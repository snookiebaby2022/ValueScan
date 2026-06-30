import { motion } from 'framer-motion';
import { Link2, LineChart, FileCheck } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const steps = [
  {
    icon: Link2,
    number: '01',
    title: 'Enter your URL',
    description: 'Paste any website address. No signup, no installation, no credit card.',
  },
  {
    icon: LineChart,
    number: '02',
    title: 'Run 50+ checks',
    description: 'Our engine crawls your site and tests SEO, SEM, security, performance, and more.',
  },
  {
    icon: FileCheck,
    number: '03',
    title: 'Get actionable fixes',
    description: 'Receive a prioritized report with scores, explanations, and step-by-step instructions.',
  },
];

export default function HowItWorks() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section id="how-it-works" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            From URL to insights in <span className="gradient-text">30 seconds</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Three simple steps to a healthier, faster, more secure website.
          </motion.p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 * index }}
              className="relative"
            >
              <div className="relative p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
                <div className="text-6xl font-bold bg-gradient-to-br from-primary/30 to-primary/5 bg-clip-text text-transparent mb-4">{step.number}</div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-6 w-12 border-t-2 border-dashed border-primary/30" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
