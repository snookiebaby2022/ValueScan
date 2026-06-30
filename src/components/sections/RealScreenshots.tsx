import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const screenshots = [
  {
    title: 'Dashboard Overview',
    desc: 'Your site health at a glance. Scores, trends, and alerts in one view.',
    color: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
    content: 'dashboard',
  },
  {
    title: 'SEO Audit Report',
    desc: 'Detailed breakdown of every SEO issue, with priority and fix instructions.',
    color: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
    content: 'seo',
  },
  {
    title: 'Security Scan',
    desc: 'Header analysis, SSL checks, and vulnerability reports.',
    color: 'bg-gradient-to-br from-red-500/20 to-orange-500/20',
    content: 'security',
  },
  {
    title: 'Competitor Comparison',
    desc: 'Side-by-side scores against up to 5 competitors.',
    color: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
    content: 'competitor',
  },
];

function ScreenshotMock({ type }: { type: string }) {
  if (type === 'dashboard') {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-6 w-20 bg-primary/20 rounded-lg" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[87, 72, 95, 64].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-card border border-border">
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 mx-auto mb-2 flex items-center justify-center text-xs font-bold">{s}</div>
              <div className="h-2 w-12 bg-muted rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="h-3 w-32 bg-muted rounded mb-2" />
          <div className="space-y-1.5">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="h-2 flex-1 bg-muted rounded" />
                <div className="h-2 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (type === 'seo') {
    return (
      <div className="p-4 space-y-3">
        <div className="h-3 w-28 bg-muted rounded mb-2" />
        <div className="space-y-2">
          {['Meta title too long', 'Missing canonical tag', 'Image alt text missing', 'Schema markup error'].map((_issue, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
              <div className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <div className="flex-1">
                <div className="h-2.5 w-32 bg-muted rounded mb-1" />
                <div className="h-2 w-20 bg-muted/50 rounded" />
              </div>
              <div className="h-6 w-14 bg-primary/20 rounded text-[10px] flex items-center justify-center text-primary">Fix</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (type === 'security') {
    return (
      <div className="p-4 space-y-3">
        <div className="h-3 w-24 bg-muted rounded mb-2" />
        <div className="grid grid-cols-2 gap-2">
          {['HTTPS', 'HSTS', 'CSP', 'X-Frame'].map((_h, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-card border border-border flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-red-500' : 'bg-green-500'}`} />
              <div className="h-2.5 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="h-2.5 w-24 bg-red-500/30 rounded mb-1" />
          <div className="h-2 w-full bg-red-500/20 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3">
      <div className="h-3 w-32 bg-muted rounded mb-2" />
      <div className="grid grid-cols-3 gap-2 mb-2">
        {['You', 'Comp A', 'Comp B'].map((_l, i) => (
          <div key={i} className="text-center">
            <div className="h-8 w-8 rounded-full bg-muted mx-auto mb-1" />
            <div className="h-2 w-12 bg-muted rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {['SEO Score', 'Performance', 'Security'].map((_m, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-20 bg-muted rounded" />
            <div className="flex-1 h-2 bg-muted/50 rounded overflow-hidden">
              <div className="h-full bg-primary/40 rounded" style={{ width: `${70 + i * 10}%` }} />
            </div>
            <div className="h-2 w-6 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RealScreenshots() {
  const { ref, isInView } = useInView(0.1);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const next = () => setActive((a) => (a + 1) % screenshots.length);
  const prev = () => setActive((a) => (a - 1 + screenshots.length) % screenshots.length);

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Product screenshots
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            What the dashboard <span className="gradient-text">actually looks like</span>
          </motion.h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Screenshot browser */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl cursor-pointer group"
            onClick={() => setLightbox(true)}
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground font-mono">app.valuescan.online</span>
              </div>
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className={cn('min-h-[280px]', screenshots[active].color)}>
              <ScreenshotMock type={screenshots[active].content} />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-card/90 rounded-lg backdrop-blur text-sm font-medium">
                Click to expand
              </div>
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            {screenshots.map((shot, i) => (
              <button
                key={shot.title}
                onClick={() => setActive(i)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-all',
                  active === i
                    ? 'border-primary/50 bg-card shadow-lg shadow-primary/5'
                    : 'border-border bg-card/30 hover:bg-card/60'
                )}
              >
                <h3 className={cn('font-semibold mb-1', active === i && 'text-primary')}>{shot.title}</h3>
                <p className="text-sm text-muted-foreground">{shot.desc}</p>
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLightbox(false)} className="absolute -top-12 right-0 p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="flex-1 text-center">
                    <span className="text-xs text-muted-foreground font-mono">{screenshots[active].title}</span>
                  </div>
                </div>
                <div className={cn('min-h-[400px] p-6', screenshots[active].color)}>
                  <ScreenshotMock type={screenshots[active].content} />
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <button onClick={prev} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-muted-foreground">{active + 1} / {screenshots.length}</span>
                <button onClick={next} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
