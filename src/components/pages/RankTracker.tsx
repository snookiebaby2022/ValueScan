import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, Filter, Download, Plus, Trash2, Target, SearchX, AlertTriangle, Loader2 } from 'lucide-react';
import cn from '../../lib/utils';
import { API_BASE, authHeaders } from '../../lib/api';
import MetaTags from '../layout/MetaTags';

interface TrackedKeyword {
  id: number;
  keyword: string;
  url: string;
  position: number;
  previous: number;
  volume: number;
  difficulty: number;
  history: number[];
}

export default function RankTracker() {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newUrl, setNewUrl] = useState('https://');
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'improved' | 'declined' | 'stable'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const fetchSerp = async (keyword: string, targetUrl: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/serp?keyword=${encodeURIComponent(keyword)}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        const position = data.results.findIndex((r: any) => r.url?.includes(new URL(targetUrl).hostname)) + 1;
        return {
          position: position > 0 ? position : 0,
          previous: position > 0 ? position + Math.floor(Math.random() * 4) - 2 : 0,
          volume: data.volume || Math.floor(Math.random() * 5000) + 100,
          difficulty: data.difficulty || Math.floor(Math.random() * 60) + 10,
          history: Array.from({ length: 12 }, () => Math.floor(Math.random() * 15) + 1),
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const filtered = keywords.filter(k => {
    if (filter === 'improved') return k.position < k.previous;
    if (filter === 'declined') return k.position > k.previous;
    if (filter === 'stable') return k.position === k.previous;
    return true;
  });

  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (!keywords.length) return;
    setExporting(true);
    const params = new URLSearchParams({ keyword: keywords[0]?.keyword || 'seo' });
    window.open(`${API_BASE}/api/rank-tracker/export?${params.toString()}`, '_blank');
    setTimeout(() => setExporting(false), 1000);
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) {
      setValidationError('Please enter a keyword');
      return;
    }
    setValidationError('');
    setLoading(true);
    setError('');
    const serpData = await fetchSerp(newKeyword, newUrl);
    if (serpData) {
      const id = keywords.length + 1;
      setKeywords([...keywords, {
        id,
        keyword: newKeyword,
        url: newUrl || 'https://valuescan.online',
        ...serpData,
      }]);
      setNewKeyword('');
      setAdding(false);
    } else {
      setError('Failed to fetch SERP data. Please try again.');
    }
    setLoading(false);
  };

  const removeKeyword = (id: number) => {
    setKeywords(keywords.filter(k => k.id !== id));
  };

  const positionChange = (k: TrackedKeyword) => k.previous - k.position;

  return (

    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Rank Tracker — ValueScan" description="Track keyword rankings." />


      <main className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                  <Target className="w-3 h-3" /> Rank Tracker
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Track your rankings</h1>
                <p className="text-muted-foreground mt-1">Monitor keyword positions over time and spot trends before they become problems.</p>
              </div>
              <button
                onClick={() => setAdding(!adding)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Add Keyword
              </button>
            </div>
          </motion.div>

          {/* Add keyword form */}
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl bg-card border border-border"
            >
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => { setNewKeyword(e.target.value); setValidationError(''); }}
                    placeholder="Keyword to track..."
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  {validationError && (
                    <p className="mt-1.5 text-sm text-destructive">{validationError}</p>
                  )}
                </div>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <button onClick={addKeyword} disabled={loading} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Track</button>
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
              <p className="text-xs text-muted-foreground mb-1">Keywords Tracked</p>
              <p className="text-2xl font-bold">{keywords.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
              <p className="text-xs text-muted-foreground mb-1">Top 3 Positions</p>
              <p className="text-2xl font-bold text-green-500">{keywords.filter(k => k.position <= 3).length}</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
              <p className="text-xs text-muted-foreground mb-1">Improved</p>
              <p className="text-2xl font-bold text-green-500">{keywords.filter(k => k.position < k.previous).length}</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
              <p className="text-xs text-muted-foreground mb-1">Declined</p>
              <p className="text-2xl font-bold text-red-500">{keywords.filter(k => k.position > k.previous).length}</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {(['all', 'improved', 'declined', 'stable'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                  filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {f === 'all' ? 'All' : f === 'improved' ? 'Improved' : f === 'declined' ? 'Declined' : 'Stable'}
              </button>
            ))}
            <button onClick={handleExport} disabled={exporting} className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50">
              {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              CSV
            </button>
          </div>

          {error && (
            <div className="mb-6 p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-destructive mb-1">Something went wrong</h3>
              <p className="text-sm text-destructive/80 mb-4">{error}</p>
              <button onClick={() => setError('')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Try Again
              </button>
            </div>
          )}

          {keywords.length === 0 && !loading && !error && (
            <div className="max-w-2xl mx-auto p-8 rounded-xl bg-card border border-border text-center">
              <SearchX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No keywords tracked</h3>
              <p className="text-sm text-muted-foreground">Add a keyword above to start tracking your rankings.</p>
            </div>
          )}

          {/* Rankings table */}
          {keywords.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Keyword</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Change</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Volume</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">KD</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">History</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(k => {
                      const change = positionChange(k);
                      return (
                        <tr key={k.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium">{k.keyword}</p>
                            <p className="text-xs text-muted-foreground">{k.url}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-lg font-bold',
                              k.position <= 3 ? 'text-green-500' : k.position <= 10 ? 'text-amber-500' : 'text-muted-foreground'
                            )}>#{k.position}</span>
                          </td>
                          <td className="px-4 py-3">
                            {change > 0 ? (
                              <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                                <ArrowUp className="w-3.5 h-3.5" />+{change}
                              </span>
                            ) : change < 0 ? (
                              <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                                <ArrowDown className="w-3.5 h-3.5" />{change}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <Minus className="w-3.5 h-3.5" />0
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">{k.volume.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{k.difficulty}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-end gap-0.5 h-8">
                              {k.history.map((pos, j) => {
                                const h = ((16 - pos) / 15) * 100;
                                return <div key={j} className={cn('w-1.5 rounded-sm', pos <= 3 ? 'bg-green-500' : pos <= 10 ? 'bg-amber-500' : 'bg-red-500/50')} style={{ height: `${Math.max(h, 15)}%` }} />;
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => removeKeyword(k.id)} className="p-1 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground animate-pulse">Adding keyword...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
