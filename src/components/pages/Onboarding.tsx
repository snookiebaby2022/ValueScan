import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Shield, BarChart3, ArrowRight, Check, Sparkles } from 'lucide-react';
import MetaTags from '../layout/MetaTags';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState('');
  const [completed, setCompleted] = useState(false);

  const steps = [
    {
      title: 'Welcome to ValueScan',
      subtitle: 'Your all-in-one SEO audit platform',
      icon: Sparkles,
      content: 'ValueScan helps you audit websites, track keywords, analyse competitors, and improve your search visibility. Let us get you started with a quick setup.',
      color: 'from-purple-600 to-purple-800'
    },
    {
      title: 'Run Your First Audit',
      subtitle: 'Enter any website URL to analyse',
      icon: Search,
      content: 'Paste a website URL and we will instantly scan it for SEO, SEM, Security, and Performance issues.',
      color: 'from-blue-600 to-blue-800'
    },
    {
      title: 'Explore Your Dashboard',
      subtitle: 'All your tools in one place',
      icon: BarChart3,
      content: 'Your dashboard gives you access to keyword research, rank tracking, backlink analysis, AI visibility, and more. Upgrade to Pro or Max for unlimited audits.',
      color: 'from-emerald-600 to-emerald-800'
    },
    {
      title: 'Stay Secure & Fast',
      subtitle: 'Monitor your website health',
      icon: Shield,
      content: 'Set up change alerts to get notified when your audit scores change. Track your Core Web Vitals and fix broken links before they hurt your rankings.',
      color: 'from-orange-600 to-orange-800'
    }
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else { setCompleted(true); }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/dashboard');
  };

  const handleFinish = () => {
    localStorage.setItem('onboarding_complete', 'true');
    if (url) navigate('/dashboard', { state: { auditUrl: url } });
    else navigate('/dashboard');
  };

  useEffect(() => {
    if (localStorage.getItem('onboarding_complete') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <MetaTags title="Onboarding — ValueScan" description="Welcome to ValueScan." />
      <div className="flex-1 flex items-center justify-center px-6 pt-16">
        <div className="max-w-lg w-full">
          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
          </div>

          {completed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">You are all set!</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Your ValueScan account is ready. Start auditing websites and tracking your SEO performance.</p>
              <button onClick={handleFinish} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center mb-6`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{current.title}</h2>
                <p className="text-purple-600 dark:text-purple-400 font-medium mb-4">{current.subtitle}</p>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">{current.content}</p>

                {step === 1 && (
                  <div className="mb-6">
                    <div className="relative">
                      <Globe className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                      <input type="text" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={handleSkip} className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                    Skip
                  </button>
                  <button onClick={handleNext} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    {step === steps.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
