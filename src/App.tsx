import React, { useState, useEffect, useRef, useCallback } from "react";
import { Home, MessageSquare, Compass, Search, User, Bell, Plus } from "lucide-react";
import { Mission, UserProfile, SmartNotification, IntelligenceItem, Message, Conversation, AiMode } from "./types";
import { initialUserProfile, initialMissions, initialNotifications, initialIntelligence, blankGuestProfile } from "./data";
import {
  fetchProfile, syncProfileCustom, updateProfileFields,
  fetchMissions, createCase, addCaseAction, markActionDone, markActionSkipped, closeCase,
  fetchNotifications, markNotificationRead,
  ApiError,
} from "./api";
import { VoiceModeOverlay } from "./components/VoiceModeOverlay";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { NewMissionModal } from "./components/NewMissionModal";
import { HomeScreen } from "./screens/HomeScreen";
import { AssistantScreen } from "./screens/AssistantScreen";
import { MissionsScreen } from "./screens/MissionsScreen";
import { IntelligenceScreen } from "./screens/IntelligenceScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { BillingScreen } from "./screens/BillingScreen";
import { InviteScreen } from "./screens/InviteScreen";

import { Sidebar } from "./components/Sidebar";

export default function App() {
  const [sessionId] = useState<string>(() => {
    let id = localStorage.getItem("pacific_session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("pacific_session_id", id);
    }
    return id;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("pacific_profile");
    return saved ? JSON.parse(saved) : initialUserProfile;
  });

  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem("pacific_missions");
    return saved ? JSON.parse(saved) : initialMissions;
  });

  const [intelligence, setIntelligence] = useState<IntelligenceItem[]>(() => {
    const saved = localStorage.getItem("pacific_intelligence");
    return saved ? JSON.parse(saved) : initialIntelligence;
  });

  const [notifications, setNotifications] = useState<SmartNotification[]>(() => {
    const saved = localStorage.getItem("pacific_notifications");
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem("pacific_conversations");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("pacific_token"));
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"home" | "assistant" | "missions" | "intelligence" | "profile" | "billing" | "invite">("home");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [activeMissionContext, setActiveMissionContext] = useState<Mission | null>(null);
  const activeMissionContextRef = useRef(activeMissionContext);
  useEffect(() => { activeMissionContextRef.current = activeMissionContext; }, [activeMissionContext]);

  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  // AI strength mode: normal (Gemini Flash) · expert (GPT-5 mini) · max (Claude Sonnet, high effort)
  const [aiMode, setAiMode] = useState<AiMode>(() => (localStorage.getItem("pacific_ai_mode") as AiMode) || "normal");
  useEffect(() => { localStorage.setItem("pacific_ai_mode", aiMode); }, [aiMode]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("Education");
  const [isSearchingIntelligence, setIsSearchingIntelligence] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newMissionDesc, setNewMissionDesc] = useState("");
  const [isGeneratingMission, setIsGeneratingMission] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [voiceMessages, setVoiceMessages] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  useEffect(() => { localStorage.setItem("pacific_profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem("pacific_missions", JSON.stringify(missions)); }, [missions]);
  useEffect(() => { localStorage.setItem("pacific_intelligence", JSON.stringify(intelligence)); }, [intelligence]);
  useEffect(() => { localStorage.setItem("pacific_notifications", JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("pacific_conversations", JSON.stringify(conversations)); }, [conversations]);

  // ─── Load real data from backend after login ────────────────────────────────
  const loadUserData = useCallback(async () => {
    const token = localStorage.getItem("pacific_token");
    if (!token) return;
    try {
      const [backendProfile, backendMissions, backendNotifs] = await Promise.all([
        fetchProfile(token),
        fetchMissions(token),
        fetchNotifications(token),
      ]);
      setProfile(backendProfile);
      setMissions(backendMissions);
      setNotifications(backendNotifs);
      // Recount stats
      setProfile(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          activeMissions: backendMissions.filter(m => m.progress < 100).length,
          completedMissions: backendMissions.filter(m => m.progress === 100).length,
        },
      }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem("pacific_token");
        setIsAuthenticated(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      loadUserData();
    }
  }, [isAuthenticated, isGuest, loadUserData]);

  // ─── Sync profile custom fields to backend when they change ────────────────
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    const token = localStorage.getItem("pacific_token");
    if (!token) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncProfileCustom(token, profile).catch(() => {});
    }, 1500);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [profile.achievements, profile.interests, profile.goals, profile.settings, profile.responseStyle]);

  useEffect(() => { fetchAISuggestions(); }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNewMissionModal(false);
        setShowNotificationDrawer(false);
        setShowVoiceMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 60);
  };

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAISuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({
          interests: profile.interests,
          currentMissions: missions.map(m => m.title),
          userDataset: profile.userDataset || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions) setAiSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error("Failed to load AI suggestions:", e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const fetchProactiveIntelligence = useCallback(async () => {
    if (isGuest) return;
    try {
      const response = await fetch("/api/intelligence/proactive", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({
          userGoals: profile.goals,
          userInterests: profile.interests,
          userCharacteristics: profile.userDataset?.characteristics || [],
          preferredPaths: profile.userDataset?.preferredPaths || [],
          userDataset: profile.userDataset || null,
        }),
      });
      if (!response.ok) return;
      const data = await response.json();

      if (data.items?.length) {
        const proactiveItems = data.items.map((item: any) => ({
          ...item,
          id: `pro_${Math.random().toString(36).substr(2, 9)}`,
          saved: false,
        }));
        setIntelligence(prev => {
          const savedItems = prev.filter(i => i.saved);
          const nonProactive = prev.filter(i => !i.id.startsWith('pro_') && !i.saved);
          return [...savedItems, ...proactiveItems, ...nonProactive].slice(0, 40);
        });
      }

      if (data.notifications?.length) {
        const newNotifs = data.notifications.map((n: any, i: number) => ({
          id: `pn_${Date.now()}_${i}`,
          title: n.title,
          description: n.description,
          type: (["achievement", "reminder", "deadline", "reflection"].includes(n.type) ? n.type : "achievement") as any,
          timestamp: "Just now",
          read: false,
        }));
        setNotifications(prev => [...newNotifs, ...prev].slice(0, 30));
      }
    } catch (e) {
      console.error("Proactive intelligence error:", e);
    }
  }, [isGuest, profile.goals, profile.interests, profile.userDataset, sessionId]);

  // Trigger proactive intelligence after login (4s delay so user data loads first)
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    const timer = setTimeout(() => fetchProactiveIntelligence(), 4000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isGuest, fetchProactiveIntelligence]);

  // Re-run when user dataset gets meaningful new goals
  const datasetGoalsKey = (profile.userDataset?.detectedGoals || []).join(",");
  useEffect(() => {
    if (!isAuthenticated || isGuest || !datasetGoalsKey) return;
    const timer = setTimeout(() => fetchProactiveIntelligence(), 2000);
    return () => clearTimeout(timer); // eslint-disable-line react-hooks/exhaustive-deps
  }, [datasetGoalsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMessage = async (textToSend?: string, forConvId?: string, imageData?: string, clarifyMode?: boolean) => {
    const rawVal = textToSend !== undefined ? textToSend : inputVal;
    if (!rawVal?.trim() && !imageData) return;
    if (textToSend === undefined) setInputVal("");

    const missionCtx = activeMissionContextRef.current;
    const newUserMsg: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: rawVal || "",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      missionId: missionCtx?.id,
      imageUrl: imageData || undefined,
    };

    let targetConvId = forConvId ?? activeConvId;
    let existingMsgs: Message[] = [];

    if (!targetConvId) {
      targetConvId = `conv_${Date.now()}`;
      const newConv: Conversation = {
        id: targetConvId,
        title: rawVal.slice(0, 50),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [newUserMsg],
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(targetConvId);
    } else {
      existingMsgs = conversationsRef.current.find(c => c.id === targetConvId)?.messages || [];
      setConversations(prev => prev.map(c => c.id === targetConvId ? {
        ...c,
        messages: [...c.messages, newUserMsg],
        updatedAt: new Date().toISOString(),
        title: c.messages.length === 0 ? rawVal.slice(0, 50) : c.title,
      } : c));
    }

    const contextMessages = [...existingMsgs, newUserMsg];
    setIsLoadingChat(true);
    scrollToBottom();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({
          messages: contextMessages,
          userProfile: {
            name: profile.name,
            interests: profile.interests.join(", "),
            goals: profile.goals.join(", "),
            responseStyle: profile.settings.style,
            achievements: profile.achievements?.map(a => `${a.title} (${a.value})`).join(", ") || "",
            userDataset: profile.userDataset || null,
          },
          missionContext: missionCtx,
          allMissions: missions.map(m => ({
            title: m.title,
            domain: m.domain,
            progress: m.progress,
            situationSummary: m.situationSummary,
            milestones: m.milestones,
          })),
          imageData: imageData || undefined,
          clarifyMode: clarifyMode !== undefined ? clarifyMode : true,
          mode: aiMode,            // normal | expert | max → model strength on the backend
        }),
      });

      if (!response.ok) throw new Error("Failed to receive response");
      const data = await response.json();
      const responseText = data.text || "I was unable to synthesize a recommendation. Please retry.";

      const topic = data.topic || "general";
      const topicLabel = data.topicLabel || undefined;

      const assistantMsg: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        missionId: missionCtx?.id,
        topic,
        topicLabel,
        suggestedCase: undefined, // auto-created via autoCreateMissionFromChat — no card needed
        quizQuestions: data.quizMode && data.quizQuestions?.length ? data.quizQuestions : undefined,
        cards: data.cards?.length ? data.cards : undefined,
      };

      if (!data.quizMode) {
        if (responseText.includes("|") && responseText.includes("---")) {
          assistantMsg.hasInteractiveCard = true;
          assistantMsg.cardData = { type: "table", title: "Pacific Strategy Check" };
        } else if (responseText.toLowerCase().includes("- [ ]") || responseText.includes("* [ ]")) {
          assistantMsg.hasInteractiveCard = true;
          assistantMsg.cardData = { type: "checklist", title: "Pacific Suggested Milestones" };
        }
      }

      // Auto-create mission when AI detects a clear goal — no click needed
      if (data.caseDetected && data.suggestedCase?.title) {
        const sc = data.suggestedCase;
        autoCreateMissionFromChat(sc.title, sc.domain || "general", sc.summary || "");
      }

      // Merge profile insights into user dataset
      if (data.profileInsights) {
        const ins = data.profileInsights;
        setProfile(prev => ({
          ...prev,
          userDataset: {
            detectedGoals: [...new Set([...(prev.userDataset?.detectedGoals || []), ...(ins.detectedGoals || [])])].slice(0, 20),
            characteristics: [...new Set([...(prev.userDataset?.characteristics || []), ...(ins.characteristics || [])])].slice(0, 20),
            preferredPaths: [...new Set([...(prev.userDataset?.preferredPaths || []), ...(ins.preferredPaths || [])])].slice(0, 20),
            quizAnswers: prev.userDataset?.quizAnswers || {},
            lastAnalyzed: new Date().toISOString(),
          },
          stats: { ...prev.stats, aiConsultations: prev.stats.aiConsultations + 1 },
        }));
      } else {
        setProfile(prev => ({ ...prev, stats: { ...prev.stats, aiConsultations: prev.stats.aiConsultations + 1 } }));
      }

      const capturedId = targetConvId;
      // Back-tag user message with the same topic so history is filterable by topic
      setConversations(prev => prev.map(c => {
        if (c.id !== capturedId) return c;
        const msgs = [...c.messages, assistantMsg];
        // Tag the last user message with the detected topic
        const taggedMsgs = msgs.map((m, i) =>
          i === msgs.length - 2 && m.role === "user" ? { ...m, topic, topicLabel } : m
        );
        return { ...c, messages: taggedMsgs, updatedAt: new Date().toISOString() };
      }));

      // The backend runs matching asynchronously after intake completes and only persists the
      // recommendation later. When it signals it's still working, poll for the follow-up reply.
      if (/i'?m (now )?searching|give me a moment|searching through everything|still searching/i.test(responseText)) {
        pollForAsyncReplies(capturedId);
      }
    } catch {
      showToast("AI connection unavailable. Please check your setup.", "warning");
      const capturedId = targetConvId;
      setConversations(prev => prev.map(c => c.id === capturedId ? {
        ...c,
        messages: [...c.messages, {
          id: `msg_${Date.now()}_fallback`,
          role: "assistant" as const,
          content: `## Offline Mode\n\nPacific is temporarily unreachable.\n1. Open **Missions** to manage your active goals.\n2. Tap **New Mission** to generate a blueprint.\n\n_Verify your API Key is configured._`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }],
        updatedAt: new Date().toISOString(),
      } : c));
    } finally {
      setIsLoadingChat(false);
      scrollToBottom();
    }
  };

  // Poll the backend for assistant messages produced asynchronously (the recommendation that
  // lands ~30–90s after intake). Dedupes against an initial cursor so the "I'm searching…" reply
  // we already rendered isn't shown twice. Stops once a real follow-up arrives or it times out.
  const pollForAsyncReplies = async (convId: string) => {
    let since = 0;
    try {
      const seed = await fetch(`/api/chat/poll?since=0`, { headers: { "X-Session-ID": sessionId } });
      if (seed.ok) since = (await seed.json()).cursor || 0;
    } catch { /* ignore — fall back to since=0 */ }

    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const res = await fetch(`/api/chat/poll?since=${since}`, { headers: { "X-Session-ID": sessionId } });
        if (!res.ok) continue;
        const data = await res.json();
        const newMsgs: Array<{ id: string; content: string; timestamp: number }> = data.messages || [];
        if (data.cursor) since = data.cursor;
        if (newMsgs.length === 0) continue;

        setConversations(prev => prev.map(c => {
          if (c.id !== convId) return c;
          const have = new Set(c.messages.map(m => m.id));
          const append = newMsgs
            .filter(m => !have.has(`srv_${m.id}`))
            .map(m => ({
              id: `srv_${m.id}`,
              role: "assistant" as const,
              content: m.content,
              timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }));
          return append.length ? { ...c, messages: [...c.messages, ...append], updatedAt: new Date().toISOString() } : c;
        }));
        scrollToBottom();
        // A substantive follow-up (not another "still working" note) means we're done.
        if (newMsgs.some(m => !/still searching|give me a moment|i'?m (now )?searching/i.test(m.content))) break;
      } catch { /* transient — keep polling */ }
    }
  };

  const openMissionChat = (missionId: string) => {
    const target = missions.find(m => m.id === missionId);
    if (!target) return;
    activeMissionContextRef.current = target;
    setActiveMissionContext(target);
    setActiveTab("assistant");

    const existingConv = conversations.find(c => c.missionId === missionId);
    if (existingConv) {
      setActiveConvId(existingConv.id);
      return;
    }

    const newConvId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      title: target.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      missionId,
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newConvId);
    setTimeout(() => {
      handleSendMessage(
        `Let's discuss my goal: "${target.title}". Here is my situation: ${target.situationSummary}`,
        newConvId
      );
    }, 150);
  };

  // Auto-creates a mission silently when AI detects a clear goal in chat.
  // Deduplicates: if a mission with same title already exists, skips silently.
  const autoCreateMissionFromChat = async (title: string, domain: string, summary: string) => {
    const alreadyExists = missions.some(
      m => m.title.toLowerCase() === title.toLowerCase() ||
           (m.domain === domain && Math.abs(m.title.length - title.length) < 5)
    );
    if (alreadyExists) return;

    try {
      const response = await fetch("/api/mission/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({ title, description: summary }),
      });
      if (!response.ok) return;
      const rawBlueprint = await response.json();

      const rawMilestones = rawBlueprint.milestones?.length > 0 ? rawBlueprint.milestones : [{
        title: "Initial Steps",
        tasks: [{ title: "Research requirements and make a checklist", completed: false }]
      }];

      let missionId = `m_${Date.now()}`;
      const milestones = rawMilestones.map((ms: any, idx: number) => ({
        id: `ms_${idx}`,
        title: ms.title || `Milestone ${idx + 1}`,
        tasks: (ms.tasks || []).map((t: any, tIdx: number) => ({
          id: `t_${idx}_${tIdx}`,
          title: t.title || "Task",
          completed: !!t.completed,
        })),
      }));

      if (!isGuest) {
        const token = localStorage.getItem("pacific_token");
        if (token) {
          try {
            const caseId = await createCase(token, rawBlueprint.title || title, summary, rawBlueprint.domain || domain);
            missionId = caseId;
            for (const ms of milestones) {
              for (const task of ms.tasks) {
                const actionId = await addCaseAction(token, caseId, task.title);
                task.id = actionId;
              }
              ms.id = `ms_${caseId}_${ms.id}`;
            }
          } catch { /* keep local IDs */ }
        }
      }

      const newMission: Mission = {
        id: missionId,
        title: rawBlueprint.title || title,
        description: rawBlueprint.description || summary,
        domain: rawBlueprint.domain || domain,
        situationSummary: summary,
        duration: rawBlueprint.duration || "4 weeks",
        progress: 0, streakCount: 0, estimatedTime: "Just created",
        category: rawBlueprint.domain || domain,
        milestones,
        recommendations: rawBlueprint.recommendations || [],
      };

      setMissions(prev => [newMission, ...prev]);
      setProfile(prev => ({ ...prev, stats: { ...prev.stats, activeMissions: prev.stats.activeMissions + 1 } }));
      showToast(`Mission added: ${newMission.title}`, "success");
    } catch { /* silent — user can create manually */ }
  };

  // Build a tailored, checkbox MISSION PLAN from a specific matched opportunity (its real
  // eligibility / requirements / steps / deadline → ordered tasks, gaps first).
  const buildMissionFromOpportunity = async (opportunityId: string, fallbackTitle?: string) => {
    try {
      showToast("Building your plan…", "info");
      const response = await fetch("/api/mission/from-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({
          opportunityId,
          userProfile: {
            name: profile.name,
            interests: profile.interests.join(", "),
            goals: profile.goals.join(", "),
            achievements: profile.achievements?.map(a => `${a.title} (${a.value})`).join(", ") || "",
          },
        }),
      });
      if (!response.ok) { showToast("Couldn't build the plan. Try again.", "warning"); return; }
      const plan = await response.json();
      if (plan?.error) { showToast("Couldn't build the plan for this one.", "warning"); return; }

      const rawMilestones = plan.milestones?.length > 0 ? plan.milestones
        : [{ title: "Steps", tasks: [{ title: "Review the requirements and make a checklist", completed: false }] }];
      const milestones = rawMilestones.map((ms: any, idx: number) => ({
        id: `ms_${idx}`,
        title: ms.title || `Milestone ${idx + 1}`,
        tasks: (ms.tasks || []).map((t: any, tIdx: number) => ({
          id: `t_${idx}_${tIdx}`,
          title: t.title || "Task",
          completed: !!t.completed,
        })),
      }));

      const newMission: Mission = {
        id: `m_${Date.now()}`,
        title: plan.title || fallbackTitle || "New Mission",
        description: plan.description || "",
        domain: plan.domain || "education",
        situationSummary: plan.description || "",
        deadline: plan.deadline,
        duration: plan.duration || "4 weeks",
        progress: 0, streakCount: 0, estimatedTime: "Just created",
        category: plan.domain || "education",
        milestones,
        recommendations: plan.recommendations || [],
      };
      setMissions(prev => [newMission, ...prev]);
      setProfile(prev => ({ ...prev, stats: { ...prev.stats, activeMissions: prev.stats.activeMissions + 1 } }));
      showToast(`Mission added: ${newMission.title}`, "success");
    } catch { showToast("Couldn't build the plan. Try again.", "warning"); }
  };

  const handleFormulateBlueprint = async () => {
    if (!newMissionTitle.trim()) return;
    setIsGeneratingMission(true);
    try {
      const response = await fetch("/api/mission/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({ title: newMissionTitle, description: newMissionDesc }),
      });
      if (!response.ok) throw new Error("Failed to formulate system blueprint");
      const rawBlueprint = await response.json();

      const rawMilestones = rawBlueprint.milestones?.length > 0 ? rawBlueprint.milestones : [{
        title: "Initial Steps",
        tasks: [{ title: "Review requirements and create a checklist", completed: false }]
      }];

      // Build mission with temp IDs first
      let missionId = `m_${Date.now()}`;
      const milestones = rawMilestones.map((milestone: any, idx: number) => ({
        id: `ms_${idx}`,
        title: milestone.title || `Milestone ${idx + 1}`,
        tasks: (milestone.tasks || []).map((task: any, tIdx: number) => ({
          id: `t_${idx}_${tIdx}`,
          title: task.title || "Task",
          completed: !!task.completed,
        })),
      }));

      // Persist to backend if authenticated
      if (!isGuest) {
        const token = localStorage.getItem("pacific_token");
        if (token) {
          try {
            const caseId = await createCase(token, rawBlueprint.title || newMissionTitle, newMissionDesc, rawBlueprint.domain || "education");
            missionId = caseId;
            // Create all tasks as CaseActions
            for (const ms of milestones) {
              for (const task of ms.tasks) {
                const actionId = await addCaseAction(token, caseId, task.title);
                task.id = actionId;
              }
              ms.id = `ms_${caseId}_${ms.id}`;
            }
          } catch {
            // Backend unavailable — keep local IDs, mission still works locally
          }
        }
      }

      const newlyFormulatedMission: Mission = {
        id: missionId,
        title: rawBlueprint.title || newMissionTitle,
        description: rawBlueprint.description || newMissionDesc,
        domain: rawBlueprint.domain || "education",
        situationSummary: newMissionDesc || "A newly created AI-guided objective.",
        duration: rawBlueprint.duration || "4 weeks",
        progress: 0,
        streakCount: 0,
        estimatedTime: "Just created",
        category: rawBlueprint.domain || "Education",
        milestones,
        recommendations: rawBlueprint.recommendations || [],
      };

      setMissions((prev) => [newlyFormulatedMission, ...prev]);
      setProfile((prev) => ({ ...prev, stats: { ...prev.stats, activeMissions: prev.stats.activeMissions + 1 } }));
      setNotifications((prev) => [{
        id: `noti_${Date.now()}`,
        title: "Mission Created",
        description: `"${newlyFormulatedMission.title}" has been added to your missions.`,
        type: "achievement",
        timestamp: "Just now",
        read: false,
      }, ...prev]);

      showToast(`Blueprint formulated: ${newlyFormulatedMission.title}`, "success");
      setShowNewMissionModal(false);
      setNewMissionTitle("");
      setNewMissionDesc("");
      setSelectedMissionId(newlyFormulatedMission.id);
      setActiveTab("missions");
    } catch (e) {
      showToast("Generation failed, please try again later.", "warning");
    } finally {
      setIsGeneratingMission(false);
    }
  };

  const handleSearchIntelligence = async (categoryFilter?: string) => {
    if (!searchQuery.trim()) return;
    const cat = categoryFilter || searchCategory;
    setIsSearchingIntelligence(true);
    try {
      const response = await fetch("/api/intelligence/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({ query: searchQuery, category: cat }),
      });
      if (!response.ok) throw new Error("Failed to search");
      const data = await response.json();
      if (data.items && Array.isArray(data.items)) {
        const enrichedItems = data.items.map((item: any) => ({
          ...item,
          id: `res_${Math.random().toString(36).substr(2, 9)}`,
          category: cat,
          saved: false,
        }));
        const keptSaved = intelligence.filter(i => i.saved);
        setIntelligence([...keptSaved, ...enrichedItems]);
        showToast(`Found results for '${searchQuery}'`, "success");
      }
    } catch (e) {
      showToast("Searching unavailable currently.", "warning");
    } finally {
      setIsSearchingIntelligence(false);
    }
  };

  const startVoiceSession = () => {
    setShowVoiceMode(true);
    setVoiceTranscript("Establishing audio connection...");
    setVoiceState("listening");
    setVoiceMessages([]);
  };

  const submitVoiceCommandSimulated = async (spokenText: string) => {
    if (!spokenText.trim()) return;
    setVoiceTranscript(`"${spokenText}"`);
    setVoiceState("thinking");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
        body: JSON.stringify({
          messages: [{ role: "user", content: spokenText }],
          userProfile: {
            name: profile.name,
            interests: profile.interests.join(", "),
            goals: profile.goals.join(", "),
            responseStyle: "Very short, vocal conversational format",
          }
        }),
      });

      const data = response.ok ? await response.json() : { text: "Connection offline." };
      const refinedVoiceText = data.text.replace(/[#*`_]/g, "").substring(0, 150);

      setVoiceState("speaking");
      setVoiceTranscript(refinedVoiceText);
      setVoiceMessages((prev) => [...prev, `You: ${spokenText}`, `Pacific: ${refinedVoiceText}`]);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(refinedVoiceText);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setVoiceState("speaking");
      const fallbackVoice = "System operational.";
      setVoiceTranscript(fallbackVoice);
    }
  };

  const toggleTaskCompletion = (missionId: string, milestoneId: string, taskId: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

    setMissions(prev => prev.map((m) => {
      if (m.id !== missionId) return m;
      let completedCount = 0;
      let totalCount = 0;
      const updatedMilestones = m.milestones.map((ms) => {
        const updatedTasks = ms.tasks.map((task) => {
          if (task.id === taskId) {
            const newDone = !task.completed;
            if (newDone) completedCount++;
            // Sync to backend if we have real UUIDs
            if (isUUID && !isGuest) {
              const token = localStorage.getItem("pacific_token");
              if (token) {
                (newDone ? markActionDone : markActionSkipped)(token, missionId, taskId).catch(() => {});
              }
            }
            return { ...task, completed: newDone };
          }
          if (task.completed) completedCount++;
          return task;
        });
        totalCount += updatedTasks.length;
        return { ...ms, tasks: updatedTasks };
      });
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      return { ...m, progress, milestones: updatedMilestones };
    }));
  };

  const deleteMission = (missionId: string) => {
    setMissions((prev) => prev.filter(m => m.id !== missionId));
    setProfile((prev) => ({ ...prev, stats: { ...prev.stats, activeMissions: Math.max(0, prev.stats.activeMissions - 1) } }));
    setSelectedMissionId(null);
    showToast("Mission deleted successfully", "warning");
    // Close the case in backend if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(missionId);
    if (isUUID && !isGuest) {
      const token = localStorage.getItem("pacific_token");
      if (token) closeCase(token, missionId).catch(() => {});
    }
  };

  const createMissionFromIntelligence = (item: IntelligenceItem) => {
    setNewMissionTitle(item.title);
    setNewMissionDesc(`Formulated from Intelligence note: ${item.summary}\n\nAI Analysis: ${item.aiAnalysis}`);
    setShowNewMissionModal(true);
    showToast("Configuring Intelligence blueprint...", "info");
  };

  const toggleSaveIntelligence = (itemId: string) => {
    setIntelligence(intelligence.map(item => {
      if (item.id === itemId) return { ...item, saved: !item.saved };
      return item;
    }));
  };

  const handleCreateEmptyMission = () => {
    setNewMissionTitle("Custom Path");
    setNewMissionDesc("Align milestones and tasks.");
    setShowNewMissionModal(true);
  };

  const unreadAlerts = notifications.filter(n => !n.read).length;
  const markAllNotificationsAsRead = () => {
    const token = localStorage.getItem("pacific_token");
    setNotifications((prev) => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (token && !isGuest) {
        prev.filter(n => !n.read).forEach(n => {
          markNotificationRead(token, n.id).catch(() => {});
        });
      }
      return updated;
    });
    showToast("Cleared alert cache", "success");
  };

  const handleSignOut = () => {
    localStorage.removeItem("pacific_token");
    localStorage.removeItem("pacific_profile");
    localStorage.removeItem("pacific_missions");
    localStorage.removeItem("pacific_notifications");
    localStorage.removeItem("pacific_messages");
    localStorage.removeItem("pacific_conversations");
    setIsAuthenticated(false);
    setIsGuest(false);
    setProfile(blankGuestProfile);
    setMissions([]);
    setNotifications([]);
    setConversations([]);
    setActiveConvId(null);
    setActiveTab("home");
    showToast("Signed out successfully.", "info");
  };

  const activeMissionData = selectedMissionId ? missions.find(m => m.id === selectedMissionId) : null;

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLoginSuccess={(userData) => {
          if (userData?.name) {
            setProfile(prev => ({
              ...prev,
              name: userData.name!,
              ...(userData.location ? { location: userData.location } : {}),
            }));
          }
          setIsGuest(false);
          setIsAuthenticated(true);
        }}
        onContinueAsGuest={() => {
          localStorage.removeItem('pacific_profile');
          localStorage.removeItem('pacific_missions');
          localStorage.removeItem('pacific_notifications');
          localStorage.removeItem('pacific_messages');
          localStorage.removeItem('pacific_conversations');
          setProfile(blankGuestProfile);
          setMissions([]);
          setNotifications([]);
          setConversations([]);
          setActiveConvId(null);
          setActiveMissionContext(null);
          setIsGuest(true);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-brand-bg text-brand-text-primary px-0 lg:px-0 py-0 flex flex-col lg:flex-row items-center lg:items-stretch justify-start antialiased selection:bg-brand-accent-light ${profile.settings.darkMode ? "dark" : ""}`}>
      {toast && (
        <div className="fixed top-4 right-4 z-[100] toast-enter bg-brand-card text-brand-text-primary border border-brand-border px-5 py-3 rounded-xl shadow-premium-lg flex items-center space-x-3 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${toast.type === "success" ? "bg-brand-success" : toast.type === "warning" ? "bg-brand-danger" : "bg-brand-accent animate-pulse"}`}></span>
          <p className="font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 text-brand-text-muted hover:text-brand-text-primary" aria-label="Dismiss">✕</button>
        </div>
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        profile={profile} 
        setProfile={setProfile} 
        unreadAlerts={unreadAlerts} 
        setShowNotificationDrawer={setShowNotificationDrawer} 
      />

      <div className="flex-1 flex w-full h-screen overflow-hidden justify-center lg:justify-start lg:bg-transparent">
        <div id="app-viewport-shell" className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-none bg-brand-card lg:bg-transparent sm:my-0 sm:border-x sm:border-brand-border lg:border-none sm:shadow-premium-lg lg:shadow-none h-screen flex flex-col relative overflow-hidden transition-colors duration-300">
          <div className="lg:hidden h-8 bg-brand-bg border-b border-brand-border/45 flex items-center justify-between text-[11px] text-brand-text-secondary font-mono transition-colors duration-300 screen-pad">
            <span>Pacific Central</span>
            <span className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-success"></span>
              <span>{new Date().toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}</span>
            </span>
          </div>

          <header className="lg:hidden py-5 border-b border-brand-border flex items-center justify-between bg-white/80 dark:bg-brand-card/80 backdrop-blur-md sticky top-0 z-[40] transition-colors duration-300 screen-pad">
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab("home")}>
              <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-white text-lg transform hover:rotate-12 transition-all shadow-premium">
                🧭
              </div>
              <div>
                <h1 className="text-h2 leading-tight tracking-tight">Pacific</h1>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={startVoiceSession}
                aria-label="Start Voice Session"
                className="p-2.5 rounded-xl border border-brand-border bg-brand-bg hover:bg-brand-accent/5 hover:border-brand-accent/30 text-brand-text-primary transition-all shadow-premium focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.97]"
              >
                <User className="w-4 h-4 text-brand-accent" />
              </button>
              <button
                onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
                aria-label="Notifications"
                className="p-2.5 rounded-xl border border-brand-border bg-brand-bg hover:bg-neutral-100 dark:hover:bg-brand-subtle transition-all shadow-premium relative focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.97]"
              >
                <Bell className="w-4 h-4 text-brand-text-primary" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-danger text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadAlerts}
                  </span>
                )}
              </button>
            </div>
          </header>

          <header className="hidden lg:flex h-[72px] border-b border-brand-border items-center justify-between bg-brand-card/90 backdrop-blur-md sticky top-0 z-[40] transition-colors duration-300 screen-pad">
             <div>
                <h2 className="text-h1 capitalize">{activeTab}</h2>
             </div>
             <div className="flex items-center space-x-3">
               <button
                  onClick={startVoiceSession}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-accent text-white hover:bg-brand-accent-dark transition-all shadow-premium focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.97]"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-semibold">Start Session</span>
                </button>
             </div>
          </header>

          {showNotificationDrawer && (
            <NotificationDrawer 
              notifications={notifications}
              unreadAlerts={unreadAlerts}
              setShowNotificationDrawer={setShowNotificationDrawer}
              markAllNotificationsAsRead={markAllNotificationsAsRead}
              openMissionChat={openMissionChat}
            />
          )}
          {showNewMissionModal && (
            <NewMissionModal
              newMissionTitle={newMissionTitle}
              setNewMissionTitle={setNewMissionTitle}
              newMissionDesc={newMissionDesc}
              setNewMissionDesc={setNewMissionDesc}
              isGeneratingMission={isGeneratingMission}
              setShowNewMissionModal={setShowNewMissionModal}
              handleFormulateBlueprint={handleFormulateBlueprint}
            />
          )}
          {showVoiceMode && (
            <VoiceModeOverlay
               profile={profile}
               setShowVoiceMode={setShowVoiceMode}
               voiceMessages={voiceMessages}
               voiceTranscript={voiceTranscript}
               setVoiceTranscript={setVoiceTranscript}
               voiceState={voiceState}
               setVoiceState={setVoiceState}
               submitVoiceCommandSimulated={submitVoiceCommandSimulated}
            />
          )}

          {/* ── Assistant tab: full-height non-scrolling layout so input stays pinned ── */}
          {activeTab === "assistant" && (
            <div className="flex-1 flex flex-col overflow-hidden bg-brand-bg lg:bg-transparent screen-pad pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-4">
              <AssistantScreen
                profile={profile}
                setProfile={setProfile}
                conversations={conversations}
                activeConvId={activeConvId}
                setActiveConvId={setActiveConvId}
                onNewConversation={() => {
                  const id = `conv_${Date.now()}`;
                  setConversations(prev => [{
                    id,
                    title: 'New Conversation',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    messages: [],
                  }, ...prev]);
                  setActiveConvId(id);
                  setActiveMissionContext(null);
                }}
                messages={conversations.find(c => c.id === activeConvId)?.messages || []}
                isLoadingChat={isLoadingChat}
                inputVal={inputVal}
                setInputVal={setInputVal}
                handleSendMessage={handleSendMessage}
                chatEndRef={chatEndRef}
                setNewMissionTitle={setNewMissionTitle}
                setNewMissionDesc={setNewMissionDesc}
                setShowNewMissionModal={setShowNewMissionModal}
                showToast={showToast}
                activeMissionContext={activeMissionContext}
                setActiveMissionContext={setActiveMissionContext}
                aiMode={aiMode}
                setAiMode={setAiMode}
                onBuildMission={buildMissionFromOpportunity}
              />
            </div>
          )}

          {/* ── All other tabs: standard scrollable layout ── */}
          {activeTab !== "assistant" && (
            <main className="flex-1 overflow-y-auto bg-brand-bg relative lg:bg-transparent transition-colors duration-300">
              <div className="lg:max-w-7xl lg:mx-auto relative animate-fade-in screen-pad screen-pad-y">
                {activeTab === "home" && (
                  <HomeScreen
                    profile={profile}
                    missions={missions}
                    setActiveTab={setActiveTab}
                    startVoiceSession={startVoiceSession}
                    handleCreateEmptyMission={handleCreateEmptyMission}
                    isLoadingSuggestions={isLoadingSuggestions}
                    aiSuggestions={aiSuggestions}
                    fetchAISuggestions={fetchAISuggestions}
                    handleSendMessage={(text) => {
                      setActiveTab("assistant");
                      if (text) {
                        const id = `conv_${Date.now()}`;
                        setConversations(prev => [{
                          id, title: text.slice(0, 50),
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          messages: [],
                        }, ...prev]);
                        setActiveConvId(id);
                        setActiveMissionContext(null);
                        setTimeout(() => handleSendMessage(text, id), 100);
                      }
                    }}
                    openMissionChat={openMissionChat}
                  />
                )}

                {activeTab === "missions" && (
                  <MissionsScreen
                    missions={missions}
                    activeMissionData={activeMissionData as any}
                    setSelectedMissionId={setSelectedMissionId}
                    setShowNewMissionModal={setShowNewMissionModal}
                    toggleTaskCompletion={toggleTaskCompletion}
                    deleteMission={deleteMission}
                    setActiveTab={setActiveTab}
                    handleSendMessage={(text) => {
                      setActiveTab("assistant");
                      if (text) {
                        const id = `conv_${Date.now()}`;
                        setConversations(prev => [{
                          id, title: text.slice(0, 50),
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          messages: [],
                        }, ...prev]);
                        setActiveConvId(id);
                        setActiveMissionContext(null);
                        setTimeout(() => handleSendMessage(text, id), 100);
                      }
                    }}
                    openMissionChat={openMissionChat}
                  />
                )}

                {activeTab === "intelligence" && (
                  <IntelligenceScreen
                    intelligence={intelligence}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchCategory={searchCategory}
                    setSearchCategory={setSearchCategory}
                    isSearchingIntelligence={isSearchingIntelligence}
                    handleSearchIntelligence={handleSearchIntelligence}
                    toggleSaveIntelligence={toggleSaveIntelligence}
                    createMissionFromIntelligence={createMissionFromIntelligence}
                    showToast={showToast}
                  />
                )}

                {activeTab === "profile" && (
                  <ProfileScreen
                    profile={profile}
                    setProfile={setProfile}
                    fetchAISuggestions={fetchAISuggestions}
                    showToast={showToast}
                    handleSignOut={handleSignOut}
                    setActiveTab={setActiveTab}
                    onProfileSave={isGuest ? undefined : (patch) => {
                      const token = localStorage.getItem("pacific_token");
                      if (token) updateProfileFields(token, patch).catch(() => {});
                    }}
                  />
                )}

                {activeTab === "billing" && (
                  <BillingScreen
                    profile={profile}
                    setProfile={(p) => setProfile(p)}
                    setActiveTab={setActiveTab}
                    showToast={showToast}
                  />
                )}

                {activeTab === "invite" && (
                  <InviteScreen
                    profile={profile}
                    setActiveTab={setActiveTab}
                    showToast={showToast}
                  />
                )}
              </div>
            </main>
          )}

          {activeTab === "home" && (
            <button
              onClick={() => {
                const id = `conv_${Date.now()}`;
                setConversations(prev => [{
                  id, title: 'New Conversation',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  messages: [],
                }, ...prev]);
                setActiveConvId(id);
                setActiveMissionContext(null);
                setActiveTab("assistant");
              }}
              className="lg:hidden fixed bottom-24 right-4 z-[45] w-14 h-14 bg-brand-accent text-white rounded-full shadow-premium-lg flex items-center justify-center hover:opacity-90 active:scale-[0.97] transition-all"
              aria-label="New conversation"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}

          <nav className="lg:hidden absolute bottom-0 left-0 right-0 h-[calc(5rem+env(safe-area-inset-bottom))] bg-brand-card border-t border-brand-border px-6 flex items-start pt-2 justify-between z-[40] shadow-premium transition-colors duration-300 pb-[env(safe-area-inset-bottom)]">
            <button aria-label="Home Tab" onClick={() => { setActiveTab("home"); setSelectedMissionId(null); }} className={`flex flex-col items-center justify-center space-y-1 flex-1 py-1.5 transition-all ${activeTab === "home" ? "text-brand-text-primary font-medium" : "text-brand-text-secondary hover:text-brand-text-primary"}`}>
              <Home className="w-5 h-5" /><span className="text-[10px] tracking-tight">Home</span>
            </button>
            <button aria-label="Assistant Tab" onClick={() => setActiveTab("assistant")} className={`flex flex-col items-center justify-center space-y-1 flex-1 py-1.5 transition-all ${activeTab === "assistant" ? "text-brand-text-primary font-medium" : "text-brand-text-secondary hover:text-brand-text-primary"}`}>
              <MessageSquare className="w-5 h-5" /><span className="text-[10px] tracking-tight">Assistant</span>
            </button>
            <button aria-label="Missions Tab" onClick={() => setActiveTab("missions")} className={`flex flex-col items-center justify-center space-y-1 flex-1 py-1.5 transition-all ${activeTab === "missions" ? "text-brand-text-primary font-medium" : "text-brand-text-secondary hover:text-brand-text-primary"}`}>
              <Compass className="w-5 h-5" /><span className="text-[10px] tracking-tight">Missions</span>
            </button>
            <button aria-label="Intelligence Tab" onClick={() => setActiveTab("intelligence")} className={`flex flex-col items-center justify-center space-y-1 flex-1 py-1.5 transition-all ${activeTab === "intelligence" ? "text-brand-text-primary font-medium" : "text-brand-text-secondary hover:text-brand-text-primary"}`}>
              <Search className="w-5 h-5" /><span className="text-[10px] tracking-tight">Intelligence</span>
            </button>
            <button aria-label="Profile Tab" onClick={() => setActiveTab("profile")} className={`flex flex-col items-center justify-center space-y-1 flex-1 py-1.5 transition-all ${activeTab === "profile" ? "text-brand-text-primary font-medium" : "text-brand-text-secondary hover:text-brand-text-primary"}`}>
              <User className="w-5 h-5" /><span className="text-[10px] tracking-tight">Profile</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
