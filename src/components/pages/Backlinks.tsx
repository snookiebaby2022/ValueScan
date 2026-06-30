import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ScanLine, Search, Link2, ExternalLink, ArrowUp, ArrowDown, Globe, Shield, Download, Zap, SearchX, AlertTriangle, Loader2 } from 'lucide-react';
import cn from '../../lib/utils';
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';
import { API_BASE, authHeaders } from '../../lib/api';

interface Backlink {
  domain: string;
  url: string;
  anchor: string;
  authority: number;
  dofollow: boolean;
  firstSeen: string;
}

export default function Backlinks() {
  const [domain, setDomain] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterDofollow, setFilterDofollow] = useState<'all' | 'dofollow' | 'nofollow'>('all');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      setValidationError('Please enter a domain');
      return;
    }
    setValidationError('');
    setLoading(true);
    setSearched(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`${API_BASE}/api/backlinks?url=${encodeURIComponent(domain)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch backlinks');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (domain.trim()) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = (format: 'pdf' | 'csv') => {
    if (!domain || !results) return;
    setExporting(true);
    const params = new URLSearchParams({ url: domain, format });
    window.open(`${API_BASE}/api/backlinks/export?${params.toString()}`, '_blank');
    setTimeout(() => setExporting(false), 1000);
  };

  const backlinks: Backlink[] = results?.backlinks || [];
  const filtered = filterDofollow === 'all' ? backlinks
    : filterDofollow === 'dofollow' ? backlinks.filter(b => b.dofollow)
    : backlinks.filter(b => !b.dofollow);

  const totalAuth = filtered.length ? Math.round(filtered.reduce((a, b) => a + b.authority, 0) / filtered.length) : 0;
  const dofollowCount = results?.dofollow ?? 0;
  const nofollowCount = results?.nofollow ?? 0;

  return (

    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Backlink Analyzer — ValueScan" description="Analyze backlink profiles." />


      <main className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Link2 className="w-3 h-3" /> Backlink Checker
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Analyze your backlink profile</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Discover who links to you, their authority scores, and whether those links pass SEO value.</p>
          </motion.div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={domain}
                onChange={(e) => { setDomain(e.target.value); setValidationError(''); }}
                placeholder="Enter domain (e.g., valuescan.online)"
                className="w-full pl-12 pr-32 py-4 rounded-xl bg-card border border-border text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Analyze'}
              </button>
            </div>
            {validationError && (
              <p className="mt-2 text-sm text-destructive text-center">{validationError}</p>
            )}
          </form>

          {searched && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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

              {filtered.length === 0 && !error && (
                <div className="max-w-2xl mx-auto p-8 rounded-xl bg-card border border-border text-center">
                  <SearchX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground">No backlinks found for this domain. Try a different domain.</p>
                </div>
              )}

              {filtered.length > 0 && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                      <p className="text-xs text-muted-foreground mb-1">Total Backlinks</p>
                      <p className="text-2xl font-bold">{results?.total ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                      <p className="text-xs text-muted-foreground mb-1">Avg. Authority</p>
                      <p className="text-2xl font-bold">{totalAuth}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                      <p className="text-xs text-muted-foreground mb-1">Dofollow</p>
                      <p className="text-2xl font-bold text-green-500">{dofollowCount}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                      <p className="text-xs text-muted-foreground mb-1">Nofollow</p>
                      <p className="text-2xl font-bold text-amber-500">{nofollowCount}</p>
                    </div>
                  </div>

                  {/* Filter */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">Filter:</span>
                    {(['all', 'dofollow', 'nofollow'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilterDofollow(f)}
                        className={cn(
                          'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                          filterDofollow === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {f === 'all' ? 'All' : f === 'dofollow' ? 'Dofollow' : 'Nofollow'}
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

                  {/* Backlinks table */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Referring Domain</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Anchor Text</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Authority</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">First Seen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((b, i) => (
                            <tr key={i} className="border-t border-border hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{b.domain}</span>
                                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{b.anchor}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={cn(
                                  'font-medium',
                                  b.authority >= 90 ? 'text-green-500' : b.authority >= 70 ? 'text-amber-500' : 'text-muted-foreground'
                                )}>{b.authority}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  'text-xs font-medium px-2 py-0.5 rounded-full',
                                  b.dofollow ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                                )}>{b.dofollow ? 'dofollow' : 'nofollow'}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{b.firstSeen}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {!searched && !loading && (
            <div className="text-center py-16">
              <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a domain to analyze backlink profile</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground animate-pulse">Scanning backlink database...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
