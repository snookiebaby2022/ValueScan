import { Router } from 'express'
import { db } from '../db.js'
import type { AuditReport } from '../lib/audit-types.js'
import { optionalAuth } from '../middleware/auth.js'
import {
  checkScanQuota,
  getClientIp,
  listPlans,
} from '../lib/valuescan-service.js'
import { executeAuditScan, getEffectivePlan } from '../lib/audit-runner.js'
import { hasFeature, planFeatures } from '../lib/plan-features.js'
import { maybeAlertScoreDrop } from '../lib/scan-alerts.js'
import auditFeaturesRoutes from './audit-features.js'

const router = Router()

function summarizeReport(report: AuditReport) {
  const categories: Record<string, { score: number; max: number }> = {}
  for (const c of report.categories) {
    categories[c.category] = { score: c.score, max: 100 }
  }
  return {
    score: report.overallScore,
    issues: report.findings.filter((f) => f.status === 'fail').length,
    warnings: report.findings.filter((f) => f.status === 'warn').length,
    url: report.meta.finalUrl || report.meta.url,
    reportId: report.id,
    categories,
  }
}

async function runScan(
  req: import('express').Request,
  res: import('express').Response,
  url: string,
  siteAudit: boolean,
) {
  if (!url) {
    res.status(400).json({ error: 'URL is required' })
    return
  }

  const clientIp = getClientIp(req)
  const userId = req.user?.userId
  const quota = checkScanQuota(userId, clientIp)

  if (!quota.allowed) {
    res.status(429).json({
      error: quota.message ?? 'Daily scan limit reached',
      quota: { used: quota.used, limit: quota.limit, plan: quota.plan },
    })
    return
  }

  try {
    const { report, plan } = await executeAuditScan({ url, userId, clientIp, siteAudit })
    if (userId && req.userRow?.email) {
      await maybeAlertScoreDrop({
        userId,
        userEmail: req.userRow.email,
        url: report.meta.url,
        report,
      })
    }
    res.json({
      ...summarizeReport(report),
      report,
      quota: {
        used: quota.used + 1,
        limit: quota.limit,
        unlimited: quota.unlimited,
        remaining: quota.unlimited ? null : Math.max(0, quota.limit - quota.used - 1),
        plan,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Audit failed'
    res.status(422).json({ error: message })
  }
}

router.get('/plans', (_req, res) => {
  res.json({ plans: listPlans(true) })
})

router.get('/quota', optionalAuth, (req, res) => {
  const clientIp = getClientIp(req)
  const quota = checkScanQuota(req.user?.userId, clientIp)
  const features = req.user?.userId ? planFeatures(getEffectivePlan(req.user.userId).slug) : []
  res.json({
    used: quota.used,
    limit: quota.limit,
    unlimited: quota.unlimited,
    remaining: quota.unlimited ? null : Math.max(0, quota.limit - quota.used),
    plan: quota.plan,
    features,
  })
})

/** Quick audit via query string — works through strict CDNs that block POST. */
router.get('/', optionalAuth, async (req, res) => {
  const url = typeof req.query.url === 'string' ? req.query.url.trim() : ''
  await runScan(req, res, url, false)
})

router.post('/scan', optionalAuth, async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const siteAudit = Boolean(req.body?.siteAudit) && req.user?.userId
    && hasFeature(getEffectivePlan(req.user.userId).slug, 'multipage')
  await runScan(req, res, url, siteAudit)
})

router.get('/history', optionalAuth, (req, res) => {
  const clientIp = getClientIp(req)
  const userId = req.user?.userId
  const rows = userId
    ? db.prepare(`
        SELECT id, url, final_url, overall_score, created_at, plan_slug
        FROM audit_scans WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 50
      `).all(userId)
    : db.prepare(`
        SELECT id, url, final_url, overall_score, created_at, plan_slug
        FROM audit_scans WHERE user_id IS NULL AND client_ip = ?
        ORDER BY created_at DESC LIMIT 50
      `).all(clientIp)
  res.json({ scans: rows })
})

router.delete('/history', optionalAuth, (req, res) => {
  const clientIp = getClientIp(req)
  const userId = req.user?.userId
  const result = userId
    ? db.prepare('DELETE FROM audit_scans WHERE user_id = ?').run(userId)
    : db.prepare('DELETE FROM audit_scans WHERE user_id IS NULL AND client_ip = ?').run(clientIp)
  res.json({ ok: true, deleted: result.changes })
})

router.use(auditFeaturesRoutes)

router.get('/:id', (req, res) => {
  const reserved = ['plans', 'quota', 'history']
  if (reserved.includes(req.params.id)) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const row = db.prepare('SELECT report_json FROM audit_scans WHERE id = ?')
    .get(req.params.id) as { report_json: string } | undefined

  if (!row) {
    res.status(404).json({ error: 'Audit report not found' })
    return
  }

  const report = JSON.parse(row.report_json) as AuditReport
  res.json({ report })
})

export default router
