import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, ChevronDown, HelpCircle, Check, Loader2, MapPin, Twitter, MessageCircle, Clock } from 'lucide-react';


import { API_BASE, authHeaders } from '../../lib/api';
import MetaTags from '../layout/MetaTags';
import { useToast } from '../layout/ToastProvider';
import Breadcrumb from '../layout/Breadcrumb';

const faqs = [
  { q: 'How many audits can I run per day?', a: 'Free users get 5 audits per day. Pro users get 50 audits per day. Max users enjoy unlimited audits.' },
  { q: 'What is included in the audit?', a: 'Each audit checks SEO, SEM, Security, and Performance. It analyzes title tags, meta descriptions, H1/H2 structure, image alt text, canonical URLs, Open Graph tags, structured data, marketing tags, HTTPS, security headers, response time, and page size.' },
  { q: 'How do I upgrade my plan?', a: 'Go to the Pricing page and select Pro or Max. You will be redirected to Stripe for secure checkout.' },
  { q: 'Can I track keyword rankings?', a: 'Yes! Pro users can track up to 10 keywords. Max users get unlimited keyword tracking.' },
  { q: 'Is my data secure?', a: 'Absolutely. We use HTTPS encryption, never store your passwords in plain text, and follow best practices for data security.' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.message) { setError('Email and message are required'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setForm({ name: '', email: '', subject: '', message: '' });
        showToast('Message sent successfully', 'success');
      } else {
        const err = data.error || 'Failed to send message';
        setError(err);
        showToast(err, 'error');
      }
    } catch {
      const err = 'Network error. Please try again.';
      setError(err);
      showToast(err, 'error');
    }
    setSending(false);
  };

  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title="Contact — ValueScan" description="Get in touch with support." />
      <Breadcrumb />
      <div className="pt-16">
        {/* Hero */}
        <section className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 text-white py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
            <p className="text-lg text-purple-100 max-w-2xl mx-auto">Have a question about ValueScan? Need help with your SEO strategy? We are here to help.</p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Send us a Message</h2>
                {sent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-center py-12" role="status" aria-live="polite" aria-atomic="true"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 10 }}
                      className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4"
                    >
                      <Check className="w-8 h-8 text-green-600" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Message Sent!</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">We will get back to you within 24 hours.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> Response time: Usually within 24 hours
                    </p>
                    <button onClick={() => setSent(false)} className="mt-4 text-purple-600 hover:text-purple-700 font-medium">Send another message</button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4" aria-label="Contact form">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                        <input id="contact-name" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                          aria-invalid={!!error} />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                        <input id="contact-email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                          aria-invalid={!!error} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="contact-subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                      <input id="contact-subject" type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                        aria-invalid={!!error} />
                    </div>
                    <div>
                      <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message *</label>
                      <textarea id="contact-message" required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                        aria-invalid={!!error} />
                    </div>
                    {error && <p className="text-sm text-red-600" role="alert" aria-live="polite" id="contact-error">{error}</p>}
                    <button type="submit" disabled={sending}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Message
                    </button>
                  </form>
                )}
              </div>

              {/* FAQ */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-500" /> Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        aria-expanded={openFaq === i}
                        aria-controls={`contact-faq-answer-${i}`}>
                        <span className="font-medium text-slate-900 dark:text-white">{faq.q}</span>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq === i && (
                        <div id={`contact-faq-answer-${i}`} className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-300">{faq.a}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Other Ways to Reach Us</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Email</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">support@valuescan.online</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Discord</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">discord.gg/valuescan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Twitter className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Twitter</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">@ValueScanHQ</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white">
                <h3 className="font-semibold mb-2">Need Priority Support?</h3>
                <p className="text-sm text-purple-100 mb-4">Max plan users get priority support with 2-hour response time.</p>
                <a href="/pricing" className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">View Plans</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
