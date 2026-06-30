import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { executeAuditScan, createMonitor } from './audit-runner.js'
import { hasFeature } from './plan-features.js'
import { getEffectivePlan } from './valuescan-service.js'
import { sendGrowthDigest } from './email-service.js'
import { logAutopilot } from './growth-utils.js'
import { syncKeywords, listKeywords, topKeyword } from './growth-keywords.js'
import { runLlmVisibilityScan, saveLlmSnapshots, getLlmVisibility } from './growth-llm-tracker.js'
import { syncRedditThreads } from './growth-reddit.js'
import {
  countScheduled,
  generateArticleRecord,
  listArticles,
  publishScheduledArticle,
} from './growth-content.js'
import { discoverLinkProspects, listLinks } from './growth-links.js'
import { runAutomatedLinkBuilding, ensureBacklinkProfile } from './growth-backlinks.js'
import { advanceMarketingCampaign, listCampaigns, seedMarketingCampaigns } from './growth-marketing.js'

type SiteRow = {
  id: string
  user_id: string
  url: string
  label: string
  autopilot_enabled: number
  cms_webhook_url: string | null
  last_scan_at: string | null
  last_growth_run_at: string | null
  next_growth_run_at: string | null
  next_autopilot_at: string | null
  email: string
  name: string
}

function parseReport(row: { report_json: string } | undefined): AuditReport | null {
  if (!row) return null
  try {
    return JSON.parse(row.report_json) as AuditReport
  } catch {
    return null
  }
}

function latestScan(userId: string, url: string): AuditReport | null {
  const normalized = url.replace(/\/+$/, '')
  const row = db.prepare(`
    SELECT report_json FROM audit_scans
    WHERE user_id = ? AND (url = ? OR final_url = ?)
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, normalized, normalized) as { report_json: string } | undefined
  return parseReport(row)
}

function hoursSince(iso: string | null): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 3600_000
}

async function ensureFreshScan(site: SiteRow): Promise<AuditReport | null> {
  if (hoursSince(site.last_scan_at) < 24) {
    return latestScan(site.user_id, site.url)
  }

  try {
    const { report } = await executeAuditScan({
      url: site.url,
      userId: site.user_id,
      clientIp: 'growth-worker',
    })
    const now = new Date().toISOString()
    db.prepare('UPDATE valuescan_connected_sites SET last_scan_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, site.id)
    logAutopilot(site.user_id, site.id, 'rescan', `Score ${report.overallScore}`)
    return report
  } catch (err) {
    console.error('[Growth worker] rescan failed', site.url, err)
    return latestScan(site.user_id, site.url)
  }
}

export async function runGrowthForSite(site: SiteRow, fullAutopilot: boolean) {
  const plan = getEffectivePlan(site.user_id)
  const now = new Date().toISOString()

  const report = await ensureFreshScan(site)

  if (hasFeature(plan.slug, 'keywords')) {
    syncKeywords(site.user_id, site.id, report, site.url)
    logAutopilot(site.user_id, site.id, 'keywords_synced')
  }

  if (hasFeature(plan.slug, 'llm_visibility')) {
    const llm = await runLlmVisibilityScan(site.url, report)
    saveLlmSnapshots(site.user_id, site.id, llm)
    logAutopilot(site.user_id, site.id, 'llm_check', `${llm.length} engines`)
  }

  if (hasFeature(plan.slug, 'ai_content')) {
    const scheduled = countScheduled(site.user_id, site.id)
    if (scheduled < 2) {
      const kw = topKeyword(site.user_id, site.id) ?? `${site.label} guide`
      generateArticleRecord(site.user_id, site.id, site.url, report, kw)
      logAutopilot(site.user_id, site.id, 'article_generated', kw)
    }
    const published = await publishScheduledArticle(
      site.user_id,
      site.email,
      site.id,
      site.cms_webhook_url,
    )
    if (published) {
      logAutopilot(site.user_id, site.id, 'article_published', published.publishUrl ?? '')
    }
  }

  if (hasFeature(plan.slug, 'link_building')) {
    const linkResult = await runAutomatedLinkBuilding(
      site.user_id,
      site.email,
      site.id,
      site.url,
      report,
      { fullAutopilot },
    )
    if (linkResult.profile) {
      logAutopilot(site.user_id, site.id, 'backlink_profile', linkResult.profile.liveUrl ?? '')
    }
    if (linkResult.blogLinks > 0) {
      logAutopilot(site.user_id, site.id, 'blog_backlinks', `${linkResult.blogLinks} synced`)
    }
    for (const link of linkResult.advanced) {
      logAutopilot(site.user_id, site.id, 'link_outreach', `${link.targetDomain} → ${link.status}`)
    }
  }

  if (hasFeature(plan.slug, 'reddit')) {
    const kws = listKeywords(site.user_id, site.id).map((k) => k.keyword)
    await syncRedditThreads(site.user_id, site.id, site.url, kws)
    logAutopilot(site.user_id, site.id, 'reddit_sync')
  }

  if (hasFeature(plan.slug, 'marketing_campaigns')) {
    const kws = listKeywords(site.user_id, site.id).map((k) => k.keyword)
    if (listCampaigns(site.user_id, site.id).length === 0) {
      seedMarketingCampaigns(site.user_id, site.id, site.url, kws, report)
      logAutopilot(site.user_id, site.id, 'marketing_seeded')
    }
    const advanced = await advanceMarketingCampaign(site.user_id, site.email, site.url, site.name)
    if (advanced) {
      logAutopilot(site.user_id, site.id, 'marketing_campaign', `${advanced.name} → ${advanced.status}`)
    }
  }

  const llm = getLlmVisibility(site.user_id, site.id)
  const articles = listArticles(site.user_id, site.id)
  const links = listLinks(site.user_id, site.id)
  const campaigns = listCampaigns(site.user_id, site.id)

  await sendGrowthDigest({
    to: site.email,
    siteUrl: site.url,
    articlesPublished: articles.filter((a) => a.status === 'published').length,
    linksLive: links.filter((l) => l.status === 'live').length,
    campaignsActive: campaigns.filter((c) => c.status === 'active' || c.status === 'scheduled').length,
    avgLlmScore: llm.length
      ? Math.round(llm.reduce((s, e) => s + e.score, 0) / llm.length)
      : 0,
    autopilot: fullAutopilot,
  })

  const growthIntervalH = fullAutopilot
    ? Number(process.env.GROWTH_AUTOPILOT_INTERVAL_HOURS ?? 6)
    : Number(process.env.GROWTH_PRO_INTERVAL_HOURS ?? 24)

  db.prepare(`
    UPDATE valuescan_connected_sites SET
      last_growth_run_at = ?,
      next_growth_run_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    now,
    new Date(Date.now() + growthIntervalH * 3600_000).toISOString(),
    now,
    site.id,
  )

  if (fullAutopilot) {
    db.prepare(`
      UPDATE valuescan_connected_sites SET last_autopilot_at = ?, next_autopilot_at = ? WHERE id = ?
    `).run(now, new Date(Date.now() + growthIntervalH * 3600_000).toISOString(), site.id)
  }
}

export async function runDueGrowthJobs() {
  const now = new Date().toISOString()

  const proSites = db.prepare(`
    SELECT s.*, u.email, u.name FROM valuescan_connected_sites s
    JOIN users u ON u.id = s.user_id
    WHERE s.next_growth_run_at IS NULL OR s.next_growth_run_at <= ?
    LIMIT 8
  `).all(now) as SiteRow[]

  for (const site of proSites) {
    const plan = getEffectivePlan(site.user_id)
    if (!hasFeature(plan.slug, 'growth_roadmap')) continue
    if (!hasFeature(plan.slug, 'ai_content') && !hasFeature(plan.slug, 'keywords')) continue
    try {
      const fullAutopilot = site.autopilot_enabled === 1 && hasFeature(plan.slug, 'autopilot')
      await runGrowthForSite(site, fullAutopilot)
    } catch (err) {
      console.error('[Growth worker]', site.url, err)
    }
  }
}

export async function bootstrapGrowthSite(userId: string, siteId: string, siteUrl: string, userEmail: string) {
  const plan = getEffectivePlan(userId)
  if (!hasFeature(plan.slug, 'growth_roadmap')) return
  const report = latestScan(userId, siteUrl)

  if (hasFeature(plan.slug, 'keywords')) {
    syncKeywords(userId, siteId, report, siteUrl)
  }
  if (hasFeature(plan.slug, 'llm_visibility')) {
    const llm = await runLlmVisibilityScan(siteUrl, report)
    saveLlmSnapshots(userId, siteId, llm)
  }
  if (hasFeature(plan.slug, 'ai_content')) {
    const kws = listKeywords(userId, siteId)
    const kw = kws[0]?.keyword ?? 'site growth guide'
    if (listArticles(userId, siteId).length === 0) {
      generateArticleRecord(userId, siteId, siteUrl, report, kw)
    }
  }
  if (hasFeature(plan.slug, 'link_building')) {
    ensureBacklinkProfile(userId, siteId, siteUrl, report)
    await discoverLinkProspects(userId, siteId, siteUrl, report)
  }
  if (hasFeature(plan.slug, 'reddit')) {
    const kws = listKeywords(userId, siteId).map((k) => k.keyword)
    await syncRedditThreads(userId, siteId, siteUrl, kws)
  }
  if (hasFeature(plan.slug, 'marketing_campaigns')) {
    const kws = listKeywords(userId, siteId).map((k) => k.keyword)
    seedMarketingCampaigns(userId, siteId, siteUrl, kws, report)
  }

  const nextRun = new Date(Date.now() + 3600_000).toISOString()
  db.prepare(`
    UPDATE valuescan_connected_sites SET next_growth_run_at = ?, updated_at = ? WHERE id = ?
  `).run(nextRun, new Date().toISOString(), siteId)

  if (hasFeature(plan.slug, 'monitors') && hasFeature(plan.slug, 'email_alerts')) {
    const existing = db.prepare(`
      SELECT id FROM valuescan_monitors WHERE user_id = ? AND url = ? LIMIT 1
    `).get(userId, siteUrl) as { id: string } | undefined
    if (!existing) {
      try {
        createMonitor(userId, {
          url: siteUrl,
          label: 'Growth site',
          alertEmail: userEmail,
          alertThreshold: 10,
          intervalHours: 24,
        })
      } catch { /* at monitor limit */ }
    }
  }
}

export function startGrowthWorker() {
  const intervalMs = Number(process.env.GROWTH_WORKER_INTERVAL_MS ?? 10 * 60 * 1000)
  setInterval(() => {
    runDueGrowthJobs().catch((err) => console.error('[Growth worker]', err))
  }, intervalMs)
  console.log(`ValueScan growth worker started (every ${intervalMs / 60000} min)`)
}
