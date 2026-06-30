import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { sendEmail } from './email-service.js'
import { extractHost, hashSeed, nicheFromUrl, slugify } from './growth-utils.js'

export type MarketingChannel = 'email' | 'social' | 'search' | 'multi'
export type MarketingStatus = 'draft' | 'scheduled' | 'active' | 'completed'

export type MarketingCampaign = {
  id: string
  name: string
  channel: MarketingChannel
  status: MarketingStatus
  headline: string
  body: string
  ctaUrl: string
  targetKeyword: string | null
  scheduledAt: string | null
  launchedAt: string | null
  updatedAt: string
}

const CHANNEL_ROTATION: MarketingChannel[] = ['email', 'social', 'search', 'multi']

function utmUrl(siteUrl: string, channel: string, campaignSlug: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  const params = new URLSearchParams({
    utm_source: 'valuescan',
    utm_medium: channel,
    utm_campaign: campaignSlug,
  })
  return `${base}?${params.toString()}`
}

function campaignCopy(
  channel: MarketingChannel,
  keyword: string,
  siteUrl: string,
  niche: string,
  host: string,
): { name: string; headline: string; body: string } {
  const slug = slugify(`${keyword}-${channel}`)
  const cta = utmUrl(siteUrl, channel, slug)

  switch (channel) {
    case 'email':
      return {
        name: `Email nurture — ${keyword}`,
        headline: `Still looking for ${keyword}?`,
        body: [
          `Subject: ${keyword} — quick win for ${host}`,
          '',
          `Hi there,`,
          '',
          `We help ${niche} teams improve visibility for searches like "${keyword}".`,
          `Our latest audit surfaced fixes that typically lift organic traffic within weeks.`,
          '',
          `See what's holding ${host} back:`,
          cta,
          '',
          `— The ${host} team`,
        ].join('\n'),
      }
    case 'social':
      return {
        name: `Social push — ${keyword}`,
        headline: `${keyword}? We fixed what was blocking ${host}.`,
        body: [
          `LinkedIn / X post:`,
          '',
          `Most ${niche} sites lose traffic to fixable SEO gaps.`,
          `We ran a full audit on ${host} and prioritised "${keyword}" — here's the roadmap:`,
          cta,
          '',
          `#SEO #${slugify(niche).replace(/-/g, '')} #growth`,
        ].join('\n'),
      }
    case 'search':
      return {
        name: `Search ads — ${keyword}`,
        headline: `${keyword} | ${host}`.slice(0, 30),
        body: [
          `Headline 1: ${keyword} for ${niche}`,
          `Headline 2: Audit ${host} free`,
          `Headline 3: Fix blockers · rank faster`,
          '',
          `Description: Automated audits + growth roadmap for ${host}. Target "${keyword}" with UTM-tracked landing:`,
          cta,
        ].join('\n'),
      }
    default:
      return {
        name: `Multi-channel — ${keyword}`,
        headline: `Launch week: ${keyword}`,
        body: [
          `Coordinated campaign across email, social, and paid search.`,
          '',
          `Primary keyword: ${keyword}`,
          `Landing URL (UTM): ${cta}`,
          '',
          `1. Email: send nurture sequence to your list`,
          `2. Social: post the LinkedIn/X copy from your Social campaign`,
          `3. Search: import ad headlines into Google Ads`,
          '',
          `All links use utm_source=valuescan for attribution in GA4.`,
        ].join('\n'),
      }
  }
}

function mapRow(r: {
  id: string; name: string; channel: string; status: string
  headline: string; body: string; cta_url: string; target_keyword: string | null
  scheduled_at: string | null; launched_at: string | null; updated_at: string
}): MarketingCampaign {
  return {
    id: r.id,
    name: r.name,
    channel: r.channel as MarketingChannel,
    status: r.status as MarketingStatus,
    headline: r.headline,
    body: r.body,
    ctaUrl: r.cta_url,
    targetKeyword: r.target_keyword,
    scheduledAt: r.scheduled_at,
    launchedAt: r.launched_at,
    updatedAt: r.updated_at,
  }
}

export function listCampaigns(userId: string, siteId: string): MarketingCampaign[] {
  return (db.prepare(`
    SELECT id, name, channel, status, headline, body, cta_url, target_keyword,
           scheduled_at, launched_at, updated_at
    FROM valuescan_marketing_campaigns
    WHERE user_id = ? AND site_id = ?
    ORDER BY updated_at DESC LIMIT 12
  `).all(userId, siteId) as Array<{
    id: string; name: string; channel: string; status: string
    headline: string; body: string; cta_url: string; target_keyword: string | null
    scheduled_at: string | null; launched_at: string | null; updated_at: string
  }>).map(mapRow)
}

export function countActiveCampaigns(userId: string, siteId: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) as c FROM valuescan_marketing_campaigns
    WHERE user_id = ? AND site_id = ? AND status IN ('scheduled', 'active')
  `).get(userId, siteId) as { c: number }
  return row.c
}

export function seedMarketingCampaigns(
  userId: string,
  siteId: string,
  siteUrl: string,
  keywords: string[],
  _report: AuditReport | null,
): MarketingCampaign[] {
  const existing = listCampaigns(userId, siteId)
  if (existing.length >= 6) return existing

  const host = extractHost(siteUrl)
  const niche = nicheFromUrl(siteUrl)
  const now = new Date().toISOString()
  const insert = db.prepare(`
    INSERT INTO valuescan_marketing_campaigns
    (id, user_id, site_id, name, channel, status, headline, body, cta_url,
     target_keyword, scheduled_at, launched_at, completed_at, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)
  `)

  const created: MarketingCampaign[] = []
  const kwList = keywords.length ? keywords : [`${niche} guide`, `${host} audit`, `${niche} tips`]

  for (let i = 0; i < CHANNEL_ROTATION.length; i++) {
    const channel = CHANNEL_ROTATION[i]
    const keyword = kwList[i % kwList.length]
    if (existing.some((c) => c.channel === channel && c.targetKeyword === keyword)) continue
    if (created.some((c) => c.channel === channel)) continue

    const copy = campaignCopy(channel, keyword, siteUrl, niche, host)
    const id = `mkt-${channel.slice(0, 3)}-${Date.now().toString(36).slice(2, 6)}-${hashSeed(keyword + channel) % 9999}`
    const ctaUrl = utmUrl(siteUrl, channel, slugify(copy.name))

    insert.run(
      id, userId, siteId, copy.name, channel, copy.headline, copy.body, ctaUrl,
      keyword, now, now,
    )
    created.push({
      id,
      name: copy.name,
      channel,
      status: 'draft',
      headline: copy.headline,
      body: copy.body,
      ctaUrl,
      targetKeyword: keyword,
      scheduledAt: null,
      launchedAt: null,
      updatedAt: now,
    })
  }

  return [...existing, ...created]
}

export async function advanceMarketingCampaign(
  userId: string,
  userEmail: string,
  siteUrl: string,
  ownerName: string,
): Promise<MarketingCampaign | null> {
  const row = db.prepare(`
    SELECT c.*, s.url as site_url FROM valuescan_marketing_campaigns c
    JOIN valuescan_connected_sites s ON s.id = c.site_id
    WHERE c.user_id = ? AND c.status != 'completed'
    ORDER BY
      CASE c.status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
      c.updated_at ASC
    LIMIT 1
  `).get(userId) as {
    id: string; site_id: string; name: string; channel: string; status: string
    headline: string; body: string; cta_url: string; target_keyword: string | null
    site_url: string
  } | undefined

  if (!row) return null

  const order: MarketingStatus[] = ['draft', 'scheduled', 'active', 'completed']
  const idx = order.indexOf(row.status as MarketingStatus)
  const next = order[Math.min(idx + 1, order.length - 1)]
  const now = new Date().toISOString()

  if (next === 'scheduled') {
    db.prepare(`
      UPDATE valuescan_marketing_campaigns SET status = ?, scheduled_at = ?, updated_at = ? WHERE id = ?
    `).run(next, new Date(Date.now() + 3600_000).toISOString(), now, row.id)
  } else if (next === 'active') {
    db.prepare(`
      UPDATE valuescan_marketing_campaigns SET status = ?, launched_at = ?, updated_at = ? WHERE id = ?
    `).run(next, now, now, row.id)

    await sendEmail({
      to: userEmail,
      subject: `Campaign ready: ${row.name}`,
      text: [
        `Hi ${ownerName},`,
        '',
        `Your ${row.channel} marketing campaign is live on autopilot.`,
        '',
        `Campaign: ${row.name}`,
        `Headline: ${row.headline}`,
        '',
        row.body,
        '',
        `Track clicks: ${row.cta_url}`,
        '',
        `— ValueScan Growth`,
      ].join('\n'),
    })
  } else if (next === 'completed') {
    db.prepare(`
      UPDATE valuescan_marketing_campaigns SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?
    `).run(next, now, now, row.id)
  } else {
    db.prepare(`UPDATE valuescan_marketing_campaigns SET status = ?, updated_at = ? WHERE id = ?`).run(next, now, row.id)
  }

  return listCampaigns(userId, row.site_id).find((c) => c.id === row.id) ?? null
}
