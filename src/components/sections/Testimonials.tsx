import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const testimonials = [
  {
    quote: "ValueScan replaced our $3,000/month SEO consultant. The daily audits catch issues before they hurt our rankings. Game changer for our startup.",
    author: "Sarah Chen",
    role: "CEO, BuildFast",
    site: "buildfast.io",
  },
  {
    quote: "We use it for every client site before launch. Caught a missing HSTS header that would have failed our security audit. Worth every penny.",
    author: "Marcus Johnson",
    role: "DevOps Lead, AgencyOne",
    site: "agencyone.co",
  },
  {
    quote: "The competitor comparison feature is brilliant. I can see exactly where my site lags behind competitors and what to fix first.",
    author: "Elena Rossi",
    role: "Solo Founder",
    site: "elenarossi.dev",
  },
  {
    quote: "As a bootstrapped founder, I can't afford an SEO agency. ValueScan gives me the same insights for the price of a coffee.",
    author: "David Park",
    role: "Founder, TaskFlow",
    site: "taskflow.app",
  },
  {
    quote: "The API integration is flawless. We pipe audit results straight into our Slack and fix issues within hours of them appearing.",
    author: "Alex Thompson",
    role: "CTO, CloudSync",
    site: "cloudsync.io",
  },
  {
    quote: "I was skeptical about AI recommendations, but the fix suggestions are genuinely useful. It even suggested schema markup we had never considered.",
    author: "Priya Patel",
    role: "Marketing Director, GrowthHub",
    site: "growthhub.com",
  },
];

const row1 = testimonials.slice(0, 3);
const row2 = testimonials.slice(3, 6);

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="flex-shrink-0 w-80 sm:w-96 bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-48 sm:h-56 shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 cursor-default">
      <div>
        <Quote className="w-5 h-5 text-primary/40 mb-3" />
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-4">“{t.quote}”</p>
      </div>
      <div className="mt-3">
        <p className="text-xs sm:text-sm font-semibold">{t.author}</p>
        <p className="text-xs text-muted-foreground">{t.role}</p>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-20 sm:py-28 overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Testimonials
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight"
          >
            Loved by builders and marketers.
          </motion.h2>
        </div>

        <div className="flex flex-col gap-4 cursor-default select-none mask-gradient-x">
          <div className="flex overflow-hidden">
            <div className={cn("flex gap-3 sm:gap-4 flex-nowrap animate-marquee-left hover:[animation-play-state:paused]")}>
              {[...row1, ...row1].map((t, i) => (
                <TestimonialCard key={`r1-${i}`} t={t} />
              ))}
            </div>
          </div>
          <div className="flex overflow-hidden">
            <div className={cn("flex gap-3 sm:gap-4 flex-nowrap animate-marquee-right hover:[animation-play-state:paused]")}>
              {[...row2, ...row2].map((t, i) => (
                <TestimonialCard key={`r2-${i}`} t={t} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
