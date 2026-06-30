import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { nicheFromUrl, pseudoDifficulty, pseudoVolume, titleFromReport } from './growth-utils.js'

export type StoredKeyword = {
  id: string
  keyword: string
  difficulty: number
  volume: number
  winScore: number
  reason: string
}

function buildKeywordSeeds(report: AuditReport | null, siteUrl: string): string[] {
  const niche = nicheFromUrl(siteUrl)
  const siteTitle = titleFromReport(report, niche)
  const shortTitle = siteTitle.split(/[|\-–—:]/)[0].trim().slice(0, 40)
  const seeds = new Set<string>()

  seeds.add(`${niche} guide`)
  seeds.add(`best ${niche} tools`)
  seeds.add(`${niche} checklist`)
  seeds.add(`how to improve ${niche}`)
  if (shortTitle.length > 3) seeds.add(shortTitle.toLowerCase())

  for (const f of report?.findings ?? []) {
    if (f.category === 'seo' && f.recommendation) {
      const words = f.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 4)
      if (words[0]) seeds.add(`${words[0]} ${niche}`)
    }
  }

  return [...seeds].slice(0, 12)
}

export function syncKeywords(userId: string, siteId: string, report: AuditReport | null, siteUrl: string): StoredKeyword[] {
  const score = report?.overallScore ?? 50
  const seeds = buildKeywordSeeds(report, siteUrl)
  const now = new Date().toISOString()

  db.prepare('DELETE FROM valuescan_keywords WHERE user_id = ? AND site_id = ?').run(userId, siteId)

  const insert = db.prepare(`
    INSERT INTO valuescan_keywords
    (id, user_id, site_id, keyword, difficulty, volume, win_score, reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const results: StoredKeyword[] = []
  seeds.forEach((keyword, i) => {
    const difficulty = pseudoDifficulty(keyword, score)
    const volume = pseudoVolume(keyword)
    const winScore = Math.max(10, Math.min(98, 100 - difficulty + Math.min(15, Math.floor(volume / 400)) - i * 2))
    const reason = i === 0
      ? 'Matches your site topic and audit profile'
      : 'Related query with ranking potential from your niche'
    const id = `kw-${siteId.slice(-6)}-${i}`
    insert.run(id, userId, siteId, keyword, difficulty, volume, winScore, reason, now, now)
    results.push({ id, keyword, difficulty, volume, winScore, reason })
  })

  return results.sort((a, b) => b.winScore - a.winScore)
}

export function listKeywords(userId: string, siteId: string): StoredKeyword[] {
  return (db.prepare(`
    SELECT id, keyword, difficulty, volume, win_score, reason
    FROM valuescan_keywords WHERE user_id = ? AND site_id = ?
    ORDER BY win_score DESC LIMIT 20
  `).all(userId, siteId) as Array<{
    id: string; keyword: string; difficulty: number; volume: number; win_score: number; reason: string
  }>).map((r) => ({
    id: r.id,
    keyword: r.keyword,
    difficulty: r.difficulty,
    volume: r.volume,
    winScore: r.win_score,
    reason: r.reason,
  }))
}

export function topKeyword(userId: string, siteId: string): string | null {
  const row = db.prepare(`
    SELECT keyword FROM valuescan_keywords WHERE user_id = ? AND site_id = ?
    ORDER BY win_score DESC LIMIT 1
  `).get(userId, siteId) as { keyword: string } | undefined
  return row?.keyword ?? null
}
