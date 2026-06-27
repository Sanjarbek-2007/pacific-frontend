import { Mission, UserProfile, SmartNotification, IntelligenceItem } from "./types";

export const blankGuestProfile: UserProfile = {
  name: "Guest",
  location: "",
  interests: [],
  goals: [],
  responseStyle: "Professional",
  streakCount: 0,
  learningProgress: 0,
  stats: { activeMissions: 0, completedMissions: 0, hoursTracked: 0, aiConsultations: 0 },
  achievements: [],
  settings: {
    darkMode: false,
    notificationsEnabled: true,
    voiceEnabled: false,
    voiceName: 'Zephyr',
    handsFreeMode: false,
    style: 'Professional',
  },
};

export const initialUserProfile: UserProfile = {
  ...blankGuestProfile,
};

export const initialMissions: Mission[] = [];

export const initialNotifications: SmartNotification[] = [];

export const initialIntelligence: IntelligenceItem[] = [];

export const recentActivity: { id: string; action: string; detail: string; time: string; type: string }[] = [];
