import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, ArrowRight, Sparkles, Shield, Zap, Globe, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ParticleBackground from '../animations/ParticleBackground';
import cn from '../../lib/utils';
import { normalizeAuditUrl } from '../../lib/normalize-url';

export default function Hero() {
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      const target = normalizeAuditUrl(urlParam);
      navigate(`/audit/scan?url=${encodeURIComponent(target)}`, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizeAuditUrl(url);
    if (!target) return;
    navigate(`/audit/scan?url=${encodeURIComponent(target)}`);
  };

  return (
    <section id="audit" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hidden md:block">
          <ParticleBackground />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] rounded-full bg-pink-500/10 blur-[80px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Website Audits</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Audit your website in{' '}
            <span className="gradient-text">seconds</span>, not hours
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            ValueScan runs 50+ automated checks across SEO, SEM, marketing, security, and technical performance — then gives you actionable fixes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-xl mx-auto mb-12"
          >
            <form onSubmit={handleSubmit} className="relative">
              <div
                className={cn(
                  'relative flex items-center gap-2 p-2 rounded-2xl border-2 transition-all duration-300 bg-card',
                  focused
                    ? 'border-primary/50 shadow-lg shadow-primary/10 ring-2 ring-primary/10'
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

            <p className="text-xs text-muted-foreground mt-3">
              No signup required. Free scan takes ~30 seconds.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span>Trusted by <strong className="text-foreground">10,000+</strong> users</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>50+ checks</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Security included</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>AI recommendations</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
