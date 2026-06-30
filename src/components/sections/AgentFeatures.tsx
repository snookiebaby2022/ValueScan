import { motion } from 'framer-motion';
import {
  Twitter, Globe, Search, FileText, Newspaper, Linkedin, Radar,
  ChevronRight
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const agents = [
  {
    icon: Twitter,
    name: 'X Agent',
    color: 'text-white',
    bg: 'bg-black',
    status: '2 ideas ready',
    statusColor: 'bg-green-500/20 text-green-500',
    description: 'Monitors your brand on X, finds engagement opportunities, and drafts replies that sound like you.',
  },
  {
    icon: Globe,
    name: 'Reddit Agent',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    status: '2 opportunities ready',
    statusColor: 'bg-green-500/20 text-green-500',
    description: 'Finds relevant subreddits, tracks keyword mentions, and suggests authentic engagement.',
  },
  {
    icon: Search,
    name: 'SEO Agent',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    status: '2 recommendations ready',
    statusColor: 'bg-green-500/20 text-green-500',
    description: 'Runs daily audits, queues SEO fixes, and tracks keyword rankings across search engines.',
  },
  {
    icon: FileText,
    name: 'Articles Agent',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    status: '1 topic ready',
    statusColor: 'bg-yellow-500/20 text-yellow-500',
    description: 'Generates blog content in your brand voice, optimised for SEO and GEO.',
  },
  {
    icon: Newspaper,
    name: 'Hacker News Agent',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    status: '1 post ready',
    statusColor: 'bg-yellow-500/20 text-yellow-500',
    description: 'Tracks tech discussions, finds launch opportunities, and suggests Show HN posts.',
  },
  {
    icon: Linkedin,
    name: 'LinkedIn Agent',
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    status: '1 post ready',
    statusColor: 'bg-yellow-500/20 text-yellow-500',
    description: 'Creates professional content, B2B engagement posts, and lead-generation content.',
  },
  {
    icon: Radar,
    name: 'GEO Agent',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    status: 'New — in beta',
    statusColor: 'bg-blue-500/20 text-blue-500',
    description: 'Optimises how AI search engines (ChatGPT, Perplexity, Gemini) describe your brand.',
  },
];

export default function AgentFeatures() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section id="features" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Your marketing team
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            7 specialised agents, <span className="gradient-text">one dashboard</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Each agent monitors, plans, and executes on a different channel. They work together, not in silos.
          </motion.p>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.08 * index }}
              className={cn(
                'group relative p-5 rounded-2xl border border-border bg-card',
                'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                'transition-all duration-300 hover:-translate-y-1 cursor-pointer'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', agent.bg)}>
                  <agent.icon className={cn('w-5 h-5', agent.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{agent.name}</h3>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5', agent.statusColor)}>
                    {agent.status}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {agent.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
