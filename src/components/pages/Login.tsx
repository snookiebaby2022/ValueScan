import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';
import { useToast } from '../../hooks/useToast';

export default function Login() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');

    let valid = true;
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
    }
    if (!valid) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        showToast('Signed in successfully', 'success');
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        const err = data.error || 'Invalid credentials';
        setError(err);
        showToast(err, 'error');
      }
    } catch {
      const err = 'Server error — please try again';
      setError(err);
      showToast(err, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MetaTags title="Sign In — ValueScan" description="Sign in to your ValueScan audit dashboard." />
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-6 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <ScanLine className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">ValueScan</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your audit dashboard</p>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500" role="alert" aria-live="polite" id="login-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign in form" noValidate>
              <div>
                <label htmlFor="login-email" className="text-sm font-medium mb-1.5 block">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="you@company.com"
                  className={`w-full px-4 py-3 rounded-xl bg-card border text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary ${emailError || error ? 'border-red-500' : 'border-border'}`}
                  required
                  aria-invalid={!!emailError || !!error}
                  aria-describedby={emailError ? 'login-email-error' : error ? 'login-error' : undefined}
                />
                {emailError && <p id="login-email-error" className="text-sm text-red-500 mt-1.5">{emailError}</p>}
              </div>
              <div>
                <label htmlFor="login-password" className="text-sm font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-xl bg-card border text-sm outline-none transition-colors pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary ${passwordError || error ? 'border-red-500' : 'border-border'}`}
                    required
                    aria-invalid={!!passwordError || !!error}
                    aria-describedby={passwordError ? 'login-password-error' : error ? 'login-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && <p id="login-password-error" className="text-sm text-red-500 mt-1.5">{passwordError}</p>}
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-primary hover:underline hover:text-primary/80 transition-colors">Forgot password?</Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium hover:text-primary/80 transition-colors">Sign up for free</Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
