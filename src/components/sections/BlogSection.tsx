import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

const articles = [
  {
    title: 'How to Fix Core Web Vitals in 2026: A Complete Guide',
    excerpt: 'Google\'s CWV metrics are tougher than ever. Here\'s how to pass all three metrics without sacrificing design.',
    date: 'Jun 18, 2026',
    readTime: '8 min',
    tag: 'Performance',
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    title: 'The Solo Founder\'s SEO Playbook: Zero to Ranked',
    excerpt: 'No budget, no team, no problem. The exact strategy we used to grow from 0 to 50k monthly organic visitors.',
    date: 'Jun 15, 2026',
    readTime: '12 min',
    tag: 'SEO',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    title: 'Marketing Tags You\'re Probably Missing (And Losing Conversions)',
    excerpt: 'Most sites miss 3-5 critical marketing tags. Here\'s the checklist we use on every audit.',
    date: 'Jun 12, 2026',
    readTime: '6 min',
    tag: 'SEM',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    title: 'Security Headers Explained for Non-Developers',
    excerpt: 'HSTS, CSP, X-Frame-Options — what they mean, why they matter, and how to add them in 10 minutes.',
    date: 'Jun 10, 2026',
    readTime: '10 min',
    tag: 'Security',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
  {
    title: 'GEO: What It Is and Why Your Site Needs It in 2026',
    excerpt: 'Generative Engine Optimisation is the new SEO. Learn how AI search engines find your brand and how to optimise for them.',
    date: 'Jun 5, 2026',
    readTime: '9 min',
    tag: 'GEO',
    gradient: 'from-indigo-500/20 to-violet-500/20',
  },
  {
    title: 'Competitor Analysis: How to Steal Traffic Without Stealing',
    excerpt: 'Ethical ways to reverse-engineer what your competitors are doing right — and where they are vulnerable.',
    date: 'May 28, 2026',
    readTime: '11 min',
    tag: 'Strategy',
    gradient: 'from-yellow-500/20 to-amber-500/20',
  },
  {
    title: '8 SaaS Growth Hacks for Lean Teams in 2026',
    excerpt: 'Struggling to scale? These growth hacks cover acquisition, retention, and expansion with tactics built for small teams.',
    date: 'May 20, 2026',
    readTime: '12 min',
    tag: 'Growth',
    gradient: 'from-teal-500/20 to-cyan-500/20',
  },
  {
    title: 'How Much Does an SEO Agency Cost in 2026?',
    excerpt: 'SEO agencies charge £2,000–£8,000/month. Here is what drives the price and what lean teams use instead.',
    date: 'May 15, 2026',
    readTime: '10 min',
    tag: 'Pricing',
    gradient: 'from-rose-500/20 to-pink-500/20',
  },
  {
    title: 'Reddit Marketing for SaaS: A Complete Guide',
    excerpt: 'How to find the right subreddits, engage without spamming, and turn Reddit into a growth channel.',
    date: 'May 8, 2026',
    readTime: '14 min',
    tag: 'Community',
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    title: 'AI CMO vs. Hiring a Marketing Team: Full Comparison',
    excerpt: 'AI CMO or an in-house team — which is worth your budget? A full breakdown of cost, ROI, and outcomes.',
    date: 'Apr 28, 2026',
    readTime: '10 min',
    tag: 'Strategy',
    gradient: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    title: '10 Best Ahrefs Alternatives in 2026 (Ranked)',
    excerpt: 'We compared 10 tools on backlinks, SEO, GEO and distribution. See which fits your budget and workflow.',
    date: 'Apr 20, 2026',
    readTime: '13 min',
    tag: 'Tools',
    gradient: 'from-cyan-500/20 to-blue-500/20',
  },
  {
    title: 'Schema Markup: The Missing Piece in Your SEO',
    excerpt: 'How structured data helps you win rich snippets, improve CTR, and get found by AI search engines.',
    date: 'Apr 12, 2026',
    readTime: '8 min',
    tag: 'SEO',
    gradient: 'from-green-500/20 to-teal-500/20',
  },
  {
    title: 'How to Use AI for Content Marketing at Scale',
    excerpt: 'From ideation to distribution — the AI-powered workflow that produces 10x content without 10x headcount.',
    date: 'Apr 5, 2026',
    readTime: '11 min',
    tag: 'AI',
    gradient: 'from-purple-500/20 to-violet-500/20',
  },
];

export default function BlogSection() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
            >
              From the blog
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl font-bold tracking-tight"
            >
              Latest insights
            </motion.h2>
          </div>
          <Link to="/blog" className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            View all articles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {articles.map((article, index) => (
            <Link
              key={article.title}
              to={`/blog/${slugify(article.title)}`}
              className={cn(
                'group relative rounded-2xl border border-border bg-card p-5',
                'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                'transition-all duration-300 hover:-translate-y-1',
                index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''
              )}
            >
              <div className={cn(
                'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
                article.gradient
              )} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {article.tag}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {article.date}
                  </div>
                </div>
                <h3 className={cn('font-semibold mb-2 group-hover:text-primary transition-colors leading-snug', index === 0 ? 'text-lg' : 'text-sm')}>
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {article.readTime}
                </div>
              </div>
</Link>
          ))}
        </div>
      </div>
    </section>
  );
}
