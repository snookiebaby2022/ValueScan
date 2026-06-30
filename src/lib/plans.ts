export type PlanId = 'free' | 'pro' | 'max';

export type PlanFeature =
  | 'keywordResearch'
  | 'rankTracker'
  | 'backlinks'
  | 'aiVisibility'
  | 'contentGap'
  | 'localSeo'
  | 'competitorAnalysis'
  | 'changeAlerts'
  | 'pdfExport'
  | 'apiAccess'
  | 'whiteLabel'
  | 'team'
  | 'webhooks';

export const PLAN_PRICES: Record<PlanId, { monthly: number; label: string }> = {
  free: { monthly: 0, label: '£0' },
  pro: { monthly: 12, label: '£12' },
  max: { monthly: 29, label: '£29' },
};

export const PLAN_SUMMARIES: Record<PlanId, string> = {
  free: '3 audits/day',
  pro: '50 audits/day + all tools',
  max: 'Unlimited + API & team',
};

export function annualMonthlyPrice(monthly: number): number {
  return Math.round(monthly * 0.8);
}

export function formatPrice(plan: PlanId, annual = false): string {
  const { monthly } = PLAN_PRICES[plan];
  if (monthly === 0) return '£0';
  const price = annual ? annualMonthlyPrice(monthly) : monthly;
  return `£${price}`;
}
