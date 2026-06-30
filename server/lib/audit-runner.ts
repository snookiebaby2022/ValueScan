import { randomUUID, createHash, randomBytes } from 'crypto'
import { db } from '../db.js'
import { runAudit } from './audit-service.js'
import type { AuditReport } from './audit-types.js'
import { type ValueScanPlanPublic, getEffectivePlan } from './valuescan-service.js'

export { getEffectivePlan }
import { hasFeature, maxMonitors, canUseWebhooks, scanPriority } from './plan-features.js'

type ScanJob = {
  priority: number
  run: () => Promise<AuditReport>
  resolve: (r: AuditReport) => void
  reject: (e: Error) => void
}

const queue: ScanJob[] = []
let processing = false

function processQueue() {
  if (processing || queue.length === 0) return
  processing = true
  queue.sort((a, b) => a.priority - b.priority)
  const job = queue.shift()!
  job.run()
    .then(job.resolve)
    .catch(job.reject)
    .finally(() => {
      processing = false
      processQueue()
    })
}

export function enqueueScan(priority: number, run: () => Promise<AuditReport>): Promise<AuditReport> {
  return new Promise((resolve, reject) => {
    queue.push({ priority, run, resolve, reject })
    processQueue()
  })
}

export async function executeAuditScan(opts: {
  url: string
  userId?: string
  clientIp: string
  siteAudit?: boolean
}): Promise<{ report: AuditReport; plan: ValueScanPlanPublic }> {
  const plan = getEffectivePlan(opts.userId)
  const priority = scanPriority(plan.slug)

  const run = async () => {
    if (opts.siteAudit && plan.slug === 'agency') {
      const { runSiteAudit } = await import('./audit-multipage.js')
      return runSiteAudit(opts.url, 5)
    }
    return runAudit(opts.url)
  }

  const report = await enqueueScan(priority, run)

  db.prepare(`
    INSERT INTO audit_scans (id, url, final_url, overall_score, report_json, created_at, user_id, client_ip, plan_slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    report.id,
    report.meta.url,
    report.meta.finalUrl,
    report.overallScore,
    JSON.stringify(report),
    report.meta.scannedAt,
    opts.userId ?? null,
    opts.clientIp,
    plan.slug,
  )

  return { report, plan }
}

export function getPreviousScan(url: string, userId: string | undefined, excludeId: string): AuditReport | null {
  const row = db.prepare(`
    SELECT report_json FROM audit_scans
    WHERE url = ? AND id != ? AND (user_id = ? OR ? IS NULL)
    ORDER BY created_at DESC
    LIMIT 1
  `).get(url, excludeId, userId ?? null, userId ?? null) as { report_json: string } | undefined
  if (!row) return null
  return JSON.parse(row.report_json) as AuditReport
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `vs_${randomBytes(24).toString('hex')}`
  const prefix = raw.slice(0, 11)
  return { raw, prefix, hash: hashApiKey(raw) }
}

export function verifyApiKey(raw: string): { userId: string; keyId: string } | null {
  const hash = hashApiKey(raw)
  const row = db.prepare(`
    SELECT id, user_id FROM valuescan_api_keys
    WHERE key_hash = ? AND revoked = 0
  `).get(hash) as { id: string; user_id: string } | undefined
  if (!row) return null
  db.prepare('UPDATE valuescan_api_keys SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), row.id)
  return { userId: row.user_id, keyId: row.id }
}

export function createApiKey(userId: string, name: string) {
  const { raw, prefix, hash } = generateApiKey()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO valuescan_api_keys (id, user_id, name, key_prefix, key_hash, created_at, revoked)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(id, userId, name, prefix, hash, now)
  return { id, name, prefix, raw, createdAt: now }
}

export function listApiKeys(userId: string) {
  return db.prepare(`
    SELECT id, name, key_prefix, created_at, last_used_at, revoked
    FROM valuescan_api_keys WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId)
}

export function revokeApiKey(userId: string, keyId: string) {
  db.prepare('UPDATE valuescan_api_keys SET revoked = 1 WHERE id = ? AND user_id = ?').run(keyId, userId)
}

export type Branding = {
  companyName: string
  logoUrl: string
  hideValueScan: boolean
  accentColor: string
}

export function getBranding(userId: string): Branding {
  const row = db.prepare('SELECT * FROM valuescan_branding WHERE user_id = ?').get(userId) as {
    company_name: string
    logo_url: string
    hide_valuescan: number
    accent_color: string
  } | undefined
  if (!row) {
    return { companyName: '', logoUrl: '', hideValueScan: false, accentColor: '#6366f1' }
  }
  return {
    companyName: row.company_name,
    logoUrl: row.logo_url,
    hideValueScan: row.hide_valuescan === 1,
    accentColor: row.accent_color || '#6366f1',
  }
}

export function saveBranding(userId: string, b: Partial<Branding>) {
  const existing = getBranding(userId)
  const merged = { ...existing, ...b }
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO valuescan_branding (user_id, company_name, logo_url, hide_valuescan, accent_color, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      company_name = excluded.company_name,
      logo_url = excluded.logo_url,
      hide_valuescan = excluded.hide_valuescan,
      accent_color = excluded.accent_color,
      updated_at = excluded.updated_at
  `).run(
    userId,
    merged.companyName,
    merged.logoUrl,
    merged.hideValueScan ? 1 : 0,
    merged.accentColor,
    now,
  )
  return merged
}

export function listMonitors(userId: string) {
  return db.prepare(`
    SELECT * FROM valuescan_monitors WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId)
}

export function createMonitor(userId: string, body: {
  url: string
  label?: string
  alertEmail?: string
  alertThreshold?: number
  webhookUrl?: string
  intervalHours?: number
}) {
  const plan = getEffectivePlan(userId)
  const limit = maxMonitors(plan.slug)
  if (limit <= 0) {
    throw new Error('Upgrade to Pro to add domain monitors and email alerts')
  }
  const count = db.prepare('SELECT COUNT(*) as c FROM valuescan_monitors WHERE user_id = ?').get(userId) as { c: number }
  if (count.c >= limit) {
    throw new Error(`Monitor limit reached (${limit}). Remove one or upgrade your plan.`)
  }
  if (body.webhookUrl && !canUseWebhooks(plan.slug)) {
    throw new Error('Webhooks require Agency plan')
  }

  const id = randomUUID()
  const now = new Date().toISOString()
  const hours = body.intervalHours ?? 24
  const next = new Date(Date.now() + hours * 3600_000).toISOString()
  db.prepare(`
    INSERT INTO valuescan_monitors (
      id, user_id, url, label, alert_email, alert_threshold, webhook_url,
      interval_hours, enabled, created_at, next_check_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id, userId, body.url.trim(), body.label ?? body.url,
    body.alertEmail ?? null, body.alertThreshold ?? 10,
    body.webhookUrl ?? null, hours, now, next,
  )
  return db.prepare('SELECT * FROM valuescan_monitors WHERE id = ?').get(id)
}

export function deleteMonitor(userId: string, id: string) {
  db.prepare('DELETE FROM valuescan_monitors WHERE id = ? AND user_id = ?').run(id, userId)
}

export function listTeamMembers(ownerId: string) {
  return db.prepare(`
    SELECT t.id, t.member_user_id, t.status, t.created_at, u.email, u.name
    FROM valuescan_team_members t
    JOIN users u ON u.id = t.member_user_id
    WHERE t.owner_user_id = ? AND t.status = 'active'
    ORDER BY t.created_at DESC
  `).all(ownerId)
}

export function inviteTeamMember(ownerId: string, email: string) {
  const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email) as
    { id: string; email: string; name: string } | undefined
  if (user) {
    if (user.id === ownerId) throw new Error('Cannot add yourself')
    const existing = db.prepare(`
      SELECT id FROM valuescan_team_members
      WHERE owner_user_id = ? AND member_user_id = ? AND status = 'active'
    `).get(ownerId, user.id)
    if (existing) throw new Error('Already on team')
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO valuescan_team_members (id, owner_user_id, member_user_id, status, created_at)
      VALUES (?, ?, ?, 'active', ?)
    `).run(id, ownerId, user.id, now)
    return { id, email: user.email, name: user.name, createdAt: now, pending: false }
  }

  const token = randomBytes(24).toString('hex')
  const id = randomUUID()
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 7 * 86400_000).toISOString()
  db.prepare(`
    INSERT INTO valuescan_team_invites (id, owner_user_id, email, token, status, expires_at, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, ownerId, email.toLowerCase(), token, expires, now)
  return { id, email, token, pending: true, expiresAt: expires }
}

export function acceptTeamInvite(token: string, userId: string) {
  const invite = db.prepare(`
    SELECT * FROM valuescan_team_invites WHERE token = ? AND status = 'pending'
  `).get(token) as {
    id: string; owner_user_id: string; email: string; expires_at: string
  } | undefined
  if (!invite) throw new Error('Invalid or expired invite')
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired')

  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string }
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error('Invite was sent to a different email address')
  }

  const memberId = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO valuescan_team_members (id, owner_user_id, member_user_id, status, created_at)
    VALUES (?, ?, ?, 'active', ?)
  `).run(memberId, invite.owner_user_id, userId, now)
  db.prepare(`UPDATE valuescan_team_invites SET status = 'accepted' WHERE id = ?`).run(invite.id)
  return { ok: true }
}

export function removeTeamMember(ownerId: string, memberId: string) {
  db.prepare(`
    UPDATE valuescan_team_members SET status = 'removed'
    WHERE owner_user_id = ? AND member_user_id = ?
  `).run(ownerId, memberId)
}

export function reportToCsv(report: AuditReport): string {
  const header = 'Category,Status,Impact,Title,Description,Recommendation'
  const rows = report.findings.map((f) =>
    [f.category, f.status, f.impact, f.title, f.description, f.recommendation ?? '']
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  )
  return [header, ...rows].join('\n')
}

export function reportToPrintHtml(report: AuditReport, branding: Branding): string {
  const brand = branding.companyName || 'ValueScan'
  const hideVs = branding.hideValueScan
  const findings = report.findings.map((f) =>
    `<tr><td>${f.status}</td><td>${f.category}</td><td>${f.title}</td><td>${f.description}</td><td>${f.recommendation ?? ''}</td></tr>`,
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${brand} Report</title>
<style>body{font-family:system-ui,sans-serif;padding:2rem;color:#111}table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}.score{font-size:48px;font-weight:700}</style></head>
<body>${branding.logoUrl ? `<img src="${branding.logoUrl}" height="40" alt="">` : ''}
<h1>${brand} Audit Report</h1>${hideVs ? '' : '<p>Powered by ValueScan</p>'}
<p><strong>URL:</strong> ${report.meta.url}</p>
<p class="score">Score: ${report.overallScore}/100</p>
<p>${report.summary}</p>
<h2>Findings</h2>
<table><thead><tr><th>Status</th><th>Category</th><th>Issue</th><th>Detail</th><th>Fix</th></tr></thead>
<tbody>${findings}</tbody></table></body></html>`
}
