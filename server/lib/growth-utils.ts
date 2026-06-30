import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'

export function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return h
}

export function extractHost(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0]
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'article'
}

export function nicheFromUrl(siteUrl: string): string {
  const host = extractHost(siteUrl)
  return host.split('.')[0].replace(/-/g, ' ')
}

export async function fetchText(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ValueScanGrowthBot/1.0 (+https://valuescan.online)' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const text = await res.text()
    return text.slice(0, 500_000)
  } catch {
    return null
  }
}

export function titleFromReport(report: AuditReport | null, fallback: string): string {
  const titleFinding = report?.findings?.find((f) =>
    f.id === 'title' || f.title.toLowerCase().includes('title tag'))
  return titleFinding?.value?.trim() || fallback
}

export function logAutopilot(userId: string, siteId: string, action: string, detail = '') {
  db.prepare(`
    INSERT INTO valuescan_autopilot_log (id, user_id, site_id, action, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    siteId,
    action,
    detail.slice(0, 500),
    new Date().toISOString(),
  )
}

export function pseudoVolume(keyword: string): number {
  const h = hashSeed(keyword)
  return 120 + (h % 4800)
}

export function pseudoDifficulty(keyword: string, reportScore: number): number {
  const h = hashSeed(keyword + 'd')
  const base = 15 + (h % 70)
  return Math.max(5, Math.min(95, base - Math.floor((reportScore - 50) / 5)))
}
