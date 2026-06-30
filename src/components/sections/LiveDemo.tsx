import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, User, Bot } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const DEMO_MESSAGES = [
  { role: 'user', text: 'Run a full audit on https://example.com' },
  { role: 'bot', text: 'Scanning… Found 8 issues.\n\n🔴 Critical: Missing HSTS header\n🟡 Warning: No OG image tag\n🟡 Warning: 3 images missing alt text\n🟢 Info: Consider schema markup\n\nOverall score: 79/100. Want the full report?' },
  { role: 'user', text: 'Show me how to fix the HSTS header' },
  { role: 'bot', text: 'Here is the fix for your server:\n\n**Nginx**\n```nginx\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n```\n\n**Apache**\n```apache\nHeader always set Strict-Transport-Security "max-age=31536000; includeSubDomains"\n```\n\nExpected impact: +15 security points. This will take ~2 minutes to apply and test.' },
];

export default function LiveDemo() {
  const { ref, isInView } = useInView(0.1);
  const [input, setInput] = useState('');

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
            Try it now
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          >
            Chat with your <span className="gradient-text">audit agent</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Ask anything. Get fixes, explanations, and step-by-step guides — all in one conversation.
          </motion.p>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-2xl mx-auto rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-card/50">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">ValueScan AI</p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
            {DEMO_MESSAGES.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.3 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-muted' : 'bg-primary'}`}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="whitespace-pre-line">{msg.text}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about your audit..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 rounded-lg px-2 py-1"
            />
            <button className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all hover:scale-105 hover:shadow-md hover:shadow-primary/20 active:scale-95">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          This is a demo. Start a real audit to get personalised results.
        </p>
      </div>
    </section>
  );
}
