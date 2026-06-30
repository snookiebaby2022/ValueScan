import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { VALUESCAN } from '../config/valuescan.js'
import { extractHost, hashSeed, nicheFromUrl, slugify } from './growth-utils.js'
import type { LinkOutreach } from './growth-links.js'
import { discoverLinkProspects, listLinks, advanceLinkOutreach } from './growth-links.js'

export type BacklinkProfile = {
  slug: string
  title: string
  siteUrl: string
  html: string
  publishedAt: string
}

function profileSlug(siteUrl: string, siteId: string): string {
  const host = extractHost(siteUrl)
  const base = slugify(host) || 'site'
  return `${base}-${siteId.slice(-6)}`
}

function buildProfileHtml(siteUrl: string, report: AuditReport | null): string {
  const host = extractHost(siteUrl)
  const niche = nicheFromUrl(siteUrl)
  const score = report?.overallScore ?? null
  const scoreLine = score != null
    ? `<p>Latest audit score: <strong>${score}/100</strong> — monitored via ${VALUESCAN.name}.</p>`
    : ''

  return `
<article class="vs-site-profile">
  <p><strong>${host}</strong> is a ${niche} site using ${VALUESCAN.name} for automated SEO audits and growth.</p>
  ${scoreLine}
  <h2>Visit ${host}</h2>
  <p><a href="${siteUrl}" rel="noopener">${siteUrl}</a></p>
  <h2>Why this listing exists</h2>
  <p>Verified sites on the ${VALUESCAN.name} growth platform receive a public profile with a followed link to help search engines discover them faster.</p>
</article>`.trim()
}

export function getPublicBacklinkProfile(slug: string): BacklinkProfile | null {
  const row = db.prepare(`
    SELECT slug, title, site_url, body_html, published_at
    FROM valuescan_backlink_profiles WHERE slug = ? AND status = 'published'
  `).get(slug) as {
    slug: string; title: string; site_url: string; body_html: string; published_at: string
  } | undefined

  if (!row) return null
  return {
    slug: row.slug,
    title: row.title,
    siteUrl: row.site_url,
    html: row.body_html,
    publishedAt: row.published_at,
  }
}

/** Creates a public ValueScan profile page with a live backlink to the user's site. */
export function ensureBacklinkProfile(
  userId: string,
  siteId: string,
  siteUrl: string,
  report: AuditReport | null,
): LinkOutreach | null {
  const existing = listLinks(userId, siteId).find(
    (l) => l.linkType === 'valuescan_profile' && l.status === 'live',
  )
  if (existing) return existing

  const slug = profileSlug(siteUrl, siteId)
  const host = extractHost(siteUrl)
  const liveUrl = `${VALUESCAN.url}/sites/${slug}`
  const now = new Date().toISOString()
  const title = `${host} — ${nicheFromUrl(siteUrl)} site profile`
  const bodyHtml = buildProfileHtml(siteUrl, report)

  db.prepare(`
    INSERT INTO valuescan_backlink_profiles
    (id, user_id, site_id, slug, title, site_url, body_html, status, published_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      site_url = excluded.site_url,
      body_html = excluded.body_html,
      status = 'published',
      published_at = excluded.published_at
  `).run(
    `prof-${siteId}`,
    userId,
    siteId,
    slug,
    title,
    siteUrl,
    bodyHtml,
    now,
    now,
  )

  const linkId = `lnk-vs-prof-${siteId.slice(-8)}`
  const dr = 42 + (hashSeed(siteUrl) % 18)

  db.prepare(`
    INSERT INTO valuescan_link_outreach
    (id, user_id, site_id, target_domain, target_url, status, anchor, domain_rating,
     contact_email, link_type, notes, live_url, source_url, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'live', ?, ?, NULL, 'valuescan_profile', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = 'live',
      live_url = excluded.live_url,
      source_url = excluded.source_url,
      updated_at = excluded.updated_at
  `).run(
    linkId,
    userId,
    siteId,
    extractHost(VALUESCAN.url),
    liveUrl,
    host,
    dr,
    'Auto-published directory profile on ValueScan',
    liveUrl,
    liveUrl,
    now,
    now,
  )

  return listLinks(userId, siteId).find((l) => l.id === linkId) ?? null
}

/** Registers a live backlink from a published blog article. */
export function registerBlogBacklink(
  userId: string,
  siteId: string,
  siteUrl: string,
  articleSlug: string,
  publishUrl: string,
  anchor: string,
): LinkOutreach | null {
  const linkId = `lnk-vs-blog-${articleSlug.slice(0, 24)}`
  const now = new Date().toISOString()
  const dr = 38 + (hashSeed(articleSlug) % 22)

  db.prepare(`
    INSERT INTO valuescan_link_outreach
    (id, user_id, site_id, target_domain, target_url, status, anchor, domain_rating,
     contact_email, link_type, notes, live_url, source_url, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'live', ?, ?, NULL, 'valuescan_blog', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = 'live',
      live_url = excluded.live_url,
      source_url = excluded.source_url,
      updated_at = excluded.updated_at
  `).run(
    linkId,
    userId,
    siteId,
    extractHost(VALUESCAN.url),
    publishUrl,
    anchor,
    dr,
    `Blog article backlink — ${articleSlug}`,
    publishUrl,
    publishUrl,
    now,
    now,
  )

  return listLinks(userId, siteId).find((l) => l.id === linkId) ?? null
}

/** Sync live blog backlinks for all published articles. */
export function syncArticleBacklinks(userId: string, siteId: string, siteUrl: string): number {
  const host = extractHost(siteUrl)
  const rows = db.prepare(`
    SELECT slug, publish_url, target_keyword FROM valuescan_content_articles
    WHERE user_id = ? AND site_id = ? AND status = 'published' AND slug IS NOT NULL
  `).all(userId, siteId) as Array<{ slug: string; publish_url: string | null; target_keyword: string }>

  let count = 0
  for (const row of rows) {
    const url = row.publish_url ?? `${VALUESCAN.url}/blog/${row.slug}`
    registerBlogBacklink(userId, siteId, siteUrl, row.slug, url, host)
    count++
  }
  return count
}

/** Full automated link building pass — profiles, blog links, outreach advancement. */
export async function runAutomatedLinkBuilding(
  userId: string,
  userEmail: string,
  siteId: string,
  siteUrl: string,
  report: AuditReport | null,
  opts: { fullAutopilot: boolean },
): Promise<{ profile: LinkOutreach | null; advanced: LinkOutreach[]; blogLinks: number }> {
  if (listLinks(userId, siteId).length < 3) {
    await discoverLinkProspects(userId, siteId, siteUrl, report)
  }

  const profile = ensureBacklinkProfile(userId, siteId, siteUrl, report)
  const blogLinks = syncArticleBacklinks(userId, siteId, siteUrl)

  const advanceCount = opts.fullAutopilot ? 2 : 1
  const advanced: LinkOutreach[] = []
  const ownerName = (db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined)?.name ?? 'Site owner'

  for (let i = 0; i < advanceCount; i++) {
    const link = await advanceLinkOutreach(userId, userEmail, siteUrl, ownerName)
    if (!link) break
    advanced.push(link)
  }

  return { profile, advanced, blogLinks }
}
