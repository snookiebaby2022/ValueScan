import { Router } from 'express'
import { db } from '../db.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

router.use(authRequired)

router.get('/listing/:listingId', (req, res) => {
  const offers = db.prepare(
    `SELECT o.*, u.name as buyer_name FROM offers o JOIN users u ON o.buyer_id = u.id
     WHERE o.listing_id = ? ORDER BY o.created_at DESC`,
  ).all(req.params.listingId)
  res.json({ offers })
})

router.get('/mine', (req, res) => {
  const offers = db.prepare(
    `SELECT o.*, l.title as listing_title FROM offers o JOIN listings l ON o.listing_id = l.id
     WHERE o.buyer_id = ? ORDER BY o.created_at DESC`,
  ).all(req.user!.userId)
  res.json({ offers })
})

router.post('/', (req, res) => {
  const { listingId, amount, message } = req.body as { listingId?: string; amount?: number; message?: string }
  if (!listingId || !amount || amount <= 0) {
    res.status(400).json({ error: 'Listing and valid amount required' })
    return
  }

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as {
    seller_id: string
    price: number
    accepts_offers: number
    sale_format: string
  } | undefined

  if (!listing) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }
  if (listing.seller_id === req.user!.userId) {
    res.status(400).json({ error: 'You cannot offer on your own listing' })
    return
  }
  if (!listing.accepts_offers && listing.sale_format !== 'negotiable') {
    res.status(400).json({ error: 'This listing does not accept price suggestions' })
    return
  }
  if (amount >= listing.price) {
    res.status(400).json({ error: 'Offer must be below the listed price — add to basket instead' })
    return
  }

  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO offers (id, listing_id, buyer_id, amount, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, listingId, req.user!.userId, amount, message?.trim() ?? null, new Date().toISOString())

  res.status(201).json({ ok: true, offerId: id })
})

router.patch('/:id/respond', (req, res) => {
  const { status } = req.body as { status?: 'accepted' | 'declined' }
  if (!status || !['accepted', 'declined'].includes(status)) {
    res.status(400).json({ error: 'Status must be accepted or declined' })
    return
  }

  const offer = db.prepare(
    `SELECT o.*, l.seller_id FROM offers o JOIN listings l ON o.listing_id = l.id WHERE o.id = ?`,
  ).get(req.params.id) as { seller_id: string; status: string } | undefined

  if (!offer) {
    res.status(404).json({ error: 'Offer not found' })
    return
  }
  if (offer.seller_id !== req.user!.userId) {
    res.status(403).json({ error: 'Not your listing' })
    return
  }

  db.prepare('UPDATE offers SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ ok: true })
})

export default router
