import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const comparisons = [
  { feature: 'SEO audit', valuescan: 'Daily, 50+ checks', agency: 'Monthly, £300+', ok: 'partial' },
  { feature: 'Security scan', valuescan: 'Every audit, automated', agency: 'Extra cost, £500+', ok: 'check' },
  { feature: 'Competitor tracking', valuescan: 'Up to 5 sites, included', agency: 'Extra, £200+/site', ok: 'check' },
  { feature: 'PDF reports', valuescan: 'White-label, unlimited', agency: 'Custom, £150+ each', ok: 'check' },
  { feature: 'Response time', valuescan: '30 seconds', agency: '2-5 business days', ok: 'check' },
  { feature: 'Contract', valuescan: 'None, cancel anytime', agency: '6-12 months', ok: 'check' },
  { feature: 'API access', valuescan: 'Included on Max', agency: 'Not available', ok: 'partial' },
  { feature: 'Team seats', valuescan: 'Unlimited, all plans', agency: 'Extra per seat', ok: 'check' },
];

export default function Comparison() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Compare
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            ValueScan vs. an agency
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            The numbers that matter for bootstrapped teams.
          </motion.p>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl border border-border bg-card overflow-hidden overflow-x-auto min-w-[480px]"
        >
          <div className="grid grid-cols-3 text-sm font-medium border-b border-border bg-muted/30">
            <div className="px-4 py-3 sm:px-6 sm:py-4">Feature</div>
            <div className="px-4 py-3 sm:px-6 sm:py-4 text-center text-primary">ValueScan</div>
            <div className="px-4 py-3 sm:px-6 sm:py-4 text-center text-muted-foreground">Agency</div>
          </div>

          {comparisons.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="grid grid-cols-3 text-sm border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
            >
              <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-2">
                {row.ok === 'check' && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                {row.ok === 'partial' && <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-500 shrink-0" />}
                <span>{row.feature}</span>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:py-4 text-center font-medium text-foreground">{row.valuescan}</div>
              <div className="px-4 py-3 sm:px-6 sm:py-4 text-center text-muted-foreground">{row.agency}</div>
            </motion.div>
          ))}

          <div className="grid grid-cols-3 text-sm font-bold border-t border-border bg-muted/30">
            <div className="px-4 py-3 sm:px-6 sm:py-4">Annual cost</div>
            <div className="px-4 py-3 sm:px-6 sm:py-4 text-center text-primary">£1,188 (Max)</div>
            <div className="px-4 py-3 sm:px-6 sm:py-4 text-center text-muted-foreground">£3,600 – £15,000+</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
