import { Router } from 'express'
import { db, getListingWithSeller, type ListingRow } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { computeOrderTotals, type CartLine } from '../lib/order-service.js'
import { getFeeSettings } from '../config/fees.js'

const router = Router()

router.use(authRequired)

router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT c.listing_id, c.quantity, l.stock
     FROM cart_items c JOIN listings l ON c.listing_id = l.id
     WHERE c.user_id = ?`,
  ).all(req.user!.userId) as { listing_id: string; quantity: number; stock: number }[]

  const items: Array<{ listing: ReturnType<typeof getListingWithSeller>; quantity: number }> = []
  const cartLines: CartLine[] = []

  for (const row of rows) {
    const listing = getListingWithSeller(row.listing_id)
    if (!listing || listing.stock < 1) continue
    const qty = Math.min(row.quantity, listing.stock)
    items.push({ listing, quantity: qty })
    const lr = db.prepare('SELECT * FROM listings WHERE id = ?').get(row.listing_id) as ListingRow
    cartLines.push({ ...lr, listing_id: row.listing_id, quantity: qty })
  }

  const totals = cartLines.length ? computeOrderTotals(cartLines) : null

  res.json({
    items,
    subtotal: totals?.subtotal ?? 0,
    shippingTotal: totals?.shippingTotal ?? 0,
    platformFee: totals?.platformFee ?? 0,
    buyerProtectionFee: totals?.buyerProtectionFee ?? 0,
    vatAmount: totals?.vatAmount ?? 0,
    total: totals?.total ?? 0,
    fees: getFeeSettings(),
  })
})

router.post('/', (req, res) => {
  const { listingId, quantity = 1 } = req.body as { listingId?: string; quantity?: number }
  if (!listingId) {
    res.status(400).json({ error: 'listingId is required' })
    return
  }

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as ListingRow | undefined
  if (!listing || listing.stock < 1) {
    res.status(404).json({ error: 'Listing unavailable' })
    return
  }

  const qty = Math.max(1, Math.min(Number(quantity), listing.stock))
  const existing = db.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND listing_id = ?').get(
    req.user!.userId,
    listingId,
  ) as { quantity: number } | undefined

  if (existing) {
    const newQty = Math.min(existing.quantity + qty, listing.stock)
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND listing_id = ?').run(
      newQty, req.user!.userId, listingId,
    )
  } else {
    db.prepare('INSERT INTO cart_items (user_id, listing_id, quantity) VALUES (?, ?, ?)').run(
      req.user!.userId, listingId, qty,
    )
  }

  res.status(201).json({ ok: true })
})

router.patch('/:listingId', (req, res) => {
  const { quantity } = req.body as { quantity?: number }
  if (!quantity || quantity < 1) {
    res.status(400).json({ error: 'Valid quantity required' })
    return
  }

  const listing = db.prepare('SELECT stock FROM listings WHERE id = ?').get(req.params.listingId) as { stock: number } | undefined
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }

  const qty = Math.min(quantity, listing.stock)
  const result = db.prepare(
    'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND listing_id = ?',
  ).run(qty, req.user!.userId, req.params.listingId)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Item not in cart' })
    return
  }
  res.json({ ok: true })
})

router.delete('/:listingId', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND listing_id = ?').run(
    req.user!.userId,
    req.params.listingId,
  )
  res.json({ ok: true })
})

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user!.userId)
  res.json({ ok: true })
})

export default router
