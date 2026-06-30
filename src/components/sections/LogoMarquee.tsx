import { motion } from 'framer-motion';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

// Color palettes for each initial letter — matches the image style
const colorMap: Record<string, { bg: string; text: string }> = {
  U: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  C: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  R: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  S: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  I: { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400' },
  L: { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  K: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  V: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  T: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  W: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  F: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  G: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  B: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  N: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  D: { bg: 'bg-lime-500/20', text: 'text-lime-400' },
  H: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
};

const logos = [
  'UpGuard', 'Cloud66', 'Razer', 'StickerMule', 'InsightTimer', 'Locket', 'Kong', 'VWO',
  'Tailwind', 'Radix', 'Vercel', 'Stripe', 'Notion', 'Figma', 'Linear', 'Supabase',
  'Webflow', 'Framer', 'GitHub', 'GitLab', 'Bitbucket', 'Slack', 'Discord', 'Shopify',
];

const row1 = logos.slice(0, 8);
const row2 = logos.slice(8, 16);
const row3 = logos.slice(16, 24);

function LogoItem({ name }: { name: string }) {
  const initial = name[0];
  const colors = colorMap[initial] || { bg: 'bg-violet-500/20', text: 'text-violet-400' };

  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-border/60 bg-card/80 backdrop-blur-sm text-sm font-medium text-foreground whitespace-nowrap hover:border-primary/20 transition-colors cursor-default">
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold', colors.bg, colors.text)}>
        {initial}
      </div>
      <span>{name}</span>
    </div>
  );
}

export default function LogoMarquee() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-16 sm:py-20 overflow-hidden bg-background">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-xs uppercase tracking-[0.25em] font-semibold text-muted-foreground text-center mb-10"
        >
          Trusted by teams at
        </motion.p>

        <div className="flex flex-col gap-3 cursor-default select-none mask-gradient-x">
          <div className="flex overflow-hidden">
            <div className={cn('flex gap-3 flex-nowrap animate-marquee-left hover:[animation-play-state:paused]')}>
              {[...row1, ...row1].map((name, i) => (
                <LogoItem key={`r1-${i}`} name={name} />
              ))}
            </div>
          </div>
          <div className="flex overflow-hidden">
            <div className={cn('flex gap-3 flex-nowrap animate-marquee-right hover:[animation-play-state:paused]')}>
              {[...row2, ...row2].map((name, i) => (
                <LogoItem key={`r2-${i}`} name={name} />
              ))}
            </div>
          </div>
          <div className="flex overflow-hidden">
            <div className={cn('flex gap-3 flex-nowrap animate-marquee-left-slow hover:[animation-play-state:paused]')}>
              {[...row3, ...row3].map((name, i) => (
                <LogoItem key={`r3-${i}`} name={name} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
