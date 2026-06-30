import { Router } from 'express'
import { db, getListingWithSeller } from '../db.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

router.use(authRequired)

router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT w.listing_id, w.created_at FROM watchlist w WHERE w.user_id = ? ORDER BY w.created_at DESC`,
  ).all(req.user!.userId) as { listing_id: string }[]

  const listings = rows.map((r) => getListingWithSeller(r.listing_id)).filter(Boolean)
  res.json({ listings })
})

router.get('/ids', (req, res) => {
  const rows = db.prepare('SELECT listing_id FROM watchlist WHERE user_id = ?').all(req.user!.userId) as { listing_id: string }[]
  res.json({ ids: rows.map((r) => r.listing_id) })
})

router.post('/:listingId', (req, res) => {
  const listing = db.prepare('SELECT id FROM listings WHERE id = ?').get(req.params.listingId)
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }
  try {
    db.prepare('INSERT INTO watchlist (user_id, listing_id, created_at) VALUES (?, ?, ?)').run(
      req.user!.userId,
      req.params.listingId,
      new Date().toISOString(),
    )
  } catch {
    // already saved
  }
  res.json({ ok: true })
})

router.delete('/:listingId', (req, res) => {
  db.prepare('DELETE FROM watchlist WHERE user_id = ? AND listing_id = ?').run(
    req.user!.userId,
    req.params.listingId,
  )
  res.json({ ok: true })
})

export default router
