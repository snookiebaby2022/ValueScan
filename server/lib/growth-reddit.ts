import { db } from '../db.js'
import { nicheFromUrl } from './growth-utils.js'

export type RedditThread = {
  id: string
  subreddit: string
  threadId: string
  title: string
  url: string
  fitScore: number
  status: string
  suggestion: string
}

type RedditListing = {
  data?: {
    children?: Array<{
      data?: {
        id?: string
        subreddit?: string
        title?: string
        permalink?: string
        score?: number
        num_comments?: number
      }
    }>
  }
}

type PullPushSubmission = {
  id?: string
  subreddit?: string
  title?: string
  permalink?: string
  score?: number
  num_comments?: number
}

const USER_AGENT = 'ValueScanGrowthBot/1.0 (+https://valuescan.online)'

async function searchRedditJson(query: string): Promise<RedditListing> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=15`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return {}
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('json')) return {}
  return res.json() as Promise<RedditListing>
}

async function searchRedditPullPush(query: string): Promise<PullPushSubmission[]> {
  const url = `https://api.pullpush.io/reddit/search/submission/?q=${encodeURIComponent(query)}&size=15&sort=desc&sort_type=created_utc`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return []
  const body = await res.json() as { data?: PullPushSubmission[] }
  return body.data ?? []
}

function threadUrl(permalink: string | undefined, threadId: string): string {
  if (!permalink) return `https://www.reddit.com/comments/${threadId}`
  if (permalink.startsWith('http')) return permalink
  return `https://www.reddit.com${permalink.startsWith('/') ? permalink : `/${permalink}`}`
}

function upsertThread(
  userId: string,
  siteId: string,
  threadId: string,
  subreddit: string,
  title: string,
  url: string,
  fitScore: number,
  query: string,
  seen: Set<string>,
  now: string,
): void {
  if (seen.has(threadId)) return
  seen.add(threadId)

  const existing = db.prepare(`
    SELECT id FROM valuescan_reddit_threads WHERE user_id = ? AND thread_id = ?
  `).get(userId, threadId) as { id: string } | undefined

  const sub = subreddit.startsWith('r/') ? subreddit : `r/${subreddit}`

  if (existing) {
    db.prepare(`
      UPDATE valuescan_reddit_threads SET last_seen_at = ?, fit_score = ? WHERE id = ?
    `).run(now, Math.round(fitScore), existing.id)
    return
  }

  db.prepare(`
    INSERT INTO valuescan_reddit_threads
    (id, user_id, site_id, subreddit, thread_id, title, url, fit_score, status, discovered_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
  `).run(
    `rd-${threadId}`,
    userId,
    siteId,
    sub,
    threadId,
    title,
    url,
    Math.round(fitScore),
    now,
    now,
  )
}

async function ingestFromJson(
  userId: string,
  siteId: string,
  query: string,
  seen: Set<string>,
  now: string,
): Promise<boolean> {
  const data = await searchRedditJson(query)
  let count = 0
  for (const child of data.data?.children ?? []) {
    const d = child.data
    if (!d?.id || !d.subreddit || !d.title) continue
    const fitScore = Math.min(98, 40 + (d.score ?? 0) / 10 + (d.num_comments ?? 0))
    upsertThread(
      userId,
      siteId,
      d.id,
      d.subreddit,
      d.title,
      threadUrl(d.permalink, d.id),
      fitScore,
      query,
      seen,
      now,
    )
    count++
  }
  return count > 0
}

async function ingestFromPullPush(
  userId: string,
  siteId: string,
  query: string,
  seen: Set<string>,
  now: string,
): Promise<void> {
  const rows = await searchRedditPullPush(query)
  for (const d of rows) {
    if (!d.id || !d.subreddit || !d.title) continue
    const fitScore = Math.min(98, 40 + (d.score ?? 0) / 10 + (d.num_comments ?? 0))
    upsertThread(
      userId,
      siteId,
      d.id,
      d.subreddit,
      d.title,
      threadUrl(d.permalink, d.id),
      fitScore,
      query,
      seen,
      now,
    )
  }
}

export async function syncRedditThreads(
  userId: string,
  siteId: string,
  siteUrl: string,
  keywords: string[],
): Promise<RedditThread[]> {
  const niche = nicheFromUrl(siteUrl)
  const queries = [...new Set([niche, ...keywords.slice(0, 3)])]
  const seen = new Set<string>()
  const now = new Date().toISOString()

  for (const q of queries) {
    try {
      const fromReddit = await ingestFromJson(userId, siteId, q, seen, now)
      if (!fromReddit) {
        await ingestFromPullPush(userId, siteId, q, seen, now)
      }
    } catch (err) {
      console.error('[ValueScan reddit]', q, err)
      try {
        await ingestFromPullPush(userId, siteId, q, seen, now)
      } catch (fallbackErr) {
        console.error('[ValueScan reddit] pullpush fallback', q, fallbackErr)
      }
    }
  }

  return listRedditThreads(userId, siteId)
}

export function listRedditThreads(userId: string, siteId: string): RedditThread[] {
  return (db.prepare(`
    SELECT id, subreddit, thread_id, title, url, fit_score, status
    FROM valuescan_reddit_threads WHERE user_id = ? AND site_id = ?
    ORDER BY fit_score DESC LIMIT 15
  `).all(userId, siteId) as Array<{
    id: string; subreddit: string; thread_id: string; title: string; url: string
    fit_score: number; status: string
  }>).map((r) => ({
    id: r.id,
    subreddit: r.subreddit,
    threadId: r.thread_id,
    title: r.title,
    url: r.url,
    fitScore: r.fit_score,
    status: r.status,
    suggestion: r.status === 'new'
      ? 'Open thread and add a helpful comment with context about your site'
      : 'Thread tracked — engage when relevant',
  }))
}
