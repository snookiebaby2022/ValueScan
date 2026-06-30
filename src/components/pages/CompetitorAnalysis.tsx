import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ScanLine, Target, BarChart3, ArrowUp, ArrowDown, Search, Globe, Link2, FileText, Shield, Zap, TrendingUp, Download, ExternalLink, SearchX, AlertTriangle, Loader2 } from 'lucide-react';
import cn from '../../lib/utils';
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';
import { API_BASE, authHeaders } from '../../lib/api';

interface Competitor {
  domain: string;
  authority: number;
  traffic: number;
  keywords: number;
  backlinks: number;
  pages: number;
  score: number;
  issues: number;
  cwv: number;
}

const metrics = [
  { key: 'authority', label: 'Authority', icon: Shield },
  { key: 'traffic', label: 'Traffic', icon: TrendingUp },
  { key: 'keywords', label: 'Keywords', icon: Search },
  { key: 'backlinks', label: 'Backlinks', icon: Link2 },
  { key: 'pages', label: 'Pages', icon: FileText },
  { key: 'score', label: 'Audit Score', icon: Zap },
  { key: 'cwv', label: 'CWV Score', icon: BarChart3 },
];

export default function CompetitorAnalysis() {
  const [domain, setDomain] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMetric, setActiveMetric] = useState('authority');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const [exporting, setExporting] = useState(false);

  const handleExport = (format: 'pdf' | 'csv') => {
    if (!domain || !competitors || !results) return;
    const comp = competitors.split(',')[0].trim();
    setExporting(true);
    const params = new URLSearchParams({ domain, competitor: comp, format });
    window.open(`${API_BASE}/api/competitors/export?${params.toString()}`, '_blank');
    setTimeout(() => setExporting(false), 1000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || !competitors.trim()) {
      setValidationError('Please enter both domains');
      return;
    }
    setValidationError('');
    setLoading(true);
    setSearched(true);
    setError('');
    setResults(null);
    try {
      const competitor = competitors.split(',')[0].trim();
      const res = await fetch(
        `${API_BASE}/api/competitors?domain=${encodeURIComponent(domain)}&competitor=${encodeURIComponent(competitor)}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error('Failed to fetch competitor data');
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (domain.trim() && competitors.trim()) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const displayData: Competitor[] = results
    ? [
        {
          domain: results.yourDomain,
          authority: results.comparison.authority.your,
          traffic: results.comparison.traffic.your,
          keywords: results.comparison.keywords.your,
          backlinks: results.comparison.backlinks.your,
          pages: results.comparison.pages.your,
          score: results.yourScore,
          issues: 0,
          cwv: results.comparison.cwv.your,
        },
        {
          domain: results.competitorDomain,
          authority: results.comparison.authority.competitor,
          traffic: results.comparison.traffic.competitor,
          keywords: results.comparison.keywords.competitor,
          backlinks: results.comparison.backlinks.competitor,
          pages: results.comparison.pages.competitor,
          score: results.competitorScore,
          issues: 0,
          cwv: results.comparison.cwv.competitor,
        },
      ]
    : [];

  const yourSite = displayData[0];
  const others = displayData.slice(1);
  const maxVal = displayData.length > 0 ? Math.max(...displayData.map((c) => (c[activeMetric as keyof Competitor] as number))) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Competitor Analysis — ValueScan" description="Compare competitor SEO." />


      <main className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Target className="w-3 h-3" /> Competitor Analysis
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">See how you stack up</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Compare your site against up to 3 competitors on authority, traffic, keywords, backlinks, and audit scores.</p>
          </motion.div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setValidationError(''); }}
                  placeholder="Your domain"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div className="relative flex-1">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={competitors}
                  onChange={(e) => { setCompetitors(e.target.value); setValidationError(''); }}
                  placeholder="Competitors (comma separated)"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Analyzing...' : 'Compare'}
              </button>
            </div>
            {validationError && (
              <p className="mt-2 text-sm text-destructive text-center">{validationError}</p>
            )}
          </form>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-2xl mx-auto mb-8 p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-destructive mb-1">Something went wrong</h3>
              <p className="text-sm text-destructive/80 mb-4">{error}</p>
              <button onClick={handleRetry} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Try Again
              </button>
            </motion.div>
          )}

          {searched && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {displayData.length === 0 && !error && (
                <div className="max-w-2xl mx-auto p-8 rounded-xl bg-card border border-border text-center mb-6">
                  <SearchX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No data found</h3>
                  <p className="text-sm text-muted-foreground">Could not retrieve competitor data. Check the domains and try again.</p>
                </div>
              )}

              {displayData.length > 0 && (
                <>
                  {/* Metric selector */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {metrics.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setActiveMetric(m.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          activeMetric === m.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        <m.icon className="w-3.5 h-3.5" />
                        {m.label}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleExport('pdf')} disabled={exporting} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50">
                        {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        PDF
                      </button>
                      <button onClick={() => handleExport('csv')} disabled={exporting} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50">
                        CSV
                      </button>
                    </div>
                  </div>

                  {/* Comparison bars */}
                  <div className="space-y-3 mb-8">
                    {displayData.map((c, i) => {
                      const val = c[activeMetric as keyof Competitor] as number;
                      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                      const isYou = i === 0;
                      return (
                        <div key={c.domain} className={cn('p-4 rounded-xl border hover:shadow-md transition-shadow', isYou ? 'bg-primary/5 border-primary/30' : 'bg-card border-border')}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={cn('font-medium', isYou && 'text-primary')}>{c.domain}</span>
                              {isYou && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">You</span>}
                            </div>
                            <span className="text-sm font-bold">{val.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', isYou ? 'bg-primary' : 'bg-muted-foreground/30')} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed table */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Domain</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Authority</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Traffic</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Keywords</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Backlinks</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Score</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">CWV</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.map((c, i) => (
                            <tr key={c.domain} className={cn('border-t border-border hover:bg-muted/50 transition-colors', i === 0 && 'bg-primary/5')}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={cn('font-medium', i === 0 && 'text-primary')}>{c.domain}</span>
                                  {i === 0 && <span className="text-xs text-primary font-medium">You</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">{c.authority}</td>
                              <td className="px-4 py-3 text-right">{c.traffic.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">{c.keywords.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">{c.backlinks.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={cn('font-medium', c.score >= 85 ? 'text-green-500' : c.score >= 70 ? 'text-amber-500' : 'text-red-500')}>{c.score}</span>
                              </td>
                              <td className="px-4 py-3 text-right">{c.cwv}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Gaps */}
                  {results?.gaps && results.gaps.length > 0 && (
                    <div className="mt-8 rounded-xl border border-border overflow-hidden">
                      <div className="px-4 py-3 bg-muted/50 border-b border-border">
                        <h3 className="text-sm font-medium">Content Gaps</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30">
                            <tr>
                              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Topic</th>
                              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Competitor Traffic</th>
                              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Your Traffic</th>
                              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Opportunity</th>
                              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Keywords</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.gaps.map((gap: any, i: number) => (
                              <tr key={i} className="border-t border-border hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 font-medium">{gap.topic}</td>
                                <td className="px-4 py-3 text-right">{gap.competitorTraffic.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">{gap.yourTraffic.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={cn('font-medium', gap.opportunity > 0 ? 'text-green-500' : 'text-red-500')}>
                                    {gap.opportunity > 0 ? '+' : ''}{gap.opportunity.toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">{gap.keywords.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {!searched && !loading && (
            <div className="text-center py-16">
              <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Enter your domain and competitors to start comparing</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground animate-pulse">Analyzing competitors...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
