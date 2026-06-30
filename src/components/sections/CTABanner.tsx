import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, Globe, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';
import { normalizeAuditUrl } from '../../lib/normalize-url';

export default function CTABanner() {
  const { ref, isInView } = useInView(0.1);
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizeAuditUrl(url);
    if (!target) return;
    navigate(`/audit/scan?url=${encodeURIComponent(target)}`);
  };

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-card to-card/80 p-8 sm:p-12 lg:p-16 text-center overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[80px] pointer-events-none"
          />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Ready to <span className="gradient-text">audit your site</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Join 10,000+ founders and teams who use ValueScan to catch issues before they cost you traffic.
            </p>

            <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
              <div
                className={cn(
                  'relative flex items-center gap-2 p-2 rounded-2xl border-2 transition-all duration-300 bg-background',
                  focused
                    ? 'border-primary/50 shadow-lg shadow-primary/10'
                    : 'border-border hover:border-border/80'
                )}
              >
                <div className="pl-3 text-muted-foreground">
                  <Globe className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  inputMode="url"
                  placeholder="example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="flex-1 bg-transparent border-0 outline-none text-sm sm:text-base placeholder:text-muted-foreground/60 py-3 px-2"
                  required
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                >
                  <ScanLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Audit Now</span>
                  <ArrowRight className="w-4 h-4 sm:hidden" />
                </button>
              </div>
            </form>

            <p className="text-xs text-muted-foreground mt-4">
              Free scan. No credit card required.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
