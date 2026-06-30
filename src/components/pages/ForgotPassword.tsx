import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, ArrowRight, Mail, Loader2, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';
import { useToast } from '../layout/ToastProvider';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        showToast('Reset link sent to your email', 'success');
      } else {
        const err = data.error || 'Failed to send reset link';
        setError(err);
        showToast(err, 'error');
      }
    } catch {
      const err = 'Network error. Please try again.';
      setError(err);
      showToast(err, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <MetaTags title="Forgot Password — ValueScan" description="Reset your ValueScan password." />
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
          <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">We will send you a link to reset it.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-8">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="forgot-email" className="text-sm font-medium mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@company.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-card border text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary ${error ? 'border-red-500' : 'border-border'}`}
                    required
                    aria-invalid={!!error}
                    aria-describedby={error ? 'forgot-error' : undefined}
                  />
                </div>
                {error && <p id="forgot-error" className="text-sm text-red-500 mt-1.5">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          ) : (
            <div className="text-center p-6 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Check your email</p>
              <p className="text-xs text-muted-foreground">We sent a password reset link to {email}</p>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remember it? <Link to="/login" className="text-primary hover:underline font-medium hover:text-primary/80 transition-colors">Sign in</Link>
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
