import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Phone, Globe, Clock, CheckCircle, XCircle, Download, SearchX, AlertTriangle, Loader2 } from 'lucide-react';
import MetaTags from '../layout/MetaTags';
import { API_BASE, authHeaders } from '../../lib/api';

export default function LocalSeo() {
  const [business, setBusiness] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business.trim()) {
      setValidationError('Please enter a business name');
      return;
    }
    setValidationError('');
    setLoading(true);
    setSearched(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch(`${API_BASE}/api/local-seo?url=${encodeURIComponent(business)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch local SEO data');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (business.trim()) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = (format: 'pdf' | 'csv') => {
    if (!business || !results) return;
    setExporting(true);
    const params = new URLSearchParams({ url: business, format });
    window.open(`${API_BASE}/api/local-seo/export?${params.toString()}`, '_blank');
    setTimeout(() => setExporting(false), 1000);
  };

  const listedCount = results?.listings?.filter((l: any) => l.listed).length ?? 0;
  const missingCount = results?.listings?.filter((l: any) => !l.listed).length ?? 0;
  const issueCount = results?.listings?.reduce((a: number, l: any) => a + l.issues.length, 0) ?? 0;

  return (

    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Local SEO — ValueScan" description="Local SEO audit tools." />


      <main className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium mb-4">
              <MapPin className="w-3 h-3" /> Local SEO
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Check your local presence</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Verify your Google Business Profile, Apple Maps, Yelp, and other local listings for consistency and completeness.</p>
          </motion.div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={business}
                onChange={(e) => { setBusiness(e.target.value); setValidationError(''); }}
                placeholder="Enter business name or address..."
                className="w-full pl-12 pr-32 py-4 rounded-xl bg-card border border-border text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Check Local'}
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

          {searched && !loading && results && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {(!results.listings || results.listings.length === 0) && (
                <div className="max-w-2xl mx-auto p-8 rounded-xl bg-card border border-border text-center mb-6">
                  <SearchX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                  <p className="text-sm text-muted-foreground">No local listings data available for this business. Try a different name or address.</p>
                </div>
              )}

              {/* Business card */}
              <div className="p-5 rounded-xl bg-card border border-border mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{results?.name}</h2>
                    <p className="text-sm text-muted-foreground">{results?.address}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{results?.phone}</span>
                      <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{results?.website}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{results?.hours}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-lg font-bold">{results?.gbpRating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{results?.gbpReviews} Google reviews</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Listings Found</p>
                  <p className="text-2xl font-bold text-green-500">{listedCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Missing</p>
                  <p className="text-2xl font-bold text-red-500">{missingCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                  <p className="text-xs text-muted-foreground mb-1">Issues</p>
                  <p className="text-2xl font-bold text-amber-500">{issueCount}</p>
                </div>
              </div>

              {/* Listings table */}
              <div className="rounded-xl border border-border overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Platform</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Rating</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reviews</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results?.listings?.map((l: any, i: number) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium">{l.platform}</td>
                          <td className="px-4 py-3">
                            {l.listed ? (
                              <span className="flex items-center gap-1 text-xs text-green-500 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Listed</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="w-3.5 h-3.5" /> Missing</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">{l.rating ? l.rating.toFixed(1) : '—'}</td>
                          <td className="px-4 py-3 text-right">{l.reviews ?? '—'}</td>
                          <td className="px-4 py-3">
                            {l.issues.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {l.issues.map((issue: string, j: number) => (
                                  <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{issue}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-green-500">No issues</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
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
            </motion.div>
          )}

          {!searched && !loading && (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Enter your business name to check local listings</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground animate-pulse">Scanning local directories...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
