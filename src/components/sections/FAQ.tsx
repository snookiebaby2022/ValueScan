import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import cn from '../../lib/utils';

const faqs = [
  {
    question: 'How does the free audit work?',
    answer: 'Simply enter any website URL and our engine crawls the site, running 50+ checks across SEO, SEM, security, and performance. You get a score, a list of issues, and AI-powered fix recommendations — no signup required.',
  },
  {
    question: 'What is the difference between Free and Pro?',
    answer: 'Free gives you 3 audits per day with basic SEO and security checks. Pro unlocks 50 audits per day, full SEM analysis, AI recommendations, PDF exports, competitor tracking, and change alerts.',
  },
  {
    question: 'How does competitor analysis work?',
    answer: 'Enter up to 3 competitor URLs (5 on Max). We run the same audit on each site and compare scores side-by-side, showing you exactly where you lead or lag behind.',
  },
  {
    question: 'Can I export reports?',
    answer: 'Yes — Pro and Max plans include PDF exports. Max also includes white-label reports, so you can add your own branding before sharing with clients.',
  },
  {
    question: 'Do you offer an API?',
    answer: 'API access is included on the Max plan. You can trigger audits programmatically, pull results into your own dashboards, and integrate with CI/CD pipelines.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We only crawl public-facing pages. No login credentials are stored. All data is encrypted in transit and at rest. We are GDPR compliant.',
  },
  {
    question: 'Can I change plans or cancel?',
    answer: 'Yes — you can upgrade, downgrade, or cancel anytime from your account dashboard. No contracts, no cancellation fees.',
  },
];

function AccordionItem({ question, answer, isOpen, onClick, index }: { question: string; answer: string; isOpen: boolean; onClick: () => void; index: number }) {
  return (
    <div className={cn('border border-border rounded-xl bg-card overflow-hidden transition-colors', isOpen && 'bg-card/80')}>
      <button
        onClick={onClick}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors group"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
      >
        <span className="text-sm font-medium group-hover:text-primary transition-colors">{question}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-answer-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const { ref, isInView } = useInView(0.1);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            FAQ
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            Questions? Answered.
          </motion.h2>
        </div>

        <div ref={ref} className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <AccordionItem
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                index={index}
              />
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-10"
        >
          <p className="text-sm text-muted-foreground">
            Still have questions?{' '}
            <a href="/contact" className="text-primary font-medium hover:underline">Contact us</a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
