import { randomUUID } from 'crypto'
import type {
  AuditCategory,
  AuditFinding,
  AuditMeta,
  AuditReport,
  AuditStatus,
  CategoryScore,
} from './audit-types.js'
import { runAccessibilityChecks } from './audit-a11y.js'
import { checkDnsAuth, runCoreWebVitalsProxies, runExtraSeoMarketingChecks } from './audit-extras.js'
import { enrichFindingsWithFixOptions } from './audit-fix-options.js'

const FETCH_TIMEOUT_MS = 15000
const MAX_BODY_BYTES = 2_000_000

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  seo: 'SEO',
  sem: 'SEM & Paid Media',
  marketing: 'Marketing',
  security: 'Security',
  technical: 'Technical',
  accessibility: 'Accessibility',
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('URL is required')
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(withProtocol)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported')
  }
  return parsed.toString()
}


function extractMeta(html: string, name: string): string | null {
  const byName = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
  )
  if (byName) return byName[1].trim()
  const byNameAlt = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'),
  )
  return byNameAlt ? byNameAlt[1].trim() : null
}

function extractProperty(html: string, property: string): string | null {
  const match = html.match(
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
  )
  if (match) return match[1].trim()
  const alt = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
  )
  return alt ? alt[1].trim() : null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].replace(/\s+/g, ' ').trim() : null
}

function countMatches(html: string, pattern: RegExp): number {
  const matches = html.match(pattern)
  return matches ? matches.length : 0
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
}

function finding(
  category: AuditCategory,
  title: string,
  description: string,
  status: AuditStatus,
  impact: AuditFinding['impact'],
  recommendation?: string,
  value?: string,
): AuditFinding {
  return {
    id: randomUUID(),
    category,
    title,
    description,
    status,
    impact,
    recommendation,
    value,
  }
}

async function fetchResource(url: string): Promise<{
  ok: boolean
  status: number
  headers: Headers
  body: string
  elapsedMs: number
  finalUrl: string
}> {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'PrintableListings-AuditBot/1.0 (+https://printablelistings.xyz/audit)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const buffer = await res.arrayBuffer()
    const truncated = buffer.byteLength > MAX_BODY_BYTES
      ? buffer.slice(0, MAX_BODY_BYTES)
      : buffer
    const body = new TextDecoder('utf-8', { fatal: false }).decode(truncated)

    return {
      ok: res.ok,
      status: res.status,
      headers: res.headers,
      body,
      elapsedMs: Date.now() - start,
      finalUrl: res.url,
    }
  } finally {
    clearTimeout(timer)
  }
}

function runSeoChecks(html: string, url: string, findings: AuditFinding[]) {
  const title = extractTitle(html)
  const description = extractMeta(html, 'description')
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1]
    ?? html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)?.[1]

  const h1Count = countMatches(html, /<h1[\s>]/gi)
  const h2Count = countMatches(html, /<h2[\s>]/gi)
  const lang = html.match(/<html[^>]+lang=["']([^"']*)["']/i)?.[1]
  const robotsMeta = extractMeta(html, 'robots')
  const viewport = extractMeta(html, 'viewport')
  const jsonLdCount = countMatches(html, /application\/ld\+json/gi)
  const imgCount = countMatches(html, /<img[\s>]/gi)
  const altCount = countMatches(html, /<img[^>]+alt=["'][^"']+["']/gi)
  const internalLinks = (html.match(/href=["'](?!https?:\/\/|mailto:|tel:|#|javascript:)([^"']+)["']/gi) ?? []).length
  const parsed = new URL(url)

  if (!title) {
    findings.push(finding('seo', 'Missing page title', 'No <title> tag found.', 'fail', 'high', 'Add a unique, descriptive title between 30–60 characters.'))
  } else if (title.length < 30) {
    findings.push(finding('seo', 'Title too short', `Title is ${title.length} characters.`, 'warn', 'medium', 'Expand the title to 30–60 characters with primary keywords.', title))
  } else if (title.length > 60) {
    findings.push(finding('seo', 'Title too long', `Title is ${title.length} characters and may truncate in SERPs.`, 'warn', 'medium', 'Shorten the title to under 60 characters.', title))
  } else {
    findings.push(finding('seo', 'Page title', 'Title length is within recommended range.', 'pass', 'low', undefined, title))
  }

  if (!description) {
    findings.push(finding('seo', 'Missing meta description', 'No meta description found.', 'fail', 'high', 'Add a compelling meta description between 120–160 characters.'))
  } else if (description.length < 120) {
    findings.push(finding('seo', 'Meta description too short', `Description is ${description.length} characters.`, 'warn', 'medium', 'Expand to 120–160 characters.', description))
  } else if (description.length > 160) {
    findings.push(finding('seo', 'Meta description too long', `Description is ${description.length} characters.`, 'warn', 'medium', 'Trim to 160 characters or less.', description))
  } else {
    findings.push(finding('seo', 'Meta description', 'Description length is optimal for search snippets.', 'pass', 'low', undefined, description))
  }

  if (h1Count === 0) {
    findings.push(finding('seo', 'Missing H1', 'No H1 heading found.', 'fail', 'high', 'Add one clear H1 that describes the page topic.'))
  } else if (h1Count > 1) {
    findings.push(finding('seo', 'Multiple H1 tags', `Found ${h1Count} H1 elements.`, 'warn', 'medium', 'Use a single H1 per page for clearer structure.'))
  } else {
    findings.push(finding('seo', 'H1 heading', 'Single H1 found — good heading hierarchy.', 'pass', 'low'))
  }

  if (h2Count === 0) {
    findings.push(finding('seo', 'No H2 subheadings', 'Page lacks H2 headings for content structure.', 'warn', 'medium', 'Add H2 subheadings to organize content for readers and crawlers.'))
  } else {
    findings.push(finding('seo', 'Heading structure', `${h2Count} H2 subheadings found.`, 'pass', 'low'))
  }

  if (!canonical) {
    findings.push(finding('seo', 'Missing canonical URL', 'No canonical link tag detected.', 'warn', 'medium', `Add <link rel="canonical" href="${url}"> to prevent duplicate content issues.`))
  } else {
    findings.push(finding('seo', 'Canonical URL', 'Canonical tag is present.', 'pass', 'low', undefined, canonical))
  }

  if (!lang) {
    findings.push(finding('seo', 'Missing lang attribute', 'HTML element has no lang attribute.', 'warn', 'medium', 'Add lang="en" (or appropriate locale) to the <html> tag.'))
  } else {
    findings.push(finding('seo', 'Language attribute', `Page language set to "${lang}".`, 'pass', 'low', undefined, lang))
  }

  if (robotsMeta?.toLowerCase().includes('noindex')) {
    findings.push(finding('seo', 'Page blocked from indexing', `robots meta: ${robotsMeta}`, 'fail', 'high', 'Remove noindex if you want this page in search results.', robotsMeta))
  } else {
    findings.push(finding('seo', 'Indexability', robotsMeta ? `robots meta: ${robotsMeta}` : 'No restrictive robots meta tag.', 'pass', 'low', undefined, robotsMeta ?? 'index, follow'))
  }

  if (!viewport) {
    findings.push(finding('seo', 'Missing viewport meta', 'No viewport meta tag for mobile rendering.', 'fail', 'high', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">'))
  }

  if (jsonLdCount === 0) {
    findings.push(finding('seo', 'No structured data', 'No JSON-LD schema markup detected.', 'warn', 'medium', 'Add Organization, Product, or WebSite schema for rich results.'))
  } else {
    findings.push(finding('seo', 'Structured data', `${jsonLdCount} JSON-LD block(s) found.`, 'pass', 'low'))
  }

  if (imgCount > 0) {
    const altRatio = Math.round((altCount / imgCount) * 100)
    if (altRatio < 80) {
      findings.push(finding('seo', 'Image alt text coverage', `${altRatio}% of images have alt text (${altCount}/${imgCount}).`, 'warn', 'medium', 'Add descriptive alt text to all meaningful images.'))
    } else {
      findings.push(finding('seo', 'Image alt text', `${altRatio}% of images have alt text.`, 'pass', 'low'))
    }
  }

  if (internalLinks < 3) {
    findings.push(finding('seo', 'Few internal links', `Only ${internalLinks} internal links detected.`, 'warn', 'low', 'Add internal links to improve crawlability and site structure.'))
  } else {
    findings.push(finding('seo', 'Internal linking', `${internalLinks} internal links found.`, 'pass', 'low'))
  }

  findings.push(finding('seo', 'URL structure', parsed.pathname.length > 80 ? 'URL path is very long.' : 'URL path length is reasonable.', parsed.pathname.length > 80 ? 'warn' : 'pass', 'low', undefined, parsed.pathname))
}

function runSemChecks(html: string, findings: AuditFinding[]) {
  const hasGtm = /googletagmanager\.com/i.test(html)
  const hasGa4 = /G-[A-Z0-9]+/i.test(html) || /google-analytics\.com/i.test(html) || /gtag\s*\(/i.test(html)
  const hasGoogleAds = /googleadservices\.com|AW-\d+|gtag\s*\(\s*['"]config['"]\s*,\s*['"]AW-/i.test(html)
  const hasFbPixel = /connect\.facebook\.net\/.*fbevents|fbq\s*\(/i.test(html)
  const hasLinkedIn = /snap\.licdn\.com|_linkedin_partner_id/i.test(html)
  const hasMicrosoftUet = /bat\.bing\.com|UET/i.test(html)
  const hasHotjar = /hotjar\.com/i.test(html)
  const hasClarity = /clarity\.ms/i.test(html)

  if (hasGtm) {
    findings.push(finding('sem', 'Google Tag Manager', 'GTM container detected — central tag management in place.', 'pass', 'low'))
  } else if (hasGa4) {
    findings.push(finding('sem', 'Google Analytics', 'GA4 / gtag tracking detected.', 'pass', 'low'))
  } else {
    findings.push(finding('sem', 'No analytics tracking', 'No Google Analytics or GTM detected.', 'warn', 'high', 'Install GA4 or GTM to measure traffic and campaign performance.'))
  }

  if (hasGoogleAds) {
    findings.push(finding('sem', 'Google Ads conversion tracking', 'Google Ads tags detected.', 'pass', 'low'))
  } else {
    findings.push(finding('sem', 'No Google Ads tags', 'No Google Ads conversion or remarketing tags found.', 'info', 'medium', 'Add conversion tracking if running Google Ads campaigns.'))
  }

  if (hasFbPixel) {
    findings.push(finding('sem', 'Meta Pixel', 'Facebook/Meta Pixel detected.', 'pass', 'low'))
  } else {
    findings.push(finding('sem', 'No Meta Pixel', 'No Facebook Pixel found for paid social retargeting.', 'info', 'medium', 'Install Meta Pixel if running Facebook/Instagram ads.'))
  }

  if (hasLinkedIn) findings.push(finding('sem', 'LinkedIn Insight Tag', 'LinkedIn tracking detected.', 'pass', 'low'))
  if (hasMicrosoftUet) findings.push(finding('sem', 'Microsoft UET', 'Bing Ads UET tag detected.', 'pass', 'low'))
  if (hasHotjar) findings.push(finding('sem', 'Hotjar', 'Session recording / heatmaps detected.', 'pass', 'low'))
  if (hasClarity) findings.push(finding('sem', 'Microsoft Clarity', 'Clarity analytics detected.', 'pass', 'low'))

  const formCount = countMatches(html, /<form[\s>]/gi)
  const ctaPatterns = /(buy now|sign up|get started|subscribe|contact us|free trial|add to cart|book now|learn more)/gi
  const ctaMatches = stripTags(html).match(ctaPatterns)?.length ?? 0

  if (formCount === 0 && ctaMatches < 2) {
    findings.push(finding('sem', 'Weak conversion elements', 'Few forms or call-to-action phrases detected.', 'warn', 'high', 'Add clear CTAs and lead capture forms for paid traffic landing pages.'))
  } else {
    findings.push(finding('sem', 'Conversion elements', `${formCount} form(s) and ${ctaMatches} CTA phrase(s) detected.`, 'pass', 'low'))
  }

  const utmLinks = (html.match(/utm_(source|medium|campaign)=/gi) ?? []).length
  if (utmLinks > 0) {
    findings.push(finding('sem', 'UTM parameters', `${utmLinks} UTM-tagged link(s) found in page source.`, 'pass', 'low'))
  } else {
    findings.push(finding('sem', 'No UTM links in source', 'No UTM parameters in static HTML (may be added dynamically).', 'info', 'low', 'Use UTM parameters on campaign links for attribution.'))
  }
}

function runMarketingChecks(html: string, url: string, findings: AuditFinding[]) {
  const ogTitle = extractProperty(html, 'og:title')
  const ogDescription = extractProperty(html, 'og:description')
  const ogImage = extractProperty(html, 'og:image')
  const ogUrl = extractProperty(html, 'og:url')
  const twitterCard = extractMeta(html, 'twitter:card')
  const twitterTitle = extractMeta(html, 'twitter:title')
  const favicon = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i)?.[1]
  const pageTitle = extractTitle(html)

  const ogComplete = ogTitle && ogDescription && ogImage
  if (!ogTitle && !ogDescription && !ogImage) {
    findings.push(finding('marketing', 'Missing Open Graph tags', 'No og:title, og:description, or og:image found.', 'fail', 'high', 'Add Open Graph tags for rich social sharing previews.'))
  } else if (!ogComplete) {
    const missing = [!ogTitle && 'og:title', !ogDescription && 'og:description', !ogImage && 'og:image'].filter(Boolean).join(', ')
    findings.push(finding('marketing', 'Incomplete Open Graph', `Missing: ${missing}.`, 'warn', 'medium', 'Complete all core OG tags for consistent social previews.'))
  } else {
    findings.push(finding('marketing', 'Open Graph tags', 'Core OG tags (title, description, image) are present.', 'pass', 'low'))
  }

  if (!twitterCard) {
    findings.push(finding('marketing', 'Missing Twitter Card', 'No twitter:card meta tag.', 'warn', 'medium', 'Add twitter:card="summary_large_image" for Twitter/X previews.'))
  } else {
    findings.push(finding('marketing', 'Twitter Card', `Card type: ${twitterCard}.`, 'pass', 'low', undefined, twitterCard))
  }

  if (!favicon) {
    findings.push(finding('marketing', 'Missing favicon', 'No favicon link detected.', 'warn', 'low', 'Add a favicon for brand recognition in browser tabs and bookmarks.'))
  } else {
    findings.push(finding('marketing', 'Favicon', 'Favicon is linked.', 'pass', 'low', undefined, favicon))
  }

  const socialPatterns = [
    { name: 'Facebook', pattern: /facebook\.com/i },
    { name: 'Instagram', pattern: /instagram\.com/i },
    { name: 'Twitter/X', pattern: /(twitter\.com|x\.com)/i },
    { name: 'LinkedIn', pattern: /linkedin\.com/i },
    { name: 'YouTube', pattern: /youtube\.com/i },
    { name: 'TikTok', pattern: /tiktok\.com/i },
  ]
  const foundSocial = socialPatterns.filter((s) => s.pattern.test(html)).map((s) => s.name)
  if (foundSocial.length === 0) {
    findings.push(finding('marketing', 'No social profile links', 'No links to social media profiles detected.', 'info', 'low', 'Link to your social profiles to build brand trust.'))
  } else {
    findings.push(finding('marketing', 'Social presence', `Links to: ${foundSocial.join(', ')}.`, 'pass', 'low'))
  }

  if (pageTitle && ogTitle && pageTitle !== ogTitle) {
    findings.push(finding('marketing', 'Title/OG mismatch', 'Page title differs from og:title.', 'info', 'low', 'Align titles for consistent branding across search and social.', `Title: "${pageTitle}" · OG: "${ogTitle}"`))
  }

  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const emails = html.match(emailPattern) ?? []
  const publicEmails = emails.filter((e) => !e.includes('example.com') && !e.includes('sentry.io'))
  if (publicEmails.length > 0) {
    findings.push(finding('marketing', 'Contact email visible', `${publicEmails.length} email address(es) found on page.`, 'pass', 'low'))
  }

  if (ogUrl && ogUrl !== url) {
    findings.push(finding('marketing', 'OG URL mismatch', 'og:url differs from scanned URL.', 'warn', 'medium', 'Set og:url to the canonical page URL.', `og:url: ${ogUrl}`))
  }

  if (twitterTitle) {
    findings.push(finding('marketing', 'Twitter title', 'Twitter title meta tag present.', 'pass', 'low', undefined, twitterTitle))
  }
}

function runSecurityChecks(
  html: string,
  url: string,
  headers: Headers,
  findings: AuditFinding[],
) {
  const parsed = new URL(url)
  const isHttps = parsed.protocol === 'https:'

  if (!isHttps) {
    findings.push(finding('security', 'Not using HTTPS', 'Site is served over HTTP.', 'fail', 'high', 'Enable HTTPS with a valid TLS certificate.'))
  } else {
    findings.push(finding('security', 'HTTPS enabled', 'Site is served over HTTPS.', 'pass', 'low'))
  }

  const securityHeaders: Array<{ name: string; impact: AuditFinding['impact']; recommendation: string }> = [
    { name: 'strict-transport-security', impact: 'high', recommendation: 'Add Strict-Transport-Security to enforce HTTPS.' },
    { name: 'content-security-policy', impact: 'high', recommendation: 'Add a Content-Security-Policy to mitigate XSS.' },
    { name: 'x-frame-options', impact: 'medium', recommendation: 'Add X-Frame-Options or frame-ancestors in CSP to prevent clickjacking.' },
    { name: 'x-content-type-options', impact: 'medium', recommendation: 'Add X-Content-Type-Options: nosniff.' },
    { name: 'referrer-policy', impact: 'low', recommendation: 'Add Referrer-Policy to control referrer leakage.' },
    { name: 'permissions-policy', impact: 'low', recommendation: 'Add Permissions-Policy to restrict browser features.' },
  ]

  for (const header of securityHeaders) {
    const value = headers.get(header.name)
    if (!value) {
      findings.push(finding('security', `Missing ${header.name}`, `Response lacks ${header.name} header.`, 'warn', header.impact, header.recommendation))
    } else {
      findings.push(finding('security', header.name, 'Security header present.', 'pass', 'low', undefined, value))
    }
  }

  const serverHeader = headers.get('server')
  const poweredBy = headers.get('x-powered-by')
  if (serverHeader) {
    const generic = /^(cloudflare|nginx|openresty|cloudfront|AkamaiGHost)$/i.test(serverHeader.trim())
    const versionLeak = /\/|express|php\/|apache\/|nginx\/|microsoft-iis\/|\d+\.\d+/i.test(serverHeader)
    if (versionLeak || !generic) {
      findings.push(finding('security', 'Server header exposed', `Server: ${serverHeader}`, 'warn', 'low', 'Consider hiding or genericizing the Server header.'))
    } else {
      findings.push(finding('security', 'Server header', `Generic Server: ${serverHeader}`, 'pass', 'low'))
    }
  }
  if (poweredBy) {
    findings.push(finding('security', 'X-Powered-By exposed', `X-Powered-By: ${poweredBy}`, 'warn', 'medium', 'Remove X-Powered-By to reduce information disclosure.', poweredBy))
  }

  if (isHttps) {
    const mixedContent = (html.match(/(?:src|href)=["']http:\/\/(?!localhost)/gi) ?? []).length
    if (mixedContent > 0) {
      findings.push(finding('security', 'Mixed content', `${mixedContent} HTTP resource reference(s) on HTTPS page.`, 'fail', 'high', 'Upgrade all resources to HTTPS.'))
    } else {
      findings.push(finding('security', 'No mixed content', 'No insecure HTTP resources detected.', 'pass', 'low'))
    }
  }

  const sensitivePatterns = [
    { name: 'API key pattern', pattern: /(?:api[_-]?key|secret[_-]?key)\s*[:=]\s*["'][a-zA-Z0-9_-]{16,}/i },
    { name: 'AWS key pattern', pattern: /AKIA[0-9A-Z]{16}/ },
    { name: 'Private key block', pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
  ]
  for (const check of sensitivePatterns) {
    if (check.pattern.test(html)) {
      findings.push(finding('security', `Possible exposed ${check.name}`, 'Sensitive-looking data found in HTML source.', 'fail', 'high', 'Remove secrets from client-side code immediately.'))
    }
  }

  const setCookie = headers.get('set-cookie')
  if (setCookie) {
    const hasSecure = /;\s*secure/i.test(setCookie)
    const hasHttpOnly = /;\s*httponly/i.test(setCookie)
    const hasSameSite = /;\s*samesite=/i.test(setCookie)
    if (!hasSecure || !hasHttpOnly || !hasSameSite) {
      findings.push(finding('security', 'Cookie security flags', 'Set-Cookie missing Secure, HttpOnly, or SameSite.', 'warn', 'high', 'Set Secure, HttpOnly, and SameSite=Strict/Lax on cookies.'))
    } else {
      findings.push(finding('security', 'Cookie security', 'Cookies use Secure, HttpOnly, and SameSite.', 'pass', 'low'))
    }
  }
}

function runTechnicalChecks(
  html: string,
  meta: Pick<AuditMeta, 'responseTimeMs' | 'pageSizeBytes' | 'statusCode'>,
  headers: Headers,
  findings: AuditFinding[],
) {
  if (meta.statusCode >= 400) {
    findings.push(finding('technical', 'HTTP error status', `Page returned status ${meta.statusCode}.`, 'fail', 'high', 'Fix server errors before running campaigns.'))
  } else if (meta.statusCode >= 300 && meta.statusCode < 400) {
    findings.push(finding('technical', 'Redirect response', `Status ${meta.statusCode} — page redirects.`, 'info', 'low'))
  } else {
    findings.push(finding('technical', 'HTTP status', `Page returned ${meta.statusCode} OK.`, 'pass', 'low'))
  }

  if (meta.responseTimeMs > 3000) {
    findings.push(finding('technical', 'Slow response time', `TTFB/body fetch took ${meta.responseTimeMs}ms.`, 'warn', 'high', 'Optimise server response time — aim for under 1 second.'))
  } else if (meta.responseTimeMs > 1500) {
    findings.push(finding('technical', 'Moderate response time', `Response took ${meta.responseTimeMs}ms.`, 'warn', 'medium', 'Consider caching and CDN to improve load speed.'))
  } else {
    findings.push(finding('technical', 'Response time', `Page loaded in ${meta.responseTimeMs}ms.`, 'pass', 'low'))
  }

  const sizeKb = Math.round(meta.pageSizeBytes / 1024)
  if (meta.pageSizeBytes > 500_000) {
    findings.push(finding('technical', 'Large page size', `HTML body is ~${sizeKb}KB.`, 'warn', 'medium', 'Reduce HTML size — minify and defer non-critical content.'))
  } else {
    findings.push(finding('technical', 'Page size', `HTML body is ~${sizeKb}KB.`, 'pass', 'low'))
  }

  const encoding = headers.get('content-encoding')
  if (encoding) {
    findings.push(finding('technical', 'Compression', `Content-Encoding: ${encoding}.`, 'pass', 'low'))
  } else {
    findings.push(finding('technical', 'No compression', 'Response is not gzip/brotli compressed.', 'warn', 'medium', 'Enable gzip or Brotli compression on the server.'))
  }

  const charset = html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i)?.[1]
  if (!charset) {
    findings.push(finding('technical', 'Missing charset', 'No character encoding declared.', 'warn', 'medium', 'Add <meta charset="UTF-8"> in the document head.'))
  } else {
    findings.push(finding('technical', 'Character encoding', `Charset: ${charset}.`, 'pass', 'low'))
  }

  const hasDoctype = /<!DOCTYPE html>/i.test(html)
  findings.push(finding('technical', 'HTML5 doctype', hasDoctype ? 'Valid HTML5 doctype present.' : 'Missing or non-HTML5 doctype.', hasDoctype ? 'pass' : 'warn', 'low'))

  const deprecated = countMatches(html, /<(font|center|marquee)[\s>]/gi)
  if (deprecated > 0) {
    findings.push(finding('technical', 'Deprecated HTML tags', `Found ${deprecated} deprecated tag(s).`, 'warn', 'low', 'Replace deprecated tags with modern CSS.'))
  }
}

function robotsBlocksAll(body: string): boolean {
  const blocks = body.split(/\n(?=User-agent:)/i)
  for (const block of blocks) {
    if (!/User-agent:\s*\*/i.test(block)) continue
    const lines = block.split('\n').map((l) => l.trim().toLowerCase())
    const hasAllowRoot = lines.some((l) => l === 'allow: /' || l === 'allow:/')
    const hasDisallowRoot = lines.some((l) => l === 'disallow: /' || l === 'disallow:/')
    if (hasDisallowRoot && !hasAllowRoot) return true
  }
  return false
}

async function checkRobotsAndSitemap(origin: string, findings: AuditFinding[]) {
  try {
    const robots = await fetchResource(`${origin}/robots.txt`)
    if (robots.status === 200 && robots.body.trim()) {
      findings.push(finding('seo', 'robots.txt', 'robots.txt is accessible.', 'pass', 'low'))
      if (robotsBlocksAll(robots.body)) {
        findings.push(finding('seo', 'robots.txt blocks all', 'robots.txt disallows all crawlers.', 'fail', 'high', 'Remove "Disallow: /" unless intentionally blocking search engines.'))
      }
    } else {
      findings.push(finding('seo', 'Missing robots.txt', 'No robots.txt found at site root.', 'warn', 'low', 'Add robots.txt to guide search engine crawlers.'))
    }
  } catch {
    findings.push(finding('seo', 'robots.txt unreachable', 'Could not fetch robots.txt.', 'info', 'low'))
  }

  try {
    const sitemap = await fetchResource(`${origin}/sitemap.xml`)
    if (sitemap.status === 200 && (sitemap.body.includes('<urlset') || sitemap.body.includes('<sitemapindex'))) {
      findings.push(finding('seo', 'sitemap.xml', 'XML sitemap found at /sitemap.xml.', 'pass', 'low'))
    } else {
      findings.push(finding('seo', 'Missing sitemap.xml', 'No sitemap at /sitemap.xml.', 'warn', 'medium', 'Submit an XML sitemap to search engines via Search Console.'))
    }
  } catch {
    findings.push(finding('seo', 'sitemap.xml unreachable', 'Could not fetch sitemap.xml.', 'info', 'low'))
  }
}

function scoreFindings(findings: AuditFinding[]): { overall: number; categories: CategoryScore[] } {
  const weights: Record<AuditStatus, number> = { pass: 100, info: 85, warn: 50, fail: 0 }
  const impactWeight: Record<AuditFinding['impact'], number> = { high: 3, medium: 2, low: 1 }

  const categories: AuditCategory[] = ['seo', 'sem', 'marketing', 'security', 'technical', 'accessibility']
  const categoryScores: CategoryScore[] = categories.map((category) => {
    const catFindings = findings.filter((f) => f.category === category)
    if (catFindings.length === 0) {
      return { category, score: 0, label: CATEGORY_LABELS[category], pass: 0, warn: 0, fail: 0, info: 0 }
    }

    let weightedSum = 0
    let totalWeight = 0
    for (const f of catFindings) {
      const w = impactWeight[f.impact]
      weightedSum += weights[f.status] * w
      totalWeight += w
    }

    return {
      category,
      label: CATEGORY_LABELS[category],
      score: Math.round(weightedSum / totalWeight),
      pass: catFindings.filter((f) => f.status === 'pass').length,
      warn: catFindings.filter((f) => f.status === 'warn').length,
      fail: catFindings.filter((f) => f.status === 'fail').length,
      info: catFindings.filter((f) => f.status === 'info').length,
    }
  })

  const categoryWeights: Record<AuditCategory, number> = {
    seo: 0.22,
    sem: 0.16,
    marketing: 0.16,
    security: 0.18,
    technical: 0.14,
    accessibility: 0.14,
  }

  const overall = Math.round(
    categoryScores.reduce((sum, c) => sum + c.score * categoryWeights[c.category], 0),
  )

  return { overall, categories: categoryScores }
}

function buildSummary(overall: number, categories: CategoryScore[]): string {
  const weakest = [...categories].sort((a, b) => a.score - b.score)[0]
  const strongest = [...categories].sort((a, b) => b.score - a.score)[0]

  if (overall >= 85) {
    return `Strong overall health (${overall}/100). Best area: ${strongest.label} (${strongest.score}). Monitor ${weakest.label} (${weakest.score}) for continued improvement.`
  }
  if (overall >= 65) {
    return `Moderate score (${overall}/100). Priority focus: ${weakest.label} at ${weakest.score}/100 — address failed checks there first.`
  }
  return `Needs attention (${overall}/100). Critical gaps in ${weakest.label} (${weakest.score}/100). Fix high-impact failures before scaling SEO, ads, or marketing spend.`
}

export async function runAudit(inputUrl: string): Promise<AuditReport> {
  const url = normalizeUrl(inputUrl)
  const findings: AuditFinding[] = []

  let response: Awaited<ReturnType<typeof fetchResource>>
  try {
    response = await fetchResource(url)
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'Request timed out after 15 seconds'
      : err instanceof Error ? err.message : 'Failed to fetch URL'
    throw new Error(message)
  }

  const finalUrl = response.finalUrl || url
  const html = response.body
  const parsed = new URL(finalUrl)
  const origin = parsed.origin

  const meta: AuditMeta = {
    url: inputUrl.trim(),
    finalUrl,
    scannedAt: new Date().toISOString(),
    responseTimeMs: response.elapsedMs,
    statusCode: response.status,
    pageSizeBytes: new TextEncoder().encode(html).byteLength,
    contentType: response.headers.get('content-type'),
  }

  runSeoChecks(html, finalUrl, findings)
  runSemChecks(html, findings)
  runMarketingChecks(html, finalUrl, findings)
  runSecurityChecks(html, finalUrl, response.headers, findings)
  runTechnicalChecks(html, meta, response.headers, findings)
  runAccessibilityChecks(html, findings)
  runCoreWebVitalsProxies(response.elapsedMs, html, findings)
  await runExtraSeoMarketingChecks(html, origin, findings)
  await checkRobotsAndSitemap(origin, findings)
  await checkDnsAuth(origin, findings)

  const { overall, categories } = scoreFindings(findings)

  const enrichedFindings = enrichFindingsWithFixOptions(findings, { url: finalUrl, origin })

  return {
    id: randomUUID(),
    meta,
    overallScore: overall,
    categories,
    findings: enrichedFindings,
    summary: buildSummary(overall, categories),
  }
}

export { normalizeUrl, CATEGORY_LABELS }
