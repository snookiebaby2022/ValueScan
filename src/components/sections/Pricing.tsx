import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import { Link } from 'react-router-dom';
import cn from '../../lib/utils';

const plans = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Try ValueScan with no commitment.',
    features: [
      '3 audits per day',
      'Basic SEO checks',
      'Security header scan',
      'Performance score',
      '7-day history',
    ],
    missing: [
      'Competitor analysis',
      'AI recommendations',
      'PDF exports',
      'API access',
      'Team collaboration',
      'Change alerts',
    ],
    cta: 'Start Free',
    popular: false,
    planId: 'free' as const,
  },
  {
    name: 'Pro',
    price: '£12',
    period: '/month',
    description: 'For founders and marketers who audit weekly.',
    features: [
      '50 audits per day',
      'Full SEO + SEM + Security',
      'AI recommendations',
      'PDF exports',
      '30-day history',
      'Competitor analysis (1)',
      'Change alerts',
      'All research tools',
      'Email support',
    ],
    missing: [
      'API access',
      'Team collaboration',
    ],
    cta: 'Get Pro',
    popular: true,
    planId: 'pro' as const,
  },
  {
    name: 'Max',
    price: '£29',
    period: '/month',
    description: 'For agencies and teams that need scale.',
    features: [
      'Unlimited audits',
      'Full SEO + SEM + Security',
      'AI recommendations',
      'PDF exports + white-label',
      'Unlimited history',
      'Competitor analysis (5)',
      'Change alerts + webhooks',
      'API access',
      'Team collaboration',
      'Priority support',
    ],
    missing: [],
    cta: 'Get Max',
    popular: false,
    planId: 'max' as const,
  },
];

export default function Pricing() {
  const { ref, isInView } = useInView(0.1);
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-muted-foreground mb-4"
          >
            Pricing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg mb-8"
          >
            No hidden fees. No surprises. Cancel anytime.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center gap-3 p-1 rounded-full bg-muted border border-border"
          >
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                !annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              Annual
              <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * index }}
              className={cn(
                'relative rounded-2xl border p-6 sm:p-8 flex flex-col',
                plan.popular
                  ? 'border-primary/50 bg-card shadow-lg shadow-primary/10'
                  : 'border-border bg-card/50'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {annual && plan.price !== '£0'
                      ? `£${Math.round(parseInt(plan.price.slice(1)) * 0.8)}`
                      : plan.price}
                  </span>
                  <span className="text-muted-foreground">{annual && plan.price !== '£0' ? '/mo' : plan.period}</span>
                  {annual && plan.price !== '£0' && (
                    <span className="ml-2 text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Billed annually</span>
                  )}
                </div>
                {annual && plan.price !== '£0' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Save £{(parseInt(plan.price.slice(1)) * 12 * 0.2)} per year
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
                {plan.missing.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-40">
                    <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                to={plan.planId === 'free' ? '/signup' : `/signup?plan=${plan.planId}`}
                className={cn(
                  'w-full py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] block text-center',
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                )}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
