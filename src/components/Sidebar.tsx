import React from "react";
import { Home, MessageSquare, Compass, Search, User, Bell, Moon, Sun } from "lucide-react";
import { UserProfile } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: "home" | "assistant" | "missions" | "intelligence" | "profile" | "billing" | "invite") => void;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  unreadAlerts: number;
  setShowNotificationDrawer: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, profile, setProfile, unreadAlerts, setShowNotificationDrawer }) => {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "assistant", label: "Assistant", icon: MessageSquare },
    { id: "missions", label: "Missions", icon: Compass },
    { id: "intelligence", label: "Intelligence", icon: Search },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <div className="w-[240px] flex flex-col h-full bg-brand-card border-r border-brand-border py-6 flex-shrink-0 transition-colors duration-300 z-10 hidden lg:flex">
      <button 
        className="px-6 mb-8 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none rounded-r-lg" 
        onClick={() => setActiveTab("home")}
        aria-label="Go to Home screen"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-white text-lg transform hover:rotate-12 transition-all shadow-premium">
            🧭
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight leading-none text-brand-text-primary">Pacific</h1>
            <p className="text-[10px] uppercase tracking-widest font-mono text-brand-text-secondary mt-1">AI Life Navigator</p>
          </div>
        </div>
      </button>

      <nav className="flex-1 px-3 space-y-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={`Navigate to ${tab.label}`}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none ${isActive ? "bg-brand-accent-light text-brand-accent font-semibold" : "text-brand-text-secondary hover:bg-brand-subtle hover:text-brand-text-primary"}`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-accent rounded-r-full" />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 mt-auto pt-4 border-t border-brand-border">
        <label className="flex items-center justify-between mb-4 cursor-pointer gap-2" aria-label="Toggle dark mode">
          <div className="flex items-center space-x-2 text-brand-text-secondary text-sm">
            {profile.settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm">{profile.settings.darkMode ? "Light Mode" : "Dark Mode"}</span>
          </div>
          <button
            onClick={() => setProfile({ ...profile, settings: { ...profile.settings, darkMode: !profile.settings.darkMode } })}
            aria-checked={profile.settings.darkMode}
            role="switch"
            aria-label="Toggle theme"
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 ${profile.settings.darkMode ? "bg-brand-accent" : "bg-brand-border"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-300 ${profile.settings.darkMode ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </label>
        
        <div className="flex items-center justify-between">
            <button 
              className="flex items-center space-x-3 cursor-pointer group text-left focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none p-1 -ml-1 rounded-lg"
              onClick={() => setActiveTab("profile")}
              aria-label="View user profile"
            >
            <div className="w-8 h-8 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center text-sm font-bold text-brand-text-primary group-hover:bg-brand-accent group-hover:text-white transition-colors">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text-primary truncate">{profile.name || "Explorer"}</p>
                <p className="text-[10px] text-brand-text-secondary group-hover:text-brand-accent transition-colors">View Profile</p>
            </div>
            </button>

            <button
            onClick={() => setShowNotificationDrawer(true)}
            aria-label="Open notifications"
            className="p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-subtle transition-colors relative focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
            <Bell className="w-4 h-4" />
            {unreadAlerts > 0 && (
                <span className="absolute top-0 right-0 bg-brand-danger text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts}
                </span>
            )}
            </button>
        </div>
      </div>
    </div>
  );
};
