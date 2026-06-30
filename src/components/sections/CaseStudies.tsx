import { motion } from 'framer-motion';
import { ArrowUpRight, Users } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const cases = [
  {
    company: 'BuildFast',
    logo: 'B',
    metric: '+340%',
    label: 'Organic traffic',
    description: 'Fixed 12 critical SEO issues identified by ValueScan. Ranked #1 for 8 target keywords within 3 months.',
    color: 'bg-blue-500',
  },
  {
    company: 'CloudSync',
    logo: 'C',
    metric: '-60%',
    label: 'Security vulnerabilities',
    description: 'Daily security scans caught a misconfigured CSP before a pen test. Fixed in 48 hours.',
    color: 'bg-green-500',
  },
  {
    company: 'GrowthHub',
    logo: 'G',
    metric: '£12k',
    label: 'Saved vs agency',
    description: 'Replaced a £3,000/month SEO retainer with ValueScan Max. Same results, 12x cheaper.',
    color: 'bg-purple-500',
  },
];

export default function CaseStudies() {
  const { ref, isInView } = useInView(0.1);

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
            Case studies
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            Real results, <span className="gradient-text">real numbers</span>
          </motion.h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.company}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * i }}
              className={cn(
                'relative rounded-2xl border border-border bg-card p-6 sm:p-8',
                'hover:border-primary/30 transition-all duration-300 hover:-translate-y-1'
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold', c.color)}>
                    {c.logo}
                  </div>
                  <span className="font-semibold">{c.company}</span>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="mb-4">
                <p className="text-4xl font-bold gradient-text">{c.metric}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {c.description}
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>Verified by ValueScan</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
