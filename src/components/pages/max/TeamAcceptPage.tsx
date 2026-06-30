import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ScanLine, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE, authHeaders } from '../../../lib/api';

export default function TeamAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'login'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      setStatus('login');
      return;
    }
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link');
      return;
    }
    fetch(`${API_BASE}/api/max/team/accept/${token}`, {
      method: 'POST',
      headers: authHeaders(),
    })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          setStatus('ok');
        } else {
          setStatus('error');
          setMessage(data.error || 'Could not accept invitation');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center p-8 rounded-2xl border border-border bg-card">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
          <ScanLine className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold mb-2">Team invitation</h1>
        {status === 'loading' && <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />}
        {status === 'ok' && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">You&apos;ve joined the team successfully.</p>
            <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Go to dashboard</button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
        {status === 'login' && (
          <>
            <p className="text-muted-foreground mb-4">Sign in to accept this team invitation.</p>
            <Link to={`/login?redirect=/team/accept/${token}`} className="inline-block px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
