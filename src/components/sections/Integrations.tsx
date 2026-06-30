import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const integrations = [
  { name: 'WordPress', desc: 'Auto-publish audits to your WP dashboard', color: 'bg-blue-500' },
  { name: 'Webflow', desc: 'Sync CMS fields with audit recommendations', color: 'bg-blue-400' },
  { name: 'Framer', desc: 'Connect your Framer site for live checks', color: 'bg-purple-500' },
  { name: 'Slack', desc: 'Get alerts and reports in your channels', color: 'bg-green-500' },
  { name: 'GitHub', desc: 'PR comments with audit summaries', color: 'bg-gray-800' },
  { name: 'Notion', desc: 'Export reports to Notion databases', color: 'bg-gray-600' },
  { name: 'Vercel', desc: 'Deploy hooks trigger post-build audits', color: 'bg-black' },
  { name: 'Zapier', desc: 'Connect 5000+ apps to your audit data', color: 'bg-orange-500' },
];

export default function Integrations() {
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
            Integrations
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            Plays nice with your <span className="gradient-text">stack</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Connect the tools you already use. No migration needed.
          </motion.p>
        </div>

        <div ref={ref} className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {integrations.map((integration, index) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.08 * index }}
              className={cn(
                'group relative p-5 sm:p-6 rounded-2xl border border-border bg-card',
                'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                'transition-all duration-300 hover:-translate-y-1 cursor-pointer'
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', integration.color)}>
                <span className="text-white font-bold text-sm">{integration.name[0]}</span>
              </div>
              <h3 className="text-sm font-semibold mb-1">{integration.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{integration.desc}</p>
              <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Connect
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
