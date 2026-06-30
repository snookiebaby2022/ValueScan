import type { AuditFinding, AuditFixOption } from './audit-types.js'

type FixContext = {
  url: string
  origin: string
}

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function securityHeaderOptions(header: string): AuditFixOption[] {
  const snippets: Record<string, { nginx: string; apache: string; note?: string }> = {
    'strict-transport-security': {
      nginx: 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
      apache: 'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    },
    'content-security-policy': {
      nginx: "add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;\" always;",
      apache: "Header set Content-Security-Policy \"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;\"",
      note: 'Tighten directives to match only the domains your site actually uses.',
    },
    'x-frame-options': {
      nginx: 'add_header X-Frame-Options "SAMEORIGIN" always;',
      apache: 'Header always set X-Frame-Options "SAMEORIGIN"',
    },
    'x-content-type-options': {
      nginx: 'add_header X-Content-Type-Options "nosniff" always;',
      apache: 'Header always set X-Content-Type-Options "nosniff"',
    },
    'referrer-policy': {
      nginx: 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
      apache: 'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    },
    'permissions-policy': {
      nginx: 'add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;',
      apache: 'Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"',
    },
  }

  const cfg = snippets[header]
  if (!cfg) {
    return [{
      label: 'Add response header',
      steps: [`Configure your server or CDN to send the ${header} header on every HTML response.`],
    }]
  }

  const opts: AuditFixOption[] = [
    { label: 'Nginx', snippet: cfg.nginx, steps: cfg.note ? [cfg.note] : undefined },
    { label: 'Apache (.htaccess)', snippet: cfg.apache },
    {
      label: 'Cloudflare',
      steps: [
        'Go to Rules → Transform Rules → Modify Response Header.',
        `Add header ${header} with the value from your security policy.`,
        'Apply to HTML responses on your zone.',
      ],
    },
  ]
  return opts
}

function metaTagOptions(ctx: FixContext, finding: AuditFinding): AuditFixOption[] {
  const key = titleKey(finding.title)

  if (key === 'missing-page-title' || key === 'title-too-short' || key === 'title-too-long') {
    return [
      {
        label: 'HTML <title>',
        snippet: `<title>Your primary keyword — Brand name</title>`,
        steps: ['Keep between 30–60 characters.', 'Put the main keyword near the start.', 'Make each page title unique.'],
      },
      {
        label: 'WordPress',
        steps: ['Edit the page in the block editor.', 'Set the SEO title in Yoast, Rank Math, or the document sidebar.', 'Save and clear any page cache.'],
      },
    ]
  }

  if (key.includes('meta-description')) {
    return [
      {
        label: 'HTML meta tag',
        snippet: `<meta name="description" content="A compelling summary of this page in 120–160 characters with your main keyword.">`,
        steps: ['Write one unique description per page.', 'Aim for 120–160 characters.'],
      },
      {
        label: 'CMS SEO plugin',
        steps: ['Open your SEO plugin (Yoast, Rank Math, etc.).', 'Fill in the meta description field for this URL.', 'Re-scan after publishing.'],
      },
    ]
  }

  if (key === 'missing-viewport-meta') {
    return [{
      label: 'Add viewport meta',
      snippet: `<meta name="viewport" content="width=device-width, initial-scale=1">`,
      steps: ['Place inside <head> on every page.', 'Required for mobile-friendly ranking.'],
    }]
  }

  if (key === 'missing-h1') {
    return [{
      label: 'Page content',
      snippet: `<h1>Clear page topic matching the title</h1>`,
      steps: ['Use exactly one H1 per page.', 'Describe what the page is about in plain language.'],
    }]
  }

  if (key === 'missing-canonical-url') {
    return [{
      label: 'Canonical link tag',
      snippet: `<link rel="canonical" href="${ctx.url}">`,
      steps: ['Add to <head> on this page.', 'Use the preferred URL (HTTPS, no tracking params).'],
    }]
  }

  if (key === 'missing-lang-attribute') {
    return [{
      label: 'HTML lang attribute',
      snippet: `<html lang="en">`,
      steps: ['Set to your primary language/locale (e.g. en-GB, en-US).'],
    }]
  }

  if (key.includes('open-graph') || key === 'incomplete-open-graph') {
    const imageUrl = finding.value?.startsWith('http') ? finding.value : `${ctx.origin}/images/og-preview.jpg`
    return [
      {
        label: 'Core OG tags',
        snippet: `<meta property="og:title" content="Page title" />\n<meta property="og:description" content="Short summary for social shares." />\n<meta property="og:image" content="${imageUrl}" />\n<meta property="og:url" content="${ctx.url}" />`,
        steps: ['Use absolute HTTPS URLs.', 'OG image should be at least 1200×630px.'],
      },
      {
        label: 'WordPress',
        steps: ['Set social image in Yoast/Rank Math → Social tab.', 'Or upload a featured image used as OG fallback.', 'Clear cache plugins after saving.'],
      },
    ]
  }

  if (key === 'og-image-broken' || key === 'og-image-unreachable') {
    const current = finding.value ?? `${ctx.origin}/images/og-preview.jpg`
    return [
      {
        label: 'Fix the image URL',
        snippet: `<meta property="og:image" content="${current.startsWith('http') ? current.replace(/\/[^/]*$/, '/og-preview.jpg') : `${ctx.origin}/og-preview.jpg`}" />`,
        steps: [
          'Upload a JPG or PNG (1200×630px recommended) to your server or CDN.',
          'Update og:image to the new absolute URL.',
          'Open the image URL in a browser — it must return HTTP 200, not 404.',
        ],
      },
      {
        label: 'Quick checklist',
        steps: [
          'URL must be HTTPS and publicly accessible (no login wall).',
          'Avoid query strings that expire or redirect loops.',
          'Re-scan after updating meta tags and clearing cache.',
        ],
      },
    ]
  }

  if (key === 'missing-twitter-card') {
    return [{
      label: 'Twitter / X Card tags',
      snippet: `<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="Page title" />\n<meta name="twitter:description" content="Short summary." />\n<meta name="twitter:image" content="${ctx.origin}/images/og-preview.jpg" />`,
    }]
  }

  if (key === 'missing-favicon') {
    return [{
      label: 'Favicon link',
      snippet: `<link rel="icon" href="${ctx.origin}/favicon.ico" sizes="any">`,
      steps: ['Place favicon.ico at site root or update the href path.', 'Optional: add PNG/SVG icons for modern browsers.'],
    }]
  }

  if (key === 'no-cookie-banner') {
    return [
      {
        label: 'Cookie consent tool',
        steps: [
          'Install a GDPR/UK PECR compliant banner (Cookiebot, OneTrust, Osano, etc.).',
          'Block non-essential cookies until the user accepts.',
          'Link to your cookie/privacy policy.',
        ],
      },
      {
        label: 'Google Tag Manager',
        steps: [
          'Load analytics/marketing tags only after consent via GTM consent mode.',
          'Document cookies in your privacy policy.',
        ],
      },
    ]
  }

  return []
}

function semAndTechnicalOptions(finding: AuditFinding): AuditFixOption[] {
  const key = titleKey(finding.title)

  if (key === 'no-analytics-tracking') {
    return [
      {
        label: 'Google Tag Manager (recommended)',
        snippet: `<!-- GTM head -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>`,
        steps: ['Create a GTM container at tagmanager.google.com.', 'Replace GTM-XXXXXXX with your container ID.', 'Add GA4 Configuration tag inside GTM.'],
      },
      {
        label: 'GA4 directly',
        snippet: `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXXXXX');\n</script>`,
      },
    ]
  }

  if (key === 'weak-conversion-elements') {
    return [
      {
        label: 'Above-the-fold CTA',
        steps: [
          'Add one primary button (e.g. “Get started”, “Book a demo”) above the fold.',
          'Use contrasting colour and action-oriented copy.',
          'Match the CTA to your ad campaign message.',
        ],
      },
      {
        label: 'Lead capture form',
        snippet: `<form action="/contact" method="post">\n  <label>Email <input type="email" name="email" required></label>\n  <button type="submit">Get my free guide</button>\n</form>`,
      },
    ]
  }

  if (key === 'no-compression') {
    return [
      {
        label: 'Nginx',
        snippet: `gzip on;\ngzip_types text/plain text/css application/json application/javascript text/xml application/xml;\nbrotli on;`,
      },
      {
        label: 'Cloudflare',
        steps: ['Speed → Optimization → enable Brotli.', 'Auto Minify HTML/CSS/JS if safe for your site.'],
      },
    ]
  }

  if (key.includes('response-time') || key === 'slow-ttfb') {
    return [
      {
        label: 'Caching',
        steps: [
          'Enable full-page or edge caching (Cloudflare, Varnish, WP Rocket).',
          'Cache static assets with long max-age headers.',
          'Use a CDN close to your audience.',
        ],
      },
      {
        label: 'Server / hosting',
        steps: [
          'Upgrade PHP/opcache or Node memory if on shared hosting.',
          'Reduce database queries on the homepage.',
          'Target TTFB under 800ms.',
        ],
      },
    ]
  }

  if (key === 'render-blocking-scripts') {
    return [{
      label: 'Defer non-critical scripts',
      snippet: `<script src="/app.js" defer></script>`,
      steps: ['Add defer to scripts that do not need to run before render.', 'Use async for independent third-party widgets.', 'Move non-critical JS to the page footer.'],
    }]
  }

  if (key === 'not-using-https') {
    return [
      {
        label: 'Let\'s Encrypt + redirect',
        snippet: `# Nginx — redirect HTTP to HTTPS\nserver {\n  listen 80;\n  server_name example.com;\n  return 301 https://$host$request_uri;\n}`,
        steps: ['Install a free TLS certificate (Let\'s Encrypt, Cloudflare).', 'Force HTTPS on all pages.', 'Update internal links to https://.'],
      },
    ]
  }

  if (key === 'mixed-content') {
    return [{
      label: 'Upgrade resource URLs',
      steps: [
        'Find http:// links in HTML, CSS, and JS.',
        'Change to https:// or protocol-relative URLs where supported.',
        'Use your CDN or CMS “replace URL” tools for bulk fixes.',
      ],
    }]
  }

  return []
}

function defaultFixOptions(finding: AuditFinding): AuditFixOption[] {
  const opts: AuditFixOption[] = []

  if (finding.recommendation) {
    opts.push({
      label: 'Recommended action',
      steps: [finding.recommendation],
    })
  }

  if (finding.fixSnippet) {
    opts.push({
      label: 'Copy-ready snippet',
      snippet: finding.fixSnippet,
    })
  }

  if (opts.length === 0) {
    opts.push({
      label: 'Next steps',
      steps: [
        'Share this finding with your developer or hosting provider.',
        'Apply the fix and re-scan this URL to confirm it is resolved.',
      ],
    })
  } else {
    opts.push({
      label: 'Verify the fix',
      steps: ['Save your changes and clear any CDN or page cache.', 'Run a new scan on this URL to confirm the issue is gone.'],
    })
  }

  return opts
}

export function buildFixOptions(finding: AuditFinding, ctx: FixContext): AuditFixOption[] {
  if (finding.status !== 'warn' && finding.status !== 'fail') return []

  const missingHeader = finding.title.match(/^Missing ([a-z0-9-]+)$/i)
  if (missingHeader && finding.category === 'security') {
    return securityHeaderOptions(missingHeader[1].toLowerCase())
  }

  const fromMeta = metaTagOptions(ctx, finding)
  if (fromMeta.length) return fromMeta

  const fromSemTech = semAndTechnicalOptions(finding)
  if (fromSemTech.length) return fromSemTech

  const key = titleKey(finding.title)
  const playbook: Record<string, AuditFixOption[]> = {
    'page-blocked-from-indexing': [{
      label: 'Allow indexing',
      steps: [
        'Remove noindex from the robots meta tag or X-Robots-Tag header.',
        'In WordPress: Settings → Reading → ensure “Discourage search engines” is unchecked.',
        'Check Search Console for manual actions or removals.',
      ],
    }],
    'robots-txt-blocks-all': [{
      label: 'Fix robots.txt',
      snippet: `User-agent: *\nAllow: /\nSitemap: ${ctx.origin}/sitemap.xml`,
      steps: ['Remove Disallow: / unless you intentionally block all crawlers.'],
    }],
    'missing-sitemap-xml': [{
      label: 'Create sitemap.xml',
      steps: [
        `Generate at ${ctx.origin}/sitemap.xml (Yoast, Rank Math, or sitemap generator).`,
        'Submit the sitemap in Google Search Console.',
      ],
    }],
    'images-missing-alt-text': [{
      label: 'Add alt attributes',
      snippet: `<img src="/photo.jpg" alt="Describe what the image shows">`,
      steps: ['Use alt="" only for decorative images.', 'Describe informative images in plain language.'],
    }],
    'cookie-security-flags': [{
      label: 'Secure cookie flags',
      snippet: `Set-Cookie: session=...; Secure; HttpOnly; SameSite=Lax`,
    }],
  }

  if (playbook[key]?.length) return playbook[key]

  return defaultFixOptions(finding)
}

export function enrichFindingsWithFixOptions(findings: AuditFinding[], ctx: FixContext): AuditFinding[] {
  return findings.map((f) => {
    const fixOptions = buildFixOptions(f, ctx)
    if (!fixOptions.length) return f
    return { ...f, fixOptions }
  })
}
