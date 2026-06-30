import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const tabs = ['Traffic', 'SEO', 'Links', 'Technical', 'GEO'];

const funnel = [
  { label: 'Saw you in Google', value: '10', change: '-210.0%', color: 'text-red-400' },
  { label: 'Clicked through', value: '2', change: '-300.0%', color: 'text-red-400' },
  { label: 'Visited your site', value: '17', change: '-62.2%', color: 'text-red-400' },
];

const metrics = [
  { label: 'Click rate', value: '28.8%' },
  { label: 'From other channels', value: '8.5×' },
];

export default function AnalyticsPreview() {
  const { ref, isInView } = useInView(0.1);
  const [activeTab, setActiveTab] = useState('Traffic');
  const [period, setPeriod] = useState('7');

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Analytics
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            See how people <span className="gradient-text">found you</span>
          </motion.h2>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    activeTab === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setPeriod('7')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  period === '7' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                Last 7 days
              </button>
              <button
                onClick={() => setPeriod('30')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  period === '30' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                Last 30 days
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {/* Funnel */}
            <div className="mb-8">
              <p className="text-sm font-semibold mb-1">How people found you</p>
              <p className="text-xs text-muted-foreground mb-6">From a search result to a visit on your site</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {funnel.map((step, i) => (
                  <div key={step.label} className="relative">
                    <p className="text-xs text-muted-foreground mb-2">{step.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold">{step.value}</p>
                    <p className={cn('text-xs font-medium flex items-center gap-1 mt-1', step.color)}>
                      <TrendingUp className="w-3 h-3" />
                      {step.change}
                    </p>
                    {i < 2 && (
                      <div className="absolute top-1/2 -right-2 w-4 border-t border-dashed border-border hidden sm:block" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-6 mb-8">
              {metrics.map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="text-sm font-bold">{m.value}</span>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="text-sm font-semibold mb-1">Traffic over time</p>
              <p className="text-xs text-muted-foreground mb-6">Visits vs. search clicks — last {period} days</p>
              <div className="relative h-40 flex items-end gap-1">
                {[35, 65, 45, 30, 55, 80, 50, 40, 70, 60, 45, 75, 55, 40].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className="w-full bg-primary/30 rounded-t-sm group-hover:bg-primary/50 transition-colors"
                      style={{ height: `${h}%` }}
                    />
                    <div className="w-full bg-primary/10 rounded-t-sm group-hover:bg-primary/30 transition-colors"
                      style={{ height: `${Math.max(0, h - 15)}%` }}
                    />
                  </div>
                ))}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-muted/30" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
