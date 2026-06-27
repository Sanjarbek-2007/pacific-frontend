import React, { useState } from "react";
import { Plus, Compass, Clock, CheckCircle, Circle, Cpu, MessageSquare, ChevronRight, Hash, ArrowLeft, Trash2 } from "lucide-react";
import { Mission } from "../types";
import { getDomainConfig } from "../utils/domainConfig";

interface MissionsScreenProps {
  missions: Mission[];
  activeMissionData: Mission | null;
  setSelectedMissionId: (id: string | null) => void;
  setShowNewMissionModal: (s: boolean) => void;
  toggleTaskCompletion: (missionId: string, milestoneId: string, taskId: string) => void;
  deleteMission: (missionId: string) => void;
  setActiveTab: (tab: "home" | "assistant" | "missions" | "intelligence" | "profile") => void;
  handleSendMessage: (text?: string) => void;
  openMissionChat: (missionId: string) => void;
}

export function MissionsScreen({
  missions,
  activeMissionData,
  setSelectedMissionId,
  setShowNewMissionModal,
  toggleTaskCompletion,
  deleteMission,
  setActiveTab,
  handleSendMessage,
  openMissionChat
}: MissionsScreenProps) {
  
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this mission? This cannot be undone.")) {
      deleteMission(id);
      setSelectedMissionId(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full space-y-4 lg:space-y-0 lg:space-x-6 animate-fade-in relative">
      
      {/* Left Column: Mission List (Hidden on mobile if a mission is selected) */}
      <div className={`lg:w-[380px] lg:flex-shrink-0 flex-col h-full ${activeMissionData ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center justify-between mb-4 mt-1 lg:mt-0">
          <div>
            <h3 className="text-h2">Pacific Missions</h3>
            <p className="text-caption">Transform goals into action items</p>
          </div>
          <button
            onClick={() => setShowNewMissionModal(true)}
            className="p-2 lg:px-3 lg:py-2 bg-brand-accent hover:opacity-90 text-white rounded-xl flex items-center space-x-1.5 shadow-premium focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-1 active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline text-xs font-semibold">New Mission</span>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pb-6 pr-2 lg:h-[calc(100vh-140px)] min-h-[500px]">
          {missions.length === 0 ? (
            <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center text-brand-text-secondary mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-body-strong">No active mission objectives</h4>
                <p className="text-caption">Formulate your goals to receive daily AI guidance matrices.</p>
              </div>
              <button
                onClick={() => setShowNewMissionModal(true)}
                className="px-4 py-2 bg-brand-accent text-white hover:opacity-90 rounded-xl text-xs font-semibold"
              >
                Launch Custom Blueprint
              </button>
            </div>
          ) : (
            missions.map((m) => {
              const domCfg = getDomainConfig(m.domain);
              const isSelected = activeMissionData?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMissionId(m.id)}
                  aria-label={`Select mission: ${m.title}`}
                  className={`w-full text-left card-default p-4 lg:p-5 flex flex-col transition-all space-y-3 cursor-pointer interactive-card focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none ${isSelected ? 'ring-2 ring-brand-accent ring-inset border-brand-accent' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                         <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: domCfg.color }} />
                         <span className="text-xs text-brand-text-secondary">{domCfg.label}</span>
                      </div>
                      <h4 className="text-body-strong transition-colors line-clamp-1">
                        {m.title}
                      </h4>
                      <p className="text-body text-brand-text-secondary font-light line-clamp-1">
                        {m.situationSummary || m.description}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-brand-text-muted transform transition-transform shrink-0 self-center ${isSelected ? 'translate-x-1 text-brand-accent' : ''}`} />
                  </div>
  
                  <div className="w-full bg-brand-border/40 h-1 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ width: `${m.progress}%`, backgroundColor: domCfg.color }}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Mission Details */}
      <div className={`flex-1 flex-col h-full bg-brand-card border border-brand-border rounded-xl shadow-premium overflow-hidden ${!activeMissionData ? 'hidden lg:flex items-center justify-center bg-brand-bg/50 border-dashed' : 'flex animate-slide-up lg:animate-fade-in'}`}>
        
        {!activeMissionData ? (
          <div className="text-center space-y-3 opacity-50 select-none">
            <Compass className="w-12 h-12 text-brand-text-muted mx-auto" />
            <p className="text-body-strong text-brand-text-secondary">Select a mission to view details</p>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
            {/* Header Sticky */}
            <div className="sticky top-0 bg-brand-card/95 backdrop-blur-sm p-5 border-b border-brand-border z-10 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedMissionId(null)}
                  className="lg:hidden p-2 -ml-2 text-brand-text-secondary hover:text-brand-text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-brand-accent transition-colors"
                  aria-label="Back to missions list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] uppercase font-mono px-2 py-1 rounded-md border font-bold" style={{backgroundColor: getDomainConfig(activeMissionData.domain).light, color: getDomainConfig(activeMissionData.domain).color, borderColor: getDomainConfig(activeMissionData.domain).color}}>
                  {activeMissionData.domain || activeMissionData.category}
                </span>
                
                <div className="flex items-center space-x-2 ml-auto">
                    <button
                        onClick={(e) => handleDelete(activeMissionData.id, e)}
                        className="p-1.5 hover:bg-red-50 text-brand-text-muted hover:text-red-500 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Delete mission"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>

              <div>
                <h4 className="text-h1">{activeMissionData.title}</h4>
                <p className="text-body mt-2">{activeMissionData.description}</p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {activeMissionData.situationSummary && (
                  <div className="p-4 bg-brand-bg rounded-xl text-sm border border-brand-border">
                    <p className="text-brand-text-muted font-mono uppercase tracking-widest mb-1.5 text-[10px]">Context summary</p>
                    <p className="text-brand-text-primary">{activeMissionData.situationSummary}</p>
                  </div>
              )}

              <div className="bg-brand-subtle/30 border border-brand-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-label">Mission Completion Matrix</p>
                  <h5 className="font-mono font-bold text-3xl text-brand-accent mt-0.5">{activeMissionData.progress}%</h5>
                  <span className="text-caption">{activeMissionData.duration || "4 weeks"} estimated timeline</span>
                </div>

                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#E5E7EB" strokeWidth="4" fill="transparent" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke={getDomainConfig(activeMissionData.domain).color}
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 - (175.9 * activeMissionData.progress) / 100}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold font-mono text-brand-text-primary">{activeMissionData.progress}%</span>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-label">Milestones</span>
                
                <div className="space-y-4">
                  {activeMissionData.milestones.map((milestone) => {
                    const milestoneCompletedCount = milestone.tasks.filter(t => t.completed).length;
                    const milestoneTotal = milestone.tasks.length;
                    const percentRatio = milestoneTotal > 0 ? Math.round((milestoneCompletedCount / milestoneTotal) * 100) : 0;

                    return (
                      <div key={milestone.id} className="border border-brand-border rounded-xl p-4 space-y-3 bg-brand-card">
                        <div className="flex items-center justify-between">
                          <h6 className="text-body-strong leading-none">{milestone.title}</h6>
                          <span className="text-[10px] font-mono font-bold text-brand-text-muted">
                            {milestoneCompletedCount}/{milestoneTotal}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {milestone.tasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => toggleTaskCompletion(activeMissionData.id, milestone.id, task.id)}
                              aria-label={`Toggle task: ${task.title}`}
                              className="w-full flex items-start space-x-3 text-left p-2 hover:bg-brand-bg rounded-lg group transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
                            >
                              <span className="mt-0.5 flex-shrink-0">
                                {task.completed ? (
                                  <CheckCircle className="w-4 h-4 text-brand-success bg-brand-success/10 rounded-full" />
                                ) : (
                                  <Circle className="w-4 h-4 text-brand-border group-hover:text-brand-accent transition-colors" />
                                )}
                              </span>
                              <span className={`text-sm transition-all ${task.completed ? "line-through text-brand-text-muted" : "text-brand-text-primary group-hover:text-brand-accent"}`}>
                                {task.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeMissionData.recommendations && activeMissionData.recommendations.length > 0 && (
                <div className="p-4 bg-brand-bg border border-brand-border rounded-xl space-y-3 mt-6">
                  <div className="flex items-center space-x-2 pb-2 border-b border-brand-border/50">
                    <Cpu className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-semibold text-brand-text-primary uppercase font-display tracking-tight">AI Suggestions</span>
                  </div>
                  <ul className="space-y-2 text-sm text-brand-text-secondary font-light">
                    {activeMissionData.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-brand-accent select-none mt-1 text-[10px]">■</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            
            <div className="p-4 border-t border-brand-border bg-brand-bg rounded-b-xl flex justify-between items-center">
                <button
                onClick={() => openMissionChat(activeMissionData.id)}
                className="w-full flex justify-center items-center py-3 bg-brand-accent hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>Discuss Mission with Pacific</span>
                </button>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
