import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Shield, Zap, Globe, BarChart3 } from 'lucide-react';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4030';

interface AuditSummary {
  id: number;
  url: string;
  score: number;
  issues: number;
  warnings: number;
  created_at: string;
}

interface CompareData {
  audit1: AuditSummary;
  audit2: AuditSummary;
  diff: { score: number; issues: number; warnings: number };
  categoryDiff: Record<string, { score1: number; score2: number; diff: number }>;
}

export default function CompareAudits() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [selected1, setSelected1] = useState('');
  const [selected2, setSelected2] = useState('');
  const [result, setResult] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${API_BASE}/api/audit/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAudits(data); });
  }, [token, navigate]);

  const compare = async () => {
    if (!selected1 || !selected2) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/audit/compare?id1=${selected1}&id2=${selected2}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.error) setResult(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const diffIcon = (val: number) => {
    if (val > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (val < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const catIcon = { seo: Globe, sem: BarChart3, security: Shield, performance: Zap };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Compare Audits — ValueScan" description="Compare two website audits side-by-side to see what changed." />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Compare Audits</h1>
            <p className="text-muted-foreground">Select two audits to see side-by-side differences.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Audit 1 (Before)</label>
                <select value={selected1} onChange={e => setSelected1(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground">
                  <option value="">Select an audit...</option>
                  {audits.map(a => (
                    <option key={a.id} value={a.id}>{a.url} — {new Date(a.created_at).toLocaleDateString('en-GB')} ({a.score}/100)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Audit 2 (After)</label>
                <select value={selected2} onChange={e => setSelected2(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground">
                  <option value="">Select an audit...</option>
                  {audits.map(a => (
                    <option key={a.id} value={a.id}>{a.url} — {new Date(a.created_at).toLocaleDateString('en-GB')} ({a.score}/100)</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={compare} disabled={loading || !selected1 || !selected2}
              className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Comparing...' : 'Compare'}
            </button>
            {(!selected1 || !selected2) && (
              <p className="mt-2 text-xs text-muted-foreground">Select two audits to compare</p>
            )}
          </div>

          {result && (
            <div className="space-y-6">
              {/* Score comparison */}
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Score Comparison</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Audit 1</p>
                    <p className="text-3xl font-bold">{result.audit1.score}</p>
                    <p className="text-xs text-muted-foreground">{new Date(result.audit1.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">Difference</p>
                    <div className="flex items-center gap-2">
                      {diffIcon(result.diff.score)}
                      <span className={`text-2xl font-bold ${result.diff.score > 0 ? 'text-green-500' : result.diff.score < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {result.diff.score > 0 ? '+' : ''}{result.diff.score}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Audit 2</p>
                    <p className="text-3xl font-bold">{result.audit2.score}</p>
                    <p className="text-xs text-muted-foreground">{new Date(result.audit2.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
                <div className="space-y-3">
                  {Object.entries(result.categoryDiff).map(([cat, data]) => {
                    const Icon = catIcon[cat as keyof typeof catIcon] || BarChart3;
                    return (
                      <div key={cat} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/50 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium uppercase">{cat}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-1 sm:justify-end">
                          <div className="w-24 sm:w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Before</span>
                              <span className="font-medium">{data.score1}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${data.score1}%` }} />
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="w-24 sm:w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">After</span>
                              <span className="font-medium">{data.score2}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${data.score2}%` }} />
                            </div>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${data.diff > 0 ? 'bg-green-500/10 text-green-500' : data.diff < 0 ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                            {data.diff > 0 ? '+' : ''}{data.diff}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Issues & Warnings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card border border-border/50 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Issues</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{result.audit1.issues}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className={`text-2xl font-bold ${result.diff.issues < 0 ? 'text-green-500' : result.diff.issues > 0 ? 'text-red-500' : ''}`}>{result.audit2.issues}</span>
                  </div>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Warnings</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{result.audit1.warnings}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className={`text-2xl font-bold ${result.diff.warnings < 0 ? 'text-green-500' : result.diff.warnings > 0 ? 'text-red-500' : ''}`}>{result.audit2.warnings}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
