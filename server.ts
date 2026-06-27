import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

app.use(express.json({ limit: "12mb" }));

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return aiClient;
}

function hasApiKey(): boolean {
  return !!apiKey;
}

// ─── Spring Boot proxy ────────────────────────────────────────────────────────

async function proxyToBackend(req: Request, res: Response): Promise<boolean> {
  try {
    const url = `${BACKEND_URL}${req.originalUrl}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;
    if (req.headers["x-session-id"]) headers["X-Session-ID"] = req.headers["x-session-id"] as string;

    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok && response.status === 403) {
      console.warn(`[proxy] Backend returned 403 for ${req.originalUrl} — falling back to Gemini`);
      return false;
    }

    const data = await response.json();
    res.status(response.status).json(data);
    return true;
  } catch {
    return false;
  }
}

// ─── REAL DATA SOURCES (knowledge embedded in prompts) ───────────────────────
// HH.uz (HeadHunter Uzbekistan), GrantU.uz, IT Park Tashkent, international programs

const REAL_PROGRAMS_KNOWLEDGE = `
## REAL PROGRAMS & SOURCES (2024–2025, Central Asia / Uzbekistan)

### SCHOLARSHIPS & GRANTS
- **Yoshlar ta'lim jamg'armasi** (Youth Education Fund): Presidential scholarships for top students. Deadline: ~April yearly. Full coverage.
- **Fulbright (US Embassy Tashkent)**: Master's/PhD in USA. Deadline: ~October. fulbright.uz
- **DAAD (Germany)**: Study in Germany. Various programs. daad.de. Require B2 German or English.
- **Chevening (UK)**: UK Government scholarship. Master's in UK. chevening.org. Deadline: ~November.
- **JICA (Japan)**: Japanese government development scholarships. jica.go.jp
- **Korea Foundation / GKS**: Korean Government Scholarship for undergrad and grad. studyinkorea.go.kr
- **Stipendium Hungaricum (Hungary)**: Full scholarships in Hungary. stipendiumhungaricum.hu
- **Chinese Government Scholarship (CSC)**: Study in China, full coverage. campuschina.org
- **Erasmus+ for Central Asia**: Exchange programs in EU universities. erasmus-uzbekistan.uz
- **ADB-JSP**: Asian Development Bank scholarships for Master's. adb.org
- **GIZ programs**: German development cooperation programs. giz.de
- **USAID programs**: Various development grants. usaid.gov/central-asia
- **GrantU.uz**: Uzbekistan's national scholarship portal — aggregates all state scholarships.
- **Stipendiya.uz**: Portal for international scholarships relevant to Uzbek students.
- **IT Park Scholarships**: Free coding bootcamps, IT courses, internships. it-park.uz

### JOBS & CAREER
- **HH.uz** (HeadHunter Uzbekistan): Main job portal. Categories: IT, Finance, Marketing, Legal, Healthcare. hh.uz
- **Jobs.uz**: Secondary job portal. jobs.uz
- **Tanlov.uz**: Government tender/job portal.
- **IT Park companies**: 900+ tech companies, many hiring. it-park.uz/companies
- **EPAM Systems Uzbekistan**: International IT company with training & jobs.
- **Uzcard/Humo**: Fintech jobs.
- **Ucell, MTS, Beeline**: Telecom sector jobs.
- **Remote work**: Upwork, Fiverr, Toptal — accessible from Uzbekistan.

### EDUCATION & TRAINING
- **IT Park Tashkent**: Free 6-month coding courses (Python, Java, JavaScript, Data Science). Apply at it-park.uz
- **INHA University in Tashkent**: Korean-affiliated, strong IT/Engineering. inha.uz
- **Turin Polytechnic in Tashkent**: Italian-affiliated. turinpolytechnic.org
- **Westminster International University in Tashkent (WIUT)**: UK-affiliated MBA, Business. wiut.uz
- **Tashkent University of IT (TUIT)**: Main IT university in UZ.
- **Coursera/edX**: Online degrees and certificates recognized internationally.
- **Lingua (language schools)**: IELTS, TOEFL prep. Various in Tashkent.
- **Speak Up, British Council**: English language programs.

### BUSINESS & ENTREPRENEURSHIP
- **IT Park Business Incubator**: 3-year tax breaks, support for tech startups.
- **Innozone (Technopark)**: Science & tech park in Tashkent.
- **MOST Business Incubator**: Startup support.
- **Impact Hub Tashkent**: Coworking & startup community.
- **Kapitalbank / Ipoteka Bank**: SME loans at preferential rates.
- **Yoshlar jamgarmasi**: Youth Business Fund — loans up to $10,000 at 0% for first year.

### HOUSING & FINANCE
- **OLX.uz**: Real estate listings (rent & buy).
- **Click.uz, Payme**: Digital payment platforms.
- **Hamkorbank**: Mortgage programs for young families.
- **Ipoteka Bank**: State-backed mortgage program.
- **Presidential Decree on Affordable Housing**: Subsidized housing for youth under 35.
`;

// ─── Gemini fallback: Chat ────────────────────────────────────────────────────

async function handleChatFallback(req: Request, res: Response): Promise<void> {
  try {
    const { messages, userProfile, missionContext, allMissions, imageData, clarifyMode } = req.body;
    const clarifyAllowed = clarifyMode !== false; // default: true
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages body. Must be an array." });
      return;
    }

    if (!hasApiKey()) {
      res.json({
        text: "## Pacific — Setup Required\n\nNo Gemini API key configured. Add **GEMINI_API_KEY** to `Pacific-frontend/.env`.",
        caseDetected: false, quizMode: false, quizQuestions: null, profileInsights: null,
      });
      return;
    }

    const ai = getAi();
    const missionsList = Array.isArray(allMissions) ? allMissions : [];
    const isFirstMessages = messages.length <= 3;

    const missionsBlock = missionsList.length > 0
      ? missionsList.map((m: any, i: number) => {
          const progress = Math.round(m.progress || 0);
          const tasks = (m.milestones || []).flatMap((ms: any) => ms.tasks || []);
          const pending = tasks.filter((t: any) => !t.completed).slice(0, 3).map((t: any) => t.title).join("; ");
          return `${i + 1}. [${(m.domain || "goal").toUpperCase()}] "${m.title}" — ${progress}% done${pending ? `. Next tasks: ${pending}` : ""}. Context: ${m.situationSummary || "no details"}`;
        }).join("\n")
      : "No missions created yet.";

    const focusBlock = missionContext
      ? `\nCURRENT FOCUS MISSION: "${missionContext.title}" (${missionContext.domain}) — ${missionContext.situationSummary || ""}`
      : "";

    const profileBlock = userProfile
      ? `Name: ${userProfile.name || "User"} | Goals: ${userProfile.goals || "not set"} | Interests: ${userProfile.interests || "not set"} | Achievements: ${userProfile.achievements || "none"} | Style: ${userProfile.responseStyle || "Professional"} | Dataset: ${userProfile.userDataset ? JSON.stringify(userProfile.userDataset).slice(0, 300) : "none yet"}`
      : "Unknown user.";

    const imageNote = imageData ? "\n[USER HAS UPLOADED AN IMAGE — analyze it as part of your response and provide specific advice based on what you see]" : "";

    const conversationLength = messages.length;
    const responseStyle = userProfile?.responseStyle || "Direct";

    // Build topic-annotated conversation history so AI sees message topology
    const topicAnnotatedHistory = messages.slice(0, -1).map((m: any) => {
      const prefix = m.topic ? `[topic:${m.topic}] ` : "";
      return `${prefix}${m.role === "user" ? "User" : "Pacific"}: ${(m.content || "").slice(0, 400)}`;
    }).join("\n");

    const systemInstruction = `You are Pacific — a personal AI life navigator for users in Uzbekistan and Central Asia.

━━━ WHAT YOU ALREADY KNOW ABOUT THIS USER (use this — never re-ask) ━━━
${profileBlock}

ACTIVE MISSIONS (${missionsList.length}):
${missionsBlock}
${focusBlock}
${imageNote}

━━━ CONVERSATION HISTORY (topic-annotated) ━━━
${topicAnnotatedHistory || "(first message)"}

━━━ REAL PROGRAMS & RESOURCES ━━━
${REAL_PROGRAMS_KNOWLEDGE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTIVE ADVISORY MODE: ${responseStyle.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE STRUCTURE — follow the template for "${responseStyle}" exactly:

DIRECT → No preamble. No empathy sentences. No "I understand".
  1. One-line situation read (max 12 words): "You need X, here are your best options:"
  2. Bulleted resources with real name + URL + one sentence why
  3. **First step:** [bold, specific, immediate]

ACTION-ORIENTED → Everything is an imperative verb. No future tense. No feelings.
  1. "Do this now: [step]"  2. "Then: [step]"  3. "Resources: [list with links]"
  No hedging. No "you might consider". Tell them exactly what to do.

MENTOR → First-person, personal, opinionated.
  "In your situation, I'd [do X] because [reason]. Here's what I'd actually use: [resources].
  The thing most people miss here is [insight]. Start with [specific first step]."

COACH → Affirm direction, surface resources, end with ONE guiding question.
  Warm, not interrogating. Guide thinking — don't demand info upfront.

PROFESSIONAL → Structure: Situation summary → Recommended path with rationale → Resources with requirements → Timeline estimate.

CRISIS SUPPORT → Acknowledge in 1-2 warm sentences MAXIMUM. Then immediately practical.
  Structure: [Brief acknowledgment] → [Most urgent resource + link] → [Step 1 right now] → [What's next]
  NEVER dwell. Move to action within 3 sentences.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE ALGORITHM — ACT FIRST, REFINE SECOND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — EXTRACT (internal, silent)
From the FULL conversation history above + user profile, extract every known attribute:
  domain, intent, field, urgency, experience level, location, budget, timeline, things already said.
Low-confidence signals count. "Failed university" → no degree, entry-level. "IT startup" → technical founder.
Assume Tashkent as location if not specified. Assume tourist if travel purpose not stated.
NEVER re-ask for anything extractable from conversation history or profile.

STEP 2 — CITE YOUR MEMORY EXPLICITLY
Reference what you know about this user. Examples:
  "Since you mentioned earlier you're building IT products, here are startup resources that match that..."
  "You failed CS after one year — that means no degree yet, but these options don't need one..."
  "Based on your goal of [X] from your profile..."
Make the user feel remembered. This is core product experience.

STEP 3 — DELIVER THE ANSWER IMMEDIATELY (no waiting, no gates)
Real names, real URLs, real requirements. 3-5 resource/action cards based on what you extracted.
Your text is 1-3 sentences of framing. Cards carry the substance.
If info is missing: make the most reasonable inference and act on it.
Mention the inference briefly ("Assuming tourist visa for Japan…") — then proceed.

STEP 4 — QUIZ QUESTIONS (only via quizQuestions[], NEVER in text)
Questions in your text content are BANNED. Period.
If extra context would genuinely flip your top 3 picks:
  → add up to 3 questions to quizQuestions[] (shown as interactive buttons below your answer)
  → user answers ALL of them at once, then one combined message arrives — then you refine
Only ask about things that truly change your recommendations: budget range, trip duration, destination type.
Never ask about: purpose (infer it), city (default Tashkent), general intent (read the message).

━━━ CLARIFY SETTING: ${clarifyAllowed ? "ON" : "OFF"} ━━━
${clarifyAllowed
  ? "You MAY add quiz questions in quizQuestions[] (max 3, all shown at once as interactive buttons). Your text STILL delivers a full answer — quiz just sharpens the follow-up round. NEVER put a '?' in your text content."
  : "CLARIFY IS OFF. No quizQuestions. Give your best answer. State inferences briefly inline ('Assuming tourist visa…')."}


━━━ CARDS SYSTEM ━━━
For every resource, program, action step, or warning you mention, add a structured entry to the cards array.
This is how the frontend renders rich visual content — do NOT omit cards.

Card types and when to use them:
- "resource" → a real website/program to visit. ALWAYS include a real URL.
- "action" → a concrete action step to take right now (no URL needed)
- "warning" → a deadline, caveat, or important constraint
- "insight" → a key stat, tip, or surprising fact
- "step" → numbered step in a process (include step number)

Fields:
- url: always include for resource type (exact real URL)
- imageUrl: include when you have a direct image URL (hotel photo, place photo, poster). Omit if unsure.
- icon: emoji that represents the entity (✈️ for flights, 🏨 for hotels, 🎓 for education, etc.)
- subtitle: one-line context (category, price range, location)
- body: one sentence — the most important fact or action

Format your TEXT as PROSE only (1-3 sentences). Let cards handle the structured list.
Do not repeat resource names as markdown bullets if they're already in cards.

Example cards output for "find a job after failed CS":
[
  { "type": "resource", "title": "HH.uz", "subtitle": "Uzbekistan's main job portal", "body": "Filter «без опыта» for entry-level IT roles", "url": "https://hh.uz", "icon": "💼", "urgency": "high" },
  { "type": "resource", "title": "IT Park Free Courses", "subtitle": "6-month Python/JS bootcamp — free", "body": "Get a certificate employers recognize without a degree", "url": "https://it-park.uz", "icon": "🎓", "urgency": "medium" },
  { "type": "action", "title": "Open HH.uz right now", "body": "Search 'Junior developer Tashkent', filter без опыта. Takes 5 minutes.", "icon": "⚡", "urgency": "high" }
]

━━━ ABSOLUTE PROHIBITIONS ━━━
- NEVER open with empathy paragraphs ("I hear your frustration", "It sounds incredibly tough") — unless mode is Crisis Support, and even then max 1 sentence
- NEVER put a question mark (?) in your text/markdown content — all questions go ONLY in quizQuestions[]
- NEVER write "To help me find...", "Could you clarify...", "Could you tell me...", "What is your..." in text
- NEVER make your text conditional on missing info ("once you tell me X, I'll..." → FORBIDDEN)
- NEVER run a quiz (quizMode=true) unless message is truly unactionable: "hi", "help", zero intent, single word
- NEVER re-ask what the conversation history already contains
- The quiz card appears BELOW your full answer — your text already delivers the best available result

━━━ CONCRETE EXAMPLES OF BAD VS GOOD ━━━
BAD: "I hear your frustration. It sounds incredibly tough. Could you tell me more about what happened with your studies?"
GOOD (Direct): "You're job-hunting without a degree after 1 year of CS — no problem, here's what works:
  - **HH.uz** → filter by «без опыта» — dozens of QA, support, junior dev roles. hh.uz
  - **IT Park free courses** → 6-month Python/JS bootcamp → gets you a certificate employers recognize. it-park.uz
  - **EPAM Systems Uzbekistan** → actively hires trainees, no degree required. careers.epam.com
  **First step:** Open hh.uz, search «Junior developer Tashkent», filter «без опыта». Do it in the next 30 minutes."

BAD (travel query): "I understand you're looking to travel to Japan. Could you tell me the purpose of your trip?"
BAD follow-up: "What is your estimated budget?" (this is the SECOND sequential question — completely forbidden)
GOOD (Direct, "find ways to travel to Japan"):
  text: "Here's how to get to Japan from Tashkent — cheapest via Istanbul or Moscow hubs."
  cards: [
    { type: "resource", title: "Aviasales", subtitle: "Flights from Tashkent", body: "Compare TAS→NRT/HND via IST/SVO. Cheapest: $600–$900 return.", url: "https://aviasales.ru", icon: "✈️", urgency: "high" },
    { type: "resource", title: "Japanese Embassy Tashkent", subtitle: "Tourist C-visa", body: "No invite letter needed for tourism. Processing 5-7 days. Fee: $35.", url: "https://www.uz.emb-japan.go.jp", icon: "🗂️", urgency: "high" },
    { type: "resource", title: "Booking.com", subtitle: "Hotels in Japan", body: "Tokyo guesthouses from $40/night. Free cancellation available.", url: "https://booking.com", icon: "🏨" },
    { type: "insight", title: "Best time: Spring or Autumn", body: "Mar–May cherry blossoms; Oct–Nov foliage. Avoid Golden Week (May 3–5) — prices triple.", icon: "🌸" },
    { type: "action", title: "First step: Check Aviasales now", body: "Search TAS–NRT. Cheapest dates show in the fare calendar. Takes 3 minutes.", icon: "⚡", urgency: "high" }
  ]
  quizQuestions: [
    { id: "q1", question: "When are you planning to go?", options: ["Within 1 month", "3–6 months", "This year", "Just exploring"] },
    { id: "q2", question: "Budget per person (USD)?", options: ["Under $1,500", "$1,500–$3,000", "$3,000+", "Flexible"] },
    { id: "q3", question: "Travel priority?", options: ["Culture & temples", "Food & nightlife", "Nature & hiking", "Anime & pop culture"] }
  ]

BAD: "I need to clarify, what type of startup are you building?"
GOOD (Action-Oriented): "You've got 2 IT startups. Do this now:
  1. Register at IT Park → 3-year tax exemption, legal support, free space. it-park.uz
  2. Apply to Innozone → grant funding for tech products. innozone.uz
  3. Pacific app: apply as resident company → test users + network.
  4. Med CRM: pitch to USAID health program + private clinic networks in Tashkent.
  Next: Email it-park.uz/rezident today. Takes 2 hours."

━━━ TOPIC CLASSIFICATION ━━━
For each response, assign the topic of THIS exchange. Use one of:
  job_search | education | startup | housing | finance | health | legal | family | visa | scholarship | language | career_change | general

━━━ PROFILE INSIGHTS ━━━
Always populate profileInsights with everything you detected:
  detectedGoals, characteristics (e.g. "no degree", "entry level", "IT startup founder"), preferredPaths

━━━ MISSION DETECTION (CRITICAL — READ CAREFULLY) ━━━
Set caseDetected=true AND fill suggestedCase EVERY TIME the user expresses a clear personal goal or intent.
Triggers — ANY of these patterns:
  • "I want to [achieve something]" / "I'd like to / I'm thinking about / I'm planning to"
  • "Help me [get / find / apply / move / start / study / work / buy / launch]"
  • "How do I / How can I [achieve a life goal]"
  • Any mention of: studying abroad, finding a job, getting a scholarship, starting a business,
    buying property, getting a visa, moving to another country, finding funding/grants/investors
  • EVEN if they mentioned it before and already have a related mission — still set caseDetected=true
    (the frontend will deduplicate)

suggestedCase object:
  title:   "[Action verb] [Goal]" — max 6 words. Examples: "Study in Japan on Scholarship",
           "Get a Job in Dubai", "Launch IT Startup in Tashkent", "Apply for DAAD Scholarship"
  domain:  One of: scholarship | job_search | startup | housing | visa | education | finance | general
  summary: One sentence on what Pacific will help track for this goal

DO NOT set caseDetected=true for:
  • Pure information questions with no personal goal ("What is the Chevening scholarship?")
  • Follow-up messages within an EXISTING mission conversation
  • Casual greetings or meta-questions about Pacific

Respond ONLY as valid JSON:
{ "text": "<markdown>", "topic": "job_search", "topicLabel": "Job Search", "caseDetected": false, "suggestedCase": null, "quizMode": false, "quizQuestions": null, "profileInsights": null }`;

    // Build content with optional image in last user message
    const contents = messages.map((m: any, idx: number) => {
      const isLast = idx === messages.length - 1;
      const isUser = m.role === "user";

      if (isLast && isUser && imageData) {
        const base64 = imageData.split(",")[1] || imageData;
        const mimeType = imageData.startsWith("data:") ? imageData.split(";")[0].split(":")[1] : "image/jpeg";
        return {
          role: "user",
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: m.content || "Please analyze this image and give me specific advice relevant to my situation." },
          ],
        };
      }

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["text", "caseDetected", "quizMode", "topic"],
          properties: {
            text: { type: Type.STRING },
            topic: { type: Type.STRING },
            topicLabel: { type: Type.STRING },
            caseDetected: { type: Type.BOOLEAN },
            quizMode: { type: Type.BOOLEAN },
            suggestedCase: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                title: { type: Type.STRING },
                domain: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
            },
            quizQuestions: {
              type: Type.ARRAY,
              nullable: true,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            profileInsights: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                detectedGoals: { type: Type.ARRAY, items: { type: Type.STRING } },
                characteristics: { type: Type.ARRAY, items: { type: Type.STRING } },
                preferredPaths: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
            cards: {
              type: Type.ARRAY,
              nullable: true,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING, nullable: true },
                  body: { type: Type.STRING, nullable: true },
                  url: { type: Type.STRING, nullable: true },
                  imageUrl: { type: Type.STRING, nullable: true },
                  urgency: { type: Type.STRING, nullable: true },
                  icon: { type: Type.STRING, nullable: true },
                  step: { type: Type.INTEGER, nullable: true },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const cards = (parsed.cards || null) as any[] | null;
    res.json({
      text: parsed.text || "No response generated.",
      topic: parsed.topic || "general",
      topicLabel: parsed.topicLabel || null,
      caseDetected: !!parsed.caseDetected,
      suggestedCase: parsed.suggestedCase || null,
      quizMode: !!parsed.quizMode,
      quizQuestions: parsed.quizQuestions || null,
      profileInsights: parsed.profileInsights || null,
      cards,
    });
  } catch (error: any) {
    console.error("[chat-fallback] Gemini error:", error?.message || error);
    res.json({
      text: "## Connection Notice\n\nPacific is temporarily unreachable. Your missions are saved locally.\n\nTry again in a moment.",
      caseDetected: false, quizMode: false, quizQuestions: null, profileInsights: null,
    });
  }
}

// ─── Gemini fallback: Mission Generate ───────────────────────────────────────

async function handleMissionGenerateFallback(req: Request, res: Response): Promise<void> {
  try {
    const { title, description } = req.body;
    if (!title) {
      res.status(400).json({ error: "Mission title is required." });
      return;
    }

    if (!hasApiKey()) {
      res.json({
        title,
        description: description || `Structured guide to complete: ${title}.`,
        duration: "4 weeks",
        domain: "education",
        milestones: [
          { id: "m1", title: "Document Preparation", tasks: [
            { id: "t1_1", title: "Obtain required certificates (MFY, etc.)", completed: false },
            { id: "t1_2", title: "Notarize and translate primary documents", completed: false },
          ]},
          { id: "m2", title: "Application Submission", tasks: [
            { id: "t2_1", title: "Complete all required forms", completed: false },
            { id: "t2_2", title: "Submit application before deadline", completed: false },
          ]},
        ],
        recommendations: [
          "Book translation services early — they have 1-2 week lead times.",
          "Keep digital and physical copies of every stamped document.",
        ],
      });
      return;
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Design a highly tailored milestone roadmap for a user in Uzbekistan/Central Asia:
GOAL: "${title}"
DESCRIPTION: "${description || "No additional details provided."}"
Output only valid JSON.`,
      config: {
        systemInstruction: `You are the Pacific mission planner. Use this real programs knowledge:
${REAL_PROGRAMS_KNOWLEDGE}
Output highly realistic, bureaucracy-aware milestones with specific real steps, real program names, and real websites. Be specific about local requirements and processes.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "description", "duration", "domain", "milestones", "recommendations"],
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            duration: { type: Type.STRING },
            domain: { type: Type.STRING },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "title", "tasks"],
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["id", "title", "completed"],
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        completed: { type: Type.BOOLEAN },
                      },
                    },
                  },
                },
              },
            },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    if (!["education", "work", "legal", "finance", "health", "family"].includes(parsedData.domain)) {
      parsedData.domain = "education";
    }
    res.json(parsedData);
  } catch (error: any) {
    res.json({
      title: req.body.title || "Custom Mission",
      description: req.body.description || "AI-guided mission roadmap.",
      duration: "4 weeks",
      domain: "education",
      milestones: [{
        id: "m1",
        title: "Initial Planning",
        tasks: [
          { id: "t1_1", title: "Research requirements and eligibility", completed: false },
          { id: "t1_2", title: "Create a document checklist", completed: false },
        ],
      }],
      recommendations: ["Start by listing all required documents.", "Set weekly check-ins to track progress."],
    });
  }
}

// ─── Gemini fallback: Intelligence Search (with grounding) ────────────────────

async function handleIntelligenceSearchFallback(req: Request, res: Response): Promise<void> {
  try {
    const { query, category } = req.body;
    if (!hasApiKey()) {
      res.json({ items: [{ title: `Research: ${query}`, summary: "Add GEMINI_API_KEY to get real intelligence.", source: "Pacific Local Cache", aiAnalysis: "Enable AI to get specific insights." }] });
      return;
    }

    const ai = getAi();

    // Use Google Search grounding for real current data
    let groundedText = "";
    try {
      const groundedResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Search for current information about "${query}" in the category "${category || "General"}" specifically for Uzbekistan and Central Asia. Include real programs, deadlines, requirements, websites, and any relevant current news or opportunities.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      groundedText = groundedResponse.text || "";
    } catch {
      groundedText = "";
    }

    // Structure the results
    const structureResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on this research about "${query}" (category: ${category || "General"}) for users in Uzbekistan/Central Asia:

${groundedText || "Use your knowledge about real programs in Uzbekistan."}

${REAL_PROGRAMS_KNOWLEDGE}

Extract and return 2-4 high-quality, specific intelligence items about "${query}". Each item should have real program names, real websites, concrete requirements, and an AI analysis tailored for a Central Asian user.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["items"],
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "summary", "source", "aiAnalysis"],
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  source: { type: Type.STRING },
                  aiAnalysis: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    res.json(JSON.parse(structureResponse.text || '{"items":[]}'));
  } catch (error: any) {
    res.json({ items: [{ title: `Insights on ${req.body.query}`, summary: "Intelligence temporarily unavailable.", source: "Cache", aiAnalysis: "-" }] });
  }
}

// ─── Gemini: Proactive Intelligence (smart, auto-pushed to user) ─────────────

async function handleProactiveIntelligence(req: Request, res: Response): Promise<void> {
  try {
    const { userGoals, userInterests, userCharacteristics, preferredPaths, userDataset } = req.body;

    if (!hasApiKey()) {
      res.json({ items: [], notifications: [] });
      return;
    }

    const ai = getAi();
    const goalsList = (userGoals || []).join(", ") || "general self-improvement";
    const interestsList = (userInterests || []).join(", ") || "education, career";
    const charsList = (userCharacteristics || []).join(", ") || "motivated";
    const pathsList = (preferredPaths || []).join(", ") || "";
    const datasetSummary = userDataset ? `Detected goals: ${(userDataset.detectedGoals || []).join(", ")}; Paths: ${(userDataset.preferredPaths || []).join(", ")}` : "";

    let groundedText = "";
    try {
      const groundedResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find CURRENT 2025 opportunities specifically for a person in Uzbekistan with these goals: ${goalsList}. Interests: ${interestsList}. Search for: scholarships with open applications, IT Park programs, job vacancies on HH.uz, grants, government programs. Find real deadlines and real requirements.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      groundedText = groundedResponse.text || "";
    } catch {
      groundedText = "";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate proactive intelligence for a Pacific user with:
Goals: ${goalsList}
Interests: ${interestsList}
Characteristics: ${charsList}
Suggested paths: ${pathsList}
${datasetSummary ? `User dataset: ${datasetSummary}` : ""}

Current web research findings:
${groundedText || "Use the knowledge base below."}

${REAL_PROGRAMS_KNOWLEDGE}

Generate 4-6 highly relevant, actionable intelligence items. Each must:
- Be specific to their goals (match what they actually want)
- Include a REAL program name and website
- Have urgent/actionable information (deadline, requirement, next step)
- Be genuinely useful, not generic

Also generate 2-3 smart notification messages that would be pushed to the user proactively.
These notifications should feel like a personal advisor nudging the user about real opportunities.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["items", "notifications"],
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "summary", "source", "aiAnalysis", "category", "urgency"],
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  source: { type: Type.STRING },
                  aiAnalysis: { type: Type.STRING },
                  category: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                },
              },
            },
            notifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "description", "type"],
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    res.json(JSON.parse(response.text || '{"items":[],"notifications":[]}'));
  } catch (error: any) {
    console.error("[proactive] error:", error?.message || error);
    res.json({ items: [], notifications: [] });
  }
}

// ─── Gemini fallback: Suggestions ────────────────────────────────────────────

async function handleSuggestionsFallback(req: Request, res: Response): Promise<void> {
  const fallback = [
    { id: "s1", title: "Review Active Goals", desc: "Check your Missions for upcoming deadlines.", category: "Work" },
    { id: "s2", title: "Update Profile Credentials", desc: "Add recent achievements to improve AI recommendations.", category: "Education" },
  ];

  if (!hasApiKey()) {
    res.json({ suggestions: fallback });
    return;
  }

  try {
    const ai = getAi();
    const { interests, currentMissions, userDataset } = req.body;
    const datasetInfo = userDataset ? `User characteristics: ${(userDataset.characteristics || []).join(", ")}. Preferred paths: ${(userDataset.preferredPaths || []).join(", ")}. Detected goals: ${(userDataset.detectedGoals || []).join(", ")}.` : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 3-4 specific micro-action suggestions for a Pacific user in Uzbekistan/Central Asia.
User interests: ${(interests || []).join(", ")}
Active missions: ${(currentMissions || []).join(", ")}
${datasetInfo}

${REAL_PROGRAMS_KNOWLEDGE}

Each suggestion must reference REAL programs, websites, or concrete actionable steps. Make them feel personal and urgent.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["suggestions"],
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "title", "desc", "category"],
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  desc: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch {
    res.json({ suggestions: fallback });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function handleWithGeminiFallback(req: Request, res: Response): Promise<void> {
  const url = req.originalUrl.split("?")[0];

  if (req.method === "POST" && url === "/api/chat") return handleChatFallback(req, res);
  if (req.method === "POST" && url === "/api/mission/generate") return handleMissionGenerateFallback(req, res);
  if (req.method === "POST" && url === "/api/intelligence/search") return handleIntelligenceSearchFallback(req, res);
  if (req.method === "POST" && url === "/api/intelligence/proactive") return handleProactiveIntelligence(req, res);
  if (req.method === "POST" && url === "/api/suggestions") return handleSuggestionsFallback(req, res);

  res.status(503).json({
    error: "Backend unavailable",
    text: "The Spring Boot backend is not running. Start it from IntelliJ, or configure `BACKEND_URL` in `.env`.",
  });
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "Pacific", apiKeyConfigured: hasApiKey(), backendUrl: BACKEND_URL, timestamp: new Date().toISOString() });
});

// ─── All /api/* routes ────────────────────────────────────────────────────────

app.use("/api", async (req: Request, res: Response) => {
  const proxied = await proxyToBackend(req, res);
  if (proxied) return;
  await handleWithGeminiFallback(req, res);
});

// ─── Dev / Prod ───────────────────────────────────────────────────────────────

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => { res.sendFile(path.join(distPath, "index.html")); });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pacific server running at http://0.0.0.0:${PORT}`);
    console.log(`Spring Boot backend: ${BACKEND_URL}`);
    console.log(`Gemini API key: ${hasApiKey() ? "configured" : "not set"}`);
  });
};

startServer().catch((err) => { console.error("Failed to start Pacific server:", err); });
