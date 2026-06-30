import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface Alert {
  id: number;
  url: string;
  check_type: string;
  active: number;
  created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bellRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!token || !open) return;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4030';
    setLoading(true);
    fetch(`${API_BASE}/api/alerts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
        else setError('Failed to load alerts');
        setLoading(false);
      })
      .catch(() => { setError('Network error'); setLoading(false); });
  }, [open, token]);

  const activeCount = alerts.filter(a => a.active).length;

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary/80 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {activeCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-72 rounded-xl bg-card border border-border shadow-xl shadow-black/10 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Alerts</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-secondary/60">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center">
                <BellRing className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No alerts yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Set up change alerts to get notified</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start gap-2">
                    {alert.active ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{alert.url}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {alert.check_type === 'score_change' ? 'Score Change' : alert.check_type === 'security_issue' ? 'Security Issue' : 'Performance Drop'}
                        {' · '}{new Date(alert.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {error && <p className="p-3 text-xs text-red-500">{error}</p>}
          </div>
          <div className="px-4 py-2 border-t border-border bg-secondary/20">
            <a href="/alerts" className="text-xs text-primary hover:underline">View all alerts</a>
          </div>
        </div>
      )}
    </div>
  );
}
