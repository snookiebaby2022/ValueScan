import { runAudit } from './audit-service.js'
import type { AuditFinding, AuditReport, SiteAuditSummary } from './audit-types.js'

async function fetchSitemapUrls(origin: string, max: number): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const xml = await res.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim())
    const unique = [...new Set(locs)].filter((u) => {
      try {
        return new URL(u).origin === origin
      } catch {
        return false
      }
    })
    return unique.slice(0, max)
  } catch {
    return []
  }
}

export async function runSiteAudit(inputUrl: string, maxPages = 5): Promise<AuditReport> {
  const primary = await runAudit(inputUrl)
  const origin = new URL(primary.meta.finalUrl).origin
  const sitemapUrls = await fetchSitemapUrls(origin, maxPages)
  const urls = [primary.meta.finalUrl, ...sitemapUrls.filter((u) => u !== primary.meta.finalUrl)].slice(0, maxPages)

  if (urls.length <= 1) {
    return primary
  }

  const pageResults: SiteAuditSummary['pageResults'] = [{ url: primary.meta.finalUrl, score: primary.overallScore }]
  const extraFindings: AuditFinding[] = []

  for (const pageUrl of urls.slice(1)) {
    try {
      const report = await runAudit(pageUrl)
      pageResults.push({ url: pageUrl, score: report.overallScore })
      for (const f of report.findings.filter((x) => x.status === 'fail' || x.status === 'warn')) {
        extraFindings.push({
          ...f,
          id: `${f.id}-${pageUrl}`,
          title: `[${new URL(pageUrl).pathname || '/'}] ${f.title}`,
          description: `${f.description} (page: ${pageUrl})`,
        })
      }
    } catch {
      extraFindings.push({
        id: `crawl-fail-${pageUrl}`,
        category: 'technical',
        title: `Crawl failed: ${pageUrl}`,
        description: 'Could not audit this sitemap URL.',
        status: 'warn',
        impact: 'low',
      })
    }
  }

  const avgScore = Math.round(pageResults.reduce((s, p) => s + p.score, 0) / pageResults.length)
  const mergedFindings = [...primary.findings, ...extraFindings.slice(0, 30)]
  mergedFindings.push({
    id: 'site-audit-summary',
    category: 'seo',
    title: 'Multi-page site audit',
    description: `Scanned ${pageResults.length} pages from sitemap. Average score: ${avgScore}/100.`,
    status: avgScore >= 80 ? 'pass' : avgScore >= 60 ? 'warn' : 'fail',
    impact: 'medium',
    value: pageResults.map((p) => `${p.url}: ${p.score}`).join(', '),
  })

  return {
    ...primary,
    overallScore: avgScore,
    findings: mergedFindings,
    summary: `Site audit of ${pageResults.length} pages — average ${avgScore}/100. ${primary.summary}`,
    siteAudit: { pagesScanned: pageResults.length, pageResults },
  }
}
