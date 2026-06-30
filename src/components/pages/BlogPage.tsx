import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ScanLine, ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';
import Breadcrumb from '../layout/Breadcrumb';

const articles = [
  { slug: 'core-web-vitals', title: 'How to Fix Core Web Vitals in 2026', excerpt: 'Pass all three CWV metrics without sacrificing design.', date: 'Jun 18, 2026', readTime: '8 min', tag: 'Performance', gradient: 'from-orange-500/20 to-red-500/20' },
  { slug: 'solo-founder-seo', title: "The Solo Founder's SEO Playbook", excerpt: 'Grow from 0 to 50k monthly organic visitors.', date: 'Jun 15, 2026', readTime: '12 min', tag: 'SEO', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { slug: 'marketing-tags', title: "Marketing Tags You're Probably Missing", excerpt: 'The checklist we use on every audit.', date: 'Jun 12, 2026', readTime: '6 min', tag: 'SEM', gradient: 'from-purple-500/20 to-pink-500/20' },
  { slug: 'security-headers', title: 'Security Headers Explained', excerpt: 'HSTS, CSP, X-Frame-Options — what they mean and how to add them.', date: 'Jun 10, 2026', readTime: '10 min', tag: 'Security', gradient: 'from-green-500/20 to-emerald-500/20' },
  { slug: 'geo-optimisation', title: 'GEO: What It Is and Why You Need It', excerpt: 'Generative Engine Optimisation is the new SEO.', date: 'Jun 5, 2026', readTime: '9 min', tag: 'GEO', gradient: 'from-indigo-500/20 to-violet-500/20' },
  { slug: 'competitor-analysis', title: 'Competitor Analysis: Steal Traffic Ethically', excerpt: 'Reverse-engineer what competitors do right.', date: 'May 28, 2026', readTime: '11 min', tag: 'Strategy', gradient: 'from-yellow-500/20 to-amber-500/20' },
  { slug: 'saas-growth-hacks', title: '8 SaaS Growth Hacks for Lean Teams', excerpt: 'Acquisition, retention, and expansion tactics.', date: 'May 20, 2026', readTime: '12 min', tag: 'Growth', gradient: 'from-teal-500/20 to-cyan-500/20' },
  { slug: 'seo-agency-cost', title: 'How Much Does an SEO Agency Cost?', excerpt: 'What drives the price and what lean teams use instead.', date: 'May 15, 2026', readTime: '10 min', tag: 'Pricing', gradient: 'from-rose-500/20 to-pink-500/20' },
  { slug: 'reddit-marketing', title: 'Reddit Marketing for SaaS', excerpt: 'Find the right subreddits and engage without spamming.', date: 'May 8, 2026', readTime: '14 min', tag: 'Community', gradient: 'from-orange-500/20 to-red-500/20' },
  { slug: 'ai-cmo-vs-team', title: 'AI CMO vs. Hiring a Marketing Team', excerpt: 'Full breakdown of cost, ROI, and outcomes.', date: 'Apr 28, 2026', readTime: '10 min', tag: 'Strategy', gradient: 'from-blue-500/20 to-indigo-500/20' },
  { slug: 'ahrefs-alternatives', title: '10 Best Ahrefs Alternatives', excerpt: 'Compared on backlinks, SEO, GEO and distribution.', date: 'Apr 20, 2026', readTime: '13 min', tag: 'Tools', gradient: 'from-cyan-500/20 to-blue-500/20' },
  { slug: 'schema-markup', title: 'Schema Markup: The Missing Piece', excerpt: 'Win rich snippets and get found by AI search engines.', date: 'Apr 12, 2026', readTime: '8 min', tag: 'SEO', gradient: 'from-green-500/20 to-teal-500/20' },
];

const tags = ['All', 'SEO', 'SEM', 'Performance', 'Security', 'Strategy', 'Growth', 'GEO', 'Community', 'Tools', 'Pricing'];

export default function BlogPage() {
  const { ref, isInView } = useInView(0.1);
  const [activeTag, setActiveTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = articles.filter((a) => {
    const tagMatch = activeTag === 'All' || a.tag === activeTag;
    const searchMatch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return tagMatch && searchMatch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">


      <main className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">The ValueScan Blog</h1>
            <p className="text-muted-foreground text-lg">SEO, SEM, security, and growth — written for founders who ship.</p>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                  activeTag === tag ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}
              >
                {tag}
              </button>
            ))}
          </div>

          <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((article, index) => (
                <motion.div
                  key={article.title}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: 0.05 * index }}
                  className="group"
                >
                  <Link to={`/blog/${article.slug}`} className={cn(
                    'block relative rounded-2xl border border-border bg-card p-6',
                    'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                    'transition-all duration-300 hover:-translate-y-1'
                  )}>
                    <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none', article.gradient)} />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{article.tag}</span>
                      </div>
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors leading-snug">{article.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{article.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{article.date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-4px] group-hover:translate-x-0">
                          Read more <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No articles found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filter to find what you are looking for.</p>
              <button
                onClick={() => { setActiveTag('All'); setSearchQuery(''); }}
                className="text-sm text-primary hover:underline font-medium"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
