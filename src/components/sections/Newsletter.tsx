import { motion } from 'framer-motion';
import { Mail, ArrowRight, Zap } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

export default function Newsletter() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-border bg-card p-8 sm:p-12 text-center overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Weekly SEO tips, <span className="gradient-text">zero spam</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Get one actionable fix every Monday. We scan 1,000+ sites to find the most common issues — and send you the fix before it hurts yours.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Thanks for subscribing! (Demo)');
              }}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
            >
              <div className="relative flex-1 w-full">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all w-full sm:w-auto justify-center"
              >
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-xs text-muted-foreground mt-4">
              8,000+ subscribers. Unsubscribe anytime. No spam, ever.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
