import type { Request } from 'express'
import { db } from '../db.js'
import type { UserRow } from '../db.js'
import { getSupportTicketStats } from './support-tickets.js'

export type ValueScanPlan = {
  id: string
  name: string
  slug: string
  price_gbp: number
  scans_per_day: number
  features: string
  active: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type ValueScanPlanPublic = {
  id: string
  name: string
  slug: string
  priceGbp: number
  scansPerDay: number
  unlimited: boolean
  features: string[]
  active: boolean
  sortOrder: number
}

export function planToPublic(row: ValueScanPlan): ValueScanPlanPublic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceGbp: row.price_gbp,
    scansPerDay: row.scans_per_day,
    unlimited: row.scans_per_day < 0,
    features: JSON.parse(row.features) as string[],
    active: row.active === 1,
    sortOrder: row.sort_order,
  }
}

const CORE_FEATURES = [
  'Full SEO, SEM, marketing & security report',
  'Shareable report links',
  'Category score breakdown',
] as const

export const DEFAULT_PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '5 scans per day',
    ...CORE_FEATURES,
  ],
  pro: [
    '100 scans per day',
    ...CORE_FEATURES,
    'Growth roadmap & site connection',
    'Catch blockers holding you back',
    'Unlimited scan history',
    'Priority scan queue',
    'Email alerts on score drops',
    'Export reports (PDF)',
    'Score trend comparison',
    'Priority fix recommendations',
    'AI content generation — articles written & ranked',
    'Keywords you can win',
    'LLM visibility tracking (ChatGPT, Perplexity, Gemini+)',
    'Show up across search + AI engines',
  ],
  agency: [
    'Unlimited daily scans',
    ...CORE_FEATURES,
    'Growth roadmap & site connection',
    'Catch blockers holding you back',
    'Multi-page site crawl (5 pages)',
    'Accessibility audit category',
    'Multi-domain monitoring',
    'Scheduled re-scans & webhooks',
    'Team member accounts',
    'API access & developer docs',
    'White-label reports',
    'CSV & PDF export',
    'Embeddable scan widget',
    'Dedicated support portal',
    'Automated link building — outreach handled',
    'Marketing campaigns on autopilot',
    'Get found on Reddit',
    'Grow on autopilot',
  ],
}

export function seedValueScanPlans() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM valuescan_plans').get() as { c: number }
  if (existing.c > 0) return

  const now = new Date().toISOString()
  const plans: Array<Omit<ValueScanPlan, 'created_at' | 'updated_at'>> = [
    {
      id: 'vs-plan-free',
      name: 'Free',
      slug: 'free',
      price_gbp: 0,
      scans_per_day: 5,
      features: JSON.stringify(DEFAULT_PLAN_FEATURES.free),
      active: 1,
      sort_order: 0,
    },
    {
      id: 'vs-plan-pro',
      name: 'Pro',
      slug: 'pro',
      price_gbp: 19,
      scans_per_day: 100,
      features: JSON.stringify(DEFAULT_PLAN_FEATURES.pro),
      active: 1,
      sort_order: 1,
    },
    {
      id: 'vs-plan-agency',
      name: 'Agency',
      slug: 'agency',
      price_gbp: 49,
      scans_per_day: -1,
      features: JSON.stringify(DEFAULT_PLAN_FEATURES.agency),
      active: 1,
      sort_order: 2,
    },
  ]

  const insert = db.prepare(`
    INSERT INTO valuescan_plans (id, name, slug, price_gbp, scans_per_day, features, active, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const p of plans) {
    insert.run(p.id, p.name, p.slug, p.price_gbp, p.scans_per_day, p.features, p.active, p.sort_order, now, now)
  }
}

/** Keep default feature lists in sync after code updates (does not change prices). */
export function syncValueScanPlanFeatures() {
  const now = new Date().toISOString()
  const update = db.prepare(`
    UPDATE valuescan_plans SET features = ?, updated_at = ? WHERE slug = ?
  `)
  for (const [slug, features] of Object.entries(DEFAULT_PLAN_FEATURES)) {
    update.run(JSON.stringify(features), now, slug)
  }
}

export function listPlans(activeOnly = true): ValueScanPlanPublic[] {
  const rows = db.prepare(`
    SELECT * FROM valuescan_plans
    ${activeOnly ? 'WHERE active = 1' : ''}
    ORDER BY sort_order ASC
  `).all() as ValueScanPlan[]
  return rows.map(planToPublic)
}

export function getPlanBySlug(slug: string): ValueScanPlanPublic | null {
  const row = db.prepare('SELECT * FROM valuescan_plans WHERE slug = ?').get(slug) as ValueScanPlan | undefined
  return row ? planToPublic(row) : null
}

export function getPlanById(id: string): ValueScanPlanPublic | null {
  const row = db.prepare('SELECT * FROM valuescan_plans WHERE id = ?').get(id) as ValueScanPlan | undefined
  return row ? planToPublic(row) : null
}

export function getUserPlan(userId: string | undefined): ValueScanPlanPublic {
  if (userId) {
    expireWhmcsSubscriptions(userId)
    const sub = db.prepare(`
      SELECT p.* FROM valuescan_subscriptions s
      JOIN valuescan_plans p ON p.id = s.plan_id
      WHERE s.user_id = ? AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
      ORDER BY s.started_at DESC
      LIMIT 1
    `).get(userId) as ValueScanPlan | undefined
    if (sub) return planToPublic(sub)
  }
  return getPlanBySlug('free')!
}

function expireWhmcsSubscriptions(userId: string) {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE valuescan_subscriptions
    SET status = 'cancelled', updated_at = ?
    WHERE user_id = ? AND status = 'active' AND billing_provider = 'whmcs'
      AND expires_at IS NOT NULL AND expires_at <= datetime('now')
  `).run(now, userId)
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}

export function countScansToday(userId: string | undefined, clientIp: string): number {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const sinceIso = since.toISOString()

  if (userId) {
    const row = db.prepare(`
      SELECT COUNT(*) as c FROM audit_scans
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, sinceIso) as { c: number }
    return row.c
  }

  const row = db.prepare(`
    SELECT COUNT(*) as c FROM audit_scans
    WHERE client_ip = ? AND user_id IS NULL AND created_at >= ?
  `).get(clientIp, sinceIso) as { c: number }
  return row.c
}

export function getEffectiveOwnerId(userId: string | undefined): string | undefined {
  if (!userId) return undefined
  const team = db.prepare(`
    SELECT owner_user_id FROM valuescan_team_members
    WHERE member_user_id = ? AND status = 'active'
    LIMIT 1
  `).get(userId) as { owner_user_id: string } | undefined
  return team?.owner_user_id ?? userId
}

export function getEffectivePlan(userId: string | undefined): ValueScanPlanPublic {
  return getUserPlan(getEffectiveOwnerId(userId))
}

export function checkScanQuota(userId: string | undefined, clientIp: string): {
  allowed: boolean
  used: number
  limit: number
  unlimited: boolean
  plan: ValueScanPlanPublic
  message?: string
} {
  const plan = getEffectivePlan(userId)
  const used = countScansToday(userId, clientIp)
  const unlimited = plan.scansPerDay < 0

  if (unlimited) {
    return { allowed: true, used, limit: -1, unlimited: true, plan }
  }

  if (used >= plan.scansPerDay) {
    return {
      allowed: false,
      used,
      limit: plan.scansPerDay,
      unlimited: false,
      plan,
      message: `Daily scan limit reached (${plan.scansPerDay}/${plan.name} plan). Upgrade your plan for more scans.`,
    }
  }

  return { allowed: true, used, limit: plan.scansPerDay, unlimited: false, plan }
}

export function assignUserPlan(userId: string, planId: string, adminId: string) {
  const plan = db.prepare('SELECT id FROM valuescan_plans WHERE id = ?').get(planId)
  if (!plan) throw new Error('Plan not found')

  db.prepare(`UPDATE valuescan_subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`)
    .run(new Date().toISOString(), userId)

  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO valuescan_subscriptions (id, user_id, plan_id, status, started_at, assigned_by, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
  `).run(
    `vs-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    planId,
    now,
    adminId,
    now,
    now,
  )
}

export function activatePlanFromWhmcs(userId: string, planSlug: string, whmcsInvoiceId: number) {
  const plan = db.prepare('SELECT id FROM valuescan_plans WHERE slug = ?').get(planSlug) as { id: string } | undefined
  if (!plan) return

  const now = new Date()
  const startedAt = now.toISOString()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + 30)

  db.prepare(`UPDATE valuescan_subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`)
    .run(startedAt, userId)

  db.prepare(`
    INSERT INTO valuescan_subscriptions (
      id, user_id, plan_id, status, started_at, billing_provider, whmcs_invoice_id, expires_at, created_at, updated_at
    )
    VALUES (?, ?, ?, 'active', ?, 'whmcs', ?, ?, ?, ?)
  `).run(
    `vs-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    plan.id,
    startedAt,
    whmcsInvoiceId,
    expiresAt.toISOString(),
    startedAt,
    startedAt,
  )
}

export function activatePlanFromStripe(userId: string, planSlug: string, stripeSubId: string, stripeCustomerId: string | null) {
  const plan = db.prepare('SELECT id FROM valuescan_plans WHERE slug = ?').get(planSlug) as { id: string } | undefined
  if (!plan) return

  const now = new Date().toISOString()
  db.prepare(`UPDATE valuescan_subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`)
    .run(now, userId)

  db.prepare(`
    INSERT INTO valuescan_subscriptions (id, user_id, plan_id, status, started_at, stripe_subscription_id, stripe_customer_id, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(
    `vs-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    plan.id,
    now,
    stripeSubId,
    stripeCustomerId,
    now,
    now,
  )
}

export function cancelStripeSubscription(userId: string) {
  const now = new Date().toISOString()
  db.prepare(`UPDATE valuescan_subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`)
    .run(now, userId)
}

export function getUserBillingInfo(userId: string) {
  const plan = getUserPlan(userId)
  const quota = checkScanQuota(userId, 'account')
  const sub = db.prepare(`
    SELECT stripe_customer_id, stripe_subscription_id, billing_provider, expires_at, whmcs_invoice_id
    FROM valuescan_subscriptions
    WHERE user_id = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY started_at DESC LIMIT 1
  `).get(userId) as {
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    billing_provider: string | null
    expires_at: string | null
    whmcs_invoice_id: number | null
  } | undefined

  return {
    plan,
    quota: {
      used: quota.used,
      limit: quota.limit,
      unlimited: quota.unlimited,
      remaining: quota.unlimited ? null : Math.max(0, quota.limit - quota.used),
    },
    stripeCustomerId: sub?.stripe_customer_id ?? null,
    stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
    canManageBilling: Boolean(sub?.stripe_customer_id),
    billingProvider: sub?.billing_provider ?? null,
    renewsAt: sub?.expires_at ?? null,
    whmcsInvoiceId: sub?.whmcs_invoice_id ?? null,
  }
}

export function getOnboardingSteps(userId: string): string[] {
  const row = db.prepare('SELECT onboarding_json FROM valuescan_user_settings WHERE user_id = ?').get(userId) as
    { onboarding_json: string } | undefined
  if (!row) return []
  try {
    return JSON.parse(row.onboarding_json) as string[]
  } catch {
    return []
  }
}

export function completeOnboardingStep(userId: string, step: string): string[] {
  const steps = new Set(getOnboardingSteps(userId))
  steps.add(step)
  const list = [...steps]
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO valuescan_user_settings (user_id, onboarding_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET onboarding_json = excluded.onboarding_json, updated_at = excluded.updated_at
  `).run(userId, JSON.stringify(list), now)
  return list
}

export function getScoreTrend(userId: string, url?: string, limit = 20) {
  const rows = url
    ? db.prepare(`
        SELECT id, url, overall_score, created_at FROM audit_scans
        WHERE user_id = ? AND url = ? ORDER BY created_at DESC LIMIT ?
      `).all(userId, url, limit)
    : db.prepare(`
        SELECT id, url, overall_score, created_at FROM audit_scans
        WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
      `).all(userId, limit)
  return (rows as Array<{ id: string; url: string; overall_score: number; created_at: string }>).reverse()
}

export function updatePlan(id: string, body: Partial<{ name: string; priceGbp: number; scansPerDay: number; features: string[]; active: boolean; sortOrder: number }>) {
  const row = db.prepare('SELECT * FROM valuescan_plans WHERE id = ?').get(id) as ValueScanPlan | undefined
  if (!row) throw new Error('Plan not found')

  const now = new Date().toISOString()
  db.prepare(`
    UPDATE valuescan_plans SET
      name = ?,
      price_gbp = ?,
      scans_per_day = ?,
      features = ?,
      active = ?,
      sort_order = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    body.name ?? row.name,
    body.priceGbp ?? row.price_gbp,
    body.scansPerDay ?? row.scans_per_day,
    body.features ? JSON.stringify(body.features) : row.features,
    body.active !== undefined ? (body.active ? 1 : 0) : row.active,
    body.sortOrder ?? row.sort_order,
    now,
    id,
  )

  return getPlanById(id)!
}

export function getAdminAnalytics() {
  const summary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM audit_scans) as totalScans,
      (SELECT COUNT(*) FROM audit_scans WHERE created_at >= date('now')) as scansToday,
      (SELECT COUNT(*) FROM audit_scans WHERE created_at >= date('now', '-7 days')) as scansWeek,
      (SELECT ROUND(AVG(overall_score), 1) FROM audit_scans) as avgScore,
      (SELECT COUNT(DISTINCT url) FROM audit_scans) as uniqueUrls,
      (SELECT COUNT(*) FROM valuescan_subscriptions WHERE status = 'active' AND plan_id != 'vs-plan-free') as paidSubs
  `).get() as Record<string, number>

  const scansOverTime = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count, ROUND(AVG(overall_score), 1) as avgScore
    FROM audit_scans
    WHERE created_at >= date('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all()

  const planBreakdown = db.prepare(`
    SELECT p.name, p.slug, COUNT(s.id) as subscribers
    FROM valuescan_plans p
    LEFT JOIN valuescan_subscriptions s ON s.plan_id = p.id AND s.status = 'active'
    GROUP BY p.id
    ORDER BY p.sort_order
  `).all()

  const recentScans = db.prepare(`
    SELECT id, url, overall_score, created_at, client_ip, user_id, plan_slug
    FROM audit_scans
    ORDER BY created_at DESC
    LIMIT 10
  `).all()

  const topDomains = db.prepare(`
    SELECT url, COUNT(*) as scanCount, ROUND(AVG(overall_score), 1) as avgScore
    FROM audit_scans
    GROUP BY url
    ORDER BY scanCount DESC
    LIMIT 10
  `).all()

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  const connectedSites = (db.prepare('SELECT COUNT(*) as c FROM valuescan_connected_sites').get() as { c: number }).c
  const support = getSupportTicketStats()

  return { summary, scansOverTime, planBreakdown, recentScans, topDomains, totalUsers, connectedSites, support }
}

export function listSubscriptions() {
  return db.prepare(`
    SELECT s.id, s.user_id, s.plan_id, s.status, s.started_at, s.updated_at,
           u.email, u.name,
           p.name as plan_name, p.slug as plan_slug, p.price_gbp
    FROM valuescan_subscriptions s
    JOIN users u ON u.id = s.user_id
    JOIN valuescan_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
    ORDER BY s.started_at DESC
  `).all()
}

export function listUsersWithoutSub() {
  return db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.created_at
    FROM users u
    WHERE u.id NOT IN (
      SELECT user_id FROM valuescan_subscriptions WHERE status = 'active'
    )
    ORDER BY u.created_at DESC
    LIMIT 100
  `).all() as UserRow[]
}
