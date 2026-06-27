import React, { useState, useEffect } from "react";
import { ChevronLeft, Share2, Copy } from "lucide-react";
import { UserProfile } from "../types";

interface InviteScreenProps {
  profile: UserProfile;
  setActiveTab: (tab: any) => void;
  showToast: (msg: string, type: "success" | "info" | "warning") => void;
}

export function InviteScreen({ profile, setActiveTab, showToast }: InviteScreenProps) {
  const [stats, setStats] = useState({ count: 0, rewardUnlocked: false });
  const [code, setCode] = useState(profile.referral_code || 'PCFC-' + Math.random().toString(36).substring(2, 6).toUpperCase());

  useEffect(() => {
    const token = localStorage.getItem('pacific_token');
    if (!token) return;
    fetch('/api/referrals/status', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.code) setCode(d.code); setStats({ count: d.count || 0, rewardUnlocked: d.rewardUnlocked || false }); })
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    showToast("Invite code copied to clipboard", "success");
  };

  const handleShare = async () => {
    const text = `Join Pacific 🧭 — the AI that actually remembers your situation. Use my code ${code} to sign up!`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Join Pacific', text }); } catch { handleCopy(); }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => setActiveTab('profile')} className="p-2 -ml-2 rounded-lg hover:bg-brand-subtle text-brand-text-secondary transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-h2">Invite Friends</h2>
      </div>

      <div className="text-center py-6 space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Invite friends, earn free months</h1>
        <p className="text-sm text-brand-text-secondary max-w-sm mx-auto">
          Know someone applying abroad? Pacific makes it easy. Give them your code.
        </p>
      </div>

      <div className="card-default p-8 text-center space-y-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-brand-text-muted">Your Invite Code</span>
          <p className="text-4xl font-bold tracking-widest text-brand-accent mt-2 font-mono">{code}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={handleCopy} className="w-full sm:w-auto px-6 py-3 bg-brand-subtle hover:bg-brand-border text-brand-text-primary rounded-xl font-medium transition-colors flex items-center justify-center space-x-2">
            <Copy className="w-4 h-4" /><span>Copy Code</span>
          </button>
          <button onClick={handleShare} className="w-full sm:w-auto px-6 py-3 bg-brand-text-primary text-brand-bg rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 shadow-premium">
            <Share2 className="w-4 h-4" /><span>Share Invite</span>
          </button>
        </div>
      </div>

      <div className="card-default p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-body-strong tracking-tight">Reward Progress</h3>
          <span className="text-sm font-medium">{stats.count} of 3 friends joined</span>
        </div>
        <div className="flex space-x-2 h-3">
          {[1, 2, 3].map(step => (
            <div key={step} className={`flex-1 rounded-full ${stats.count >= step ? 'bg-brand-accent' : 'bg-brand-subtle'}`} />
          ))}
        </div>
        <p className="text-sm text-brand-text-secondary pt-2">
          Invite <strong className="text-brand-text-primary">3 friends</strong> and get <strong className="text-brand-accent">1 month of Pro free</strong>, automatically applied.
        </p>
        {stats.rewardUnlocked && (
          <div className="p-3 bg-brand-success/10 border border-brand-success/20 rounded-xl text-brand-success text-sm font-medium text-center">
            🎉 Reward unlocked! 1 month of Pro added to your account.
          </div>
        )}
      </div>
    </div>
  );
}
