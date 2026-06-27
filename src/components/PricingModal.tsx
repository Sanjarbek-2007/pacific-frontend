import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface PricingModalProps {
  currentPlan: string;
  onUpgrade: (plan: 'pro' | 'family') => void;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ currentPlan, onUpgrade, onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-brand-bg w-full max-w-2xl rounded-2xl shadow-premium-lg border border-brand-border/40 p-6 sm:p-8 animate-fade-in relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-brand-text-muted hover:text-brand-text-primary bg-brand-subtle rounded-full" aria-label="Close">
          ✕
        </button>

        <div className="text-center mb-8">
          <h2 className="text-h2 mb-2">Upgrade to Pacific Pro</h2>
          <p className="text-body text-brand-text-secondary">Select the plan that fits your life ambitions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-default p-6 flex flex-col items-center text-center space-y-4">
            <h3 className="text-body-strong">{t('plan_free')}</h3>
            <div className="text-2xl font-mono">$0<span className="text-sm text-brand-text-muted">/mo</span></div>
            <ul className="text-caption text-brand-text-secondary space-y-2 flex-1 pt-2">
              <li>3 missions/month</li>
              <li>Basic guidance</li>
              <li>Community features</li>
            </ul>
            <button disabled className="w-full py-2 rounded-xl bg-brand-subtle text-brand-text-muted font-medium">
              {currentPlan === 'free' || !currentPlan ? 'Current Plan' : 'Select'}
            </button>
          </div>

          <div className="card-default p-6 flex flex-col items-center text-center space-y-4 ring-2 ring-brand-accent">
            <h3 className="text-body-strong">{t('plan_pro')}</h3>
            <div className="text-2xl font-mono">$4<span className="text-sm text-brand-text-muted">/mo</span></div>
            <ul className="text-caption text-brand-text-secondary space-y-2 flex-1 pt-2">
              <li>Unlimited missions</li>
              <li>Priority AI routing</li>
              <li>Voice mode access</li>
            </ul>
            <button
              onClick={currentPlan === 'pro' ? undefined : () => onUpgrade('pro')}
              className={`w-full py-2 rounded-xl font-medium transition-colors ${currentPlan === 'pro' ? 'bg-brand-subtle text-brand-text-muted cursor-default' : 'bg-brand-accent text-white hover:bg-brand-accent-dark'}`}
            >
              {currentPlan === 'pro' ? 'Current Plan' : t('plan_upgrade')}
            </button>
          </div>

          <div className="card-default p-6 flex flex-col items-center text-center space-y-4">
            <h3 className="text-body-strong">{t('plan_family')}</h3>
            <div className="text-2xl font-mono">$8<span className="text-sm text-brand-text-muted">/mo</span></div>
            <ul className="text-caption text-brand-text-secondary space-y-2 flex-1 pt-2">
              <li>Up to 5 members</li>
              <li>Shared achievements</li>
              <li>Family dashboard</li>
            </ul>
            <button
              onClick={currentPlan === 'family' ? undefined : () => onUpgrade('family')}
              className={`w-full py-2 rounded-xl font-medium transition-colors ${currentPlan === 'family' ? 'bg-brand-subtle text-brand-text-muted cursor-default' : 'bg-brand-text-primary text-brand-bg hover:opacity-90'}`}
            >
              {currentPlan === 'family' ? 'Current Plan' : t('plan_upgrade')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
