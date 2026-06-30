import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie } from 'lucide-react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem('valuescan-cookie-consent');
    if (!consented) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('valuescan-cookie-consent', 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[150] rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-5 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">We use cookies</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We use cookies for analytics, sign-in, and to improve your experience. 
                <a href="/privacy" className="text-primary hover:underline">Privacy</a> · 
                <a href="/cookies" className="text-primary hover:underline">Cookies</a>
              </p>
            </div>
            <button onClick={accept} className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Accept
            </button>
            <button onClick={() => setVisible(false)} className="shrink-0 p-1 rounded-lg hover:bg-muted/50 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
