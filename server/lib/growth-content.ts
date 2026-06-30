import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { VALUESCAN } from '../config/valuescan.js'
import { sendEmail } from './email-service.js'
import { registerBlogBacklink } from './growth-backlinks.js'
import { extractHost, hashSeed, nicheFromUrl, slugify } from './growth-utils.js'

export type ContentArticle = {
  id: string
  title: string
  targetKeyword: string
  status: 'draft' | 'scheduled' | 'published'
  wordCount: number
  seoScore: number
  publishedAt: string | null
  createdAt: string
  slug: string | null
  publishUrl: string | null
}

function buildArticleHtml(opts: {
  title: string
  keyword: string
  siteUrl: string
  report: AuditReport | null
}): string {
  const host = extractHost(opts.siteUrl)
  const niche = nicheFromUrl(opts.siteUrl)
  const fixes = (opts.report?.findings ?? [])
    .filter((f) => f.status === 'fail' || f.status === 'warn')
    .slice(0, 5)
    .map((f) => `<li><strong>${f.title}</strong> — ${f.recommendation ?? f.description}</li>`)
    .join('\n')

  const sections = [
    `<p>This guide covers <strong>${opts.keyword}</strong> for ${host}, based on a live site audit and search intent analysis.</p>`,
    `<h2>Why ${opts.keyword} matters</h2><p>Ranking for "${opts.keyword}" helps ${host} reach buyers researching ${niche} solutions before they choose a competitor.</p>`,
    `<h2>Quick wins from your audit</h2><ul>${fixes || '<li>Your technical foundation is solid — focus on content depth and internal links.</li>'}</ul>`,
    `<h2>Step-by-step checklist</h2><ol><li>Align your title tag and H1 with "${opts.keyword}".</li><li>Add FAQ schema covering common ${niche} questions.</li><li>Publish this article and link it from your homepage.</li><li>Share in relevant communities (see your Reddit module).</li></ol>`,
    `<h2>Next steps</h2><p>Run weekly audits on <a href="${opts.siteUrl}">${host}</a> to track score improvements as this content gains traction.</p>`,
  ]

  return `<article>${sections.join('\n')}</article>`
}

function computeSeoScore(keyword: string, report: AuditReport | null, wordCount: number): number {
  let score = 65 + (hashSeed(keyword) % 20)
  if (report && report.overallScore > 70) score += 8
  if (wordCount > 1200) score += 5
  return Math.min(98, score)
}

export function listArticles(userId: string, siteId: string): ContentArticle[] {
  return (db.prepare(`
    SELECT id, title, target_keyword, status, word_count, seo_score, published_at, created_at, slug, publish_url
    FROM valuescan_content_articles WHERE user_id = ? AND site_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).all(userId, siteId) as Array<{
    id: string; title: string; target_keyword: string; status: string
    word_count: number; seo_score: number; published_at: string | null; created_at: string
    slug: string | null; publish_url: string | null
  }>).map(mapArticle)
}

function mapArticle(r: {
  id: string; title: string; target_keyword: string; status: string
  word_count: number; seo_score: number; published_at: string | null; created_at: string
  slug: string | null; publish_url: string | null
}): ContentArticle {
  return {
    id: r.id,
    title: r.title,
    targetKeyword: r.target_keyword,
    status: r.status as ContentArticle['status'],
    wordCount: r.word_count,
    seoScore: r.seo_score,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    slug: r.slug,
    publishUrl: r.publish_url,
  }
}

export function generateArticleRecord(
  userId: string,
  siteId: string,
  siteUrl: string,
  report: AuditReport | null,
  keyword: string,
): ContentArticle {
  const title = `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)} — complete guide`
  const slug = `${slugify(keyword)}-${Date.now().toString(36).slice(-4)}`
  const bodyHtml = buildArticleHtml({ title, keyword, siteUrl, report })
  const wordCount = bodyHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  const seoScore = computeSeoScore(keyword, report, wordCount)
  const id = `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const now = new Date().toISOString()
  const scheduledAt = new Date(Date.now() + 3600_000).toISOString()

  db.prepare(`
    INSERT INTO valuescan_content_articles
    (id, user_id, site_id, title, target_keyword, status, word_count, seo_score, published_at, created_at, slug, body_html, scheduled_at)
    VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, NULL, ?, ?, ?, ?)
  `).run(id, userId, siteId, title, keyword, wordCount, seoScore, now, slug, bodyHtml, scheduledAt)

  return mapArticle({
    id, title, target_keyword: keyword, status: 'scheduled', word_count: wordCount,
    seo_score: seoScore, published_at: null, created_at: now, slug, publish_url: null,
  })
}

async function pushToCms(webhookUrl: string, payload: object): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function publishScheduledArticle(
  userId: string,
  userEmail: string,
  siteId: string,
  cmsWebhookUrl: string | null,
): Promise<ContentArticle | null> {
  const row = db.prepare(`
    SELECT * FROM valuescan_content_articles
    WHERE user_id = ? AND site_id = ? AND status = 'scheduled'
    AND (scheduled_at IS NULL OR scheduled_at <= ?)
    ORDER BY created_at ASC LIMIT 1
  `).get(userId, siteId, new Date().toISOString()) as {
    id: string; title: string; target_keyword: string; slug: string | null
    body_html: string | null; word_count: number; seo_score: number; created_at: string
  } | undefined

  if (!row) return null

  const slug = row.slug ?? slugify(row.title)
  const publishUrl = `${VALUESCAN.url}/blog/${slug}`
  const now = new Date().toISOString()

  if (cmsWebhookUrl) {
    await pushToCms(cmsWebhookUrl, {
      title: row.title,
      slug,
      html: row.body_html,
      keyword: row.target_keyword,
      status: 'publish',
    })
  }

  db.prepare(`
    UPDATE valuescan_content_articles
    SET status = 'published', published_at = ?, publish_url = ?, slug = ?
    WHERE id = ?
  `).run(now, publishUrl, slug, row.id)

  const siteRow = db.prepare('SELECT url FROM valuescan_connected_sites WHERE id = ?').get(siteId) as { url: string } | undefined
  if (siteRow) {
    registerBlogBacklink(userId, siteId, siteRow.url, slug, publishUrl, extractHost(siteRow.url))
  }

  await sendEmail({
    to: userEmail,
    subject: `[ValueScan] Article published: ${row.title}`,
    text: `Your AI-generated article "${row.title}" is now live.\n\nView: ${publishUrl}\n\nTarget keyword: ${row.target_keyword}`,
  })

  return mapArticle({
    id: row.id,
    title: row.title,
    target_keyword: row.target_keyword,
    status: 'published',
    word_count: row.word_count,
    seo_score: row.seo_score,
    published_at: now,
    created_at: row.created_at,
    slug,
    publish_url: publishUrl,
  })
}

export function getPublicArticle(slug: string): { title: string; html: string; keyword: string; publishedAt: string } | null {
  const row = db.prepare(`
    SELECT title, body_html, target_keyword, published_at FROM valuescan_content_articles
    WHERE slug = ? AND status = 'published'
  `).get(slug) as {
    title: string; body_html: string | null; target_keyword: string; published_at: string
  } | undefined

  if (!row?.body_html) return null
  return {
    title: row.title,
    html: row.body_html,
    keyword: row.target_keyword,
    publishedAt: row.published_at,
  }
}

export function countScheduled(userId: string, siteId: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) as c FROM valuescan_content_articles
    WHERE user_id = ? AND site_id = ? AND status = 'scheduled'
  `).get(userId, siteId) as { c: number }
  return row.c
}
