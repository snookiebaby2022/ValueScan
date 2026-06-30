import { randomUUID } from 'crypto'
import type { AuditFinding } from './audit-types.js'

function finding(
  category: AuditFinding['category'],
  title: string,
  description: string,
  status: AuditFinding['status'],
  impact: AuditFinding['impact'],
  recommendation?: string,
  value?: string,
  fixSnippet?: string,
): AuditFinding {
  return { id: randomUUID(), category, title, description, status, impact, recommendation, value, fixSnippet }
}

function extractProperty(html: string, property: string): string | null {
  const match = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'))
  return match ? match[1].trim() : null
}

export async function runExtraSeoMarketingChecks(html: string, origin: string, findings: AuditFinding[]) {
  const hreflangCount = (html.match(/hreflang=["']/gi) ?? []).length
  if (hreflangCount === 0) {
    findings.push(finding('seo', 'No hreflang tags', 'No alternate language/regional links found.', 'info', 'low', 'Add hreflang if you serve multiple locales.'))
  } else {
    findings.push(finding('seo', 'Hreflang tags', `${hreflangCount} hreflang reference(s) found.`, 'pass', 'low'))
  }

  const cookieBanner = /cookie|consent|gdpr|onetrust|cookiebot/i.test(html)
  if (cookieBanner) {
    findings.push(finding('marketing', 'Cookie consent', 'Cookie/consent banner detected.', 'pass', 'low'))
  } else {
    findings.push(finding('marketing', 'No cookie banner', 'No cookie consent UI detected in HTML.', 'warn', 'medium', 'Add GDPR/UK PECR compliant cookie consent if using tracking cookies.'))
  }

  const ogImage = extractProperty(html, 'og:image')
  if (ogImage) {
    try {
      const imgUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, origin).toString()
      const res = await fetch(imgUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        findings.push(finding('marketing', 'OG image reachable', 'Open Graph image URL returns OK.', 'pass', 'low', undefined, imgUrl))
      } else {
        findings.push(finding('marketing', 'OG image broken', `og:image returned HTTP ${res.status}.`, 'fail', 'high', 'Fix or update og:image to a valid URL.', imgUrl))
      }
    } catch {
      findings.push(finding('marketing', 'OG image unreachable', 'Could not fetch og:image URL.', 'warn', 'medium', 'Ensure og:image is publicly accessible.', ogImage))
    }
  }
}

export async function checkDnsAuth(origin: string, findings: AuditFinding[]) {
  try {
    const hostname = new URL(origin).hostname
    const { promises: dns } = await import('dns')
    const txt = await dns.resolveTxt(hostname).catch(() => [] as string[][])
    const flat = txt.flat().join(' ')
    const hasSpf = flat.includes('v=spf1') || flat.includes('spf1')
    const dmarcHost = `_dmarc.${hostname}`
    const dmarc = await dns.resolveTxt(dmarcHost).catch(() => [] as string[][])
    const hasDmarc = dmarc.flat().some((r) => r.includes('v=DMARC1'))

    if (hasSpf) findings.push(finding('security', 'SPF record', 'SPF TXT record found for domain.', 'pass', 'low'))
    else findings.push(finding('security', 'No SPF record', 'No SPF record detected.', 'warn', 'medium', 'Add SPF to reduce email spoofing risk.'))

    if (hasDmarc) findings.push(finding('security', 'DMARC record', 'DMARC policy found.', 'pass', 'low'))
    else findings.push(finding('security', 'No DMARC record', 'No DMARC record at _dmarc subdomain.', 'warn', 'medium', 'Publish a DMARC policy for email authentication.'))
  } catch {
    findings.push(finding('security', 'DNS email auth', 'Could not verify SPF/DMARC records.', 'info', 'low'))
  }
}

export function runCoreWebVitalsProxies(responseTimeMs: number, html: string, findings: AuditFinding[]) {
  if (responseTimeMs <= 800) {
    findings.push(finding('technical', 'TTFB / response time', `Server responded in ${responseTimeMs}ms (good).`, 'pass', 'low', undefined, `${responseTimeMs}ms`))
  } else if (responseTimeMs <= 1800) {
    findings.push(finding('technical', 'TTFB / response time', `Response time ${responseTimeMs}ms — needs improvement.`, 'warn', 'medium', 'Optimise server/CDN to target TTFB under 800ms.', `${responseTimeMs}ms`))
  } else {
    findings.push(finding('technical', 'Slow TTFB', `Response time ${responseTimeMs}ms hurts Core Web Vitals.`, 'fail', 'high', 'Reduce server response time; use caching and a CDN.', `${responseTimeMs}ms`))
  }

  const largeImages = (html.match(/<img[^>]+width=["']\d{4,}/gi) ?? []).length
  if (largeImages > 0) {
    findings.push(finding('technical', 'Large image dimensions', `${largeImages} very wide image(s) may hurt LCP.`, 'warn', 'medium', 'Serve responsive images with srcset and modern formats (WebP/AVIF).'))
  }

  const deferScripts = (html.match(/<script[^>]+defer/gi) ?? []).length
  const asyncScripts = (html.match(/<script[^>]+async/gi) ?? []).length
  const blockingScripts = (html.match(/<script(?![^>]*(defer|async))[^>]*src=/gi) ?? []).length
  if (blockingScripts > 2 && deferScripts + asyncScripts === 0) {
    findings.push(finding('technical', 'Render-blocking scripts', `${blockingScripts} blocking script(s) without defer/async.`, 'warn', 'medium', 'Add defer or async to non-critical scripts to improve LCP/INP.'))
  }
}
