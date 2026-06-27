import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { Compass, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (userData?: { name?: string; location?: string }) => void;
  onContinueAsGuest: () => void;
}

type Step = 'language' | 'auth_choice' | 'email_login' | 'email_register' | 'feature_tour';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onContinueAsGuest }) => {
  const { setLanguage, language } = useLanguage();
  const [step, setStep] = useState<Step>('language');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('Uzbekistan');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredData, setRegisteredData] = useState<{ name?: string; location?: string } | null>(null);

  const clearError = () => setError('');

  const handleLanguageSubmit = (lang: Language) => {
    setLanguage(lang);
    setStep('auth_choice');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    clearError();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed. Check your credentials.');
      localStorage.setItem('pacific_token', data.token);
      onLoginSuccess({
        name: data.fullName || undefined,
        location: data.city || data.country || undefined,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || password.length < 8) return;
    setIsLoading(true);
    clearError();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          fullName: name.trim() || undefined,
          country: location,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed. Please try again.');
      localStorage.setItem('pacific_token', data.token);
      setRegisteredData({
        name: data.fullName || name.trim() || undefined,
        location: data.city || data.country || location,
      });
      setStep('feature_tour');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-brand-text-primary placeholder:text-brand-text-muted";
  const labelClass = "text-xs uppercase font-mono tracking-widest text-brand-text-muted mb-1 block";

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto space-y-10">

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center shadow-premium">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-display text-2xl tracking-tight">Pacific</h1>
        </div>

        <div className="min-h-[260px]">

          {step === 'language' && (
            <div className="space-y-6 animate-fade-in text-center">
              <h2 className="text-body text-brand-text-secondary">Choose your language / Tilni tanlang / Выберите язык</h2>
              <div className="space-y-3">
                <button onClick={() => handleLanguageSubmit('uz')} className={`w-full p-4 card-default hover:border-brand-accent transition-colors font-medium flex items-center justify-between ${language === 'uz' ? 'border-brand-accent bg-brand-accent/5' : ''}`}>
                  <span>O'zbek</span>
                  <span className="text-xs text-brand-text-muted">UZ</span>
                </button>
                <button onClick={() => handleLanguageSubmit('ru')} className={`w-full p-4 card-default hover:border-brand-accent transition-colors font-medium flex items-center justify-between ${language === 'ru' ? 'border-brand-accent bg-brand-accent/5' : ''}`}>
                  <span>Русский</span>
                  <span className="text-xs text-brand-text-muted">RU</span>
                </button>
                <button onClick={() => handleLanguageSubmit('en')} className={`w-full p-4 card-default hover:border-brand-accent transition-colors font-medium flex items-center justify-between ${language === 'en' ? 'border-brand-accent bg-brand-accent/5' : ''}`}>
                  <span>English</span>
                  <span className="text-xs text-brand-text-muted">EN</span>
                </button>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button disabled className="w-full p-3 card-default opacity-40 cursor-not-allowed relative overflow-hidden group">
                    <span className="font-medium text-sm">Қазақша</span>
                    <span className="absolute inset-0 flex items-center justify-center bg-brand-bg/80 text-[10px] uppercase tracking-widest font-bold translate-y-full group-hover:translate-y-0 transition-transform">Soon</span>
                  </button>
                  <button disabled className="w-full p-3 card-default opacity-40 cursor-not-allowed relative overflow-hidden group">
                    <span className="font-medium text-sm">Кыргызча</span>
                    <span className="absolute inset-0 flex items-center justify-center bg-brand-bg/80 text-[10px] uppercase tracking-widest font-bold translate-y-full group-hover:translate-y-0 transition-transform">Soon</span>
                  </button>
                </div>
              </div>
              <button onClick={onContinueAsGuest} className="text-xs text-brand-text-muted hover:text-brand-text-secondary underline underline-offset-2 transition-colors">
                Continue without account
              </button>
            </div>
          )}

          {step === 'auth_choice' && (
            <div className="space-y-6 animate-fade-in text-center">
              <div>
                <h2 className="text-lg font-semibold text-brand-text-primary">Welcome to Pacific</h2>
                <p className="text-sm text-brand-text-secondary mt-1">Sign in to your account or create a new one.</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { clearError(); setStep('email_login'); }}
                  className="w-full py-3.5 bg-brand-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { clearError(); setStep('email_register'); }}
                  className="w-full py-3.5 bg-brand-card border border-brand-border text-brand-text-primary rounded-xl font-medium hover:border-brand-accent/50 transition-colors"
                >
                  Create Account
                </button>
              </div>
              <div className="flex flex-col items-center space-y-2 pt-1">
                <button onClick={onContinueAsGuest} className="text-xs text-brand-text-muted hover:text-brand-text-secondary underline underline-offset-2 transition-colors">
                  Continue without account
                </button>
                <button onClick={() => setStep('language')} className="text-xs text-brand-text-muted hover:text-brand-text-secondary transition-colors">
                  ← Back to language
                </button>
              </div>
            </div>
          )}

          {step === 'email_login' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-body text-brand-text-secondary text-center">Sign In</h2>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              {error && <p className="text-brand-danger text-sm">{error}</p>}
              <div className="space-y-3 pt-1">
                <button
                  onClick={handleLogin}
                  disabled={!email.trim() || !password || isLoading}
                  className="w-full py-3.5 bg-brand-accent text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center transition-opacity"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                </button>
                <button
                  onClick={() => { setStep('auth_choice'); clearError(); }}
                  className="text-xs text-brand-text-muted hover:text-brand-text-secondary transition-colors w-full text-center"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {step === 'email_register' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-body text-brand-text-secondary text-center">Create Account</h2>
              <div>
                <label className={labelClass}>Your Name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Password (min. 8 characters)</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className={inputClass}
                >
                  <option>Uzbekistan</option>
                  <option>Kazakhstan</option>
                  <option>Kyrgyzstan</option>
                  <option>Tajikistan</option>
                  <option>Other</option>
                </select>
              </div>
              {error && <p className="text-brand-danger text-sm">{error}</p>}
              <div className="space-y-3 pt-1">
                <button
                  onClick={handleRegister}
                  disabled={!email.trim() || password.length < 8 || isLoading}
                  className="w-full py-3.5 bg-brand-accent text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center transition-opacity"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </button>
                <button
                  onClick={() => { setStep('auth_choice'); clearError(); }}
                  className="text-xs text-brand-text-muted hover:text-brand-text-secondary transition-colors w-full text-center"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {step === 'feature_tour' && (
            <div className="space-y-6 animate-fade-in text-center">
              <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto border border-brand-accent/20">
                <Compass className="w-8 h-8 text-brand-accent" />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-bold tracking-tight">The AI that never forgets.</h2>
                <p className="text-sm text-brand-text-secondary">
                  Pacific learns your full profile — past education, current goals, constraints — and navigates with you.
                </p>
                <div className="p-4 bg-brand-card border border-brand-border rounded-xl text-left mt-4">
                  <div className="flex space-x-3">
                    <div className="w-6 h-6 rounded bg-brand-accent flex items-center justify-center text-white text-xs">🧭</div>
                    <p className="text-sm flex-1">"I know you're aiming for Germany 🇩🇪 with IELTS 6.5. Let's finish your motivational letter."</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onLoginSuccess(registeredData || undefined)}
                className="w-full py-3.5 bg-brand-text-primary text-brand-bg rounded-xl font-semibold shadow-premium"
              >
                Start Mission
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
