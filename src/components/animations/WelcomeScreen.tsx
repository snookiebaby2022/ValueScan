import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine } from 'lucide-react';

const SCAN_LINES = [
  'Initialising audit engine...',
  'Loading SEO modules...',
  'Loading SEM modules...',
  'Loading security protocols...',
  'Calibrating performance metrics...',
  'Welcome to ValueScan.',
];

export default function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState<'typing' | 'waiting' | 'exit'>('typing');
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentLine = SCAN_LINES[lineIndex] || '';

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (phase !== 'typing') return;
    if (charIndex < currentLine.length) {
      const timer = setTimeout(() => setCharIndex(c => c + 1), 30);
      return () => clearTimeout(timer);
    } else {
      // Line complete, pause then next
      const timer = setTimeout(() => {
        if (lineIndex < SCAN_LINES.length - 1) {
          setLineIndex(i => i + 1);
          setCharIndex(0);
        } else {
          setPhase('waiting');
          setTimeout(() => setPhase('exit'), 1200);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [charIndex, currentLine, lineIndex, phase]);

  // Cursor blink
  useEffect(() => {
    const timer = setInterval(() => setShowCursor(c => !c), 500);
    return () => clearInterval(timer);
  }, []);

  // Exit animation
  useEffect(() => {
    if (phase === 'exit') {
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete();
        sessionStorage.setItem('valuescan-welcome-shown', 'true');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  // Skip on any key press
  useEffect(() => {
    if (phase === 'exit') return;
    const skip = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      e.preventDefault();
      setPhase('exit');
    };
    document.addEventListener('keydown', skip, true);
    return () => document.removeEventListener('keydown', skip, true);
  }, [phase]);

  const displayedText = currentLine.slice(0, charIndex);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center"
          tabIndex={-1}
          ref={overlayRef}
        >
          {/* Animated grid background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
            
            {/* Floating orbs */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-primary/20 blur-2xl"
                style={{
                  width: 80 + i * 40,
                  height: 80 + i * 40,
                  left: `${10 + i * 20}%`,
                  top: `${20 + (i % 2) * 40}%`,
                }}
                animate={{
                  x: [0, 30, -20, 0],
                  y: [0, -20, 30, 0],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 6 + i * 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
              className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-8 shadow-lg shadow-primary/30"
            >
              <ScanLine className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            {/* Brand name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-3xl font-bold tracking-tight mb-2"
            >
              ValueScan
            </motion.h1>

            {/* Progress bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((lineIndex + (charIndex / currentLine.length)) / SCAN_LINES.length) * 100}%` }}
              transition={{ duration: 0.3 }}
              className="h-0.5 bg-gradient-to-r from-primary to-purple-400 rounded-full mb-8 max-w-[200px]"
            />

            {/* Terminal-style text */}
            <div className="w-[320px] sm:w-[400px] font-mono text-sm text-muted-foreground">
              {SCAN_LINES.slice(0, lineIndex).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-1"
                >
                  <span className="text-green-500 mr-2">✓</span>
                  {line}
                </motion.div>
              ))}
              {phase !== 'exit' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex"
                >
                  <span className="text-primary mr-2">›</span>
                  <span>
                    {displayedText}
                    <span className={`inline-block w-2 h-4 ml-0.5 bg-primary align-middle ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
                  </span>
                </motion.div>
              )}
            </div>

            {/* Skip button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              whileHover={{ opacity: 1 }}
              onClick={() => setPhase('exit')}
              className="mt-12 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Press any key to skip
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
