import { motion } from 'framer-motion';
import { Star, Award } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

export default function SocialProof() {
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
            Loved by users
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            Rated <span className="gradient-text">4.9/5</span> by 1,000+ users
          </motion.h2>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-12"
        >
          {/* G2 badge */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <p className="text-sm font-medium">G2</p>
            <p className="text-xs text-muted-foreground">4.9/5 · 200+ reviews</p>
          </div>

          {/* Capterra badge */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <p className="text-sm font-medium">Capterra</p>
            <p className="text-xs text-muted-foreground">4.8/5 · 150+ reviews</p>
          </div>

          {/* Trustpilot badge */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-green-500 fill-green-500" />
              ))}
            </div>
            <p className="text-sm font-medium">Trustpilot</p>
            <p className="text-xs text-muted-foreground">4.9/5 · 300+ reviews</p>
          </div>

          {/* Product Hunt badge */}
          <div className="flex flex-col items-center gap-2">
            <Award className="w-6 h-6 text-orange-500" />
            <p className="text-sm font-medium">Product Hunt</p>
            <p className="text-xs text-muted-foreground">#1 Product of the Day</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
