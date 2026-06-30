/** Plan-gated ValueScan features */
export type PlanFeature =
  | 'history'
  | 'pdf'
  | 'csv'
  | 'priority'
  | 'email_alerts'
  | 'monitors'
  | 'api'
  | 'team'
  | 'whitelabel'
  | 'webhooks'
  | 'support'
  | 'score_compare'
  | 'multipage'
  | 'embed'
  | 'growth_roadmap'
  | 'ai_content'
  | 'keywords'
  | 'llm_visibility'
  | 'link_building'
  | 'reddit'
  | 'autopilot'
  | 'marketing_campaigns'

const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  free: ['score_compare'],
  pro: [
    'history', 'pdf', 'priority', 'email_alerts', 'score_compare', 'monitors',
    'growth_roadmap', 'ai_content', 'keywords', 'llm_visibility',
  ],
  agency: [
    'history', 'pdf', 'csv', 'priority', 'email_alerts', 'score_compare', 'monitors',
    'api', 'team', 'whitelabel', 'webhooks', 'support', 'multipage', 'embed',
    'growth_roadmap', 'ai_content', 'keywords', 'llm_visibility',
    'link_building', 'reddit', 'autopilot', 'marketing_campaigns',
  ],
}

/** Max domain monitors per plan (Pro gets email alerts via monitors). */
export function maxMonitors(planSlug: string): number {
  if (planSlug === 'agency') return 50
  if (planSlug === 'pro') return 5
  return 0
}

export function canUseWebhooks(planSlug: string): boolean {
  return hasFeature(planSlug, 'webhooks')
}

export function planFeatures(slug: string): PlanFeature[] {
  return PLAN_FEATURES[slug] ?? PLAN_FEATURES.free
}

export function hasFeature(planSlug: string, feature: PlanFeature): boolean {
  return planFeatures(planSlug).includes(feature)
}

export function scanPriority(planSlug: string): number {
  if (planSlug === 'agency') return 0
  if (planSlug === 'pro') return 1
  return 2
}
