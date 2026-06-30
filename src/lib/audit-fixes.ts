/** Suggested fixes for common audit findings (matched by message keywords). */
export function suggestFix(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes('missing <title>') || m.includes('title too short')) {
    return 'Add a unique <title> between 10–70 characters that describes the page and includes your primary keyword.';
  }
  if (m.includes('meta description')) {
    return 'Add <meta name="description" content="..."> with 50–160 characters summarising the page for search snippets.';
  }
  if (m.includes('no h1') || m.includes('multiple h1')) {
    return 'Use exactly one <h1> per page that clearly states the main topic; use <h2> for sections below it.';
  }
  if (m.includes('alt text')) {
    return 'Add descriptive alt attributes to every <img> — e.g. alt="Blue running shoes on white background".';
  }
  if (m.includes('canonical')) {
    return 'Add <link rel="canonical" href="https://yoursite.com/page"> to prevent duplicate-content issues.';
  }
  if (m.includes('viewport')) {
    return 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile rendering.';
  }
  if (m.includes('structured data') || m.includes('json-ld')) {
    return 'Add JSON-LD schema (Organization, WebSite, or Article) in a <script type="application/ld+json"> block.';
  }
  if (m.includes('open graph')) {
    return 'Add og:title, og:description, and og:image meta tags so links preview correctly on social platforms.';
  }
  if (m.includes('google analytics')) {
    return 'Install GA4 via Google Tag Manager or add the gtag.js snippet before </head>.';
  }
  if (m.includes('meta pixel')) {
    return 'Add the Meta Pixel base code from Events Manager to track conversions from Facebook/Instagram ads.';
  }
  if (m.includes('hsts')) {
    return 'Nginx: add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always; — then reload nginx.';
  }
  if (m.includes('csp')) {
    return 'Add a Content-Security-Policy header restricting script sources to trusted domains only.';
  }
  if (m.includes('x-frame-options')) {
    return 'Add header: X-Frame-Options: SAMEORIGIN (or DENY) to prevent clickjacking.';
  }
  if (m.includes('x-content-type-options')) {
    return 'Add header: X-Content-Type-Options: nosniff to block MIME-type sniffing.';
  }
  if (m.includes('http (not secure)') || m.includes('uses http')) {
    return 'Enable HTTPS with a free Let\'s Encrypt certificate and redirect all HTTP traffic to HTTPS.';
  }
  if (m.includes('slow response') || m.includes('moderate response')) {
    return 'Optimise server response time: enable caching, use a CDN, upgrade hosting, or reduce backend processing.';
  }
  if (m.includes('compression') || m.includes('no compression')) {
    return 'Enable gzip or Brotli compression in nginx/Apache or your CDN for HTML, CSS, and JS assets.';
  }
  if (m.includes('large html') || m.includes('very large html')) {
    return 'Reduce HTML size: remove inline scripts, lazy-load below-fold content, and minify markup.';
  }
  if (m.includes('broken link')) {
    return 'Update or remove broken links; set up 301 redirects for moved pages.';
  }
  if (m.includes('duplicate')) {
    return 'Rewrite or remove duplicate paragraphs; use canonical tags where similar pages must coexist.';
  }
  if (m.includes('favicon')) {
    return 'Add <link rel="icon" href="/favicon.ico"> (or SVG) in your <head> section.';
  }
  if (m.includes('lcp') || m.includes('cls')) {
    return 'Optimise Core Web Vitals: preload hero images, set width/height on images, defer non-critical JS.';
  }
  return null;
}
