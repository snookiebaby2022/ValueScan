import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, ArrowRight, Eye, EyeOff, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setConfirmError('');

    let valid = true;
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }
    if (!confirm) {
      setConfirmError('Please confirm your password');
      valid = false;
    } else if (password !== confirm) {
      setConfirmError('Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDone(true);
      } else {
        // Error from server is not displayed in UI
      }
    } catch {
      // Server error is not displayed in UI
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <MetaTags title="Reset Password — ValueScan" description="Set a new password." />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm"><ScanLine className="w-6 h-6 text-primary-foreground" /></div>
            <span className="text-xl font-bold">ValueScan</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password below.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-8">
          {!done ? (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="reset-password" className="text-sm font-medium mb-1.5 block">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="reset-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Min 8 characters"
                    minLength={8}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-card border text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary ${passwordError ? 'border-red-500' : 'border-border'}`}
                    required
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'reset-password-error' : undefined}
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
                {passwordError && <p id="reset-password-error" className="text-sm text-red-500 mt-1.5">{passwordError}</p>}
              </div>
              <div>
                <label htmlFor="reset-confirm" className="text-sm font-medium mb-1.5 block">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="reset-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setConfirmError(''); }}
                    placeholder="Repeat password"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-card border text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary ${confirmError ? 'border-red-500' : 'border-border'}`}
                    required
                    aria-invalid={!!confirmError}
                    aria-describedby={confirmError ? 'reset-confirm-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmError && <p id="reset-confirm-error" className="text-sm text-red-500 mt-1.5">{confirmError}</p>}
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          ) : (
            <div className="text-center p-6 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Password updated</p>
              <p className="text-xs text-muted-foreground">You can now sign in with your new password.</p>
              <Link to="/login" className="mt-4 inline-block text-sm text-primary font-medium hover:underline hover:text-primary/80 transition-colors">Sign in →</Link>
            </div>
          )}
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
