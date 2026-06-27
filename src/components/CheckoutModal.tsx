import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface CheckoutModalProps {
  plan: 'pro' | 'family';
  onSuccess: () => void;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ plan, onSuccess, onClose }) => {
  const [method, setMethod] = useState<'payme' | 'click'>('payme');
  const [isLoading, setIsLoading] = useState(false);

  const price = plan === 'pro' ? '$4.00' : '$8.00';

  const handlePay = () => {
    setIsLoading(true);
    // TODO: integrate Payme/Click merchant API before production
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-brand-bg w-full max-w-sm rounded-2xl shadow-premium-lg border border-brand-border/40 p-6 animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-brand-text-muted hover:text-brand-text-primary bg-brand-subtle rounded-full" aria-label="Close">
          ✕
        </button>

        <h2 className="text-h2 mb-1">Complete Upgrade</h2>
        <p className="text-sm text-brand-text-secondary mb-6 capitalize">{plan} Plan — {price}/month</p>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-brand-text-secondary">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod('payme')}
                className={`flex items-center justify-center p-3 rounded-xl border transition-all ${method === 'payme' ? 'border-[#33cccc] bg-[#33cccc]/10 text-[#33cccc] ring-1 ring-[#33cccc]' : 'border-brand-border bg-brand-card hover:border-[#33cccc]/50'}`}
              >
                <span className="font-bold tracking-tight">Payme</span>
              </button>
              <button
                onClick={() => setMethod('click')}
                className={`flex items-center justify-center p-3 rounded-xl border transition-all ${method === 'click' ? 'border-[#00a1e6] bg-[#00a1e6]/10 text-[#00a1e6] ring-1 ring-[#00a1e6]' : 'border-brand-border bg-brand-card hover:border-[#00a1e6]/50'}`}
              >
                <span className="font-bold tracking-tight">CLICK</span>
              </button>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-text-primary text-brand-bg rounded-xl font-medium disabled:opacity-50 flex items-center justify-center transition-opacity"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ${price}`}
          </button>
        </div>
      </div>
    </div>
  );
};
