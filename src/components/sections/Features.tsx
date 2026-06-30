import { motion } from 'framer-motion';
import {
  Search, TrendingUp, Shield, Gauge, FileText, BarChart3,
  Bell, Users, Cpu, Link2, MapPin, Target, Key, Compass, Eye, ArrowRight
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const features = [
  {
    icon: Search,
    title: 'SEO Deep Scan',
    description: 'Meta tags, headings, structured data, internal links, image alt text, and mobile-friendliness — all checked in one pass.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: TrendingUp,
    title: 'SEM & Marketing Tags',
    description: 'Detect missing or broken analytics, conversion pixels, and marketing tags from Google, Meta, LinkedIn, and more.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Shield,
    title: 'Security Headers',
    description: 'Check HTTPS, HSTS, CSP, X-Frame-Options, and other security headers that protect your users and rankings.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Gauge,
    title: 'Performance Audit',
    description: 'Core Web Vitals, load times, resource optimization, and render-blocking analysis for lightning-fast pages.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: FileText,
    title: 'AI-Powered Reports',
    description: 'Get natural-language explanations of every issue, prioritized by impact, with step-by-step fix instructions.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: BarChart3,
    title: 'Competitor Analysis',
    description: 'Compare your site against up to 3 competitors. See where you lead and where you need to catch up.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Bell,
    title: 'Change Alerts',
    description: 'Get notified when your scores drop, new issues appear, or competitors make changes that affect you.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share reports, assign fixes, and track progress across your team with unlimited seats on every plan.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: Cpu,
    title: 'API Access',
    description: 'Programmatic access to all audit data. Integrate with your CI/CD, dashboards, or internal tools.',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: Key,
    title: 'Keyword Research',
    description: 'Discover 28B+ keywords with search volume, difficulty, CPC, and intent data. Find opportunities your competitors miss.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Target,
    title: 'Rank Tracker',
    description: 'Monitor daily keyword positions across search engines. Track improvements, spot declines, and act fast.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Link2,
    title: 'Backlink Checker',
    description: 'Analyze your backlink profile. Discover referring domains, authority scores, and dofollow vs nofollow ratios.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Eye,
    title: 'AI Visibility (GEO)',
    description: 'Track how ChatGPT, Perplexity, Gemini, and Copilot mention your brand. Optimize for Generative Engine Optimisation.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: MapPin,
    title: 'Local SEO',
    description: 'Verify your Google Business Profile, Apple Maps, Yelp, and 20+ local directories. Fix inconsistencies and boost local rankings.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Compass,
    title: 'Content Gap',
    description: 'Discover topics your competitors rank for that you don\'t. Find high-opportunity content gaps and traffic potential.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
];

export default function Features() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section id="features" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            Everything you need to{' '}
            <span className="gradient-text">optimize</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            One platform. Every audit. Actionable insights in seconds.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className={cn(
                'group relative p-6 rounded-2xl border border-border bg-card',
                'hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10',
                'transition-all duration-300 hover:-translate-y-1'
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', feature.bg)}>
                <feature.icon className={cn('w-5 h-5', feature.color)} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <a href="#features" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
            See all features
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
