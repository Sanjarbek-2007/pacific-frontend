import { ReactNode } from "react";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface UserDataset {
  detectedGoals: string[];
  characteristics: string[];
  preferredPaths: string[];
  quizAnswers: Record<string, string>;
  lastAnalyzed: string;
}

export type AdvisoryStyle =
  | "Direct"
  | "Action-Oriented"
  | "Mentor"
  | "Coach"
  | "Professional"
  | "Crisis Support";

export const ADVISORY_STYLES: { value: AdvisoryStyle; label: string; desc: string; emoji: string }[] = [
  { value: "Direct",          label: "Direct",         desc: "Just the facts. No padding, no empathy preamble.", emoji: "⚡" },
  { value: "Action-Oriented", label: "Action Mode",    desc: "Verbs only. What to do right now.", emoji: "🎯" },
  { value: "Mentor",          label: "Mentor",         desc: "\"In your shoes, I'd…\" — personal & opinionated.", emoji: "🧠" },
  { value: "Coach",           label: "Coach",          desc: "Guides you to your own answer. Warm Socratic.", emoji: "🤝" },
  { value: "Professional",    label: "Professional",   desc: "Structured analysis with rationale & timeline.", emoji: "📊" },
  { value: "Crisis Support",  label: "Crisis Support", desc: "Warm acknowledgment + immediate action.", emoji: "🌊" },
];

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  domain: 'education' | 'work' | 'legal' | 'finance' | 'health' | 'family';
  situationSummary: string;
  deadline?: string;
  duration: string;
  progress: number; // 0 to 100
  estimatedTime?: string;
  streakCount: number;
  category: string;
  milestones: Milestone[];
  recommendations: string[];
}

export type AiMode = "normal" | "expert" | "max";

export interface ResponseCard {
  type: "resource" | "action" | "step" | "warning" | "insight" | "media";
  title: string;
  subtitle?: string;
  body?: string;
  url?: string;
  applyUrl?: string;   // separate "Apply" link (official apply / details page)
  imageUrl?: string;
  urgency?: "high" | "medium" | "low";
  icon?: string;
  step?: number;
  meta?: string;          // small chip, e.g. "Deadline: 2026-03-15"
  badge?: string;         // type/category tag, e.g. "scholarship"
  opportunityId?: string; // when set, the card can build a tailored mission plan
}

export type MessageRole = "user" | "assistant";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  missionId?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  topic?: string;         // e.g. "job_search", "education", "startup", "housing"
  topicLabel?: string;    // human-readable label for the topic chip
  missionId?: string;
  hasInteractiveCard?: boolean;
  cardData?: {
    type: "checklist" | "table" | "roadmap" | "progress" | "exercise";
    title?: string;
    items?: string[] | { key: string; value: string }[] | any[];
  };
  suggestedCase?: {
    title: string;
    domain: "education" | "work" | "legal" | "finance" | "health" | "family";
    summary: string;
  };
  quizQuestions?: QuizQuestion[];
  imageUrl?: string;
  cards?: ResponseCard[];
}

export interface IntelligenceItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  aiAnalysis: string;
  saved?: boolean;
}

export interface SmartNotification {
  id: string;
  title: string;
  description: string;
  type: "reminder" | "reflection" | "deadline" | "achievement";
  timestamp: string;
  read: boolean;
  missionId?: string;
}

export interface Achievement {
  id: string;
  type: 'language_cert' | 'degree' | 'work_exp' | 'skill' | 'document';
  title: string;
  value: string;
  issuedBy: string;
  validUntil?: string;
  verified: boolean;
}

export interface UserProfile {
  name: string;
  location: string;
  currentGoal?: string;
  interests: string[];
  goals: string[];
  responseStyle: string;
  streakCount: number;
  learningProgress: number; // 0 to 100
  userDataset?: UserDataset;
  plan?: "free" | "pro" | "family";
  plan_renews_at?: string;
  referral_code?: string;
  language?: "uz" | "ru" | "en";
  stats: {
    activeMissions: number;
    completedMissions: number;
    hoursTracked: number;
    aiConsultations: number;
  };
  achievements: Achievement[];
  settings: {
    darkMode: boolean;
    notificationsEnabled: boolean;
    voiceEnabled?: boolean;
    voiceName: "Zephyr" | "Kore" | "Puck" | "Fenrir" | "Charon";
    handsFreeMode: boolean;
    style: AdvisoryStyle;
  };
}
