import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Trash2, Globe, AlertTriangle, Check, Loader2, Shield } from 'lucide-react';


import { API_BASE } from '../../lib/api';
import MetaTags from '../layout/MetaTags';

interface Alert {
  id: number;
  url: string;
  check_type: string;
  active: number;
  created_at: string;
}

export default function ChangeAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('score_change');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchAlerts = useCallback(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/alerts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAlerts(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchAlerts();
  }, [token, navigate, fetchAlerts]);

  const handleAdd = async () => {
    if (!newUrl) { setError('URL is required'); return; }
    setAdding(true); setError(''); setMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: newUrl, checkType: newType })
      });
      const data = await res.json();
      if (data.success) { setMessage('Alert created successfully'); setNewUrl(''); fetchAlerts(); }
      else if (data.upgrade) setError(`${data.error} Upgrade at /pricing`);
      else setError(data.error || 'Failed to create alert');
    } catch { setError('Network error'); }
    setAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this alert?')) return;
    try {
      await fetch(`${API_BASE}/api/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title="Change Alerts — ValueScan" description="Set up SEO alerts." />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-purple-500" /> Change Alerts
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Get notified when your website audit scores change</p>
            </div>
          </div>

          {/* Add Alert */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Create New Alert</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input type="text" placeholder="https://example.com" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Check Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all">
                  <option value="score_change">Score Change</option>
                  <option value="security_issue">Security Issue</option>
                  <option value="performance_drop">Performance Drop</option>
                </select>
              </div>
            </div>
            {message && <p className="mt-3 text-sm text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {message}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button onClick={handleAdd} disabled={adding}
              className="mt-4 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Alert
            </button>
          </div>

          {/* Alerts List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Alerts ({alerts.length})</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No alerts set up yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">Create an alert above to start monitoring your website for SEO score changes, security issues, and performance drops.</p>
                <button
                  onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create your first alert
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.url}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {alert.check_type === 'score_change' ? 'Score Change' : alert.check_type === 'security_issue' ? 'Security Issue' : 'Performance Drop'}
                          {' '} &bull; {new Date(alert.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${alert.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {alert.active ? 'Active' : 'Paused'}
                      </span>
                      <button onClick={() => handleDelete(alert.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Alert Frequency</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">Alerts are checked daily. You will be notified via email when a change is detected. (Email notifications coming soon)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
