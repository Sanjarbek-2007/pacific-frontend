import React from "react";
import { Sparkles, Loader2, X } from "lucide-react";

interface NewMissionModalProps {
  newMissionTitle: string;
  setNewMissionTitle: (t: string) => void;
  newMissionDesc: string;
  setNewMissionDesc: (t: string) => void;
  isGeneratingMission: boolean;
  setShowNewMissionModal: (s: boolean) => void;
  handleFormulateBlueprint: () => void;
}

export function NewMissionModal({
  newMissionTitle,
  setNewMissionTitle,
  newMissionDesc,
  setNewMissionDesc,
  isGeneratingMission,
  setShowNewMissionModal,
  handleFormulateBlueprint
}: NewMissionModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-brand-text-primary/10 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-sm overflow-hidden shadow-premium-lg animate-slide-down">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/40 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-brand-accent" />
              <h3 id="modal-title" className="text-h2">New Mission</h3>
            </div>
            <button
              id="close-blueprint-modal-btn"
              onClick={() => setShowNewMissionModal(false)}
              className="p-1.5 hover:bg-brand-subtle rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-brand-text-secondary" />
            </button>
          </div>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="mission-title" className="text-[11px] font-mono uppercase text-brand-text-muted font-semibold tracking-wider block">Mission Core Title</label>
              <input
                id="mission-title"
                type="text"
                value={newMissionTitle}
                onChange={(e) => setNewMissionTitle(e.target.value)}
                placeholder="e.g. Learn React Native"
                className="w-full text-body py-2 px-3 bg-brand-bg border border-brand-border rounded-xl focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-brand-text-primary transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mission-desc" className="text-[11px] font-mono uppercase text-brand-text-muted font-semibold tracking-wider block">What's this about? (optional)</label>
              <textarea
                id="mission-desc"
                rows={3}
                value={newMissionDesc}
                onChange={(e) => setNewMissionDesc(e.target.value)}
                placeholder="Details for the AI to process..."
                className="w-full text-body py-2 px-3 bg-brand-bg border border-brand-border rounded-xl focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-brand-text-primary transition-colors resize-none"
              ></textarea>
            </div>

            <button
              onClick={handleFormulateBlueprint}
              disabled={isGeneratingMission || !newMissionTitle.trim()}
              className="w-full py-2.5 bg-brand-accent text-white hover:opacity-90 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-premium focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              {isGeneratingMission ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring Checklists...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Mission</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
