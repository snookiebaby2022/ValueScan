import { Router } from 'express'
import { db } from '../db.js'
import type { AuditReport } from '../lib/audit-types.js'
import { authRequired } from '../middleware/auth.js'
import {
  createApiKey,
  createMonitor,
  deleteMonitor,
  getBranding,
  getEffectivePlan,
  getPreviousScan,
  inviteTeamMember,
  acceptTeamInvite,
  listApiKeys,
  listMonitors,
  listTeamMembers,
  removeTeamMember,
  reportToCsv,
  reportToPrintHtml,
  revokeApiKey,
  saveBranding,
  verifyApiKey,
} from '../lib/audit-runner.js'
import { hasFeature, planFeatures } from '../lib/plan-features.js'
import { checkScanQuota } from '../lib/valuescan-service.js'
import { executeAuditScan } from '../lib/audit-runner.js'
import { sendSupportTicket, sendTeamInviteEmail } from '../lib/email-service.js'
import { createSupportTicket } from '../lib/support-tickets.js'
import { completeOnboardingStep, getOnboardingSteps, getScoreTrend } from '../lib/valuescan-service.js'
import { reportToPdfBuffer } from '../lib/pdf-export.js'
import { VALUESCAN } from '../config/valuescan.js'

const router = Router()

function requireFeature(feature: Parameters<typeof hasFeature>[1]) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const plan = getEffectivePlan(req.user!.userId)
    if (!hasFeature(plan.slug, feature)) {
      res.status(403).json({ error: 'Upgrade your plan to access this feature' })
      return
    }
    next()
  }
}

router.get('/me', authRequired, (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  res.json({
    plan,
    features: planFeatures(plan.slug),
    branding: getBranding(req.user!.userId),
  })
})

router.get('/my-history', authRequired, requireFeature('history'), (req, res) => {
  const scans = db.prepare(`
    SELECT id, url, final_url, overall_score, created_at, plan_slug
    FROM audit_scans WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 200
  `).all(req.user!.userId)
  res.json({ scans })
})

router.get('/monitors', authRequired, requireFeature('monitors'), (req, res) => {
  res.json({ monitors: listMonitors(req.user!.userId) })
})

router.post('/monitors', authRequired, requireFeature('monitors'), (req, res) => {
  try {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
    if (!url) {
      res.status(400).json({ error: 'URL required' })
      return
    }
    const monitor = createMonitor(req.user!.userId, {
      url,
      label: req.body.label,
      alertEmail: req.body.alertEmail ?? req.userRow!.email,
      alertThreshold: req.body.alertThreshold,
      webhookUrl: req.body.webhookUrl,
      intervalHours: req.body.intervalHours,
    })
    res.json({ monitor })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed' })
  }
})

router.delete('/monitors/:id', authRequired, requireFeature('monitors'), (req, res) => {
  deleteMonitor(req.user!.userId, req.params.id)
  res.json({ ok: true })
})

router.get('/api-keys', authRequired, requireFeature('api'), (req, res) => {
  res.json({ keys: listApiKeys(req.user!.userId) })
})

router.post('/api-keys', authRequired, requireFeature('api'), (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : 'Default'
  const key = createApiKey(req.user!.userId, name || 'Default')
  res.json({ key })
})

router.delete('/api-keys/:id', authRequired, requireFeature('api'), (req, res) => {
  revokeApiKey(req.user!.userId, req.params.id)
  res.json({ ok: true })
})

router.get('/branding', authRequired, requireFeature('whitelabel'), (req, res) => {
  res.json({ branding: getBranding(req.user!.userId) })
})

router.put('/branding', authRequired, requireFeature('whitelabel'), (req, res) => {
  const branding = saveBranding(req.user!.userId, {
    companyName: req.body.companyName,
    logoUrl: req.body.logoUrl,
    hideValueScan: req.body.hideValueScan,
    accentColor: req.body.accentColor,
  })
  res.json({ branding })
})

router.get('/team', authRequired, requireFeature('team'), (req, res) => {
  res.json({ members: listTeamMembers(req.user!.userId) })
})

router.post('/team', authRequired, requireFeature('team'), async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  if (!email) {
    res.status(400).json({ error: 'Email required' })
    return
  }
  try {
    const member = inviteTeamMember(req.user!.userId, email)
    if (member.pending && member.token) {
      await sendTeamInviteEmail({
        to: email,
        ownerName: req.userRow!.name,
        acceptUrl: `${VALUESCAN.url}/accept-invite/${member.token}`,
      })
    }
    res.json({ member })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed' })
  }
})

router.post('/team/accept', authRequired, (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
  if (!token) {
    res.status(400).json({ error: 'Token required' })
    return
  }
  try {
    acceptTeamInvite(token, req.user!.userId)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed' })
  }
})

router.get('/trends', authRequired, requireFeature('history'), (req, res) => {
  const url = typeof req.query.url === 'string' ? req.query.url : undefined
  res.json({ trends: getScoreTrend(req.user!.userId, url) })
})

router.get('/onboarding', authRequired, (req, res) => {
  res.json({ completed: getOnboardingSteps(req.user!.userId) })
})

router.post('/onboarding', authRequired, (req, res) => {
  const step = typeof req.body?.step === 'string' ? req.body.step.trim() : ''
  if (!step) {
    res.status(400).json({ error: 'step required' })
    return
  }
  res.json({ completed: completeOnboardingStep(req.user!.userId, step) })
})

router.get('/compare/:idA/:idB', authRequired, requireFeature('history'), (req, res) => {
  const rowA = db.prepare('SELECT report_json, user_id FROM audit_scans WHERE id = ?').get(req.params.idA) as
    { report_json: string; user_id: string | null } | undefined
  const rowB = db.prepare('SELECT report_json, user_id FROM audit_scans WHERE id = ?').get(req.params.idB) as
    { report_json: string; user_id: string | null } | undefined
  if (!rowA || !rowB) {
    res.status(404).json({ error: 'Report not found' })
    return
  }
  const uid = req.user!.userId
  if (rowA.user_id !== uid || rowB.user_id !== uid) {
    res.status(403).json({ error: 'Access denied' })
    return
  }
  const reportA = JSON.parse(rowA.report_json) as AuditReport
  const reportB = JSON.parse(rowB.report_json) as AuditReport
  const titlesB = new Set(reportB.findings.map((f) => f.title))
  const improved = reportA.findings.filter((f) => !titlesB.has(f.title) && f.status === 'pass')
  const regressed = reportB.findings.filter((f) => {
    const prev = reportA.findings.find((x) => x.title === f.title)
    return prev && prev.status === 'pass' && (f.status === 'warn' || f.status === 'fail')
  })
  res.json({
    reportA: { id: req.params.idA, score: reportA.overallScore, url: reportA.meta.url },
    reportB: { id: req.params.idB, score: reportB.overallScore, url: reportB.meta.url },
    delta: reportB.overallScore - reportA.overallScore,
    improved: improved.slice(0, 20),
    regressed: regressed.slice(0, 20),
  })
})

router.delete('/team/:memberId', authRequired, requireFeature('team'), (req, res) => {
  removeTeamMember(req.user!.userId, req.params.memberId)
  res.json({ ok: true })
})

router.post('/support', authRequired, requireFeature('support'), async (req, res) => {
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : ''
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!subject || !message) {
    res.status(400).json({ error: 'Subject and message required' })
    return
  }
  await sendSupportTicket({
    email: req.userRow!.email,
    userName: req.userRow!.name,
    subject,
    message,
  })
  createSupportTicket(req.user!.userId, req.userRow!.email, req.userRow!.name, subject, message)
  res.json({ ok: true })
})

router.get('/:id/compare', (req, res) => {
  const row = db.prepare('SELECT report_json, user_id, url FROM audit_scans WHERE id = ?')
    .get(req.params.id) as { report_json: string; user_id: string | null; url: string } | undefined
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const report = JSON.parse(row.report_json) as AuditReport
  const previous = getPreviousScan(row.url, row.user_id ?? undefined, report.id)
  if (!previous) {
    res.json({ previous: null })
    return
  }
  res.json({
    previous: {
      id: previous.id,
      score: previous.overallScore,
      scannedAt: previous.meta.scannedAt,
      delta: report.overallScore - previous.overallScore,
    },
  })
})

router.get('/:id/export/pdf', async (req, res) => {
  const row = db.prepare('SELECT report_json, user_id FROM audit_scans WHERE id = ?')
    .get(req.params.id) as { report_json: string; user_id: string | null } | undefined
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  if (row.user_id) {
    const plan = getEffectivePlan(row.user_id)
    if (!hasFeature(plan.slug, 'pdf')) {
      res.status(403).json({ error: 'PDF export requires Pro plan' })
      return
    }
  }
  const report = JSON.parse(row.report_json) as AuditReport
  const branding = row.user_id ? getBranding(row.user_id) : getBranding('')
  const format = req.query.format?.toString() ?? 'pdf'
  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(reportToPrintHtml(report, branding))
    return
  }
  try {
    const pdf = await reportToPdfBuffer(report, branding)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="valuescan-${report.id}.pdf"`)
    res.send(pdf)
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(reportToPrintHtml(report, branding))
  }
})

router.get('/:id/export/csv', (req, res) => {
  const row = db.prepare('SELECT report_json, user_id FROM audit_scans WHERE id = ?')
    .get(req.params.id) as { report_json: string; user_id: string | null } | undefined
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  if (row.user_id) {
    const plan = getEffectivePlan(row.user_id)
    if (!hasFeature(plan.slug, 'csv')) {
      res.status(403).json({ error: 'CSV export requires Agency plan' })
      return
    }
  }
  const report = JSON.parse(row.report_json) as AuditReport
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="valuescan-${report.id}.csv"`)
  res.send(reportToCsv(report))
})

export default router

export const apiV1Router = Router()

apiV1Router.post('/scan', async (req, res) => {
  const auth = req.headers.authorization
  const rawKey = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : req.headers['x-api-key']?.toString()
  if (!rawKey) {
    res.status(401).json({ error: 'API key required (Bearer token or X-API-Key header)' })
    return
  }
  const verified = verifyApiKey(rawKey)
  if (!verified) {
    res.status(401).json({ error: 'Invalid API key' })
    return
  }
  const plan = getEffectivePlan(verified.userId)
  if (!hasFeature(plan.slug, 'api')) {
    res.status(403).json({ error: 'API access requires Agency plan' })
    return
  }
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  if (!url) {
    res.status(400).json({ error: 'URL required' })
    return
  }
  const quota = checkScanQuota(verified.userId, 'api-key')
  if (!quota.allowed) {
    res.status(429).json({ error: quota.message })
    return
  }
  try {
    const { report } = await executeAuditScan({
      url,
      userId: verified.userId,
      clientIp: 'api-v1',
    })
    res.json({
      reportId: report.id,
      url: report.meta.url,
      score: report.overallScore,
      reportUrl: `${VALUESCAN.url}/report/${report.id}`,
      categories: report.categories,
    })
  } catch (err) {
    res.status(422).json({ error: err instanceof Error ? err.message : 'Scan failed' })
  }
})
