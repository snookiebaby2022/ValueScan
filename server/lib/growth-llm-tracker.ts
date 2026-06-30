import { db } from '../db.js'
import type { AuditReport } from './audit-types.js'
import { fetchText } from './growth-utils.js'

const ENGINES: Array<{ name: string; bots: string[]; weightSchema: number }> = [
  { name: 'ChatGPT', bots: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot'], weightSchema: 1.1 },
  { name: 'Perplexity', bots: ['PerplexityBot'], weightSchema: 1.0 },
  { name: 'Gemini', bots: ['Google-Extended', 'Googlebot'], weightSchema: 1.05 },
  { name: 'Claude', bots: ['ClaudeBot', 'anthropic-ai', 'Claude-Web'], weightSchema: 1.0 },
  { name: 'Copilot', bots: ['Bingbot', 'BingPreview'], weightSchema: 0.95 },
]

function robotsAllowsBot(robotsTxt: string, bot: string): boolean {
  const botBlock = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*/`, 'i')
  if (botBlock.test(robotsTxt)) return false
  if (!robotsTxt.trim()) return true
  const globalBlock = /User-agent:\s*\*[\s\S]*?Disallow:\s*\//i.test(robotsTxt)
  return !globalBlock
}

function scoreFromSignals(opts: {
  report: AuditReport | null
  allowsBot: boolean
  hasLlmsTxt: boolean
  hasJsonLd: boolean
  metaOk: boolean
  engineWeight: number
}): { score: number; mentions: number; signals: string[] } {
  const signals: string[] = []
  let score = opts.report?.overallScore ?? 40

  if (opts.allowsBot) {
    score += 8
    signals.push('AI crawler allowed in robots.txt')
  } else {
    score -= 15
    signals.push('AI crawler blocked or restricted in robots.txt')
  }

  if (opts.hasLlmsTxt) {
    score += 12
    signals.push('llms.txt present')
  }

  if (opts.hasJsonLd) {
    score += 10
    signals.push('Structured data (JSON-LD) detected')
  }

  if (opts.metaOk) {
    score += 6
    signals.push('Meta description and title optimised')
  }

  score = Math.round(score * opts.engineWeight)
  score = Math.max(5, Math.min(98, score))
  const mentions = Math.max(0, Math.floor(score / 7) + (opts.hasJsonLd ? 3 : 0))

  return { score, mentions, signals }
}

export async function runLlmVisibilityScan(
  siteUrl: string,
  report: AuditReport | null,
): Promise<Array<{ engine: string; score: number; mentions: number; signals: string[] }>> {
  const origin = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`).origin
  const robotsTxt = (await fetchText(`${origin}/robots.txt`, 8000)) ?? ''
  const llmsTxt = await fetchText(`${origin}/llms.txt`, 5000)
  const hasLlmsTxt = !!llmsTxt && llmsTxt.length > 20

  const titleOk = report?.findings?.some((f) => f.id === 'title' && f.status === 'pass') ?? false
  const metaOk = report?.findings?.some((f) =>
    (f.id === 'meta-description' || f.title.toLowerCase().includes('meta description')) && f.status !== 'fail',
  ) ?? false
  const hasJsonLd = report?.findings?.some((f) =>
    f.title.toLowerCase().includes('structured data') && f.status === 'pass',
  ) ?? false

  return ENGINES.map(({ name, bots, weightSchema }) => {
    const allowsBot = bots.some((b) => robotsAllowsBot(robotsTxt, b))
    return {
      engine: name,
      ...scoreFromSignals({
        report,
        allowsBot,
        hasLlmsTxt,
        hasJsonLd,
        metaOk: titleOk && metaOk,
        engineWeight: weightSchema,
      }),
    }
  })
}

export function saveLlmSnapshots(
  userId: string,
  siteId: string,
  results: Array<{ engine: string; score: number; mentions: number; signals: string[] }>,
) {
  const now = new Date().toISOString()
  const insert = db.prepare(`
    INSERT INTO valuescan_llm_snapshots
    (id, user_id, site_id, engine, score, mentions, signals_json, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const r of results) {
    insert.run(
      `llm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      siteId,
      r.engine,
      r.score,
      r.mentions,
      JSON.stringify(r.signals),
      now,
    )
  }
}

export function getLlmVisibility(userId: string, siteId: string): Array<{
  engine: string
  score: number
  trend: 'up' | 'down' | 'flat'
  mentions: number
  lastChecked: string
  signals: string[]
}> {
  const engines = ENGINES.map((e) => e.name)
  return engines.map((engine) => {
    const rows = db.prepare(`
      SELECT score, mentions, signals_json, checked_at FROM valuescan_llm_snapshots
      WHERE user_id = ? AND site_id = ? AND engine = ?
      ORDER BY checked_at DESC LIMIT 2
    `).all(userId, siteId, engine) as Array<{
      score: number; mentions: number; signals_json: string; checked_at: string
    }>

    if (rows.length === 0) {
      return { engine, score: 0, trend: 'flat' as const, mentions: 0, lastChecked: '', signals: [] }
    }

    const latest = rows[0]
    const prev = rows[1]
    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (prev) {
      if (latest.score > prev.score + 2) trend = 'up'
      else if (latest.score < prev.score - 2) trend = 'down'
    }

    let signals: string[] = []
    try {
      signals = JSON.parse(latest.signals_json) as string[]
    } catch { /* ignore */ }

    return {
      engine,
      score: latest.score,
      trend,
      mentions: latest.mentions,
      lastChecked: latest.checked_at,
      signals,
    }
  }).filter((r) => r.lastChecked)
}
