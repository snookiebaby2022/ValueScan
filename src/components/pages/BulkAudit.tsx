import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkeletonAuditReport } from '../layout/Skeleton';
import MetaTags from '../layout/MetaTags';
import { FileText, Plus, Trash2, ScanLine, ArrowRight, Loader2, CheckCircle, AlertTriangle, ExternalLink, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4030';

interface BulkResult {
  url: string;
  score: number;
  issues: number;
  warnings: number;
  loading?: boolean;
  error?: string;
}

export default function BulkAudit() {
  const navigate = useNavigate();
  const [urls, setUrls] = useState<string[]>(['']);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const token = localStorage.getItem('token');

  const addUrl = () => {
    if (urls.length < 10) setUrls(prev => [...prev, '']);
  };

  const removeUrl = (index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    setUrls(prev => prev.map((u, i) => i === index ? value : u));
  };

  const runBulkAudit = async () => {
    const validUrls = urls.filter(u => u.trim());
    if (validUrls.length === 0) return;
    if (!token) { navigate('/login'); return; }

    setRunning(true);
    setResults(validUrls.map(u => ({ url: u, score: 0, issues: 0, warnings: 0, loading: true })));
    setProgress(0);

    try {
      const res = await fetch(`${API_BASE}/api/audit/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ urls: validUrls }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results.map((r: any) => ({
          url: r.url,
          score: r.score || 0,
          issues: r.issues || 0,
          warnings: r.warnings || 0,
          error: r.error,
        })));
      } else {
        setResults(validUrls.map(u => ({ url: u, score: 0, issues: 0, warnings: 0, error: data.error || 'Failed' })));
      }
    } catch {
      setResults(validUrls.map(u => ({ url: u, score: 0, issues: 0, warnings: 0, error: 'Network error' })));
    }
    setRunning(false);
    setProgress(100);
  };

  const scoreColor = (s: number) => s >= 80 ? 'text-green-500' : s >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Bulk Audit — ValueScan" description="Audit up to 10 websites at once with ValueScan." />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Bulk Audit</h1>
            <p className="text-muted-foreground">Audit up to 10 URLs at once. Results are saved to your audit history.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6 mb-6">
            <div className="space-y-3">
              {urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={url}
                      onChange={e => updateUrl(i, e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {urls.length > 1 && (
                    <button onClick={() => removeUrl(i)} className="p-2 text-red-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              {urls.length < 10 && (
                <button onClick={addUrl} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary/60 transition-colors">
                  <Plus className="w-4 h-4" /> Add URL
                </button>
              )}
              <button
                onClick={runBulkAudit}
                disabled={running || urls.filter(u => u.trim()).length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                {running ? 'Auditing...' : 'Run Bulk Audit'}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Results</h2>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-secondary/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.url}</p>
                      {r.loading ? (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" /> Scanning…
                        </div>
                      ) : r.error ? (
                        <p className="text-xs text-red-500 mt-1">{r.error}</p>
                      ) : (
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {r.issues > 0 && <span className="text-red-500">{r.issues} errors</span>}
                          {r.warnings > 0 && <span className="text-amber-500">{r.warnings} warnings</span>}
                          {r.issues === 0 && r.warnings === 0 && <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Clean</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {r.loading ? (
                        <div className="w-8 h-8 rounded-full bg-secondary/50 animate-pulse" />
                      ) : (
                        <>
                          <span className={`text-2xl font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                          <a href={`/audits`} className="text-primary hover:text-primary/80">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
