import { db } from '../db.js'
import { executeAuditScan } from './audit-runner.js'
import { sendScoreDropAlert } from './email-service.js'
import { hasFeature } from './plan-features.js'
import { getEffectivePlan } from './audit-runner.js'
import { VALUESCAN } from '../config/valuescan.js'

async function fireWebhook(url: string, payload: object) {
  try {
    const isSlack = url.includes('hooks.slack.com')
    const isDiscord = url.includes('discord.com/api/webhooks')
    let body: string
    let headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (isSlack) {
      body = JSON.stringify({ text: `ValueScan: ${(payload as { event?: string }).event ?? 'alert'}`, blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `\`${(payload as { url?: string }).url}\` score: *${(payload as { score?: number }).score}*` } },
      ] })
    } else if (isDiscord) {
      body = JSON.stringify({ content: `ValueScan monitor: ${(payload as { url?: string }).url} → score ${(payload as { score?: number }).score}` })
    } else {
      body = JSON.stringify(payload)
    }
    await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
  } catch (err) {
    console.error('[ValueScan webhook]', err)
  }
}

export async function runDueMonitors() {
  const due = db.prepare(`
    SELECT * FROM valuescan_monitors
    WHERE enabled = 1 AND next_check_at <= ?
    LIMIT 10
  `).all(new Date().toISOString()) as Array<{
    id: string
    user_id: string
    url: string
    label: string
    alert_email: string | null
    alert_threshold: number
    webhook_url: string | null
    interval_hours: number
    last_score: number | null
  }>

  for (const m of due) {
    try {
      const plan = getEffectivePlan(m.user_id)
      if (!hasFeature(plan.slug, 'monitors')) continue

      const { report } = await executeAuditScan({
        url: m.url,
        userId: m.user_id,
        clientIp: 'monitor-worker',
      })

      const prev = m.last_score
      const now = new Date().toISOString()
      const next = new Date(Date.now() + m.interval_hours * 3600_000).toISOString()
      const reportUrl = `${VALUESCAN.url}/report/${report.id}`

      db.prepare(`
        UPDATE valuescan_monitors SET
          last_score = ?, previous_score = ?, last_scan_id = ?,
          last_checked_at = ?, next_check_at = ?
        WHERE id = ?
      `).run(report.overallScore, prev, report.id, now, next, m.id)

      if (prev !== null && prev - report.overallScore >= m.alert_threshold) {
        const email = m.alert_email
        if (email && hasFeature(plan.slug, 'email_alerts')) {
          await sendScoreDropAlert({
            to: email,
            url: m.url,
            oldScore: prev,
            newScore: report.overallScore,
            reportUrl,
          })
        }
      }

      if (m.webhook_url && hasFeature(plan.slug, 'webhooks')) {
        await fireWebhook(m.webhook_url, {
          event: 'monitor.scan_complete',
          url: m.url,
          score: report.overallScore,
          previousScore: prev,
          reportId: report.id,
          reportUrl,
        })
      }
    } catch (err) {
      console.error(`[ValueScan monitor] ${m.url}:`, err)
      const next = new Date(Date.now() + m.interval_hours * 3600_000).toISOString()
      db.prepare('UPDATE valuescan_monitors SET next_check_at = ? WHERE id = ?').run(next, m.id)
    }
  }
}

export function startMonitorWorker() {
  const intervalMs = Number(process.env.MONITOR_INTERVAL_MS ?? 15 * 60 * 1000)
  setInterval(() => {
    runDueMonitors().catch((err) => console.error('[ValueScan monitor worker]', err))
  }, intervalMs)
  console.log(`ValueScan monitor worker started (every ${intervalMs / 60000} min)`)
}
