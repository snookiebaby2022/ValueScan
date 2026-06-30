import { Router } from 'express'
import { VALUESCAN } from '../config/valuescan.js'

const router = Router()

router.get('/robots.txt', (_req, res) => {
  const base = VALUESCAN.url.replace(/\/$/, '')
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /login
Disallow: /register
Disallow: /report/

Sitemap: ${base}/sitemap.xml
`)
})

router.get('/sitemap.xml', (_req, res) => {
  const base = VALUESCAN.url.replace(/\/$/, '')
  const today = new Date().toISOString().slice(0, 10)
  const pages = ['/', '/pricing', '/grow', '/login', '/how-it-works', '/privacy', '/terms', '/docs']

  const urls = pages.map(
    (p) => `  <url>
    <loc>${base}${p === '/' ? '/' : p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
  )

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`)
})

export default router
