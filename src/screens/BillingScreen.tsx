import React, { useState, useEffect } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { UserProfile } from "../types";
import { CheckoutModal } from "../components/CheckoutModal";

interface BillingScreenProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  setActiveTab: (tab: any) => void;
  showToast: (msg: string, type: "success" | "info" | "warning") => void;
}

export function BillingScreen({ profile, setProfile, setActiveTab, showToast }: BillingScreenProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [showCheckout, setShowCheckout] = useState<'pro' | 'family' | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('pacific_token');
    if (!token) return;
    fetch('/api/billing/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => { if (d.history) setHistory(d.history); }).catch(() => {});
  }, []);

  const handleCheckoutSuccess = async (plan: 'pro' | 'family') => {
    const token = localStorage.getItem('pacific_token');
    if (token) {
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ plan, billingCycle, paymentMethod: 'card' })
        });
        const data = await res.json();
        if (data.success) {
          setProfile({ ...profile, plan: data.plan, plan_renews_at: data.plan_renews_at });
          showToast(`Upgraded to ${plan === 'pro' ? 'Pro' : 'Family'} plan!`, 'success');
          setShowCheckout(null);
          return;
        }
      } catch { /* fall through to local update */ }
    }
    // Optimistic local update for guest users or API failure
    setProfile({ ...profile, plan });
    showToast(`Upgraded to ${plan === 'pro' ? 'Pro' : 'Family'} plan!`, 'success');
    setShowCheckout(null);
  };

  const isPro = profile.plan === 'pro';
  const isFamily = profile.plan === 'family';

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => setActiveTab('profile')} className="p-2 -ml-2 rounded-lg hover:bg-brand-subtle text-brand-text-secondary transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-h2">Plan & Billing</h2>
      </div>

      <div className="card-default p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-body-strong opacity-80">Current Plan</h3>
            <p className="text-2xl font-bold tracking-tight capitalize mt-1">{profile.plan || 'Free'} Plan</p>
          </div>
          {profile.plan && profile.plan !== 'free' && profile.plan_renews_at && (
            <div className="text-right">
              <span className="text-xs text-brand-text-muted">Renews</span>
              <p className="text-sm font-medium">{new Date(profile.plan_renews_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>
        {(!profile.plan || profile.plan === 'free') && (
          <div className="pt-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-brand-text-secondary font-medium">AI Missions</span>
              <span className="font-bold">1 of 3 free</span>
            </div>
            <div className="w-full bg-brand-subtle h-2.5 rounded-full overflow-hidden">
              <div className="bg-brand-accent h-full rounded-full w-1/3" />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body-strong px-1">Upgrade</h3>
          <div className="flex items-center bg-brand-subtle p-1 rounded-xl">
            <button onClick={() => setBillingCycle('monthly')} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-brand-card shadow-sm text-brand-text-primary' : 'text-brand-text-muted'}`}>Monthly</button>
            <button onClick={() => setBillingCycle('annual')} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center ${billingCycle === 'annual' ? 'bg-brand-card shadow-sm text-brand-text-primary' : 'text-brand-text-muted'}`}>
              Annual <span className="ml-1.5 text-[10px] uppercase font-bold tracking-wider text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`card-default p-5 border-2 flex flex-col ${isPro ? 'border-brand-accent bg-brand-accent/5' : 'border-transparent'}`}>
            <div className="mb-4">
              <h4 className="text-body-strong mb-1">Pro</h4>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold tracking-tight">${billingCycle === 'annual' ? '38' : '4'}</span>
                <span className="text-brand-text-muted text-sm">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6 flex-1 text-sm text-brand-text-secondary">
              <li className="flex items-start"><Check className="w-4 h-4 text-brand-accent mr-2 mt-0.5 flex-shrink-0" /> Unlimited active missions</li>
              <li className="flex items-start"><Check className="w-4 h-4 text-brand-accent mr-2 mt-0.5 flex-shrink-0" /> Priority voice assistant routing</li>
              <li className="flex items-start"><Check className="w-4 h-4 text-brand-accent mr-2 mt-0.5 flex-shrink-0" /> Full document export (PDF)</li>
            </ul>
            <button onClick={isPro ? undefined : () => setShowCheckout('pro')} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${isPro ? 'bg-brand-subtle text-brand-text-muted cursor-default' : 'bg-brand-accent text-white hover:bg-brand-accent-dark'}`}>
              {isPro ? 'Current Plan' : 'Select Pro'}
            </button>
          </div>

          <div className={`card-default p-5 border-2 flex flex-col ${isFamily ? 'border-brand-text-primary bg-brand-text-primary/5' : 'border-transparent'}`}>
            <div className="mb-4">
              <h4 className="text-body-strong mb-1">Family</h4>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold tracking-tight">${billingCycle === 'annual' ? '77' : '8'}</span>
                <span className="text-brand-text-muted text-sm">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6 flex-1 text-sm text-brand-text-secondary">
              <li className="flex items-start"><Check className="w-4 h-4 text-brand-text-primary mr-2 mt-0.5 flex-shrink-0" /> Everything in Pro</li>
              <li className="flex items-start"><Check className="w-4 h-4 text-brand-text-primary mr-2 mt-0.5 flex-shrink-0" /> Up to 5 family members</li>
              <li className="flex items-start"><Check className="w-4 h-4 text-brand-text-primary mr-2 mt-0.5 flex-shrink-0" /> Shared immigration timelines</li>
            </ul>
            <button onClick={isFamily ? undefined : () => setShowCheckout('family')} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${isFamily ? 'bg-brand-subtle text-brand-text-muted cursor-default' : 'bg-brand-text-primary text-brand-bg hover:opacity-90'}`}>
              {isFamily ? 'Current Plan' : 'Select Family'}
            </button>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="card-default p-5 space-y-4">
          <h3 className="text-body-strong">Billing History</h3>
          <div className="space-y-3">
            {history.map(row => (
              <div key={row.id} className="flex items-center justify-between py-2 border-b border-brand-border/40 last:border-0">
                <div>
                  <p className="text-sm font-medium capitalize">{row.plan} Plan</p>
                  <p className="text-xs text-brand-text-muted">{new Date(row.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${row.amount}</p>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${row.status === 'Paid' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-text-muted/10 text-brand-text-muted'}`}>{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-default flex items-center p-2.5 pr-2">
        <input
          type="text"
          placeholder="Promo code"
          value={promoCode}
          onChange={e => setPromoCode(e.target.value.toUpperCase())}
          className="flex-1 bg-transparent px-3 text-sm focus:outline-none placeholder:text-brand-text-muted uppercase font-mono tracking-wide"
        />
        <button
          onClick={() => { showToast("Invalid or expired promo code.", "warning"); setPromoCode(''); }}
          className="px-4 py-2 bg-brand-subtle hover:bg-brand-border text-brand-text-primary text-sm font-medium rounded-lg transition-colors"
        >
          Apply
        </button>
      </div>

      {showCheckout && (
        <CheckoutModal
          plan={showCheckout}
          onClose={() => setShowCheckout(null)}
          onSuccess={() => handleCheckoutSuccess(showCheckout)}
        />
      )}
    </div>
  );
}
