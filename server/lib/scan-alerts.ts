import { db } from '../db.js'
import { VALUESCAN } from '../config/valuescan.js'
import { sendScoreDropAlert } from './email-service.js'
import { hasFeature } from './plan-features.js'
import { getEffectivePlan } from './valuescan-service.js'
import { getPreviousScan } from './audit-runner.js'
import type { AuditReport } from './audit-types.js'

export async function maybeAlertScoreDrop(opts: {
  userId: string
  userEmail: string
  url: string
  report: AuditReport
  threshold?: number
}) {
  const plan = getEffectivePlan(opts.userId)
  if (!hasFeature(plan.slug, 'email_alerts')) return

  const previous = getPreviousScan(opts.url, opts.userId, opts.report.id)
  if (!previous) return

  const drop = previous.overallScore - opts.report.overallScore
  const threshold = opts.threshold ?? 10
  if (drop < threshold) return

  const monitor = db.prepare(`
    SELECT alert_threshold FROM valuescan_monitors
    WHERE user_id = ? AND url = ? AND enabled = 1 LIMIT 1
  `).get(opts.userId, opts.url) as { alert_threshold: number } | undefined

  const effectiveThreshold = monitor?.alert_threshold ?? threshold
  if (drop < effectiveThreshold) return

  await sendScoreDropAlert({
    to: opts.userEmail,
    url: opts.url,
    oldScore: previous.overallScore,
    newScore: opts.report.overallScore,
    reportUrl: `${VALUESCAN.url}/report/${opts.report.id}`,
  })
}
