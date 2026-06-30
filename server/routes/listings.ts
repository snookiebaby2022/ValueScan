import { Router } from 'express'
import { db, getListingWithSeller, rowToListing, type ListingRow } from '../db.js'
import { sellerRequired } from '../middleware/auth.js'

const router = Router()

router.get('/', (req, res) => {
  const {
    q,
    category,
    subcategory,
    minPrice,
    maxPrice,
    freeShipping,
    featured,
    sort = 'newest',
  } = req.query as Record<string, string | undefined>

  let sql = 'SELECT l.* FROM listings l JOIN users u ON l.seller_id = u.id WHERE l.stock > 0 AND u.verified = 1'
  const params: unknown[] = []

  if (q) {
    sql += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.tags LIKE ? OR u.name LIKE ?)'
    const term = `%${q}%`
    params.push(term, term, term, term)
  }
  if (category) {
    sql += ' AND l.category = ?'
    params.push(category)
  }
  if (subcategory) {
    sql += ' AND l.subcategory = ?'
    params.push(subcategory)
  }
  if (minPrice) {
    sql += ' AND l.price >= ?'
    params.push(Number(minPrice))
  }
  if (maxPrice) {
    sql += ' AND l.price <= ?'
    params.push(Number(maxPrice))
  }
  if (freeShipping === 'true') {
    sql += ' AND l.shipping_free = 1'
  }
  if (featured === 'true') {
    sql += ' AND l.featured = 1'
  }

  switch (sort) {
    case 'price-asc':
      sql += ' ORDER BY l.price ASC'
      break
    case 'price-desc':
      sql += ' ORDER BY l.price DESC'
      break
    case 'popular':
      sql += ' ORDER BY l.views DESC'
      break
    case 'rating':
      sql += ' ORDER BY u.rating DESC'
      break
    default:
      sql += ' ORDER BY l.featured DESC, l.listed_at DESC'
  }

  const rows = db.prepare(sql).all(...params) as ListingRow[]
  const listings = rows.map((row) => {
    const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(row.seller_id) as UserRow
    return rowToListing(row, seller)
  })

  res.json({ listings })
})

router.get('/featured', (_req, res) => {
  const rows = db.prepare(
    `SELECT l.* FROM listings l JOIN users u ON l.seller_id = u.id
     WHERE l.featured = 1 AND l.stock > 0 AND u.verified = 1
     ORDER BY l.views DESC, l.sold DESC, l.listed_at DESC LIMIT 12`,
  ).all() as ListingRow[]
  const listings = rows.map((row) => {
    const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(row.seller_id) as UserRow
    return rowToListing(row, seller)
  })
  res.json({ listings })
})

router.get('/:id', (req, res) => {
  const listing = getListingWithSeller(req.params.id)
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }
  db.prepare('UPDATE listings SET views = views + 1 WHERE id = ?').run(req.params.id)
  listing.views += 1
  res.json({ listing })
})

router.post('/', sellerRequired, (req, res) => {
  if ((req.userRow!.verified ?? 0) !== 1 && req.userRow!.role !== 'admin') {
    res.status(403).json({ error: 'Verified seller account required — complete verification in Seller Hub' })
    return
  }
  const body = req.body as Record<string, unknown>
  const required = ['title', 'description', 'price', 'category', 'subcategory', 'condition', 'image']
  for (const field of required) {
    if (!body[field]) {
      res.status(400).json({ error: `${field} is required` })
      return
    }
  }

  const id = `lst-${crypto.randomUUID().slice(0, 8)}`
  const images = Array.isArray(body.images) ? body.images : [body.image as string]
  const tags = Array.isArray(body.tags) ? body.tags : []
  const listingKind = String(body.listingKind ?? 'physical')
  const saleFormat = String(body.saleFormat ?? 'fixed')
  const isDigital = listingKind === 'digital'
  const shippingFree = isDigital || Boolean(body.shippingFree)
  const shippingCost = isDigital ? 0 : (shippingFree ? 0 : Number(body.shippingCost ?? 0))

  db.prepare(
    `INSERT INTO listings (id, seller_id, title, description, price, original_price, currency, category, subcategory, condition,
      image, images, shipping_cost, shipping_free, shipping_days, tags, featured, stock, listed_at, views, sold,
      listing_kind, sale_format, accepts_offers, auction_ends_at, starting_bid, current_bid, bid_increment, digital_delivery)
     VALUES (?, ?, ?, ?, ?, ?, 'GBP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.userRow!.id,
    String(body.title),
    String(body.description),
    Number(body.price),
    body.originalPrice ? Number(body.originalPrice) : null,
    String(body.category),
    String(body.subcategory),
    String(body.condition),
    String(body.image),
    JSON.stringify(images),
    shippingCost,
    shippingFree ? 1 : 0,
    isDigital ? 'Instant delivery' : String(body.shippingDays ?? '3–5 working days'),
    JSON.stringify(tags),
    body.featured ? 1 : 0,
    Number(body.stock ?? 1),
    new Date().toISOString().slice(0, 10),
    listingKind,
    saleFormat,
    body.acceptsOffers ? 1 : 0,
    body.auctionEndsAt ?? null,
    body.startingBid ? Number(body.startingBid) : null,
    body.startingBid ? Number(body.startingBid) : null,
    Number(body.bidIncrement ?? 1),
    body.digitalDelivery ? String(body.digitalDelivery) : null,
  )

  const listing = getListingWithSeller(id)
  res.status(201).json({ listing })
})

router.put('/:id', sellerRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as ListingRow | undefined
  if (!existing) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }
  if (existing.seller_id !== req.userRow!.id && req.userRow!.role !== 'admin') {
    res.status(403).json({ error: 'Not your listing' })
    return
  }

  const body = req.body as Record<string, unknown>
  const images = body.images ? JSON.stringify(body.images) : existing.images
  const tags = body.tags ? JSON.stringify(body.tags) : existing.tags
  const kind = body.listingKind ?? existing.listing_kind ?? 'physical'
  const isDigital = kind === 'digital'
  const shippingFree = body.shippingFree !== undefined ? (body.shippingFree ? 1 : 0) : existing.shipping_free

  db.prepare(
    `UPDATE listings SET title = ?, description = ?, price = ?, original_price = ?, category = ?, subcategory = ?,
      condition = ?, image = ?, images = ?, shipping_cost = ?, shipping_free = ?, shipping_days = ?, tags = ?,
      featured = ?, stock = ?, listing_kind = ?, sale_format = ?, accepts_offers = ?, digital_delivery = ? WHERE id = ?`,
  ).run(
    body.title ?? existing.title,
    body.description ?? existing.description,
    body.price ?? existing.price,
    body.originalPrice !== undefined ? Number(body.originalPrice) : existing.original_price,
    body.category ?? existing.category,
    body.subcategory ?? existing.subcategory,
    body.condition ?? existing.condition,
    body.image ?? existing.image,
    images,
    isDigital ? 0 : (body.shippingCost ?? existing.shipping_cost),
    isDigital ? 1 : shippingFree,
    isDigital ? 'Instant delivery' : (body.shippingDays ?? existing.shipping_days),
    tags,
    body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured,
    body.stock ?? existing.stock,
    kind,
    body.saleFormat ?? existing.sale_format ?? 'fixed',
    body.acceptsOffers !== undefined ? (body.acceptsOffers ? 1 : 0) : existing.accepts_offers,
    body.digitalDelivery ?? existing.digital_delivery,
    req.params.id,
  )

  res.json({ listing: getListingWithSeller(req.params.id) })
})

router.delete('/:id', sellerRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as ListingRow | undefined
  if (!existing) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }
  if (existing.seller_id !== req.userRow!.id && req.userRow!.role !== 'admin') {
    res.status(403).json({ error: 'Not your listing' })
    return
  }
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
