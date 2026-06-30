import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, Download, Globe, Compass, SearchX, Loader2 } from 'lucide-react';
import cn from '../../lib/utils';
import MetaTags from '../layout/MetaTags';
import { API_BASE, authHeaders } from '../../lib/api';

interface Gap {
  topic: string;
  competitor: string;
  competitorTraffic: number;
  yourTraffic: number;
  opportunity: 'high' | 'medium' | 'low';
  keywords: string[];
}

export default function ContentGap() {
  const [domain, setDomain] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const [exporting, setExporting] = useState(false);

  const handleExport = (format: 'pdf' | 'csv') => {
    if (!domain || !competitor || !results) return;
    setExporting(true);
    const params = new URLSearchParams({ domain, competitor, format });
    window.open(`${API_BASE}/api/content-gap/export?${params.toString()}`, '_blank');
    setTimeout(() => setExporting(false), 1000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || !competitor.trim()) {
      setValidationError('Please enter both domains');
      return;
    }
    setValidationError('');
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/content-gap?domain=${encodeURIComponent(domain)}&competitor=${encodeURIComponent(competitor)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to fetch content gap');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (domain.trim() && competitor.trim()) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const gaps: Gap[] = results?.gaps || [];
  const highCount = gaps.filter((g: Gap) => g.opportunity === 'high').length;
  const totalTraffic = gaps.reduce((a: number, b: Gap) => a + b.competitorTraffic, 0);
  const totalYourTraffic = gaps.reduce((a: number, b: Gap) => a + b.yourTraffic, 0);

  return (

    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Content Gap — ValueScan" description="Find content gaps vs competitors." />


      <main className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium mb-4">
              <Compass className="w-3 h-3" /> Content Gap
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Find what your competitors rank for</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Discover topics and keywords your competitors cover that you don't — and the traffic you're leaving on the table.</p>
          </motion.div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setValidationError(''); }}
                  placeholder="Your domain (e.g., valuescan.online)"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div className="relative flex-1">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={competitor}
                  onChange={(e) => { setCompetitor(e.target.value); setValidationError(''); }}
                  placeholder="Competitor domain"
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
            <div className="max-w-2xl mx-auto mb-6 p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-destructive mb-1">Something went wrong</h3>
              <p className="text-sm text-destructive/80 mb-4">{error}</p>
              <button onClick={handleRetry} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Try Again
              </button>
            </div>
          )}

          {searched && !loading && !error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {gaps.length === 0 && (
                <div className="max-w-2xl mx-auto p-8 rounded-xl bg-card border border-border text-center mb-6">
                  <SearchX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No gaps found</h3>
                  <p className="text-sm text-muted-foreground">No content gaps detected. Try different competitor domains.</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Gaps Found</p>
                  <p className="text-2xl font-bold">{gaps.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">High Opportunity</p>
                  <p className="text-2xl font-bold text-green-500">{highCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Competitor Traffic</p>
                  <p className="text-2xl font-bold">{(totalTraffic / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Your Traffic</p>
                  <p className="text-2xl font-bold text-amber-500">{totalYourTraffic.toLocaleString()}</p>
                </div>
              </div>

              {/* Export */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Topics your competitors rank for that you don't</p>
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

              {/* Gaps list */}
              <div className="space-y-3">
                {gaps.map((gap: Gap, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-card border border-border hover:border-amber-500/30 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{gap.topic}</h3>
                        <p className="text-xs text-muted-foreground">Competitor: {gap.competitor}</p>
                      </div>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        gap.opportunity === 'high' ? 'bg-green-500/10 text-green-500'
                        : gap.opportunity === 'medium' ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-muted text-muted-foreground'
                      )}>{gap.opportunity} opportunity</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Their traffic</p>
                        <p className="text-sm font-bold">{gap.competitorTraffic.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Your traffic</p>
                        <p className="text-sm font-bold">{gap.yourTraffic.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Potential gain</p>
                        <p className="text-sm font-bold text-green-500">+{(gap.competitorTraffic - gap.yourTraffic).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {gap.keywords.map(kw => (
                        <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{kw}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {!searched && !loading && (
            <div className="text-center py-16">
              <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Enter your domain and a competitor to find content gaps</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground animate-pulse">Comparing content gaps...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
