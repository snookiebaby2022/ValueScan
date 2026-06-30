import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { getEffectivePlan } from './valuescan-service.js'
import { listKeywords } from './growth-keywords.js'
import { getLlmVisibility } from './growth-llm-tracker.js'
import { listRedditThreads, syncRedditThreads } from './growth-reddit.js'
import { listArticles, generateArticleRecord, publishScheduledArticle, getPublicArticle } from './growth-content.js'
import { listLinks, discoverLinkProspects, advanceLinkOutreach } from './growth-links.js'
import { listCampaigns, seedMarketingCampaigns, advanceMarketingCampaign } from './growth-marketing.js'
import { bootstrapGrowthSite } from './growth-worker.js'
import { runAutomatedLinkBuilding } from './growth-backlinks.js'

export type ConnectedSite = {
  id: string
  url: string
  label: string
  autopilotEnabled: boolean
  createdAt: string
  lastGrowthRunAt: string | null
  nextGrowthRunAt: string | null
}

export type GrowthBlocker = {
  id: string
  title: string
  category: string
  severity: 'high' | 'medium' | 'low'
  impact: string
}

export type GrowthDashboard = {
  site: ConnectedSite | null
  autopilotEnabled: boolean
  blockers: GrowthBlocker[]
  keywords: ReturnType<typeof listKeywords>
  articles: ReturnType<typeof listArticles>
  links: ReturnType<typeof listLinks>
  campaigns: ReturnType<typeof listCampaigns>
  llmVisibility: ReturnType<typeof getLlmVisibility>
  reddit: ReturnType<typeof listRedditThreads>
  roadmap: Array<{
    id: string
    phase: number
    title: string
    description: string
    status: 'todo' | 'in_progress' | 'done'
    module: string
  }>
  summary: {
    articlesPublished: number
    linksLive: number
    campaignsActive: number
    avgLlmScore: number
    keywordsTracked: number
  }
}

function latestScanForUrl(userId: string, url: string): AuditReport | null {
  const normalized = url.replace(/\/+$/, '')
  const row = db.prepare(`
    SELECT report_json FROM audit_scans
    WHERE user_id = ? AND (url = ? OR url = ? OR final_url = ? OR final_url = ?)
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, normalized, `${normalized}/`, normalized, `${normalized}/`) as { report_json: string } | undefined
  if (!row) return null
  try {
    return JSON.parse(row.report_json) as AuditReport
  } catch {
    return null
  }
}

function generateBlockers(report: AuditReport | null): GrowthBlocker[] {
  if (!report) {
    return [{
      id: 'scan-first',
      title: 'Run a site scan first',
      category: 'Setup',
      severity: 'high',
      impact: 'Connect your site and scan to unlock personalised blockers.',
    }]
  }

  const blockers: GrowthBlocker[] = []
  for (const f of report.findings ?? []) {
    if (f.status !== 'fail' && f.status !== 'warn') continue
    blockers.push({
      id: f.id,
      title: f.title,
      category: f.category,
      severity: f.status === 'fail' ? 'high' : 'medium',
      impact: f.description || f.recommendation || 'Fixing this improves search and AI visibility.',
    })
    if (blockers.length >= 8) break
  }

  if (blockers.length === 0) {
    blockers.push({
      id: 'optimize-content',
      title: 'Expand topical content coverage',
      category: 'Content',
      severity: 'low',
      impact: 'Your technical SEO is solid — content and links are the next lever.',
    })
  }
  return blockers
}

type RoadmapStatus = GrowthDashboard['roadmap'][number]['status']

function roadmapStatus(total: number, progress: number, doneAt: number): RoadmapStatus {
  if (total === 0) return 'todo'
  if (progress >= doneAt) return 'done'
  return 'in_progress'
}

function buildRoadmap(
  blockers: GrowthBlocker[],
  keywords: ReturnType<typeof listKeywords>,
  articles: ReturnType<typeof listArticles>,
  links: ReturnType<typeof listLinks>,
  campaigns: ReturnType<typeof listCampaigns>,
  llmVisibility: ReturnType<typeof getLlmVisibility>,
  reddit: ReturnType<typeof listRedditThreads>,
  autopilot: boolean,
  lastGrowthRunAt: string | null,
): GrowthDashboard['roadmap'] {
  const publishedArticles = articles.filter((a) => a.status === 'published')
  const scheduledArticles = articles.filter((a) => a.status === 'scheduled' || a.status === 'draft')
  const liveLinks = links.filter((l) => l.status === 'live')
  const outreachLinks = links.filter((l) => l.status !== 'live')
  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'scheduled')
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed')

  const keywordStatus = roadmapStatus(keywords.length, keywords.length, 3)
  const contentStatus: RoadmapStatus = articles.length === 0
    ? 'todo'
    : publishedArticles.length >= 2
      ? 'done'
      : 'in_progress'
  const llmStatus = roadmapStatus(llmVisibility.length, llmVisibility.length, 5)
  const linkStatus: RoadmapStatus = links.length === 0
    ? 'todo'
    : liveLinks.length >= 2
      ? 'done'
      : 'in_progress'
  const marketingStatus = campaigns.length === 0
    ? 'todo'
    : (activeCampaigns.length > 0 || completedCampaigns.length > 0 ? 'done' : 'in_progress')
  const redditStatus = roadmapStatus(reddit.length, reddit.length, 5)
  const autopilotStatus: RoadmapStatus = !autopilot
    ? 'todo'
    : lastGrowthRunAt
      ? 'done'
      : 'in_progress'

  const steps: GrowthDashboard['roadmap'] = [
    { id: 'connect', phase: 1, title: 'Connect your site', description: 'Site linked — growth worker scheduled.', status: 'done', module: 'setup' },
    {
      id: 'audit', phase: 1, title: "Catch what's holding you back",
      description: blockers.some((b) => b.severity === 'high')
        ? `${blockers.filter((b) => b.severity === 'high').length} high-priority blockers — automated re-scans keep this list current.`
        : 'Automated re-scans keep blockers up to date.',
      status: blockers.some((b) => b.severity === 'high') ? 'in_progress' : 'done',
      module: 'audit',
    },
    {
      id: 'keywords', phase: 2, title: 'Target keywords you can win',
      description: keywords[0]
        ? keywordStatus === 'done'
          ? `Tracking ${keywords.length} keywords including "${keywords[0].keyword}".`
          : `Tracking "${keywords[0].keyword}" and related terms.`
        : 'Keywords sync on each growth run.',
      status: keywordStatus,
      module: 'keywords',
    },
    {
      id: 'content', phase: 2, title: 'Publish AI-generated articles',
      description: publishedArticles.length
        ? `${publishedArticles.length} published · ${scheduledArticles.length} scheduled on your ValueScan blog.`
        : scheduledArticles.length
          ? `${scheduledArticles.length} article(s) scheduled — publishing automatically.`
          : 'Articles auto-generated and published to your ValueScan blog.',
      status: contentStatus,
      module: 'content',
    },
    {
      id: 'llm', phase: 3, title: 'Track every AI search engine',
      description: llmVisibility.length
        ? `Tracking ${llmVisibility.length} engines — robots.txt + llms.txt checked each run.`
        : 'robots.txt + llms.txt checked each run.',
      status: llmStatus,
      module: 'visibility',
    },
    {
      id: 'links', phase: 3, title: 'Automated link building',
      description: liveLinks.length
        ? `${liveLinks.length} live backlink${liveLinks.length === 1 ? '' : 's'} · ${outreachLinks.length} in outreach pipeline.`
        : links.length
          ? `${links.length} prospect${links.length === 1 ? '' : 's'} queued — outreach runs each growth cycle.`
          : autopilot
            ? 'Outreach emails sent automatically on Agency autopilot.'
            : 'Link building runs each growth cycle on Agency.',
      status: linkStatus,
      module: 'links',
    },
    {
      id: 'marketing', phase: 3, title: 'Marketing campaigns on autopilot',
      description: campaigns.length
        ? `${activeCampaigns.length} active · ${completedCampaigns.length} completed · UTM-tracked copy.`
        : 'Email, social, and search campaigns generated with UTM tracking.',
      status: marketingStatus,
      module: 'marketing',
    },
    {
      id: 'reddit', phase: 4, title: 'Get found on Reddit too',
      description: reddit.length
        ? `${reddit.length} thread${reddit.length === 1 ? '' : 's'} synced from Reddit search.`
        : 'Live threads synced from Reddit search.',
      status: redditStatus,
      module: 'reddit',
    },
    {
      id: 'autopilot', phase: 4, title: 'Grow on autopilot',
      description: autopilot
        ? lastGrowthRunAt
          ? 'Autopilot ON — last growth run completed, cycling every ~6 hours.'
          : 'Autopilot ON — first automated run scheduled.'
        : 'Enable autopilot on Agency to accelerate.',
      status: autopilotStatus,
      module: 'autopilot',
    },
  ]
  return steps
}

export function listConnectedSites(userId: string): ConnectedSite[] {
  const rows = db.prepare(`
    SELECT id, url, label, autopilot_enabled, created_at, last_growth_run_at, next_growth_run_at
    FROM valuescan_connected_sites WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(userId) as Array<{
    id: string; url: string; label: string; autopilot_enabled: number; created_at: string
    last_growth_run_at: string | null; next_growth_run_at: string | null
  }>

  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    label: r.label,
    autopilotEnabled: r.autopilot_enabled === 1,
    createdAt: r.created_at,
    lastGrowthRunAt: r.last_growth_run_at,
    nextGrowthRunAt: r.next_growth_run_at,
  }))
}

export function connectSite(userId: string, url: string, label?: string, userEmail?: string): ConnectedSite {
  let normalized = url.trim()
  if (!normalized.startsWith('http')) normalized = `https://${normalized}`
  normalized = normalized.replace(/\/+$/, '')

  const existing = db.prepare(`
    SELECT id FROM valuescan_connected_sites WHERE user_id = ? AND url = ?
  `).get(userId, normalized) as { id: string } | undefined

  if (existing) {
    return listConnectedSites(userId).find((s) => s.id === existing.id)!
  }

  const id = `vs-site-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()
  const siteLabel = label?.trim() || normalized.replace(/^https?:\/\//, '').split('/')[0]

  db.prepare(`
    INSERT INTO valuescan_connected_sites
    (id, user_id, url, label, autopilot_enabled, created_at, updated_at, next_growth_run_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `).run(id, userId, normalized, siteLabel, now, now, new Date(Date.now() + 60_000).toISOString())

  if (userEmail) {
    void bootstrapGrowthSite(userId, id, normalized, userEmail)
  }

  return listConnectedSites(userId).find((s) => s.id === id)!
}

export function setAutopilot(userId: string, enabled: boolean): boolean {
  const site = listConnectedSites(userId)[0]
  if (!site) return false
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE valuescan_connected_sites SET autopilot_enabled = ?, updated_at = ?,
    next_growth_run_at = ?, next_autopilot_at = ? WHERE id = ? AND user_id = ?
  `).run(
    enabled ? 1 : 0, now,
    new Date(Date.now() + 60_000).toISOString(),
    enabled ? new Date(Date.now() + 60_000).toISOString() : null,
    site.id, userId,
  )
  return true
}

export function setCmsWebhook(userId: string, webhookUrl: string | null): boolean {
  const site = listConnectedSites(userId)[0]
  if (!site) return false
  db.prepare(`
    UPDATE valuescan_connected_sites SET cms_webhook_url = ?, updated_at = ? WHERE id = ?
  `).run(webhookUrl?.trim() || null, new Date().toISOString(), site.id)
  return true
}

export async function generateArticle(userId: string, userEmail: string, keyword?: string) {
  const site = listConnectedSites(userId)[0]
  if (!site) return null
  const report = latestScanForUrl(userId, site.url)
  const kws = listKeywords(userId, site.id)
  const target = keyword ?? kws[0]?.keyword ?? 'growth guide'
  return generateArticleRecord(userId, site.id, site.url, report, target)
}

export async function publishNextArticle(userId: string, userEmail: string) {
  const site = listConnectedSites(userId)[0]
  if (!site) return null
  const row = db.prepare('SELECT cms_webhook_url FROM valuescan_connected_sites WHERE id = ?')
    .get(site.id) as { cms_webhook_url: string | null } | undefined
  return publishScheduledArticle(userId, userEmail, site.id, row?.cms_webhook_url ?? null)
}

export async function seedLinkCampaign(userId: string, userEmail: string, ownerName: string) {
  const site = listConnectedSites(userId)[0]
  if (!site) return []
  const report = latestScanForUrl(userId, site.url)
  await runAutomatedLinkBuilding(userId, userEmail, site.id, site.url, report, { fullAutopilot: true })
  return listLinks(userId, site.id)
}

export async function advanceLink(userId: string, userEmail: string, ownerName: string) {
  const site = listConnectedSites(userId)[0]
  if (!site) return null
  return advanceLinkOutreach(userId, userEmail, site.url, ownerName)
}

export async function seedMarketing(userId: string, userEmail: string) {
  const site = listConnectedSites(userId)[0]
  if (!site) return []
  const report = latestScanForUrl(userId, site.url)
  const kws = listKeywords(userId, site.id).map((k) => k.keyword)
  return seedMarketingCampaigns(userId, site.id, site.url, kws, report)
}

export async function advanceMarketing(userId: string, userEmail: string, ownerName: string) {
  const site = listConnectedSites(userId)[0]
  if (!site) return null
  return advanceMarketingCampaign(userId, userEmail, site.url, ownerName)
}

export async function syncReddit(userId: string) {
  const site = listConnectedSites(userId)[0]
  if (!site) return []
  const kws = listKeywords(userId, site.id).map((k) => k.keyword)
  return syncRedditThreads(userId, site.id, site.url, kws)
}

export function getGrowthDashboard(userId: string): GrowthDashboard {
  const sites = listConnectedSites(userId)
  const site = sites[0] ?? null
  const report = site ? latestScanForUrl(userId, site.url) : null

  const keywords = site ? listKeywords(userId, site.id) : []
  const articles = site ? listArticles(userId, site.id) : []
  const links = site ? listLinks(userId, site.id) : []
  const campaigns = site ? listCampaigns(userId, site.id) : []
  const llmVisibility = site ? getLlmVisibility(userId, site.id) : []
  const reddit = site ? listRedditThreads(userId, site.id) : []
  const blockers = generateBlockers(report)

  const avgLlmScore = llmVisibility.length
    ? Math.round(llmVisibility.reduce((s, e) => s + e.score, 0) / llmVisibility.length)
    : 0

  return {
    site,
    autopilotEnabled: site?.autopilotEnabled ?? false,
    blockers,
    keywords,
    articles,
    links,
    campaigns,
    llmVisibility,
    reddit,
    roadmap: buildRoadmap(
      blockers,
      keywords,
      articles,
      links,
      campaigns,
      llmVisibility,
      reddit,
      site?.autopilotEnabled ?? false,
      site?.lastGrowthRunAt ?? null,
    ),
    summary: {
      articlesPublished: articles.filter((a) => a.status === 'published').length,
      linksLive: links.filter((l) => l.status === 'live').length,
      campaignsActive: campaigns.filter((c) => c.status === 'active' || c.status === 'scheduled').length,
      avgLlmScore,
      keywordsTracked: keywords.length,
    },
  }
}

export { getPublicArticle }
