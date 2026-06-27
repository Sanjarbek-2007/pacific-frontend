import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Plus, ImageIcon, Send, X, MessageSquare, AlertCircle, Briefcase, BookOpen, Scale, Heart, DollarSign, Users, ChevronRight, ChevronDown, Sparkles } from "lucide-react";
import { UserProfile, Message, Mission, Conversation, QuizQuestion, ADVISORY_STYLES, AdvisoryStyle, ResponseCard, AiMode } from "../types";
import { getDomainConfig } from "../utils/domainConfig";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssistantScreenProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  conversations: Conversation[];
  activeConvId: string | null;
  setActiveConvId: (id: string) => void;
  onNewConversation: () => void;
  messages: Message[];
  isLoadingChat: boolean;
  inputVal: string;
  setInputVal: (val: string) => void;
  handleSendMessage: (text?: string, convId?: string, imageData?: string, clarifyMode?: boolean) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  setNewMissionTitle: (t: string) => void;
  setNewMissionDesc: (t: string) => void;
  setShowNewMissionModal: (s: boolean) => void;
  showToast: (msg: string, type: "success" | "info" | "warning") => void;
  activeMissionContext: Mission | null;
  setActiveMissionContext: (m: Mission | null) => void;
  aiMode: AiMode;
  setAiMode: (m: AiMode) => void;
  onBuildMission?: (opportunityId: string, title?: string) => void;
}

// ─── AI strength modes (model selection) ──────────────────────────────────────
const AI_MODES: { value: AiMode; label: string; desc: string; emoji: string; accent: string }[] = [
  { value: "normal", label: "Normal", desc: "Fast everyday answers", emoji: "⚡", accent: "#10B981" },
  { value: "expert", label: "Expert", desc: "Smarter reasoning (GPT-5)", emoji: "🎓", accent: "#6366F1" },
  { value: "max",    label: "Max",    desc: "Deepest analysis (Claude, high effort)", emoji: "🧠", accent: "#A855F7" },
];

// ─── Interactive checkbox ─────────────────────────────────────────────────────
const InteractiveCheck: React.FC<{ checked: boolean }> = ({ checked: initial }) => {
  const [checked, setChecked] = useState(initial);
  return (
    <span
      onClick={() => setChecked(v => !v)}
      className={`inline-flex items-center justify-center w-4 h-4 rounded border cursor-pointer mr-2 flex-shrink-0 transition-colors ${checked ? "bg-brand-accent border-brand-accent text-white" : "border-brand-border bg-white hover:border-brand-accent"}`}
    >
      {checked && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </span>
  );
};

// ─── Markdown renderer ────────────────────────────────────────────────────────
const MdContent: React.FC<{ content: string; onCreateMission?: (title: string, desc: string) => void }> = ({ content, onCreateMission }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-3 last:mb-0 leading-[1.7] text-[15px]">{children}</p>,
      h1: ({ children }) => <h1 className="text-[20px] font-bold mt-4 mb-2 text-brand-text-primary">{children}</h1>,
      h2: ({ children }) => <h2 className="text-[17px] font-semibold mt-4 mb-2 text-brand-text-primary">{children}</h2>,
      h3: ({ children }) => <h3 className="text-[15px] font-semibold mt-3 mb-1 text-brand-text-primary">{children}</h3>,
      strong: ({ children }) => <strong className="font-semibold text-brand-text-primary">{children}</strong>,
      em: ({ children }) => <em className="italic text-brand-text-secondary">{children}</em>,
      ul: ({ children }) => <ul className="list-disc list-outside space-y-1.5 my-3 pl-5">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-outside space-y-1.5 my-3 pl-5">{children}</ol>,
      li: ({ children, className }) => {
        const isTask = className?.includes('task-list-item');
        return isTask ? (
          <li className="flex items-start gap-1.5 text-[14px] leading-relaxed">{children}</li>
        ) : (
          <li className="text-[14px] leading-relaxed">{children}</li>
        );
      },
      input: ({ type, checked }) => {
        if (type === 'checkbox') return <InteractiveCheck checked={!!checked} />;
        return null;
      },
      a: ({ href, children }) => {
        if (href?.startsWith('pacific://add-mission')) {
          const params = new URLSearchParams(href.replace('pacific://add-mission?', ''));
          const title = decodeURIComponent(params.get('title') || String(children));
          const desc = decodeURIComponent(params.get('desc') || '');
          return (
            <button
              onClick={() => onCreateMission?.(title, desc)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-brand-accent text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3 h-3" /><span>{String(children) || 'Create Mission'}</span>
            </button>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-brand-accent underline underline-offset-2 hover:opacity-80 transition-opacity font-medium break-all">
            {children}
          </a>
        );
      },
      // react-markdown v10 removed the `inline` prop. Detect inline vs block by className:
      // fenced code blocks have className="language-xxx"; inline code has no className.
      pre: ({ children }) => (
        <pre className="bg-[#1a1a2e] border border-brand-border/40 rounded-xl p-4 text-[13px] font-mono overflow-x-auto my-3 text-emerald-300">
          {children}
        </pre>
      ),
      code: ({ className, children }: any) =>
        className
          ? <code className={className}>{children}</code>
          : <code className="bg-brand-subtle border border-brand-border/60 px-1.5 py-0.5 rounded text-[13px] font-mono text-brand-accent">{children}</code>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-[3px] border-brand-accent pl-4 my-3 text-brand-text-secondary italic text-[14px] leading-relaxed">{children}</blockquote>
      ),
      table: ({ children }) => (
        <div className="overflow-x-auto my-3 rounded-xl border border-brand-border">
          <table className="text-[13px] border-collapse w-full">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-brand-subtle">{children}</thead>,
      th: ({ children }) => <th className="border-b border-brand-border px-3 py-2 text-left font-semibold text-[12px] uppercase tracking-wide text-brand-text-muted">{children}</th>,
      td: ({ children }) => <td className="border-b border-brand-border/40 px-3 py-2 align-top text-[13px]">{children}</td>,
      hr: () => <hr className="border-brand-border/40 my-4" />,
    }}
  >
    {content}
  </ReactMarkdown>
);

// ─── Domain icons ─────────────────────────────────────────────────────────────
const DOMAIN_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  education: { icon: <BookOpen className="w-4 h-4" />, color: "#3B82F6", label: "Education" },
  work:       { icon: <Briefcase className="w-4 h-4" />, color: "#8B5CF6", label: "Work" },
  legal:      { icon: <Scale className="w-4 h-4" />, color: "#EF4444", label: "Legal" },
  finance:    { icon: <DollarSign className="w-4 h-4" />, color: "#10B981", label: "Finance" },
  health:     { icon: <Heart className="w-4 h-4" />, color: "#F59E0B", label: "Health" },
  family:     { icon: <Users className="w-4 h-4" />, color: "#EC4899", label: "Family" },
};

// ─── Case card ────────────────────────────────────────────────────────────────
const CaseCard: React.FC<{
  suggestedCase: { title: string; domain: string; summary: string };
  onCreateCase: (title: string, domain: string, summary: string) => void;
}> = ({ suggestedCase, onCreateCase }) => {
  const meta = DOMAIN_META[suggestedCase.domain] || DOMAIN_META.education;
  return (
    <div className="mt-3 pt-3 border-t border-brand-border/40 space-y-2">
      <div className="flex items-center space-x-2 text-[11px] text-brand-text-secondary font-mono">
        <AlertCircle className="w-3 h-3 text-brand-accent" />
        <span>Pacific detected a new case</span>
      </div>
      <div className="bg-brand-bg border border-brand-border rounded-xl p-3 space-y-2">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.icon}</span>
          <div>
            <p className="text-[13px] font-semibold text-brand-text-primary leading-tight">{suggestedCase.title}</p>
            <p className="text-[10px] font-mono" style={{ color: meta.color }}>{meta.label}</p>
          </div>
        </div>
        <p className="text-[12px] text-brand-text-secondary leading-snug">{suggestedCase.summary}</p>
        <button
          onClick={() => onCreateCase(suggestedCase.title, suggestedCase.domain, suggestedCase.summary)}
          className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white transition-colors"
          style={{ background: meta.color }}
        >
          <Plus className="w-3.5 h-3.5" /><span>Track this case</span>
        </button>
      </div>
    </div>
  );
};

// ─── Quiz UI ──────────────────────────────────────────────────────────────────
const QuizCard: React.FC<{
  questions: QuizQuestion[];
  onAnswer: (answer: string) => void;
  disabled: boolean;
}> = ({ questions, onAnswer, disabled }) => {
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const allAnswered = Object.keys(answered).length >= questions.length;

  const handleSelect = (questionId: string, option: string) => {
    if (disabled || answered[questionId]) return;
    const newAnswered = { ...answered, [questionId]: option };
    setAnswered(newAnswered);
    if (Object.keys(newAnswered).length >= questions.length) {
      const summary = questions.map(q => `${q.question}: **${newAnswered[q.id]}**`).join("\n");
      setTimeout(() => onAnswer(summary), 300);
    }
  };

  const remaining = questions.length - Object.keys(answered).length;

  return (
    <div className="mt-4 rounded-2xl border border-brand-accent/25 bg-gradient-to-b from-brand-accent/6 to-transparent overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-brand-accent/15">
        <div className="w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-brand-accent">Sharpen your results</p>
          <p className="text-[10px] text-brand-text-muted">Answer all {questions.length} — I'll refine my picks instantly</p>
        </div>
        {!allAnswered && remaining < questions.length && (
          <span className="ml-auto text-[10px] font-mono bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full">
            {remaining} left
          </span>
        )}
        {allAnswered && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-brand-success">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
            Sending…
          </span>
        )}
      </div>

      {/* Questions */}
      <div className="p-4 space-y-4">
        {questions.map((q, qi) => {
          const isAnswered = !!answered[q.id];
          return (
            <div key={q.id} className={`space-y-2 transition-opacity ${allAnswered && !isAnswered ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                  isAnswered ? "bg-brand-accent text-white" : "bg-brand-border text-brand-text-muted"
                }`}>{isAnswered ? "✓" : qi + 1}</span>
                <p className="text-[13px] font-medium text-brand-text-primary">{q.question}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pl-7">
                {q.options.map((opt) => {
                  const isSelected = answered[q.id] === opt;
                  const otherSelected = isAnswered && !isSelected;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      disabled={disabled || isAnswered}
                      className={`text-left px-3 py-2 rounded-xl text-[12px] border transition-all duration-200 ${
                        isSelected
                          ? "bg-brand-accent text-white border-brand-accent shadow-sm"
                          : otherSelected
                            ? "bg-transparent text-brand-text-muted border-brand-border/40 opacity-50 cursor-default"
                            : "bg-brand-bg border-brand-border text-brand-text-primary hover:border-brand-accent hover:bg-brand-accent/5 active:scale-95"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Smart Card (ResponseCard visual renderer) ────────────────────────────────
const CARD_URGENCY: Record<string, { border: string; bg: string; dot: string }> = {
  high:   { border: "border-red-200/70",   bg: "bg-red-50/60",    dot: "bg-red-500" },
  medium: { border: "border-amber-200/70", bg: "bg-amber-50/60",  dot: "bg-amber-500" },
  low:    { border: "border-brand-border", bg: "bg-brand-subtle", dot: "bg-brand-success" },
};

const CARD_TYPE_META: Record<string, { label: string; color: string }> = {
  resource: { label: "Resource", color: "text-blue-600 bg-blue-50 border-blue-200" },
  action:   { label: "Action",   color: "text-brand-accent bg-brand-accent/8 border-brand-accent/30" },
  step:     { label: "Step",     color: "text-purple-600 bg-purple-50 border-purple-200" },
  warning:  { label: "Warning",  color: "text-red-600 bg-red-50 border-red-200" },
  insight:  { label: "Insight",  color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

const getFaviconUrl = (url: string) => {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
  catch { return null; }
};

const SmartCard: React.FC<{ card: ResponseCard; onBuildMission?: (id: string, title?: string) => void }> = ({ card, onBuildMission }) => {
  const urgKey = (card.urgency || "low") as keyof typeof CARD_URGENCY;
  const urg = CARD_URGENCY[urgKey] || CARD_URGENCY.low;
  const meta = CARD_TYPE_META[card.type] || CARD_TYPE_META.resource;
  const [faviconOk, setFaviconOk] = useState(true);
  const faviconUrl = card.url ? getFaviconUrl(card.url) : null;
  const showFavicon = card.type === "resource" && faviconUrl && faviconOk;

  return (
    <div className={`rounded-xl border ${urg.border} ${urg.bg} overflow-hidden`}>
      {/* Full-width image (hotel, place, poster) */}
      {card.imageUrl && (
        <img
          src={card.imageUrl}
          alt={card.title}
          className="w-full h-36 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}

      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Step number OR favicon OR icon */}
            {card.type === "step" && card.step ? (
              <span className="w-6 h-6 rounded-full bg-brand-accent text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{card.step}</span>
            ) : showFavicon ? (
              <img
                src={faviconUrl!}
                alt=""
                className="w-6 h-6 rounded-md object-contain flex-shrink-0 bg-white border border-brand-border/30 p-0.5"
                onError={() => setFaviconOk(false)}
              />
            ) : card.icon ? (
              <span className="text-[20px] leading-none flex-shrink-0">{card.icon}</span>
            ) : null}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-brand-text-primary leading-snug">{card.title}</p>
              {card.subtitle && <p className="text-[12px] text-brand-text-secondary leading-snug mt-0.5">{card.subtitle}</p>}
            </div>
          </div>
          <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${meta.color}`}>
            {meta.label}
          </span>
        </div>

        {card.body && <p className="text-[13px] text-brand-text-secondary leading-snug">{card.body}</p>}

        {/* Meta chips: deadline + type badge */}
        {(card.meta || card.badge) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {card.meta && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                card.urgency === "high" ? "text-red-600 bg-red-50 border-red-200"
                  : card.urgency === "medium" ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-brand-text-secondary bg-brand-subtle border-brand-border"
              }`}>
                {card.urgency === "high" && <span className={`w-1.5 h-1.5 rounded-full ${urg.dot} animate-pulse`} />}
                {card.meta}
              </span>
            )}
            {card.badge && (
              <span className="text-[10px] font-mono uppercase tracking-wide text-brand-text-muted bg-brand-subtle border border-brand-border px-2 py-0.5 rounded-full">
                {card.badge}
              </span>
            )}
          </div>
        )}

        {/* Build a tailored mission plan from this exact opportunity */}
        {card.opportunityId && onBuildMission && (
          <button
            onClick={() => onBuildMission(card.opportunityId!, card.title)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-[12px] font-semibold hover:bg-brand-accent/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Build my plan to win this
          </button>
        )}

        {/* Action buttons: Apply (primary) + Open (secondary) */}
        {(card.url || card.applyUrl) && (
          <div className="flex items-center gap-2 pt-0.5">
            {card.applyUrl && (
              <a
                href={card.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-accent text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
              >
                Apply →
              </a>
            )}
            {card.url && (
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  card.applyUrl
                    ? "border border-brand-border text-brand-text-primary hover:border-brand-accent"
                    : "bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20"
                }`}
              >
                {card.applyUrl ? "Details" : "Open →"}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Staged "thinking" indicator (Claude-style syncing animation) ─────────────
const ThinkingIndicator: React.FC<{ mode: AiMode }> = ({ mode }) => {
  const stages = ["Understanding your request", "Searching 60+ opportunities", "Reasoning through your fit", "Writing your answer"];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    // Max/Expert "think" longer — pace the stages a touch slower so it reads as deeper work.
    const ms = mode === "max" ? 1400 : mode === "expert" ? 1100 : 850;
    const t = setInterval(() => setStage(s => Math.min(s + 1, stages.length - 1)), ms);
    return () => clearInterval(t);
  }, [mode]);
  return (
    <div className="w-full py-2.5 space-y-2 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-4 w-4 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent/40" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-accent/80" />
        </span>
        <span className="text-[13px] text-brand-text-primary font-medium">{stages[stage]}</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1 h-1 rounded-full bg-brand-text-muted animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </span>
      </div>
      {/* progress rail */}
      <div className="h-1 w-full max-w-[280px] bg-brand-subtle rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-accent rounded-full transition-all duration-700 ease-out"
          style={{ width: `${((stage + 1) / stages.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

// ─── Conversation list item ───────────────────────────────────────────────────
const ConvItem: React.FC<{ conv: Conversation; active: boolean; onClick: () => void }> = ({ conv, active, onClick }) => {
  const lastMsg = conv.messages[conv.messages.length - 1];
  const preview = lastMsg?.content?.slice(0, 48) || 'No messages yet';
  const ago = (() => {
    const diff = Date.now() - new Date(conv.updatedAt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${active ? 'bg-brand-accent/10 border border-brand-accent/30' : 'hover:bg-brand-subtle border border-transparent'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-medium line-clamp-1 ${active ? 'text-brand-accent' : 'text-brand-text-primary'}`}>{conv.title}</p>
        <span className="text-[10px] text-brand-text-muted flex-shrink-0">{ago}</span>
      </div>
      <p className="text-[11px] text-brand-text-muted line-clamp-1 mt-0.5">{preview}</p>
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export function AssistantScreen({
  profile,
  setProfile,
  conversations,
  activeConvId,
  setActiveConvId,
  onNewConversation,
  messages,
  isLoadingChat,
  inputVal,
  setInputVal,
  handleSendMessage,
  chatEndRef,
  setNewMissionTitle,
  setNewMissionDesc,
  setShowNewMissionModal,
  showToast,
  activeMissionContext,
  setActiveMissionContext,
  aiMode,
  setAiMode,
  onBuildMission,
}: AssistantScreenProps) {
  const [showConvList, setShowConvList] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [clarifyMode, setClarifyMode] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const domainStyle = getDomainConfig(activeMissionContext?.domain || 'education');

  // Close mode menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
    };
    if (showModeMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModeMenu]);

  const currentMode = ADVISORY_STYLES.find(s => s.value === profile.settings.style) || ADVISORY_STYLES[0];

  const quickPrompts = activeMissionContext
    ? ["What are my blockers?", "Build an action plan", "Review my progress", "What's the next step?"]
    : ["What should I focus on?", "Help me plan my week", "I need advice on my situation", "What opportunities fit me?"];

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 22;
    const minHeight = lineHeight * 2;
    const maxHeight = lineHeight * 10; // 10 lines
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => { adjustHeight(); }, [inputVal, adjustHeight]);

  const clearImage = () => {
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        showToast("Image too large. Max 10MB.", "warning");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImagePreview(dataUrl);
        setImageData(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      showToast(`File attached: ${file.name}`, "info");
      setInputVal(`[Attached: ${file.name}] ${inputVal}`);
    }
    e.target.value = "";
  };

  const doSend = () => {
    if (!inputVal.trim() && !imageData) return;
    if (isLoadingChat) return;
    const text = inputVal.trim();
    const img = imageData;
    setInputVal("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
      textareaRef.current.style.overflowY = "hidden";
    }
    clearImage();
    handleSendMessage(text || undefined, undefined, img || undefined, clarifyMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const handleQuizAnswer = (answer: string) => {
    if (isLoadingChat) return;
    handleSendMessage(answer, undefined, undefined, false);
  };

  return (
    <div className="flex h-full space-x-0 lg:space-x-5 animate-fade-in relative min-h-0">

      {/* ── Conversation list sidebar (desktop) ── */}
      <div className="hidden lg:flex flex-col w-[220px] flex-shrink-0 space-y-2">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /><span>New Chat</span>
        </button>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
          {conversations.length === 0 ? (
            <p className="text-[11px] text-brand-text-muted text-center py-6 px-2">No conversations yet.<br />Start one above.</p>
          ) : (
            conversations.map(c => (
              <ConvItem key={c.id} conv={c} active={c.id === activeConvId} onClick={() => setActiveConvId(c.id)} />
            ))
          )}
        </div>
      </div>

      {/* ── Mobile conversation drawer ── */}
      {showConvList && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConvList(false)} />
          <div className="relative ml-auto w-72 bg-brand-card border-l border-brand-border h-full flex flex-col p-4 shadow-premium-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body-strong">Conversations</h3>
              <button onClick={() => setShowConvList(false)} className="p-1.5 hover:bg-brand-subtle rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <button
              onClick={() => { onNewConversation(); setShowConvList(false); }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity mb-3"
            >
              <Plus className="w-4 h-4" /><span>New Chat</span>
            </button>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {conversations.map(c => (
                <ConvItem key={c.id} conv={c} active={c.id === activeConvId} onClick={() => { setActiveConvId(c.id); setShowConvList(false); }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full min-h-0">

        {/* Header */}
        <div className="border-b border-brand-border pb-3 flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConvList(true)}
              className="lg:hidden p-2 hover:bg-brand-subtle rounded-lg text-brand-text-secondary"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-h2">
                {activeConvId ? (conversations.find(c => c.id === activeConvId)?.title || 'Pacific Advisor') : 'Pacific Advisor'}
              </h3>
              {activeMissionContext && (
                <p className="text-caption flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: domainStyle.color }} />
                  {activeMissionContext.title}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeMissionContext && (
              <button
                onClick={() => setActiveMissionContext(null)}
                className="text-xs text-brand-text-muted hover:text-brand-danger flex items-center space-x-1 transition-colors"
              >
                <X className="w-3 h-3" /><span className="hidden sm:inline">Clear context</span>
              </button>
            )}

            {/* AI strength segmented control: Normal · Expert · Max */}
            <div className="flex items-center bg-brand-subtle border border-brand-border rounded-xl p-0.5" title="Choose how hard Pacific thinks">
              {AI_MODES.map(m => {
                const active = aiMode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => { setAiMode(m.value); showToast(`${m.label} mode — ${m.desc}`, "info"); }}
                    title={m.desc}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      active ? "bg-brand-card shadow-sm" : "text-brand-text-muted hover:text-brand-text-primary"
                    }`}
                    style={active ? { color: m.accent } : undefined}
                  >
                    <span className="text-[12px] leading-none">{m.emoji}</span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Advisory tone picker */}
            <div className="relative" ref={modeMenuRef}>
              <button
                onClick={() => setShowModeMenu(v => !v)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs border border-brand-border bg-brand-card rounded-xl hover:border-brand-accent transition-all text-brand-text-primary"
              >
                <span>{currentMode.emoji}</span>
                <span className="hidden sm:inline font-medium">{currentMode.label}</span>
                <ChevronDown className="w-3 h-3 text-brand-text-muted" />
              </button>

              {showModeMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-brand-card border border-brand-border rounded-2xl shadow-premium-lg z-50 overflow-hidden animate-slide-down">
                  <div className="px-3 py-2 border-b border-brand-border/50">
                    <p className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Advisory Mode</p>
                  </div>
                  {ADVISORY_STYLES.map(mode => {
                    const isActive = profile.settings.style === mode.value;
                    return (
                      <button
                        key={mode.value}
                        onClick={() => {
                          setProfile(prev => ({ ...prev, settings: { ...prev.settings, style: mode.value as AdvisoryStyle } }));
                          setShowModeMenu(false);
                          showToast(`Mode: ${mode.label}`, "success");
                        }}
                        className={`w-full text-left px-3 py-2.5 flex items-start space-x-2.5 transition-colors ${isActive ? "bg-brand-accent/10" : "hover:bg-brand-subtle"}`}
                      >
                        <span className="text-base flex-shrink-0 mt-0.5">{mode.emoji}</span>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-semibold ${isActive ? "text-brand-accent" : "text-brand-text-primary"}`}>{mode.label}</p>
                          <p className="text-[11px] text-brand-text-muted leading-snug">{mode.desc}</p>
                        </div>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-accent flex-shrink-0 self-center ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {messages.length === 0 && !isLoadingChat && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center px-4 min-h-0">
            <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center border border-brand-accent/20">
              <span className="text-2xl">🧭</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-body-strong">Ask Pacific anything</h3>
              <p className="text-caption max-w-xs">Describe your situation, goal, or problem — I'll analyze it and navigate with you. Upload a photo for visual analysis.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(p, undefined, undefined, clarifyMode)}
                  className="text-left p-3 card-default hover:border-brand-accent transition-colors text-sm text-brand-text-secondary hover:text-brand-text-primary rounded-xl"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-2 min-h-0">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start w-full"}`}>
                {/* Metadata row */}
                <div className="flex items-center gap-2 text-[10px] text-brand-text-secondary font-mono px-0.5 mb-1.5">
                  <span className="font-medium">{m.role === "user" ? (profile.name || "You") : "🧭 Pacific"}</span>
                  <span className="opacity-40">·</span>
                  <span>{m.timestamp}</span>
                  {m.topicLabel && (
                    <span className="px-1.5 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-[9px] font-medium tracking-wide">
                      {m.topicLabel}
                    </span>
                  )}
                </div>

                {m.role === "user" ? (
                  /* User bubble */
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-brand-accent text-white text-[14px] leading-relaxed shadow-sm">
                    {m.imageUrl && (
                      <div className="mb-2">
                        <img src={m.imageUrl} alt="Uploaded" className="max-h-48 rounded-xl object-cover" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ) : (
                  /* AI response — full-width, no bubble, clean layout */
                  <div className="w-full space-y-3">
                    <div className="text-brand-text-primary">
                      <MdContent
                        content={m.content}
                        onCreateMission={(title, desc) => {
                          setNewMissionTitle(title);
                          setNewMissionDesc(desc);
                          setShowNewMissionModal(true);
                        }}
                      />
                    </div>

                    {/* Structured resource / action cards */}
                    {m.cards && m.cards.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {m.cards.map((card, idx) => (
                          <SmartCard key={idx} card={card} onBuildMission={onBuildMission} />
                        ))}
                      </div>
                    )}

                    {/* Quiz */}
                    {m.quizQuestions && m.quizQuestions.length > 0 && (
                      <QuizCard
                        questions={m.quizQuestions}
                        onAnswer={handleQuizAnswer}
                        disabled={isLoadingChat}
                      />
                    )}

                    {/* Suggested case */}
                    {m.suggestedCase && (
                      <CaseCard
                        suggestedCase={m.suggestedCase}
                        onCreateCase={(title, _domain, summary) => {
                          setNewMissionTitle(title);
                          setNewMissionDesc(summary);
                          setShowNewMissionModal(true);
                        }}
                      />
                    )}

                    {/* Interactive card fallback (table / checklist) */}
                    {m.hasInteractiveCard && !m.suggestedCase && (
                      <button
                        onClick={() => {
                          setNewMissionTitle(m.cardData?.title || "New Mission");
                          setNewMissionDesc(m.content.substring(0, 200));
                          setShowNewMissionModal(true);
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent rounded-lg text-xs font-semibold hover:bg-brand-accent/20 transition-colors"
                      >
                        <Plus className="w-3 h-3" /><span>Save as Mission</span>
                      </button>
                    )}

                    {/* Subtle divider after AI message */}
                    <div className="border-b border-brand-border/30 pb-1" />
                  </div>
                )}
              </div>
            ))}

            {isLoadingChat && <ThinkingIndicator mode={aiMode} />}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* ── Input area (pinned at bottom, never scrolls away) ── */}
        <div className="flex-shrink-0 pt-2">
          {/* Quick prompts strip */}
          {messages.length > 0 && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 px-0 scrollbar-none text-[11px] whitespace-nowrap">
              <span className="text-brand-text-secondary uppercase font-mono tracking-tighter self-center flex-shrink-0">Quick:</span>
              {quickPrompts.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s, undefined, undefined, clarifyMode)}
                  className="px-2.5 py-1 bg-brand-bg border border-brand-border hover:border-brand-accent hover:bg-brand-card text-brand-text-primary rounded-lg font-light transition-all cursor-pointer flex-shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover border border-brand-border shadow-premium" />
              <button
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-danger text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input box */}
          <div className="bg-brand-card border border-brand-border rounded-2xl shadow-premium overflow-hidden">
            {/* Toolbar: clarify toggle */}
            <div className="flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-brand-border/30">
              <button
                onClick={() => setClarifyMode(v => !v)}
                title={clarifyMode ? "Clarify ON — AI may ask 1 follow-up question" : "Clarify OFF — AI answers from context only"}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all border flex-shrink-0 ${
                  clarifyMode
                    ? "bg-brand-accent/10 text-brand-accent border-brand-accent/30"
                    : "bg-brand-subtle text-brand-text-muted border-brand-border/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${clarifyMode ? "bg-brand-accent" : "bg-brand-text-muted/40"}`} />
                <span>Clarify</span>
              </button>
              <span className="text-[10px] text-brand-text-muted truncate">
                {clarifyMode ? "AI may ask 1 follow-up" : "Direct answers only"}
              </span>
            </div>

            {/* Input row */}
            <div className="flex items-end space-x-2 p-2">
              {/* Image upload button */}
              <label className="p-2.5 hover:bg-brand-subtle rounded-xl cursor-pointer text-brand-text-secondary hover:text-brand-accent transition-all flex-shrink-0 self-end">
                <ImageIcon className="w-4 h-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </label>

              {/* Auto-resizing textarea */}
              <textarea
                ref={textareaRef}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={imagePreview ? "Add a message about this image..." : "Ask Pacific anything… (Shift+Enter for new line)"}
                className="flex-1 bg-transparent border-none text-[15px] focus:outline-none py-2 px-1 resize-none scrollbar-none text-brand-text-primary leading-snug"
                style={{ minHeight: "44px", maxHeight: "240px", overflowY: "hidden" }}
                rows={1}
              />

              {/* Send button */}
              <button
                aria-label="Send"
                onClick={doSend}
                disabled={(!inputVal.trim() && !imageData) || isLoadingChat}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 self-end ${(inputVal.trim() || imageData) && !isLoadingChat ? "bg-brand-accent text-white hover:opacity-90" : "bg-brand-subtle text-brand-text-muted cursor-not-allowed"}`}
              >
                {isLoadingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
