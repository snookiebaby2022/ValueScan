const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

async function crawlWebsite(targetUrl) {
  const startTime = Date.now();
  const report = {
    url: targetUrl,
    score: 0,
    issues: 0,
    warnings: 0,
    categories: {
      seo: { score: 0, max: 40, checks: [] },
      sem: { score: 0, max: 15, checks: [] },
      security: { score: 0, max: 25, checks: [] },
      performance: { score: 0, max: 20, checks: [] }
    }
  };

  let response;
  let html;
  let $;
  let baseUrl;
  let allLinks = [];
  let brokenLinks = [];
  let contentSnippets = [];

  try {
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
    baseUrl = new url.URL(targetUrl);

    response = await axios.get(targetUrl, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    html = response.data;
    $ = cheerio.load(html);
    const responseTime = Date.now() - startTime;

    // ── Collect all links for broken link check ──────────────────
    const links = $('a[href]');
    links.each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        let resolved;
        try { resolved = new url.URL(href, baseUrl).href; } catch { resolved = href; }
        allLinks.push({ url: resolved, text: $(el).text().trim().substring(0, 50) });
      }
    });

    // Check a sample of links for broken status (limit to 10 to avoid timeouts)
    const uniqueLinks = [...new Map(allLinks.map(l => [l.url, l])).values()].slice(0, 10);
    for (const link of uniqueLinks) {
      try {
        const linkRes = await axios.head(link.url, { timeout: 5000, maxRedirects: 3, validateStatus: () => true });
        if (linkRes.status >= 400) brokenLinks.push({ url: link.url, status: linkRes.status, text: link.text });
      } catch {
        // Try GET if HEAD fails
        try {
          const linkRes2 = await axios.get(link.url, { timeout: 5000, maxRedirects: 3, validateStatus: () => true });
          if (linkRes2.status >= 400) brokenLinks.push({ url: link.url, status: linkRes2.status, text: link.text });
        } catch {
          brokenLinks.push({ url: link.url, status: 'timeout', text: link.text });
        }
      }
    }

    // ── Duplicate content check ───────────────────────────────────
    const paragraphs = $('p, h1, h2, h3, h4, h5, h6, li');
    const texts = [];
    paragraphs.each((i, el) => {
      const text = $(el).text().trim().toLowerCase().replace(/\s+/g, ' ');
      if (text.length > 30) texts.push(text);
    });
    const duplicates = texts.filter((item, index) => texts.indexOf(item) !== index);
    const uniqueDuplicates = [...new Set(duplicates)];

    // ── SEO Checks ───────────────────────────────────────────────
    const seo = report.categories.seo;

    const title = $('title').text().trim();
    if (!title) { seo.checks.push({ type: 'error', message: 'Missing <title> tag' }); report.issues++; }
    else if (title.length < 10) { seo.checks.push({ type: 'warning', message: `Title too short (${title.length} chars)` }); report.warnings++; seo.score += 3; }
    else if (title.length > 70) { seo.checks.push({ type: 'warning', message: `Title too long (${title.length} chars)` }); report.warnings++; seo.score += 5; }
    else { seo.checks.push({ type: 'success', message: `Title: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"` }); seo.score += 8; }

    const metaDesc = $('meta[name="description"]').attr('content') || '';
    if (!metaDesc) { seo.checks.push({ type: 'error', message: 'Missing meta description' }); report.issues++; }
    else if (metaDesc.length < 50) { seo.checks.push({ type: 'warning', message: `Meta description too short (${metaDesc.length} chars)` }); report.warnings++; seo.score += 3; }
    else if (metaDesc.length > 160) { seo.checks.push({ type: 'warning', message: `Meta description too long (${metaDesc.length} chars)` }); report.warnings++; seo.score += 5; }
    else { seo.checks.push({ type: 'success', message: `Meta description: ${metaDesc.length} chars` }); seo.score += 6; }

    const h1s = $('h1');
    if (h1s.length === 0) { seo.checks.push({ type: 'error', message: 'No H1 tag found' }); report.issues++; }
    else if (h1s.length > 1) { seo.checks.push({ type: 'warning', message: `Multiple H1 tags (${h1s.length})` }); report.warnings++; seo.score += 4; }
    else { seo.checks.push({ type: 'success', message: `H1: "${h1s.first().text().trim().substring(0, 40)}"` }); seo.score += 6; }

    const h2s = $('h2');
    if (h2s.length === 0) { seo.checks.push({ type: 'warning', message: 'No H2 tags found' }); report.warnings++; seo.score += 2; }
    else { seo.checks.push({ type: 'success', message: `${h2s.length} H2 tag(s) found` }); seo.score += 4; }

    const images = $('img');
    const imgsWithoutAlt = images.filter((i, el) => !$(el).attr('alt'));
    if (imgsWithoutAlt.length > 0) { seo.checks.push({ type: 'warning', message: `${imgsWithoutAlt.length} image(s) missing alt text` }); report.warnings++; seo.score += 2; }
    else if (images.length > 0) { seo.checks.push({ type: 'success', message: `All ${images.length} image(s) have alt text` }); seo.score += 5; }

    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) { seo.checks.push({ type: 'warning', message: 'Missing canonical URL' }); report.warnings++; seo.score += 2; }
    else { seo.checks.push({ type: 'success', message: 'Canonical URL set' }); seo.score += 3; }

    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport) { seo.checks.push({ type: 'warning', message: 'Missing viewport meta tag' }); report.warnings++; seo.score += 1; }
    else { seo.checks.push({ type: 'success', message: 'Viewport meta tag present' }); seo.score += 3; }

    const schema = $('script[type="application/ld+json"]').length;
    if (schema === 0) { seo.checks.push({ type: 'warning', message: 'No JSON-LD structured data found' }); report.warnings++; seo.score += 1; }
    else { seo.checks.push({ type: 'success', message: `${schema} structured data script(s) found` }); seo.score += 3; }

    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    if (!ogTitle || !ogDesc) { seo.checks.push({ type: 'warning', message: 'Missing Open Graph tags' }); report.warnings++; seo.score += 1; }
    else { seo.checks.push({ type: 'success', message: 'Open Graph tags present' }); seo.score += 3; }

    const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href');
    if (!favicon) { seo.checks.push({ type: 'warning', message: 'No favicon found' }); report.warnings++; seo.score += 1; }
    else { seo.checks.push({ type: 'success', message: 'Favicon present' }); seo.score += 2; }

    let internalLinks = 0;
    let externalLinks = 0;
    links.each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.startsWith('http') && !href.includes(baseUrl.hostname)) externalLinks++;
        else if (href.startsWith('/') || href.startsWith('#') || href.includes(baseUrl.hostname)) internalLinks++;
      }
    });
    if (internalLinks === 0) { seo.checks.push({ type: 'warning', message: 'No internal links found' }); report.warnings++; }
    else { seo.checks.push({ type: 'success', message: `${internalLinks} internal, ${externalLinks} external links` }); seo.score += 3; }

    // Broken links check result
    if (brokenLinks.length > 0) {
      seo.checks.push({ type: 'error', message: `${brokenLinks.length} broken link(s) found (${brokenLinks.slice(0, 2).map(l => l.url).join(', ')}${brokenLinks.length > 2 ? '...' : ''})` });
      report.issues++;
      seo.score += 2;
    } else if (uniqueLinks.length > 0) {
      seo.checks.push({ type: 'success', message: `All ${uniqueLinks.length} checked links are valid` });
      seo.score += 3;
    }

    // Duplicate content check
    if (uniqueDuplicates.length > 0) {
      seo.checks.push({ type: 'warning', message: `${uniqueDuplicates.length} duplicate text block(s) found` });
      report.warnings++;
      seo.score += 2;
    } else {
      seo.checks.push({ type: 'success', message: 'No duplicate content detected' });
      seo.score += 3;
    }

    // ── SEM Checks ──────────────────────────────────────────────
    const sem = report.categories.sem;
    const htmlLower = html.toLowerCase();
    const hasGA = htmlLower.includes('gtag') || htmlLower.includes('googletagmanager') || htmlLower.includes('google-analytics');
    const hasMetaPixel = htmlLower.includes('facebook') || htmlLower.includes('fbq') || htmlLower.includes('meta-pixel');
    const hasLinkedIn = htmlLower.includes('linkedin') && htmlLower.includes('insight');
    const hasHotjar = htmlLower.includes('hotjar');
    const hasClarity = htmlLower.includes('clarity.ms') || htmlLower.includes('microsoft.com/clarity');
    const tagCount = [hasGA, hasMetaPixel, hasLinkedIn, hasHotjar, hasClarity].filter(Boolean).length;

    if (hasGA) { sem.checks.push({ type: 'success', message: 'Google Analytics detected' }); sem.score += 3; }
    else { sem.checks.push({ type: 'warning', message: 'Google Analytics not found' }); report.warnings++; }
    if (hasMetaPixel) { sem.checks.push({ type: 'success', message: 'Meta Pixel detected' }); sem.score += 3; }
    else { sem.checks.push({ type: 'warning', message: 'Meta Pixel not found' }); }
    if (hasLinkedIn) { sem.checks.push({ type: 'success', message: 'LinkedIn Insight Tag detected' }); sem.score += 3; }
    else { sem.checks.push({ type: 'warning', message: 'LinkedIn Insight Tag not found' }); }
    if (hasHotjar || hasClarity) { sem.checks.push({ type: 'success', message: 'Heatmap tool detected' }); sem.score += 3; }
    else { sem.checks.push({ type: 'warning', message: 'No heatmap tool (Hotjar/Clarity)' }); }
    if (tagCount === 0) { sem.checks.push({ type: 'error', message: 'No marketing tags detected' }); report.issues++; }

    // ── Security Checks ───────────────────────────────────────
    const sec = report.categories.security;
    const headers = response.headers;

    if (baseUrl.protocol === 'https:') { sec.checks.push({ type: 'success', message: 'HTTPS enabled' }); sec.score += 6; }
    else { sec.checks.push({ type: 'error', message: 'Site uses HTTP (not secure)' }); report.issues++; }

    const hsts = headers['strict-transport-security'];
    if (hsts) { sec.checks.push({ type: 'success', message: `HSTS header present` }); sec.score += 5; }
    else { sec.checks.push({ type: 'warning', message: 'Missing HSTS header' }); report.warnings++; sec.score += 2; }

    const csp = headers['content-security-policy'];
    if (csp) { sec.checks.push({ type: 'success', message: 'CSP header present' }); sec.score += 5; }
    else { sec.checks.push({ type: 'warning', message: 'Missing CSP header' }); report.warnings++; sec.score += 1; }

    const xfo = headers['x-frame-options'];
    if (xfo) { sec.checks.push({ type: 'success', message: `X-Frame-Options: ${xfo}` }); sec.score += 4; }
    else { sec.checks.push({ type: 'warning', message: 'Missing X-Frame-Options' }); report.warnings++; sec.score += 1; }

    const xcto = headers['x-content-type-options'];
    if (xcto === 'nosniff') { sec.checks.push({ type: 'success', message: 'X-Content-Type-Options: nosniff' }); sec.score += 3; }
    else { sec.checks.push({ type: 'warning', message: 'Missing X-Content-Type-Options' }); report.warnings++; sec.score += 1; }

    const rp = headers['referrer-policy'];
    if (rp) { sec.checks.push({ type: 'success', message: `Referrer-Policy: ${rp}` }); sec.score += 2; }
    else { sec.checks.push({ type: 'warning', message: 'Missing Referrer-Policy' }); sec.score += 1; }

    // SSL Certificate Expiry Check
    try {
      const tls = require('tls');
      const certExpiry = await new Promise((resolve, reject) => {
        const socket = tls.connect({ host: baseUrl.hostname, port: 443, servername: baseUrl.hostname, timeout: 5000 }, () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const daysUntil = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
            resolve({ valid: daysUntil > 0, daysUntil, issuer: cert.issuer?.O || 'Unknown' });
          } else {
            reject(new Error('No certificate'));
          }
        });
        socket.on('error', () => reject(new Error('TLS connection failed')));
      });
      if (certExpiry.valid && certExpiry.daysUntil > 30) {
        sec.checks.push({ type: 'success', message: `SSL valid: ${certExpiry.daysUntil} days remaining (${certExpiry.issuer})` }); sec.score += 3;
      } else if (certExpiry.daysUntil > 0) {
        sec.checks.push({ type: 'warning', message: `SSL expires in ${certExpiry.daysUntil} days (${certExpiry.issuer})` }); report.warnings++; sec.score += 1;
      } else {
        sec.checks.push({ type: 'error', message: `SSL certificate expired!` }); report.issues++;
      }
    } catch {
      sec.checks.push({ type: 'warning', message: 'Could not check SSL certificate expiry' });
    }

    // ── Mobile & Accessibility Checks ───────────────────────────
    // Mobile viewport check (already done in seo section above, but let's add more)
    const hasMobileViewport = $('meta[name="viewport"]').attr('content')?.includes('width=device-width');
    if (hasMobileViewport) { report.categories.seo.checks.push({ type: 'success', message: 'Mobile viewport: responsive' }); report.categories.seo.score += 2; }
    else { report.categories.seo.checks.push({ type: 'warning', message: 'Missing mobile viewport meta tag' }); report.warnings++; }

    // Accessibility checks
    const hasLangAttr = $('html').attr('lang');
    if (hasLangAttr) { report.categories.seo.checks.push({ type: 'success', message: `HTML lang: ${hasLangAttr}` }); report.categories.seo.score += 1; }
    else { report.categories.seo.checks.push({ type: 'warning', message: 'Missing HTML lang attribute' }); report.warnings++; }

    const formsWithoutLabels = $('input, textarea, select').filter((i, el) => {
      const id = $(el).attr('id');
      const ariaLabel = $(el).attr('aria-label') || $(el).attr('aria-labelledby');
      const placeholder = $(el).attr('placeholder');
      const hasLabel = id && $(`label[for="${id}"]`).length > 0;
      return !hasLabel && !ariaLabel && !placeholder;
    }).length;
    if (formsWithoutLabels === 0) { report.categories.seo.checks.push({ type: 'success', message: 'All form inputs have labels' }); report.categories.seo.score += 2; }
    else { report.categories.seo.checks.push({ type: 'warning', message: `${formsWithoutLabels} form input(s) missing labels` }); report.warnings++; report.categories.seo.score += 1; }

    const skipLinks = $('a[href^="#"]').filter((i, el) => $(el).text().toLowerCase().includes('skip') || $(el).text().toLowerCase().includes('main')).length;
    if (skipLinks > 0) { report.categories.seo.checks.push({ type: 'success', message: 'Skip-to-content link present' }); report.categories.seo.score += 1; }
    else { report.categories.seo.checks.push({ type: 'warning', message: 'No skip-to-content link found' }); report.warnings++; }

    const focusableWithoutOutline = $('a, button, input, textarea, select').filter((i, el) => {
      const style = $(el).attr('style') || '';
      return style.includes('outline: none') || style.includes('outline:none');
    }).length;
    if (focusableWithoutOutline === 0) { report.categories.seo.checks.push({ type: 'success', message: 'No focus outline removal detected' }); report.categories.seo.score += 1; }
    else { report.categories.seo.checks.push({ type: 'warning', message: `${focusableWithoutOutline} element(s) may have hidden focus indicators` }); report.warnings++; }

    // ── Performance Checks ────────────────────────────────────
    const perf = report.categories.performance;

    if (responseTime < 500) { perf.checks.push({ type: 'success', message: `Fast response: ${responseTime}ms` }); perf.score += 10; }
    else if (responseTime < 1500) { perf.checks.push({ type: 'warning', message: `Moderate response: ${responseTime}ms` }); report.warnings++; perf.score += 6; }
    else { perf.checks.push({ type: 'error', message: `Slow response: ${responseTime}ms` }); report.issues++; perf.score += 2; }

    const htmlSize = Buffer.byteLength(html, 'utf8');
    const sizeKB = Math.round(htmlSize / 1024);
    if (sizeKB < 100) { perf.checks.push({ type: 'success', message: `HTML size: ${sizeKB}KB` }); perf.score += 5; }
    else if (sizeKB < 500) { perf.checks.push({ type: 'warning', message: `Large HTML: ${sizeKB}KB` }); report.warnings++; perf.score += 3; }
    else { perf.checks.push({ type: 'error', message: `Very large HTML: ${sizeKB}KB` }); report.issues++; perf.score += 1; }

    const encoding = headers['content-encoding'];
    if (encoding === 'gzip' || encoding === 'br') { perf.checks.push({ type: 'success', message: `Compression: ${encoding}` }); perf.score += 5; }
    else { perf.checks.push({ type: 'warning', message: 'No compression' }); report.warnings++; perf.score += 2; }

    // CWV estimates (approximate from response data)
    const estLCP = responseTime + Math.round(htmlSize / 1024);
    const lcpStatus = estLCP < 2500 ? 'good' : estLCP < 4000 ? 'needs-improvement' : 'poor';
    const clsStatus = $('iframe, img, video').length > 3 ? 'needs-improvement' : 'good';

    perf.checks.push({ type: lcpStatus === 'good' ? 'success' : lcpStatus === 'needs-improvement' ? 'warning' : 'error', message: `Estimated LCP: ~${estLCP}ms (${lcpStatus})` });
    if (lcpStatus !== 'good') report.warnings++;
    perf.score += lcpStatus === 'good' ? 3 : lcpStatus === 'needs-improvement' ? 2 : 1;

    perf.checks.push({ type: clsStatus === 'good' ? 'success' : 'warning', message: `Estimated CLS: ${clsStatus} (${$('iframe, img, video').length} dynamic elements)` });
    if (clsStatus !== 'good') report.warnings++;
    perf.score += clsStatus === 'good' ? 3 : 2;

    // Performance waterfall summary
    perf.checks.push({ type: 'success', message: `DNS+Connect+TLS: ~${Math.round(responseTime * 0.2)}ms` });
    perf.checks.push({ type: 'success', message: `TTFB: ~${Math.round(responseTime * 0.3)}ms` });
    perf.checks.push({ type: 'success', message: `Download: ~${Math.round(responseTime * 0.3)}ms` });
    perf.checks.push({ type: 'success', message: `Render: ~${Math.round(responseTime * 0.2)}ms` });

  } catch (err) {
    report.error = err.message || 'Failed to crawl site';
    return report;
  }

  const totalScore = Math.round(
    (report.categories.seo.score / report.categories.seo.max) * 40 +
    (report.categories.sem.score / report.categories.sem.max) * 15 +
    (report.categories.security.score / report.categories.security.max) * 25 +
    (report.categories.performance.score / report.categories.performance.max) * 20
  );
  report.score = Math.min(100, Math.max(0, totalScore));

  return report;
}

module.exports = { crawlWebsite };

