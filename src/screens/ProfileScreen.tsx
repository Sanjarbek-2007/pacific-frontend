import React, { useState } from "react";
import { Shield, ChevronRight, Verified, Medal, GraduationCap, Building2, Briefcase, FileText, Edit2, Check, LayoutDashboard, LogOut } from "lucide-react";
import { UserProfile, Achievement } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import { Language } from "../i18n/translations";

interface ProfileScreenProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  fetchAISuggestions: () => void;
  showToast: (msg: string, type: "success"|"info"|"warning") => void;
  handleSignOut: () => void;
  setActiveTab: (tab: any) => void;
  onProfileSave?: (patch: { fullName?: string; city?: string; goals?: string[] }) => void;
}

export function ProfileScreen({ profile, setProfile, fetchAISuggestions, showToast, handleSignOut, setActiveTab, onProfileSave }: ProfileScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const [newAchType, setNewAchType] = useState<Achievement['type']>('skill');
  const [newAchTitle, setNewAchTitle] = useState('');
  const [newAchValue, setNewAchValue] = useState('');
  const [newAchIssuedBy, setNewAchIssuedBy] = useState('');
  
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [editGoal, setEditGoal] = useState(profile.currentGoal);

  const handleAddAchievement = () => {
    if (!newAchTitle || !newAchValue || !newAchIssuedBy) {
         showToast("Please fill all required fields.", "warning");
         return;
    }
    const newAchievement: Achievement = {
         id: `ach_${Date.now()}`,
         type: newAchType,
         title: newAchTitle,
         value: newAchValue,
         issuedBy: newAchIssuedBy,
         verified: false
    };
    setProfile(prev => ({
         ...prev,
         achievements: [...(prev.achievements || []), newAchievement]
    }));
    setNewAchTitle('');
    setNewAchValue('');
    setNewAchIssuedBy('');
    showToast("Achievement added to profile.", "success");
  };

  const handleSaveProfile = () => {
    setProfile(prev => ({
      ...prev,
      name: editName,
      location: editLocation,
      currentGoal: editGoal,
      goals: editGoal ? [editGoal, ...prev.goals.filter(g => g !== prev.currentGoal)] : prev.goals,
    }));
    setIsEditingProfile(false);
    onProfileSave?.({ fullName: editName, city: editLocation, goals: editGoal ? [editGoal] : undefined });
    showToast("Identity updated successfully.", "success");
  };

  const getAchievementIcon = (type: string) => {
      switch(type) {
         case 'language_cert': return <FileText className="w-4 h-4" />;
         case 'degree': return <GraduationCap className="w-4 h-4" />;
         case 'work_exp': return <Briefcase className="w-4 h-4" />;
         case 'document': return <Building2 className="w-4 h-4" />;
         default: return <Medal className="w-4 h-4" />;
      }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full space-y-6 lg:space-y-0 lg:space-x-8 animate-fade-in relative z-10">
      
      {/* Left Column: Core Identity */}
      <div className="flex flex-col lg:w-1/3 space-y-6">
        <div className="space-y-1">
          <h3 className="text-h2">Identity Blueprint</h3>
          <p className="text-caption">Pacific relies on these to navigate for you</p>
        </div>

        <div className="card-default p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-brand-bg border border-brand-border text-brand-text-primary flex items-center justify-center mx-auto text-3xl shadow-sm relative">
            {profile.name.charAt(0)}
            <button
               onClick={() => setIsEditingProfile(!isEditingProfile)}
               className="absolute bottom-0 right-0 bg-brand-subtle text-brand-text-primary border border-brand-border p-1.5 rounded-full hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-brand-accent flex items-center justify-center h-8 w-8"
               aria-label="Edit Profile"
            >
               {isEditingProfile ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </button>
          </div>
          
          {isEditingProfile ? (
            <div className="space-y-3 text-left">
              <div>
                <label className="text-xs uppercase font-mono tracking-widest text-brand-text-muted mb-1 block">Full Name</label>
                <input type="text" value={editName} onChange={(e)=>setEditName(e.target.value)} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="text-xs uppercase font-mono tracking-widest text-brand-text-muted mb-1 block">Location</label>
                <input type="text" value={editLocation} onChange={(e)=>setEditLocation(e.target.value)} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="text-xs uppercase font-mono tracking-widest text-brand-text-muted mb-1 block">Primary Goal</label>
                <input type="text" value={editGoal} onChange={(e)=>setEditGoal(e.target.value)} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent" />
              </div>
              <button onClick={handleSaveProfile} className="w-full mt-2 py-2 bg-brand-text-primary text-brand-bg rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                Save Identity
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <h4 className="text-body-strong md:text-lg">{profile.name}</h4>
              <p className="text-body text-brand-text-secondary">Resident of {profile.location}</p>
              <div className="pt-2 text-sm text-brand-text-secondary italic">"{profile.currentGoal}"</div>
            </div>
          )}

          <div className="flex justify-center space-x-6 pt-4 border-t border-brand-border/40">
            <div className="text-center">
              <p className="text-xl font-medium font-mono text-brand-text-primary">{profile.stats.activeMissions}</p>
              <p className="text-[10px] uppercase text-brand-text-muted tracking-widest">Active</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-medium font-mono text-brand-text-primary">{profile.stats.completedMissions}</p>
              <p className="text-[10px] uppercase text-brand-text-muted tracking-widest">Secured</p>
            </div>
          </div>
        </div>
        
        {/* Settings */}
        <div className="card-default p-5 space-y-4">
             <div className="flex items-center space-x-2 text-brand-text-primary pb-3 border-b border-brand-border/40">
                 <LayoutDashboard className="w-4 h-4 text-brand-text-muted" />
                 <span className="text-body-strong">System Preferences</span>
             </div>
             <div className="space-y-3">
                 <button onClick={() => setActiveTab('billing')} className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity">
                     <span className="text-sm text-brand-text-secondary">Plan &amp; Billing</span>
                     <div className="flex items-center space-x-2">
                         <span className="text-[10px] uppercase font-mono tracking-widest text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-sm capitalize">{profile.plan || 'Free'}</span>
                         <ChevronRight className="w-4 h-4 text-brand-text-muted" />
                     </div>
                 </button>
                 <button onClick={() => setActiveTab('invite')} className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity">
                     <span className="text-sm text-brand-text-secondary">Invite Friends</span>
                     <ChevronRight className="w-4 h-4 text-brand-text-muted" />
                 </button>
                 <div className="flex items-center justify-between">
                     <span className="text-sm text-brand-text-secondary">Language</span>
                     <select
                         value={language}
                         onChange={e => setLanguage(e.target.value as Language)}
                         className="text-sm bg-brand-bg border border-brand-border rounded-lg px-2 py-1 text-brand-text-primary focus:outline-none focus:border-brand-accent"
                     >
                         <option value="uz">O'zbek</option>
                         <option value="ru">Русский</option>
                         <option value="en">English</option>
                     </select>
                 </div>
                 <div className="flex items-center justify-between">
                     <span className="text-sm text-brand-text-secondary">Voice Assistant</span>
                     <button onClick={() => {
                         setProfile(prev => ({...prev, settings: {...prev.settings, voiceEnabled: !prev.settings.voiceEnabled}}));
                         showToast(`Voice routing ${!profile.settings.voiceEnabled ? 'enabled' : 'disabled'}.`, "info");
                     }} className={`w-10 h-6 rounded-full transition-colors relative flex items-center focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none ${profile.settings.voiceEnabled ? 'bg-brand-success' : 'bg-brand-border'}`}>
                         <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${profile.settings.voiceEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                     </button>
                 </div>
                 <div className="pt-1 border-t border-brand-border/40">
                     <button
                         onClick={handleSignOut}
                         className="w-full flex items-center space-x-2 text-sm text-red-500 hover:text-red-600 transition-colors py-1"
                     >
                         <LogOut className="w-4 h-4" />
                         <span>Sign Out</span>
                     </button>
                 </div>
             </div>
        </div>
      </div>

      {/* Right Column: Achievements & Credentials */}
      <div className="flex-1 lg:h-[calc(100vh-140px)] min-h-[500px]">
        <div className="card-default overflow-hidden h-full flex flex-col p-0">
          <div className="p-5 border-b border-brand-border/40">
              <h4 className="text-body-strong">Verified Credentials</h4>
              <p className="text-caption mt-1">Credentials that allow Pacific to find the best opportunities for you.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-brand-border/40">
            {profile.achievements && profile.achievements.map((ach) => (
              <div key={ach.id} className="p-4 lg:p-5 flex items-center justify-between group cursor-default transition-colors interactive-card">
                 <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-text-secondary">
                       {getAchievementIcon(ach.type)}
                    </div>
                    <div>
                       <h5 className="text-body-strong line-clamp-1">{ach.title}</h5>
                       <p className="text-caption mt-0.5">{ach.issuedBy} • <span className="font-mono text-brand-text-secondary">{ach.value}</span></p>
                    </div>
                 </div>
                 {ach.verified ? (
                    <div className="text-brand-success bg-brand-success/10 p-2 rounded-full flex-shrink-0" title="Verified Credential">
                        <Verified className="w-4 h-4" />
                    </div>
                 ) : (
                    <div className="bg-brand-subtle text-brand-text-muted p-2 rounded-full flex-shrink-0" title="Self-Reported">
                        <Shield className="w-4 h-4" />
                    </div>
                 )}
              </div>
            ))}
          </div>

          <div className="p-5 bg-brand-subtle border-t border-brand-border/40">
            <button
              onClick={() => setShowAddCredential(v => !v)}
              className="w-full flex items-center justify-between text-body-strong hover:opacity-70 transition-opacity"
            >
              <span>Add New Credential</span>
              <span className="text-brand-text-muted text-lg leading-none">{showAddCredential ? '−' : '+'}</span>
            </button>
            {showAddCredential && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <input type="text" placeholder="Title (e.g. IELTS)" value={newAchTitle} onChange={e=>setNewAchTitle(e.target.value)} className="text-sm p-2.5 border border-brand-border bg-brand-bg text-brand-text-primary rounded-lg focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent placeholder:text-brand-text-muted" />
                <input type="text" placeholder="Result (e.g. 7.5)" value={newAchValue} onChange={e=>setNewAchValue(e.target.value)} className="text-sm p-2.5 border border-brand-border bg-brand-bg text-brand-text-primary rounded-lg focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent placeholder:text-brand-text-muted" />
                <input type="text" placeholder="Issuer (e.g. British Council)" value={newAchIssuedBy} onChange={e=>setNewAchIssuedBy(e.target.value)} className="text-sm p-2.5 border border-brand-border bg-brand-bg text-brand-text-primary rounded-lg col-span-1 md:col-span-2 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent placeholder:text-brand-text-muted" />
                <select value={newAchType} onChange={(e:any)=>setNewAchType(e.target.value)} className="text-sm p-2.5 border border-brand-border bg-brand-bg text-brand-text-primary rounded-lg col-span-1 md:col-span-2 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent">
                   <option value="language_cert">Language Certificate</option>
                   <option value="degree">Academic Degree</option>
                   <option value="work_exp">Work Experience</option>
                   <option value="document">Legal Document</option>
                   <option value="skill">Skill</option>
                </select>
                <button onClick={handleAddAchievement} className="col-span-1 md:col-span-2 py-2.5 bg-brand-text-primary text-brand-bg rounded-lg text-sm font-medium hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-brand-accent">
                    Add Credential
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
