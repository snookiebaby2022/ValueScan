import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, XCircle, Loader2, Mail, ArrowLeft, RefreshCw, ScanLine } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import MetaTags from '../layout/MetaTags';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const verifyToken = useCallback(async () => {
    if (!token) { setStatus('error'); setMessage('No verification token found in URL.'); return; }
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) { setStatus('success'); setMessage('Your email has been verified successfully!'); }
      else { setStatus('error'); setMessage(data.error || 'Invalid or expired verification token.'); }
    } catch { setStatus('error'); setMessage('Network error. Please try again.'); }
  }, [token]);

  const resendVerification = async () => {
    const authToken = localStorage.getItem('token');
    if (!authToken) { setResendMessage('Please log in first to resend verification.'); return; }
    setResending(true); setResendMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) { setResendMessage('Verification email sent! Check your inbox.'); }
      else { setResendMessage(data.error || 'Failed to resend. Please try again.'); }
    } catch { setResendMessage('Network error. Please try again.'); }
    setResending(false);
  };

  // Auto-verify if token is present
  useEffect(() => { if (token && status === 'idle') verifyToken(); }, [token, status, verifyToken]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetaTags title="Verify Email — ValueScan" description="Verify your email address." />
      <div className="flex-1 flex items-center justify-center px-6 pt-16">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <ScanLine className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">ValueScan</span>
            </Link>
          </div>

          {status === 'idle' && !token && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Verify Your Email</h2>
              <p className="text-muted-foreground mb-6">We have sent a verification link to your email. Please check your inbox and click the link to verify your account.</p>
              <button onClick={resendVerification} disabled={resending}
                className="px-6 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Resend Email
              </button>
              {resendMessage && <p className="mt-4 text-sm text-primary">{resendMessage}</p>}
            </>
          )}

          {status === 'loading' && (
            <div className="py-8">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all">
                Go to Dashboard
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate('/login')} className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
                <button onClick={resendVerification} disabled={resending}
                  className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Resend
                </button>
              </div>
              {resendMessage && <p className="mt-4 text-sm text-primary">{resendMessage}</p>}
            </>
          )}

          <div className="mt-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
