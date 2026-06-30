import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

export default function VideoEmbed() {
  const { ref, isInView } = useInView(0.1);
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Watch it in action
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            See ValueScan run a full audit in <span className="gradient-text">60 seconds</span>
          </motion.h2>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl aspect-video"
        >
          {!playing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-muted cursor-pointer group" onClick={() => setPlaying(true)}>
              {/* Animated rings */}
              <div className="absolute w-32 h-32 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute w-24 h-24 rounded-full border-2 border-primary/50" />
              <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-primary-foreground ml-1" />
              </div>
              <div className="absolute bottom-8 left-8 right-8">
                <p className="text-sm font-medium">Product Demo — 2:34</p>
                <p className="text-xs text-muted-foreground">Watch how ValueScan audits a live site and generates a full report</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Video placeholder — embed your YouTube/Vimeo link here</p>
                <button
                  onClick={() => setPlaying(false)}
                  className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                >
                  Close
                </button>
              </div>
              <button
                onClick={() => setPlaying(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
