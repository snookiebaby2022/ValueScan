import { Router } from 'express'
import { db, getListingWithSeller } from '../db.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

router.use(authRequired)

router.post('/', (req, res) => {
  const { listingId, amount } = req.body as { listingId?: string; amount?: number }
  if (!listingId || !amount || amount <= 0) {
    res.status(400).json({ error: 'Listing and valid bid amount required' })
    return
  }

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as {
    seller_id: string
    sale_format: string
    auction_ends_at: string | null
    current_bid: number | null
    starting_bid: number | null
    bid_increment: number
    price: number
  } | undefined

  if (!listing || listing.sale_format !== 'auction') {
    res.status(400).json({ error: 'This listing is not open for timed bidding' })
    return
  }
  if (listing.seller_id === req.user!.userId) {
    res.status(400).json({ error: 'You cannot bid on your own listing' })
    return
  }
  if (listing.auction_ends_at && new Date(listing.auction_ends_at) < new Date()) {
    res.status(400).json({ error: 'This timed sale has ended' })
    return
  }

  const minBid = (listing.current_bid ?? listing.starting_bid ?? listing.price) + (listing.bid_increment ?? 1)
  if (amount < minBid) {
    res.status(400).json({ error: `Minimum bid is £${minBid.toFixed(2)}` })
    return
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.transaction(() => {
    db.prepare('INSERT INTO bids (id, listing_id, bidder_id, amount, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id, listingId, req.user!.userId, amount, now,
    )
    db.prepare('UPDATE listings SET current_bid = ?, bid_count = bid_count + 1, price = ? WHERE id = ?').run(
      amount, amount, listingId,
    )
  })()

  res.status(201).json({ ok: true, listing: getListingWithSeller(listingId) })
})

router.get('/listing/:listingId', (req, res) => {
  const bids = db.prepare(
    `SELECT b.amount, b.created_at, u.name as bidder_name
     FROM bids b JOIN users u ON b.bidder_id = u.id
     WHERE b.listing_id = ? ORDER BY b.amount DESC LIMIT 20`,
  ).all(req.params.listingId)
  res.json({ bids })
})

export default router
