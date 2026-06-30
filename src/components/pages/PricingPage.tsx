import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, ScanLine, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import cn from '../../lib/utils';
import { annualMonthlyPrice, formatPrice, PLAN_PRICES, type PlanId } from '../../lib/plans';
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';
import { API_BASE } from '../../lib/api';

const plans: {
  name: string;
  planId: PlanId;
  period: string;
  description: string;
  features: string[];
  missing: string[];
  cta: string;
  popular: boolean;
}[] = [
  {
    name: 'Free',
    planId: 'free',
    period: 'forever',
    description: 'Try ValueScan with no commitment.',
    features: ['3 audits/day', 'Basic SEO', 'Security scan', 'Performance score', 'Audit history'],
    missing: ['Competitor analysis', 'Research tools', 'PDF exports', 'API access', 'Team', 'Alerts'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    planId: 'pro',
    period: '/month',
    description: 'Everything you need to grow organic traffic.',
    features: ['50 audits/day', 'Full SEO + SEM + Security', 'PDF exports', 'Full audit history', 'Competitor (1)', 'Change alerts (10)', 'All research tools', 'Rank tracker (10 keywords)'],
    missing: ['API access', 'Team collaboration', 'White-label branding'],
    cta: 'Get Pro — £12/mo',
    popular: true,
  },
  {
    name: 'Max',
    planId: 'max',
    period: '/month',
    description: 'Unlimited power for agencies and teams.',
    features: ['Unlimited audits', 'Full SEO + SEM + Security', 'PDF + white-label branding', 'Unlimited history', 'Competitor (5)', 'Unlimited alerts', 'API access', 'Team seats', 'All research tools', 'Rank tracker (unlimited)'],
    missing: [],
    cta: 'Get Max — £29/mo',
    popular: false,
  },
];

const comparison = [
  { feature: 'Price (monthly)', free: '£0', pro: '£12', max: '£29' },
  { feature: 'Price (annual)', free: '£0', pro: '£10/mo', max: '£23/mo' },
  { feature: 'Audits per day', free: '3', pro: '50', max: 'Unlimited' },
  { feature: 'SEO checks', free: 'Basic', pro: 'Full', max: 'Full' },
  { feature: 'Keyword research', free: '—', pro: '✓', max: '✓' },
  { feature: 'Rank tracker', free: '—', pro: '10 keywords', max: 'Unlimited' },
  { feature: 'Backlink checker', free: '—', pro: '✓', max: '✓' },
  { feature: 'AI visibility (GEO)', free: '—', pro: '✓', max: '✓' },
  { feature: 'Content gap analysis', free: '—', pro: '✓', max: '✓' },
  { feature: 'Local SEO', free: '—', pro: '✓', max: '✓' },
  { feature: 'Competitor analysis', free: '—', pro: '1 site', max: '5 sites' },
  { feature: 'PDF exports', free: '—', pro: '✓', max: '✓ + white-label' },
  { feature: 'Change alerts', free: '—', pro: '10 alerts', max: 'Unlimited' },
  { feature: 'API access', free: '—', pro: '—', max: '✓' },
  { feature: 'Team seats', free: '—', pro: '—', max: 'Unlimited' },
  { feature: 'White-label branding', free: '—', pro: '—', max: '✓' },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [subscribing, setSubscribing] = useState<PlanId | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === 'free') {
      navigate(isLoggedIn ? '/dashboard' : '/signup');
      return;
    }
    if (!isLoggedIn) {
      navigate(`/signup?plan=${planId}`);
      return;
    }
    // Logged in user → Stripe checkout
    setSubscribing(planId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
        setSubscribing(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout');
      setSubscribing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Pricing — ValueScan" description="Free, Pro and Max plans." />


      <main className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h1>
            <p className="text-muted-foreground text-lg mb-6">Pro at £12/mo and Max at £29/mo — full SEO toolkit without agency pricing.</p>
            <div className="inline-flex items-center gap-3 p-1 rounded-full bg-muted border border-border shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200', !annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5', annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                Annual
                <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full font-semibold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-20">
            {plans.map((plan, i) => {
              const monthly = PLAN_PRICES[plan.planId].monthly;
              const display = monthly === 0 ? '£0' : formatPrice(plan.planId, annual);
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 * i }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className={cn(
                    'relative rounded-2xl border p-6 sm:p-8 flex flex-col transition-shadow duration-300',
                    plan.popular ? 'border-primary/50 bg-card shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15' : 'border-border bg-card/50 hover:shadow-lg hover:shadow-black/5 hover:border-border/80'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                        <Sparkles className="w-3 h-3" /> Most Popular
                      </div>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{display}</span>
                      <span className="text-muted-foreground">{monthly === 0 ? plan.period : annual ? '/mo billed yearly' : plan.period}</span>
                    </div>
                    {annual && monthly > 0 && (
                      <p className="text-xs text-green-500 mt-2 font-medium">
                        Save £{monthly * 12 - annualMonthlyPrice(monthly) * 12}/year vs monthly
                      </p>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                    {plan.missing.map((f) => (
                      <div key={f} className="flex items-start gap-3 opacity-40">
                        <X className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSubscribe(plan.planId)}
                    disabled={!!subscribing}
                    className={cn(
                      'w-full py-3 rounded-xl font-medium text-sm text-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                      plan.popular ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                    )}
                  >
                    {subscribing === plan.planId ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      plan.cta
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="mb-20">
            <h2 className="text-2xl font-bold text-center mb-8">Feature comparison</h2>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="rounded-2xl border border-border bg-card overflow-hidden min-w-[600px]">
                <div className="grid grid-cols-4 text-sm font-medium border-b border-border bg-muted/30">
                  <div className="px-4 py-3">Feature</div>
                  <div className="px-4 py-3 text-center">Free</div>
                  <div className="px-4 py-3 text-center text-primary font-bold">Pro</div>
                  <div className="px-4 py-3 text-center">Max</div>
                </div>
                {comparison.map((row, idx) => (
                  <div key={row.feature} className={cn('grid grid-cols-4 text-sm border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors', idx % 2 === 0 ? 'bg-card' : 'bg-muted/10')}>
                    <div className="px-4 py-3 font-medium">{row.feature}</div>
                    <div className="px-4 py-3 text-center text-muted-foreground">{row.free}</div>
                    <div className="px-4 py-3 text-center font-semibold text-primary">{row.pro}</div>
                    <div className="px-4 py-3 text-center text-muted-foreground">{row.max}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                { q: 'Can I switch plans at any time?', a: 'Yes. You can upgrade or downgrade from your dashboard at any time. Changes take effect immediately.' },
                { q: 'Is there a free trial?', a: 'The Free plan gives you 3 audits per day forever. No credit card required.' },
                { q: 'What payment methods do you accept?', a: 'We accept all major credit cards via Stripe. Annual plans are billed upfront.' },
                { q: 'Can I get a refund?', a: 'Yes. We offer a 14-day money-back guarantee for all paid plans. No questions asked.' },
                { q: 'Do you offer team plans?', a: 'Max includes unlimited team seats. Pro is single-user only.' },
              ].map((faq, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 transition-colors">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground mb-4">Questions? Email us at hello@valuescan.online</p>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
