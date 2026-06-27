import { UserProfile, Mission, SmartNotification, Achievement } from './types';
import { blankGuestProfile } from './data';

// ─── HTTP helper ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status);
  }
  return res.json();
}

// ─── Domain mapping ───────────────────────────────────────────────────────────

function mapDomain(d: string | null | undefined): Mission['domain'] {
  switch (d) {
    case 'university_application': case 'scholarship': return 'education';
    case 'job_search': return 'work';
    case 'visa': return 'legal';
    case 'purchase': return 'finance';
    case 'education': case 'work': case 'legal': case 'finance': case 'health': case 'family':
      return d as Mission['domain'];
    default: return 'education';
  }
}

function mapNotifType(t: string): SmartNotification['type'] {
  if (t === 'deadline') return 'deadline';
  if (t === 'achievement') return 'achievement';
  if (t === 'reflection') return 'reflection';
  return 'reminder';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProfile(token: string): Promise<UserProfile> {
  const p = await apiFetch('/api/profile/me', token);
  const custom: Record<string, any> = p.custom || {};
  const goals: string[] = p.goals || [];
  const location = [p.city, p.country].filter(Boolean).join(', ') || '';

  return {
    ...blankGuestProfile,
    name: p.fullName || 'Navigator',
    location,
    goals,
    currentGoal: goals[0] || '',
    interests: custom.interests || goals,
    achievements: (custom.achievements as Achievement[]) || [],
    responseStyle: custom.responseStyle || 'Professional',
    settings: { ...blankGuestProfile.settings, ...(custom.settings || {}) },
    stats: {
      activeMissions: 0,
      completedMissions: 0,
      hoursTracked: custom.hoursTracked || 0,
      aiConsultations: custom.aiConsultations || 0,
    },
  };
}

export async function syncProfileCustom(token: string, profile: UserProfile): Promise<void> {
  await apiFetch('/api/profile/me', token, {
    method: 'PATCH',
    body: JSON.stringify({
      custom: {
        achievements: profile.achievements,
        interests: profile.interests,
        responseStyle: profile.responseStyle,
        settings: profile.settings,
        hoursTracked: profile.stats.hoursTracked,
        aiConsultations: profile.stats.aiConsultations,
      },
    }),
  });
}

export async function updateProfileFields(token: string, patch: {
  fullName?: string;
  country?: string;
  city?: string;
  occupation?: string;
  goals?: string[];
}): Promise<void> {
  await apiFetch('/api/profile/me', token, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// ─── Cases / Missions ─────────────────────────────────────────────────────────

async function fetchActionsForCase(token: string, caseId: string): Promise<any[]> {
  try {
    return await apiFetch(`/api/cases/${caseId}/actions`, token);
  } catch {
    return [];
  }
}

function mapCaseToMission(c: any, actions: any[]): Mission {
  const tasks = actions.map(a => ({
    id: a.id as string,
    title: a.stepTitle as string,
    completed: a.status === 'DONE',
  }));
  const done = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return {
    id: c.id,
    title: c.title,
    description: c.description || '',
    domain: mapDomain(c.domain || c.category),
    situationSummary: c.goal || c.description || '',
    duration: c.openedAt
      ? `${Math.max(1, Math.ceil((Date.now() - new Date(c.openedAt).getTime()) / 86400000))} days`
      : 'Ongoing',
    progress,
    estimatedTime: c.lastActivityAt ? relativeTime(c.lastActivityAt) : undefined,
    streakCount: 0,
    category: c.category || 'Other',
    milestones: tasks.length > 0
      ? [{ id: `ms_${c.id}`, title: 'Action Steps', tasks }]
      : [],
    recommendations: Array.isArray(c.constraints) ? c.constraints : [],
  };
}

export async function fetchMissions(token: string): Promise<Mission[]> {
  const cases: any[] = await apiFetch('/api/cases', token);
  return Promise.all(
    cases.map(async c => mapCaseToMission(c, await fetchActionsForCase(token, c.id)))
  );
}

export async function createCase(token: string, title: string, description: string, domain: string): Promise<string> {
  const c = await apiFetch('/api/cases', token, {
    method: 'POST',
    body: JSON.stringify({ title, description, category: domain }),
  });
  return c.id as string;
}

export async function addCaseAction(token: string, caseId: string, stepTitle: string, description?: string): Promise<string> {
  const a = await apiFetch(`/api/cases/${caseId}/actions`, token, {
    method: 'POST',
    body: JSON.stringify({ stepTitle, description }),
  });
  return a.id as string;
}

export async function markActionDone(token: string, caseId: string, actionId: string): Promise<void> {
  await apiFetch(`/api/cases/${caseId}/actions/${actionId}/done`, token, { method: 'POST' });
}

export async function markActionSkipped(token: string, caseId: string, actionId: string): Promise<void> {
  await apiFetch(`/api/cases/${caseId}/actions/${actionId}/skip`, token, { method: 'POST' });
}

export async function closeCase(token: string, caseId: string): Promise<void> {
  await apiFetch(`/api/cases/${caseId}/close`, token, { method: 'POST' });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotifications(token: string): Promise<SmartNotification[]> {
  const list: any[] = await apiFetch('/api/notifications', token);
  return list.map(n => ({
    id: n.id,
    title: n.title,
    description: n.body || '',
    type: mapNotifType(n.type),
    timestamp: relativeTime(n.createdAt),
    read: n.status === 'READ',
    missionId: n.payload?.caseId,
  }));
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, token, { method: 'POST' });
}
