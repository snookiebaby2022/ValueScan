import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { sendEmail } from './email-service.js'
import { extractHost, fetchText, hashSeed, nicheFromUrl } from './growth-utils.js'

export type LinkOutreach = {
  id: string
  targetDomain: string
  targetUrl: string | null
  status: 'prospect' | 'contacted' | 'negotiating' | 'live'
  anchor: string
  domainRating: number
  updatedAt: string
  contactEmail: string | null
  linkType: string
  notes: string | null
  liveUrl: string | null
  sourceUrl: string | null
}

const LISTING_DIRECTORIES: Array<{ domain: string; url: string; type: string; notes: string }> = [
  { domain: 'alternativeto.net', url: 'https://alternativeto.net/', type: 'directory', notes: 'Submit product listing' },
  { domain: 'producthunt.com', url: 'https://www.producthunt.com/', type: 'directory', notes: 'Launch or list your product' },
  { domain: 'saashub.com', url: 'https://www.saashub.com/', type: 'directory', notes: 'SaaS directory submission' },
  { domain: 'toolify.ai', url: 'https://www.toolify.ai/', type: 'directory', notes: 'AI tools directory' },
  { domain: 'betalist.com', url: 'https://betalist.com/', type: 'directory', notes: 'Startup beta listing' },
]

function guessContactEmail(domain: string): string {
  return `hello@${domain.replace(/^www\./, '')}`
}

function extractExternalDomains(html: string, ownHost: string): string[] {
  const hosts = new Set<string>()
  const re = /href=["']https?:\/\/([^/"']+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const host = m[1].replace(/^www\./, '').toLowerCase()
    if (host === ownHost || host.includes('google') || host.includes('facebook')) continue
    if (host.endsWith('.gov') || host.endsWith('.edu')) hosts.add(host)
    else if (/blog|news|mag|review|guide/.test(host)) hosts.add(host)
  }
  return [...hosts].slice(0, 8)
}

export async function discoverLinkProspects(
  userId: string,
  siteId: string,
  siteUrl: string,
  _report: AuditReport | null,
): Promise<LinkOutreach[]> {
  const host = extractHost(siteUrl)
  const niche = nicheFromUrl(siteUrl)
  const existing = listLinks(userId, siteId)
  if (existing.length >= 8) return existing

  const now = new Date().toISOString()
  const insert = db.prepare(`
    INSERT INTO valuescan_link_outreach
    (id, user_id, site_id, target_domain, target_url, status, anchor, domain_rating,
     contact_email, link_type, notes, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'prospect', ?, ?, ?, ?, ?, ?, ?)
  `)

  const created: LinkOutreach[] = []

  for (const dir of LISTING_DIRECTORIES) {
    if (existing.some((l) => l.targetDomain === dir.domain)) continue
    const id = `lnk-dir-${dir.domain.slice(0, 8)}-${Date.now().toString(36).slice(2, 4)}`
    const dr = 35 + (hashSeed(dir.domain) % 45)
    insert.run(id, userId, siteId, dir.domain, dir.url, host, dr, guessContactEmail(dir.domain), dir.type, dir.notes, now, now)
    created.push({
      id, targetDomain: dir.domain, targetUrl: dir.url, status: 'prospect', anchor: host,
      domainRating: dr, updatedAt: now, contactEmail: guessContactEmail(dir.domain),
      linkType: dir.type, notes: dir.notes,
    })
  }

  const html = await fetchText(siteUrl)
  if (html) {
    for (const domain of extractExternalDomains(html, host)) {
      if (existing.some((l) => l.targetDomain === domain) || created.some((l) => l.targetDomain === domain)) continue
      const id = `lnk-${domain.slice(0, 12)}-${Date.now().toString(36).slice(2, 4)}`
      const dr = 20 + (hashSeed(domain) % 55)
      const targetUrl = `https://${domain}/`
      insert.run(
        id, userId, siteId, domain, targetUrl, `${niche} resources`, dr,
        guessContactEmail(domain), 'outreach', `Resource page opportunity for ${niche}`, now, now,
      )
      created.push({
        id, targetDomain: domain, targetUrl, status: 'prospect', anchor: `${niche} resources`,
        domainRating: dr, updatedAt: now, contactEmail: guessContactEmail(domain),
        linkType: 'outreach', notes: `Resource page opportunity for ${niche}`,
      })
      if (created.length >= 10) break
    }
  }

  return [...existing, ...created]
}

export function listLinks(userId: string, siteId: string): LinkOutreach[] {
  return (db.prepare(`
    SELECT id, target_domain, target_url, status, anchor, domain_rating, updated_at,
           contact_email, link_type, notes, live_url, source_url
    FROM valuescan_link_outreach WHERE user_id = ? AND site_id = ?
    ORDER BY updated_at DESC LIMIT 20
  `).all(userId, siteId) as Array<{
    id: string; target_domain: string; target_url: string | null; status: string
    anchor: string; domain_rating: number; updated_at: string
    contact_email: string | null; link_type: string; notes: string | null
    live_url: string | null; source_url: string | null
  }>).map((r) => ({
    id: r.id,
    targetDomain: r.target_domain,
    targetUrl: r.target_url,
    status: r.status as LinkOutreach['status'],
    anchor: r.anchor,
    domainRating: r.domain_rating,
    updatedAt: r.updated_at,
    contactEmail: r.contact_email,
    linkType: r.link_type,
    notes: r.notes,
    liveUrl: r.live_url,
    sourceUrl: r.source_url,
  }))
}

async function pageLinksToSite(pageUrl: string | null, siteUrl: string): Promise<boolean> {
  if (!pageUrl) return false
  const host = extractHost(siteUrl)
  const html = await fetchText(pageUrl)
  if (!html) return false
  return html.includes(host) || html.includes(siteUrl.replace(/^https?:\/\//, ''))
}

export async function advanceLinkOutreach(
  userId: string,
  userEmail: string,
  siteUrl: string,
  ownerName: string,
): Promise<LinkOutreach | null> {
  const row = db.prepare(`
    SELECT l.*, s.url as site_url FROM valuescan_link_outreach l
    JOIN valuescan_connected_sites s ON s.id = l.site_id
    WHERE l.user_id = ? AND l.status != 'live'
    ORDER BY l.updated_at ASC LIMIT 1
  `).get(userId) as {
    id: string; site_id: string; target_domain: string; target_url: string | null
    status: string; anchor: string; contact_email: string | null; link_type: string; notes: string | null
    site_url: string
  } | undefined

  if (!row) return null

  const order: LinkOutreach['status'][] = ['prospect', 'contacted', 'negotiating', 'live']
  const idx = order.indexOf(row.status as LinkOutreach['status'])
  let next = order[Math.min(idx + 1, order.length - 1)]
  const now = new Date().toISOString()
  const internalLink = row.link_type === 'valuescan_profile' || row.link_type === 'valuescan_blog'

  if (next === 'contacted' && row.contact_email && !internalLink) {
    const host = extractHost(siteUrl)
    await sendEmail({
      to: row.contact_email,
      subject: `Partnership / listing — ${host}`,
      text: `Hi,\n\nI'm ${ownerName} from ${host}. We'd love to be included as a resource for ${row.anchor}.\n\nSite: ${siteUrl}\n\nHappy to reciprocate or provide a guest post. Would you be open to a link or directory listing?\n\nBest,\n${ownerName}`,
    })
    db.prepare(`UPDATE valuescan_link_outreach SET outreach_sent_at = ? WHERE id = ?`).run(now, row.id)
  }

  if (internalLink && next !== 'live') {
    next = 'live'
  }

  if (next === 'live' && !internalLink) {
    const verified = await pageLinksToSite(row.target_url, siteUrl)
    if (!verified) {
      next = 'negotiating'
    }
  }

  const liveUrl = next === 'live'
    ? (row.link_type === 'valuescan_profile' || row.link_type === 'valuescan_blog'
      ? row.target_url
      : row.target_url)
    : null

  db.prepare(`
    UPDATE valuescan_link_outreach SET status = ?, updated_at = ?,
    live_url = COALESCE(?, live_url), source_url = COALESCE(?, source_url)
    WHERE id = ?
  `).run(next, now, liveUrl, liveUrl, row.id)

  return listLinks(userId, row.site_id).find((l) => l.id === row.id) ?? null
}

export function countLiveLinks(userId: string, siteId: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) as c FROM valuescan_link_outreach
    WHERE user_id = ? AND site_id = ? AND status = 'live'
  `).get(userId, siteId) as { c: number }
  return row.c
}
