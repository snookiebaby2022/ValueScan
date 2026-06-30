import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanLine, Search, Loader2, CheckCircle, AlertTriangle, ArrowRight, Zap } from 'lucide-react';
import type { ToolItem } from '../../lib/tools-catalog';

type GenericToolPageProps = {
  tool: ToolItem;
  icon: React.ReactNode;
  placeholder?: string;
  sampleResults?: { label: string; value: string; status: 'good' | 'warn' | 'bad' }[];
  tips?: string[];
};

export default function GenericToolPage({
  tool,
  icon,
  placeholder = 'https://example.com',
  sampleResults = [],
  tips = [],
}: GenericToolPageProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setRan(false);
    setTimeout(() => {
      setLoading(false);
      setRan(true);
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              {icon}
              {tool.label}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{tool.label}</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">{tool.description}</p>
          </motion.div>

          <form onSubmit={run} className="flex gap-2 mb-8 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary/50"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Analyze
            </button>
          </form>

          {ran && sampleResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card overflow-hidden mb-8">
              <div className="px-5 py-3 border-b border-border bg-muted/30 text-sm font-medium">Results for {url}</div>
              <div className="divide-y divide-border">
                {sampleResults.map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="flex items-center gap-2 font-medium">
                      {r.status === 'good' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {r.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {r.status === 'bad' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tips.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3">Pro tips</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
