import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, ArrowRight, ArrowUp, ArrowDown, ExternalLink, AlertTriangle, CheckCircle, Loader2, BarChart3, Calendar, Download, FileX, Trash2 } from 'lucide-react';
import { API_BASE, authHeaders } from '../../lib/api';
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';

interface AuditRecord {
  id: number;
  url: string;
  score: number;
  issues: number;
  warnings: number;
  created_at: string;
}

export default function AuditHistory() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof AuditRecord>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(10);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${API_BASE}/api/audit/history`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) { setAudits(data); }
        else setError(data.error || 'Failed to load history');
        setLoading(false);
      })
      .catch(() => { setError('Network error'); setLoading(false); });
  }, [token, navigate]);

  const filtered = audits.filter(a => a.url.toLowerCase().includes(search.toLowerCase()));

  const toggleSort = (key: keyof AuditRecord) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  const displayed = sorted.slice(0, limit);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this audit?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/audit/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        setAudits(prev => prev.filter(a => a.id !== id));
      } else {
        alert('Failed to delete audit.');
      }
    } catch {
      alert('Network error while deleting.');
    }
  };

  const scoreColor = (s: number) => s >= 80 ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300' : s >= 50 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300' : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300';
  const scoreIcon = (s: number) => s >= 80 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;

  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title="Audit History — ValueScan" description="View your past website audits." />
      <Breadcrumb />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-500" /> Audit History
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">View all your past website audits</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  window.open(`${API_BASE}/api/audit/history/export/csv`, '_blank');
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={() => navigate('/')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> New Audit
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by URL..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <FileX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-slate-500 dark:text-slate-400">No audits yet</p>
              <button onClick={() => navigate('/')} className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">Run your first scan</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th onClick={() => toggleSort('url')} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none">
                        URL {sortKey === 'url' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                      </th>
                      <th onClick={() => toggleSort('score')} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none">
                        Score {sortKey === 'score' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                      </th>
                      <th onClick={() => toggleSort('issues')} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none">
                        Issues {sortKey === 'issues' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                      </th>
                      <th onClick={() => toggleSort('created_at')} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none">
                        Date {sortKey === 'created_at' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {displayed.map(audit => (
                      <tr key={audit.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={audit.url}>{audit.url}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColor(audit.score)}`}>
                            {scoreIcon(audit.score)} {audit.score}/100
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                            {audit.issues > 0 && <span className="text-red-500">{audit.issues} errors</span>}
                            {audit.warnings > 0 && <span className="text-amber-500">{audit.warnings} warnings</span>}
                            {audit.issues === 0 && audit.warnings === 0 && <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Clean</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(audit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => navigate(`/audit/${audit.id}`)}
                              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                              View Report <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(audit.id)} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sorted.length > limit && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center">
                  <button onClick={() => setLimit(prev => prev + 10)} className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
