import { Router } from 'express'
import { db } from '../db.js'
import { SITE } from '../config/site.js'

const router = Router()

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodTag}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

router.get('/sitemap.xml', (_req, res) => {
  const base = SITE.url.replace(/\/$/, '')
  const today = new Date().toISOString().slice(0, 10)
  const urls: string[] = []

  urls.push(urlEntry(`${base}/`, 'daily', '1.0', today))
  urls.push(urlEntry(`${base}/browse`, 'hourly', '0.9', today))
  urls.push(urlEntry(`${base}/browse?featured=true`, 'daily', '0.8', today))
  urls.push(urlEntry(`${base}/privacy`, 'monthly', '0.3', today))
  urls.push(urlEntry(`${base}/terms`, 'monthly', '0.3', today))

  const categories = db.prepare('SELECT id FROM categories ORDER BY name ASC').all() as { id: string }[]
  for (const cat of categories) {
    urls.push(urlEntry(`${base}/browse?category=${encodeURIComponent(cat.id)}`, 'daily', '0.7', today))
  }

  const listings = db.prepare(
    `SELECT l.id, l.listed_at FROM listings l
     JOIN users u ON l.seller_id = u.id
     WHERE l.stock > 0 AND u.verified = 1
     ORDER BY l.listed_at DESC LIMIT 5000`,
  ).all() as { id: string; listed_at: string }[]

  for (const listing of listings) {
    const lastmod = listing.listed_at?.slice(0, 10) ?? today
    urls.push(urlEntry(`${base}/listing/${listing.id}`, 'weekly', '0.6', lastmod))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  res.type('application/xml').send(xml)
})

export default router
