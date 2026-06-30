import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, Loader2 } from 'lucide-react';
import { API_BASE, authHeaders } from '../../lib/api';
import type { PlanFeature } from '../../lib/plans';

type QuotaResponse = {
  plan: string;
  features: Partial<Record<PlanFeature, boolean>>;
};

type PlanGateProps = {
  feature: PlanFeature;
  children: ReactNode;
  title?: string;
};

export default function PlanGate({ feature, children, title }: PlanGateProps) {
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/quota`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setQuota(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowed = quota?.features?.[feature] === true;

  if (allowed) return <>{children}</>;

  const minPlan = feature === 'apiAccess' || feature === 'team' || feature === 'whiteLabel' || feature === 'webhooks' ? 'Max' : 'Pro';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">{title || 'Upgrade to unlock'}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {token
            ? `This tool is included on the ${minPlan} plan. Upgrade to get full access.`
            : `Sign in and upgrade to ${minPlan} to use this tool.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {token ? (
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Sparkles className="w-4 h-4" />
              View plans
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">
                Sign in
              </Link>
              <Link to="/signup" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                Sign up for free
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
