import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, X, ExternalLink, GitBranch, FileText, Zap, Layers, Puzzle, Smartphone, MousePointer, Users, Compass, Megaphone, DollarSign, Mail, Share2, Video, Image, TrendingUp, Lightbulb, BarChart2, Award, Globe, Briefcase, Target, Search, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';
import MetaTags from '../layout/MetaTags';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'seo-audit': Search,
  'ai-seo': Zap,
  'site-arch': Layers,
  'programm': Puzzle,
  'schema': FileText,
  'content': FileText,
  'aso': Smartphone,
  'cro': MousePointer,
  'signup': Users,
  'onboarding': Compass,
  'popups': Megaphone,
  'paywalls': DollarSign,
  'copywriting': FileText,
  'copy-edit': FileText,
  'cold-email': Mail,
  'emails': Mail,
  'social': Share2,
  'video': Video,
  'image': Image,
  'sms': Smartphone,
  'ads': Megaphone,
  'ad-creative': Lightbulb,
  'ab-testing': BarChart2,
  'analytics': TrendingUp,
  'referrals': Users,
  'free-tools': Puzzle,
  'churn-prevent': ArrowRight,
  'community': MessageSquare,
  'lead-magnet': Zap,
  'co-mktg': Globe,
  'revops': Briefcase,
  'sales-enable': Award,
  'launch': Zap,
  'pricing': DollarSign,
  'competitors': Target,
  'comp-profile': FileText,
  'directory': Globe,
  'prospecting': Search,
  'mktg-ideas': Lightbulb,
  'mktg-psych': Brain,
  'customer-research': Search,
};

function MessageSquare({ className }: { className?: string }) { return <Users className={className} />; }

const pillars = [
  {
    title: 'SEO & Content',
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-500',
    skills: [
      { id: 'seo-audit', label: 'SEO Audit', desc: 'Full site crawl, technical SEO, backlink analysis, and indexability checks.' },
      { id: 'ai-seo', label: 'AI SEO', desc: 'LLM-powered content optimisation, keyword clustering, and semantic search.' },
      { id: 'site-arch', label: 'Site Architecture', desc: 'URL structure, internal linking, breadcrumbs, and navigation hierarchy.' },
      { id: 'programm', label: 'Programmatic SEO', desc: 'Auto-generated landing pages at scale from structured data.' },
      { id: 'schema', label: 'Schema Markup', desc: 'JSON-LD structured data for rich snippets, FAQ, and review stars.' },
      { id: 'content', label: 'Content Strategy', desc: 'Editorial calendars, topic clusters, and content gap analysis.' },
      { id: 'aso', label: 'ASO', desc: 'App Store Optimisation for iOS and Android search visibility.' },
    ],
  },
  {
    title: 'CRO',
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500',
    skills: [
      { id: 'cro', label: 'Conversion Rate Optimisation', desc: 'A/B testing, heatmaps, funnel analysis, and friction reduction.' },
      { id: 'signup', label: 'Signup Flow', desc: 'Registration UX, form optimisation, and SSO integration.' },
      { id: 'onboarding', label: 'Onboarding', desc: 'First-run experience, progress indicators, and guided tours.' },
      { id: 'popups', label: 'Popups & Modals', desc: 'Exit-intent, scroll-triggered, and timed modal strategies.' },
      { id: 'paywalls', label: 'Paywalls & Gates', desc: 'Freemium, metered, and hard paywall configuration.' },
    ],
  },
  {
    title: 'Content & Copy',
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-500',
    skills: [
      { id: 'copywriting', label: 'Copywriting', desc: 'Persuasive web copy, landing pages, and sales letters.' },
      { id: 'copy-edit', label: 'Copy Editing', desc: 'Voice consistency, tone calibration, and grammar refinement.' },
      { id: 'cold-email', label: 'Cold Email', desc: 'Outreach sequences, subject-line testing, and deliverability.' },
      { id: 'emails', label: 'Email Marketing', desc: 'Newsletters, drip campaigns, and transactional messaging.' },
      { id: 'social', label: 'Social Content', desc: 'Post calendars, hashtag strategy, and community replies.' },
      { id: 'video', label: 'Video Production', desc: 'Scripting, editing, thumbnail optimisation, and hosting.' },
      { id: 'image', label: 'Image Assets', desc: 'Hero images, infographics, and social media graphics.' },
      { id: 'sms', label: 'SMS Marketing', desc: 'Text campaigns, short codes, and compliance messaging.' },
    ],
  },
  {
    title: 'Paid & Measurement',
    color: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-500',
    skills: [
      { id: 'ads', label: 'Paid Ads', desc: 'Google Ads, Meta Ads, LinkedIn Ads, and TikTok Ads management.' },
      { id: 'ad-creative', label: 'Ad Creative', desc: 'Creative testing, ad fatigue monitoring, and asset libraries.' },
      { id: 'ab-testing', label: 'A/B Testing', desc: 'Statistical significance, multi-armed bandit, and sample sizing.' },
      { id: 'analytics', label: 'Analytics', desc: 'Event tracking, attribution modelling, and dashboard reporting.' },
    ],
  },
  {
    title: 'Growth & Retention',
    color: 'from-teal-500/20 to-cyan-500/20',
    borderColor: 'border-teal-500/30',
    textColor: 'text-teal-500',
    skills: [
      { id: 'referrals', label: 'Referrals', desc: 'Viral loops, invite rewards, and referral tracking.' },
      { id: 'free-tools', label: 'Free Tools', desc: 'Micro-tools, calculators, and lead magnets that drive backlinks.' },
      { id: 'churn-prevent', label: 'Churn Prevention', desc: 'Cancel flows, save offers, and dunning sequences.' },
      { id: 'community', label: 'Community', desc: 'Forums, Discord, Slack, and user-generated content.' },
      { id: 'lead-magnet', label: 'Lead Magnets', desc: 'Ebooks, templates, checklists, and gated content.' },
      { id: 'co-mktg', label: 'Co-Marketing', desc: 'Partnerships, joint webinars, and cross-promotion.' },
    ],
  },
  {
    title: 'Sales & GTM',
    color: 'from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-500/30',
    textColor: 'text-rose-500',
    skills: [
      { id: 'revops', label: 'RevOps', desc: 'CRM hygiene, pipeline management, and sales forecasting.' },
      { id: 'sales-enable', label: 'Sales Enablement', desc: 'Battle cards, demo scripts, and objection handling.' },
      { id: 'launch', label: 'Product Launch', desc: 'Launch calendars, press kits, and beta programmes.' },
      { id: 'pricing', label: 'Pricing Strategy', desc: 'Value-based pricing, tier design, and price testing.' },
      { id: 'competitors', label: 'Competitor Analysis', desc: 'Feature comparison, positioning, and SWOT analysis.' },
      { id: 'comp-profile', label: 'Comp Profile', desc: 'Ideal customer profiles, personas, and buyer journey maps.' },
      { id: 'directory', label: 'Directory Listing', desc: 'G2, Capterra, and software directory optimisation.' },
      { id: 'prospecting', label: 'Prospecting', desc: 'Lead scoring, enrichment, and outbound cadence.' },
    ],
  },
  {
    title: 'Strategy',
    color: 'from-indigo-500/20 to-violet-500/20',
    borderColor: 'border-indigo-500/30',
    textColor: 'text-indigo-500',
    skills: [
      { id: 'mktg-ideas', label: 'Marketing Ideas', desc: 'Campaign concepts, viral mechanics, and growth hacks.' },
      { id: 'mktg-psych', label: 'Marketing Psychology', desc: 'Behavioural economics, nudges, and persuasion principles.' },
      { id: 'customer-research', label: 'Customer Research', desc: 'Interviews, surveys, jobs-to-be-done, and JTBD analysis.' },
    ],
  },
];

const crossReferences = [
  { from: 'copywriting', arrows: '↔', to: 'cro, ab-testing' },
  { from: 'revops', arrows: '↔', to: 'sales-enablement, cold-email' },
  { from: 'seo-audit', arrows: '↔', to: 'schema, ai-seo' },
  { from: 'customer-research', arrows: '→', to: 'copywriting, cro, competitors' },
];

export default function SkillsPage() {
  const { ref, isInView } = useInView(0.05);
  const [activeSkill, setActiveSkill] = useState<{ id: string; label: string; desc: string } | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<number | null>(null);

  return (

    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Skills Framework — ValueScan" description="Marketing skills framework." />
      <main className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top product-marketing card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block px-6 py-4 rounded-2xl border border-primary/30 bg-primary/5 mb-8">
              <p className="text-sm font-medium text-primary mb-1">product-marketing</p>
              <p className="text-xs text-muted-foreground">(read by all other skills first)</p>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">The ValueScan Marketing Stack</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Every skill your product needs to grow. Cross-referenced, connected, and built for modern marketing teams.</p>
          </motion.div>

          {/* Connector lines (desktop only) */}
          <div className="hidden lg:block relative mb-4">
            <div className="flex justify-center gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-px h-8 bg-gradient-to-b from-primary/30 to-transparent" />
              ))}
            </div>
            <div className="flex justify-center">
              <div className="h-px w-[80%] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>
          </div>

          {/* 7 Pillars */}
          <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-20">
            {pillars.map((pillar, pIdx) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.08 * pIdx }}
                className={cn(
                  'rounded-2xl border bg-card overflow-hidden',
                  pillar.borderColor
                )}
              >
                {/* Pillar header */}
                <button
                  onClick={() => setExpandedPillar(expandedPillar === pIdx ? null : pIdx)}
                  className={cn(
                    'w-full px-4 py-4 text-left border-b border-border/50 bg-gradient-to-br',
                    pillar.color
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className={cn('font-bold text-sm', pillar.textColor)}>{pillar.title}</h3>
                    {expandedPillar === pIdx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Skills list */}
                <div className={cn('p-3 space-y-1', expandedPillar === pIdx ? 'block' : 'hidden lg:block')}>
                  {pillar.skills.map((skill) => {
                    const Icon = iconMap[skill.id] || FileText;
                    return (
                      <button
                        key={skill.id}
                        onClick={() => setActiveSkill(skill)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20',
                          'hover:bg-muted/50 hover:translate-x-0.5',
                          activeSkill?.id === skill.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{skill.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Cross-references */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="rounded-2xl border border-border bg-card p-8 max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-2 mb-6">
              <GitBranch className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Skills Cross-Reference</h2>
            </div>
            <div className="space-y-3">
              {crossReferences.map((ref) => (
                <div key={ref.from} className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="font-medium text-primary">{ref.from}</span>
                  <span className="text-muted-foreground">{ref.arrows}</span>
                  <span className="text-muted-foreground">{ref.to}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <div className="text-center mt-16">
            <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all">
              Start building with ValueScan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Skill detail modal */}
      <AnimatePresence>
        {activeSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActiveSkill(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{activeSkill.label}</h3>
                <button onClick={() => setActiveSkill(null)} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">{activeSkill.desc}</p>
              <div className="flex items-center gap-3">
                <Link to="/signup" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium text-center hover:opacity-90 transition-opacity">
                  Try it free
                </Link>
                <Link to="/docs" className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-center hover:bg-muted/50 transition-colors flex items-center justify-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> Docs
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
