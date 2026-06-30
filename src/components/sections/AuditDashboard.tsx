import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Search, Gauge, BarChart3, Zap, Globe, Lock, FileText, ExternalLink } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const scores = [
  { label: 'SEO', score: 87, color: 'text-green-500', bg: 'bg-green-500', ring: 'stroke-green-500' },
  { label: 'SEM', score: 72, color: 'text-yellow-500', bg: 'bg-yellow-500', ring: 'stroke-yellow-500' },
  { label: 'Security', score: 95, color: 'text-green-500', bg: 'bg-green-500', ring: 'stroke-green-500' },
  { label: 'Performance', score: 64, color: 'text-orange-500', bg: 'bg-orange-500', ring: 'stroke-orange-500' },
];

const issues = [
  { severity: 'error', message: 'Missing HSTS header on HTTPS response', category: 'Security' },
  { severity: 'error', message: 'No Open Graph image meta tag', category: 'SEO' },
  { severity: 'warning', message: 'Image missing alt text (3 found)', category: 'SEO' },
  { severity: 'warning', message: 'Google Analytics 4 not detected', category: 'SEM' },
  { severity: 'info', message: 'Consider adding schema.org markup', category: 'SEO' },
  { severity: 'info', message: 'Largest Contentful Paint is 2.8s', category: 'Performance' },
];

const checks = [
  { icon: Shield, label: 'HTTPS', status: 'pass' },
  { icon: Lock, label: 'CSP', status: 'pass' },
  { icon: Search, label: 'Meta tags', status: 'pass' },
  { icon: FileText, label: 'Sitemap', status: 'pass' },
  { icon: Gauge, label: 'Core Web Vitals', status: 'warn' },
  { icon: Globe, label: 'Mobile-friendly', status: 'pass' },
  { icon: BarChart3, label: 'Analytics', status: 'fail' },
  { icon: Zap, label: 'Compression', status: 'pass' },
];

function ScoreRing({ score, color, label }: { score: number; color: string; label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            className={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{score}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export default function AuditDashboard() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Live Preview
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            See what an audit looks like <span className="gradient-text">before you run it</span>
          </motion.h2>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl"
        >
          {/* Dashboard header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="text-xs text-muted-foreground font-mono">valuescan.online</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Just now</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: Score rings */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-semibold mb-6">Overall Score</h3>
              <div className="grid grid-cols-2 gap-6">
                {scores.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  >
                    <ScoreRing score={s.score} color={s.ring} label={s.label} />
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
                <h4 className="text-sm font-semibold mb-3">Quick Checks</h4>
                <div className="grid grid-cols-2 gap-2">
                  {checks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2 text-xs">
                      <check.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{check.label}</span>
                      {check.status === 'pass' && <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />}
                      {check.status === 'warn' && <AlertTriangle className="w-3 h-3 text-yellow-500 ml-auto" />}
                      {check.status === 'fail' && <AlertTriangle className="w-3 h-3 text-red-500 ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Issues list */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold">Issues Found</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    2 Critical
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    2 Warnings
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    2 Suggestions
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors hover:bg-muted/30',
                      issue.severity === 'error' && 'border-red-500/20 bg-red-500/5',
                      issue.severity === 'warning' && 'border-yellow-500/20 bg-yellow-500/5',
                      issue.severity === 'info' && 'border-blue-500/20 bg-blue-500/5'
                    )}
                  >
                    {issue.severity === 'error' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                    {issue.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />}
                    {issue.severity === 'info' && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{issue.message}</p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full shrink-0',
                      issue.severity === 'error' && 'bg-red-500/10 text-red-500',
                      issue.severity === 'warning' && 'bg-yellow-500/10 text-yellow-500',
                      issue.severity === 'info' && 'bg-blue-500/10 text-blue-500'
                    )}>
                      {issue.category}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">AI Recommendation</p>
                    <p className="text-sm text-muted-foreground">
                      Adding an HSTS header would improve your security score by 15 points. It's a one-line server config change. Click "Fix Guide" for step-by-step instructions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
