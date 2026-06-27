import React, { useRef } from "react";
import { Search, Loader2, Bookmark, Share2, Plus, Upload, FileText, Calendar, HardDrive } from "lucide-react";
import { IntelligenceItem } from "../types";
import { getDomainConfig } from "../utils/domainConfig";

interface IntelligenceScreenProps {
  intelligence: IntelligenceItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchCategory: string;
  setSearchCategory: (c: string) => void;
  isSearchingIntelligence: boolean;
  handleSearchIntelligence: (cat?: string) => void;
  toggleSaveIntelligence: (id: string) => void;
  createMissionFromIntelligence: (item: IntelligenceItem) => void;
  showToast: (msg: string, type: "success"|"info"|"warning") => void;
}

export function IntelligenceScreen({
  intelligence,
  searchQuery,
  setSearchQuery,
  searchCategory,
  setSearchCategory,
  isSearchingIntelligence,
  handleSearchIntelligence,
  toggleSaveIntelligence,
  createMissionFromIntelligence,
  showToast
}: IntelligenceScreenProps) {
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast(`Document "${file.name}" uploaded successfully for indexing.`, "success");
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in relative z-10">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-h2">Intellectual Grounding</h3>
          <p className="text-caption">Verify academic repositories and OSINT assets with AI Analysis</p>
        </div>
        
        <div className="flex items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full lg:w-auto px-4 py-2 bg-brand-accent hover:opacity-90 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.98] shadow-premium"
            >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
            </button>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-4 shadow-premium space-y-4">
        {/* Research categories switch board */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          {["Technology", "Programming", "Business", "Education", "Science", "Career"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSearchCategory(cat);
                if (searchQuery.trim()) {
                  handleSearchIntelligence(cat);
                }
              }}
              className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-brand-accent ${searchCategory === cat ? "bg-brand-accent text-white border-brand-accent" : "bg-brand-bg text-brand-text-primary border-brand-border hover:bg-brand-subtle"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Core Input Box bar */}
        <div className="bg-brand-bg border border-brand-border rounded-xl p-1.5 flex items-center space-x-2 focus-within:ring-2 focus-within:ring-brand-accent transition-all">
          <Search className="w-4 h-4 text-brand-text-secondary ml-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearchIntelligence(); }}
            placeholder={`Search intelligence for ${searchCategory}... (e.g. university requirements)`}
            className="flex-1 bg-transparent border-none text-body text-brand-text-primary focus:outline-none py-2 px-1"
          />
          <button
            onClick={() => handleSearchIntelligence()}
            disabled={!searchQuery.trim() || isSearchingIntelligence}
            className="px-4 py-2 bg-neutral-900 text-white hover:bg-black rounded-lg text-xs font-semibold transition-all disabled:opacity-50 active:scale-[0.97]"
          >
            {isSearchingIntelligence ? "Grounding..." : "Search Context"}
          </button>
        </div>
      </div>

      {/* Intelligence results matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-label">Grounded Records</span>
        </div>
        
        {isSearchingIntelligence ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-brand-text-secondary card-default border border-brand-border border-dashed">
            <Loader2 className="w-8 h-8 animate-spin text-brand-accent mb-4" />
            <p className="text-body-strong">Synthesizing intelligence network...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:gap-4">
            {intelligence
              .filter(item => item.category === searchCategory || item.saved)
              .map((item) => {
                const domCfg = getDomainConfig(item.category.toLowerCase() as any);

                return (
                <div
                  key={item.id}
                  className="card-default p-4 lg:p-5 flex flex-col interactive-card group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                         <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: domCfg.color }} />
                         <span className="text-xs text-brand-text-secondary">{domCfg.label}</span>
                      </div>
                      <h4 className="text-body-strong text-brand-text-primary line-clamp-1 group-hover:text-brand-accent transition-colors cursor-pointer" onClick={() => createMissionFromIntelligence(item)}>
                        {item.title}
                      </h4>
                      <p className="text-body text-brand-text-secondary line-clamp-1 font-light">{item.summary}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => toggleSaveIntelligence(item.id)}
                        className={`p-2 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-brand-accent ${item.saved ? "text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20" : "text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-subtle"}`}
                        aria-label={item.saved ? "Unsave" : "Save"}
                      >
                        <Bookmark className={`w-4 h-4 ${item.saved ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )})}

            {intelligence.filter(item => item.category === searchCategory && !item.saved).length === 0 && (
              <div className="col-span-full card-default p-12 text-center space-y-3 opacity-80 border border-dashed border-brand-border">
                <div className="w-12 h-12 rounded-full bg-brand-subtle text-brand-text-muted flex items-center justify-center mx-auto mb-2">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-body-strong text-brand-text-primary">Discover More Intelligence</p>
                  <p className="text-caption text-brand-text-secondary">Type a topic above to query the secure framework.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
