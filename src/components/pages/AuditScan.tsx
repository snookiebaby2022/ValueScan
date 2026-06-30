import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanLine, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { runQuickAudit } from '../../lib/run-audit';
import { normalizeAuditUrl } from '../../lib/normalize-url';
import cn from '../../lib/utils';
import MetaTags from '../layout/MetaTags';

const SCAN_STEPS = [
  'Connecting to target server…',
  'Fetching page HTML and response headers…',
  'Running SEO checks (meta tags, headings, links)…',
  'Analysing SEM and marketing tags…',
  'Scanning security headers and HTTPS…',
  'Measuring performance signals…',
  'Checking for broken links…',
  'Generating recommendations…',
  'Compiling your full report…',
];

const DURATION_MS = 30_000;

const FUN_MESSAGES = [
  'Crawling pages…',
  'Checking headers…',
  'Analyzing content…',
  'Scanning images…',
  'Measuring speed…',
  'Validating markup…',
  'Reviewing links…',
  'Calculating score…',
];

export default function AuditScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [finished, setFinished] = useState(false);
  const started = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const targetUrl = normalizeAuditUrl(searchParams.get('url') || '');

  useEffect(() => {
    if (!targetUrl) {
      setError('Please enter a website URL to audit.');
      return;
    }
    if (started.current) return;
    started.current = true;

    const startTime = Date.now();
    let reportId: string | null = null;
    let auditError: string | null = null;

    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      setStepIndex(Math.min(SCAN_STEPS.length - 1, Math.floor((pct / 100) * SCAN_STEPS.length)));
    }, 150);

    const auditPromise = runQuickAudit(targetUrl)
      .then((result) => {
        if (result.reportId) reportId = result.reportId;
        else auditError = 'Audit completed but no report was saved.';
      })
      .catch((err: unknown) => {
        auditError = err instanceof Error ? err.message : 'Audit failed — please try again.';
      });

    const timerPromise = new Promise<void>((resolve) => {
      window.setTimeout(resolve, DURATION_MS);
    });

    void Promise.all([auditPromise, timerPromise]).then(() => {
      window.clearInterval(progressInterval);
      setProgress(100);
      setStepIndex(SCAN_STEPS.length - 1);

      if (auditError || !reportId) {
        setError(auditError || 'Audit failed — please try again.');
        return;
      }
      navigate(`/audit/${reportId}`, { replace: true });
    });

    return () => window.clearInterval(progressInterval);
  }, [targetUrl, navigate]);

  const secondsLeft = Math.max(0, Math.ceil((DURATION_MS - (progress / 100) * DURATION_MS) / 1000));

  const handleCancel = () => {
    cancelledRef.current = true;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setCancelled(true);
    setProgress(0);
    setStepIndex(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="New Audit — ValueScan" description="Run a new website audit." />
      <div className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20"
          >
            <ScanLine className="w-8 h-8 text-primary-foreground" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            {error ? 'Audit could not complete' : 'Running your audit'}
          </h1>

          {targetUrl && !error && (
            <p className="text-sm text-muted-foreground mb-8 truncate">{targetUrl}</p>
          )}

          {cancelled ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Audit cancelled.</p>
              <button onClick={() => { setCancelled(false); setError(''); setProgress(0); setStepIndex(0); setFinished(false); started.current = false; }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                Restart
              </button>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-left mb-6">
              <div className="flex items-start gap-2 text-sm text-red-500">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-4 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Back to home
              </button>
              {error.toLowerCase().includes('limit') && (
                <Link
                  to="/pricing"
                  className="mt-2 block w-full py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/10"
                >
                  Upgrade plan
                </Link>
              )}
            </div>
          ) : (
            <>
              {finished ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-green-500/20 bg-green-500/10 p-6 text-center space-y-3"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                  <p className="text-lg font-semibold">Audit complete!</p>
                  <p className="text-sm text-muted-foreground">Redirecting to your report...</p>
                </motion.div>
              ) : (
                <>
                  <div className="mb-3">
                    <div
                      className="h-4 rounded-full bg-muted overflow-hidden"
                      role="progressbar"
                      aria-label="Audit progress"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <motion.div
                        className={cn('h-full rounded-full bg-gradient-to-r from-primary to-purple-500')}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {FUN_MESSAGES[0]}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">
                    {Math.round(progress)}% complete
                  </p>
                  <p className="text-xs text-muted-foreground mb-8">
                    ~{secondsLeft}s remaining
                  </p>

                  <div className="text-left rounded-xl border border-border bg-card p-4 space-y-2">
                    {SCAN_STEPS.map((step, i) => (
                      <div
                        key={step}
                        className={cn(
                          'flex items-center gap-2 text-sm transition-colors',
                          i < stepIndex ? 'text-green-500' : i === stepIndex ? 'text-foreground' : 'text-muted-foreground/50',
                        )}
                      >
                        <span className="w-4 text-center shrink-0">
                          {i < stepIndex ? '✓' : i === stepIndex ? '›' : '·'}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleCancel}
                    className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary/60 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
