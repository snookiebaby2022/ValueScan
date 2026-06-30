import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, ArrowRight, Eye, EyeOff, Loader2, CreditCard } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PLAN_PRICES, PLAN_SUMMARIES, type PlanId } from '../../lib/plans';
import MetaTags from '../layout/MetaTags';
import { useToast } from '../../hooks/useToast';

function getPasswordStrength(password: string): { score: number; label: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Excellent'; color: string; bg: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(4, score);
  const map: Record<number, { label: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Excellent'; color: string; bg: string }> = {
    0: { label: 'Weak', color: 'text-red-500', bg: 'bg-red-500' },
    1: { label: 'Fair', color: 'text-orange-500', bg: 'bg-orange-500' },
    2: { label: 'Good', color: 'text-yellow-500', bg: 'bg-yellow-500' },
    3: { label: 'Strong', color: 'text-green-500', bg: 'bg-green-500' },
    4: { label: 'Excellent', color: 'text-emerald-500', bg: 'bg-emerald-500' },
  };
  return { score, ...map[score] };
}

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PlanId) || 'free';
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro' | 'max'>(
    ['free', 'pro', 'max'].includes(initialPlan) ? initialPlan : 'free'
  );
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [agreedError, setAgreedError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setAgreedError('');

    let valid = true;
    if (!name.trim()) {
      setNameError('Full name is required');
      valid = false;
    }
    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    } else {
      const strength = getPasswordStrength(password);
      if (strength.score < 2) {
        setPasswordError('Password must be Good or better');
        valid = false;
      }
    }
    if (!agreed) {
      setAgreedError('Please agree to the Terms and Privacy Policy to continue');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plan: 'free' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Account created successfully', 'success');
        localStorage.setItem('token', data.token);
        if (plan !== 'free') {
          const stripeRes = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
            body: JSON.stringify({ plan }),
          });
          const stripeData = await stripeRes.json();
          if (stripeData.url) {
            window.location.href = stripeData.url;
            return;
          }
        }
        window.location.href = '/dashboard';
      } else {
        const err = data.error || 'Registration failed';
        setError(err);
        showToast(err, 'error');
      }
    } catch {
      const err = 'Server error — please try again later';
      setError(err);
      showToast(err, 'error');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { id: 'free' as const, label: 'Free', price: PLAN_PRICES.free.label, desc: PLAN_SUMMARIES.free, period: 'forever' },
    { id: 'pro' as const, label: 'Pro', price: PLAN_PRICES.pro.label, desc: PLAN_SUMMARIES.pro, period: '/month' },
    { id: 'max' as const, label: 'Max', price: PLAN_PRICES.max.label, desc: PLAN_SUMMARIES.max, period: '/month' },
  ];

  const ctaText = plan === 'free' ? 'Start free' : plan === 'pro' ? 'Continue to Pro checkout' : 'Continue to Max checkout';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <MetaTags title="Sign Up — ValueScan" description="Create your ValueScan account." />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <ScanLine className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ValueScan</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Start auditing in 30 seconds. No credit card for Free.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign up form" noValidate>
            <div>
              <label htmlFor="signup-name" className="text-sm font-medium mb-1.5 block">Full name</label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                placeholder="Alex Smith"
                className={`w-full px-4 py-3 rounded-xl bg-card border text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary ${nameError ? 'border-red-500' : 'border-border'}`}
                required
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'signup-name-error' : undefined}
              />
              {nameError && <p id="signup-name-error" className="text-sm text-red-500 mt-1.5">{nameError}</p>}
            </div>
            <div>
              <label htmlFor="signup-email" className="text-sm font-medium mb-1.5 block">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="you@company.com"
                className={`w-full px-4 py-3 rounded-xl bg-card border text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary ${emailError ? 'border-red-500' : 'border-border'}`}
                required
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'signup-email-error' : undefined}
              />
              {emailError && <p id="signup-email-error" className="text-sm text-red-500 mt-1.5">{emailError}</p>}
            </div>
            <div>
              <label htmlFor="signup-password" className="text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Min 8 characters"
                  className={`w-full px-4 py-3 rounded-xl bg-card border text-sm outline-none transition-colors pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary ${passwordError ? 'border-red-500' : 'border-border'}`}
                  required
                  minLength={8}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'signup-password-error' : 'password-strength'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p id="signup-password-error" className="text-sm text-red-500 mt-1.5">{passwordError}</p>}
              {password && (
                <div id="password-strength" className="mt-3">
                  <div className="flex gap-1.5 mb-1.5">
                    {[0, 1, 2, 3].map((i) => {
                      const strength = getPasswordStrength(password);
                      return (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-full transition-all duration-300 ${i < strength.score ? strength.bg : 'bg-slate-200 dark:bg-slate-700'}`}
                        />
                      );
                    })}
                  </div>
                  <p className={`text-xs font-medium ${getPasswordStrength(password).color}`}>{getPasswordStrength(password).label}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Choose a plan</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={`p-3 rounded-xl border text-center transition-all hover:shadow-sm ${
                      plan === p.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card/50 hover:bg-card'
                    }`}
                  >
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.price}<span className="text-[10px]">{p.period}</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`flex items-start gap-2 cursor-pointer p-2 rounded-lg transition-colors ${!agreed && agreedError ? 'bg-red-500/10 border border-red-500/20' : 'border border-transparent'}`}>
                <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setAgreedError(''); }} className="mt-0.5 rounded border-border" required />
                <span className="text-xs text-muted-foreground">
                  I agree to the <Link to="/terms" className="text-primary hover:underline hover:text-primary/80 transition-colors">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline hover:text-primary/80 transition-colors">Privacy Policy</Link>
                </span>
              </label>
              {agreedError && <p className="text-sm text-red-500 mt-1.5">{agreedError}</p>}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm" role="alert" aria-live="polite" id="signup-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : plan !== 'free' ? <CreditCard className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Creating account...' : ctaText}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-medium hover:text-primary/80 transition-colors">Sign in</Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
