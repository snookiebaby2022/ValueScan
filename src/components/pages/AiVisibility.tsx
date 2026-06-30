import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ScanLine, Brain, Zap, MessageSquare, Bot, TrendingUp, ArrowUp, ArrowDown, Globe, Search, CheckCircle, XCircle, AlertCircle, Download, Sparkles, Eye, SearchX, AlertTriangle, Loader2 } from 'lucide-react';
import cn from '../../lib/utils';
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';
import { API_BASE, authHeaders } from '../../lib/api';

interface AiMention {
  engine: string;
  query: string;
  mention: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  date: string;
}

interface EngineScore {
  engine: string;
  score: number;
  mentions: number;
  trend: 'up' | 'down' | 'stable';
  prevScore: number;
}

export default function AiVisibility() {
  const [brand, setBrand] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const [exporting, setExporting] = useState(false);

  const handleExport = (format: 'pdf' | 'csv') => {
    if (!brand || !results) return;
    setExporting(true);
    const params = new URLSearchParams({ brand, domain: brand, format });
    window.open(`${API_BASE}/api/ai-visibility/export?${params.toString()}`, '_blank');
    setTimeout(() => setExporting(false), 1000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) {
      setValidationError('Please enter a brand name');
      return;
    }
    setValidationError('');
    setLoading(true);
    setSearched(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/ai-visibility?brand=${encodeURIComponent(brand)}&domain=${encodeURIComponent(brand)}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error('Failed to fetch AI visibility data');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (brand.trim()) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const filtered = filter === 'all' ? (results?.mentions || []) : (results?.mentions || []).filter((m: AiMention) => m.sentiment === filter);
  const avgScore = results?.score ?? Math.round((results?.engines || []).reduce((a: number, b: EngineScore) => a + b.score, 0) / (results?.engines?.length || 1));

  return (

    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="AI Visibility — ValueScan" description="Track AI search engine visibility." />


      <main className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-xs font-medium mb-4">
              <Eye className="w-3 h-3" /> AI Visibility (GEO)
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Track your brand in AI search</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Monitor how ChatGPT, Perplexity, Gemini, and Copilot mention your brand. Optimize for Generative Engine Optimisation.</p>
          </motion.div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Brain className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setValidationError(''); }}
                placeholder="Enter URL / domain name"
                className="w-full pl-12 pr-32 py-4 rounded-xl bg-card border border-border text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Scan AI'}
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
              {filtered.length === 0 && (
                <div className="max-w-2xl mx-auto p-8 rounded-xl bg-card border border-border text-center mb-6">
                  <SearchX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground">No AI mentions found for this brand. Try a different brand name.</p>
                </div>
              )}

              {/* Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">AI Visibility Score</p>
                  <p className="text-2xl font-bold">{avgScore}</p>
                  <p className="text-xs text-green-500 mt-1">+8% vs last month</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Total Mentions</p>
                  <p className="text-2xl font-bold">{(results?.mentions || []).length}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Positive</p>
                  <p className="text-2xl font-bold text-green-500">{(results?.mentions || []).filter((m: AiMention) => m.sentiment === 'positive').length}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Engines Tracked</p>
                  <p className="text-2xl font-bold">{(results?.engines || []).length}</p>
                </div>
              </div>

              {/* Engine scores */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-8">
                {(results?.engines || []).map((engine: EngineScore) => (
                  <div key={engine.engine} className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{engine.engine}</span>
                      {engine.trend === 'up' ? <ArrowUp className="w-3.5 h-3.5 text-green-500" />
                        : engine.trend === 'down' ? <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                        : <TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <p className="text-2xl font-bold">{engine.score}</p>
                    <p className="text-xs text-muted-foreground">{engine.mentions} mentions</p>
                    <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${engine.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Mentions filter */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filter:</span>
                  {(['all', 'positive', 'neutral', 'negative'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                        filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
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

              {/* Mentions list */}
              <div className="space-y-3">
                {filtered.map((mention: AiMention, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-card border border-border hover:border-purple-500/30 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">{mention.engine}</span>
                        <span className="text-xs text-muted-foreground">{mention.date}</span>
                      </div>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        mention.sentiment === 'positive' ? 'bg-green-500/10 text-green-500'
                        : mention.sentiment === 'negative' ? 'bg-red-500/10 text-red-500'
                        : 'bg-amber-500/10 text-amber-500'
                      )}>{mention.sentiment}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Query: <span className="font-medium text-foreground">"{mention.query}"</span></p>
                    <p className="text-sm leading-relaxed">{mention.mention}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {results?.recommendations && results.recommendations.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
                  <div className="space-y-3">
                    {results.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-card border border-border flex items-start gap-3 hover:shadow-md transition-shadow">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {!searched && !loading && (
            <div className="text-center py-16">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Enter your brand name to scan AI search engine mentions</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground animate-pulse">Scanning ChatGPT, Perplexity, Gemini, Copilot...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
