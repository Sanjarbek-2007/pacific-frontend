import React, { useEffect } from "react";
import {
  Flame,
  MessageSquare,
  Mic,
  Plus,
  Loader2,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Compass
} from "lucide-react";
import { UserProfile, Mission } from "../types";
import { recentActivity } from "../data";
import { getDomainConfig } from "../utils/domainConfig";

interface HomeScreenProps {
  profile: UserProfile;
  missions: Mission[];
  setActiveTab: (tab: "home" | "assistant" | "missions" | "intelligence" | "profile" | "billing" | "invite") => void;
  startVoiceSession: () => void;
  handleCreateEmptyMission: () => void;
  isLoadingSuggestions: boolean;
  aiSuggestions: any[];
  fetchAISuggestions: () => void;
  handleSendMessage: (text?: string) => void;
  openMissionChat: (missionId: string) => void;
}

export function HomeScreen({
  profile,
  missions,
  setActiveTab,
  startVoiceSession,
  handleCreateEmptyMission,
  isLoadingSuggestions,
  aiSuggestions,
  fetchAISuggestions,
  handleSendMessage,
  openMissionChat
}: HomeScreenProps) {

  return (
      <div className="space-y-6 lg:space-y-8 animate-fade-in relative max-w-full">
        
        {/* Profile Greeting Section */}
        <div className="space-y-1">
          <p className="text-label">
            {profile.name} • {profile.streakCount} Day Streak
          </p>
          <h2 className="text-display">
            Good Morning, {profile.name || "Explorer"}
          </h2>
          <p className="text-body font-light">
            Pacific is ready to navigate your next move.
          </p>
        </div>

        <div id="dynamic-summary-dashboard-card" className="card-default p-4 lg:p-5 space-y-5 interactive-card">
          <div className="flex items-center justify-between border-b border-brand-border/40 pb-3">
            <span className="text-label tracking-wider">Your Progress</span>
            <div className="flex items-center space-x-1.5 text-brand-warning">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-caption font-semibold">{profile.streakCount} Day Streak</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-caption">Overall Progress</p>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-h1 font-mono text-brand-text-primary">{profile.learningProgress}%</span>
              </div>
              <div className="w-full bg-brand-subtle h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-brand-success h-full transition-all duration-500" style={{ width: `${profile.learningProgress}%` }}></div>
              </div>
            </div>

            <div className="space-y-1 border-l border-brand-border pl-4">
              <p className="text-caption">Active Missions</p>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-h1 font-mono text-brand-text-primary">{missions.length}</span>
                <span className="text-caption text-brand-text-secondary">Objectives</span>
              </div>
            </div>
          </div>
        </div>

        {/* Your Missions Widget */}
        {missions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
                <span className="text-label tracking-wider block">Your Missions</span>
                <button
                   onClick={() => { setActiveTab("missions"); }}
                   className="text-[11px] text-brand-accent hover:underline flex items-center space-x-1 focus-visible:ring-2 focus-visible:ring-brand-accent rounded p-0.5"
                 >
                   <span>View All</span>
                   <ChevronRight className="w-3 h-3" />
                 </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {missions.slice(0, 4).map(m => {
                const style = getDomainConfig(m.domain);
                return (
                  <button
                    key={m.id}
                    aria-label={`Open mission: ${m.title}`}
                    onClick={() => openMissionChat(m.id)}
                    className="card-default w-full text-left overflow-hidden interactive-card focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 group p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-body-strong group-hover:text-brand-accent transition-colors truncate">{m.title}</h4>
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{color: style.color}} />
                    </div>
                    <div className="w-full bg-brand-subtle h-1 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${m.progress}%`, background: style.color }}></div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.color }} />
                        <span className="text-xs text-brand-text-secondary">{style.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions Widget */}
        <div className="space-y-3">
          <span className="text-label tracking-wider block mb-3">Quick Actions</span>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setActiveTab("assistant"); }}
              className="p-3 lg:p-4 card-default hover:border-brand-accent interactive-card text-center space-y-2 group focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.97]"
            >
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-brand-info-light text-brand-info flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <p className="text-body-strong">Converse</p>
          </button>

          <button
            onClick={startVoiceSession}
            className="p-3 lg:p-4 bg-brand-card rounded-xl border border-brand-border hover:border-brand-accent interactive-card text-center space-y-2 group focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.97]"
          >
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-brand-success-light text-brand-success flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <p className="text-body-strong">Voice Control</p>
          </button>

          <button
            onClick={handleCreateEmptyMission}
            className="p-3 lg:p-4 bg-brand-card rounded-xl border border-brand-border hover:border-brand-accent interactive-card text-center space-y-2 group focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.97]"
          >
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-brand-warning-light text-brand-warning flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <p className="text-body-strong">New Goal</p>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-label tracking-wider block">Pacific Suggestions</span>
          <button
            onClick={fetchAISuggestions}
            className="text-xs text-brand-text-secondary hover:text-brand-accent flex items-center space-x-1 focus-visible:ring-2 focus-visible:ring-brand-accent rounded p-0.5 transition-colors"
            disabled={isLoadingSuggestions}
          >
            {isLoadingSuggestions ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <RotateCcw className="w-3 h-3" />
                <span>Regenerate</span>
              </>
            )}
          </button>
        </div>

        <div className={`grid grid-cols-1 ${aiSuggestions.length > 0 ? 'lg:grid-cols-2 gap-3 lg:gap-4' : 'gap-3 lg:gap-4'} `}>
          {isLoadingSuggestions ? (
            <>
              <div className="card-default h-24 animate-pulse"></div>
              <div className="card-default h-24 animate-pulse hidden lg:block"></div>
            </>
          ) : aiSuggestions.length > 0 ? (
            aiSuggestions.map((s: any, idx: number) => (
              <button
                key={s.id || idx}
                onClick={() => {
                  setActiveTab("assistant");
                  handleSendMessage(`I want to explore suggestion: ${s.title}. ${s.desc}`);
                }}
                className="w-full text-left card-default p-4 lg:p-5 flex items-start justify-between cursor-pointer interactive-card group focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <h4 className="text-body-strong group-hover:text-brand-accent transition-colors">{s.title}</h4>
                  <p className="text-body line-clamp-2">{s.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-brand-border group-hover:text-brand-accent self-center transform group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))
          ) : (
            <>
              <button
                onClick={() => handleSendMessage("What should I focus on this week to make progress toward my goals?")}
                className="w-full text-left card-default p-4 lg:p-5 flex items-start justify-between cursor-pointer interactive-card group focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                <div className="space-y-1.5">
                  <h4 className="text-body-strong group-hover:text-brand-accent transition-all line-clamp-1">Weekly Focus Plan</h4>
                  <p className="text-body line-clamp-1">Get a personalized action plan for this week</p>
                </div>
                <ChevronRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-accent transition-all flex-shrink-0 self-center" />
              </button>

              <button
                onClick={() => handleSendMessage("Help me identify the biggest opportunity I should pursue right now")}
                className="w-full text-left card-default p-4 lg:p-5 flex items-start justify-between cursor-pointer interactive-card group focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                <div className="space-y-1.5">
                  <h4 className="text-body-strong group-hover:text-brand-accent transition-all line-clamp-1">Find My Next Opportunity</h4>
                  <p className="text-body line-clamp-1">Discover what fits your profile and goals</p>
                </div>
                <ChevronRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-accent transition-all flex-shrink-0 self-center" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 pb-8">
        <span className="text-label tracking-wider block mb-3">Recent Activity</span>
        <div className="card-default p-4 lg:p-5 space-y-4">
          {recentActivity.length > 0 ? recentActivity.map((act) => (
            <div key={act.id} className="flex items-start space-x-3.5">
              <div className="mt-2 text-brand-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-text-secondary inline-block"></span>
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="text-body-strong">{act.action}</p>
                </div>
                <p className="text-body line-clamp-1">{act.detail}</p>
              </div>
            </div>
          )) : (
            <p className="text-body text-center py-4">No recent activity detected.</p>
          )}
        </div>
      </div>

    </div>
  );
}
