import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Gift } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

export default function Affiliate() {
  const { ref, isInView } = useInView(0.1);
  const [copied, setCopied] = useState(false);
  const refCode = 'valuescan-20';

  const copyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-8 sm:p-12 text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Earn <span className="gradient-text">30% recurring</span> for every referral
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Share ValueScan with your network. Get paid 30% of every subscription for life. No cap, no minimums.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <div className="flex-1 w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border">
                <span className="text-sm font-mono text-muted-foreground">{refCode}</span>
              </div>
              <button
                onClick={copyCode}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all',
                  copied ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'
                )}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy code'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">30%</span>
                <span>commission</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">Lifetime</span>
                <span>recurring</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">£0</span>
                <span>minimum payout</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
