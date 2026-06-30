import { Router } from 'express'
import { db, rowToListing, type ListingRow } from '../db.js'
import { sellerRequired } from '../middleware/auth.js'

const router = Router()

router.use(sellerRequired)

router.get('/dashboard', (req, res) => {
  const sellerId = req.userRow!.id

  const stats = db.prepare(
    `SELECT
      COUNT(*) as totalListings,
      COALESCE(SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END), 0) as activeListings,
      COALESCE(SUM(views), 0) as totalViews,
      COALESCE(SUM(sold), 0) as totalSold
     FROM listings WHERE seller_id = ?`,
  ).get(sellerId) as { totalListings: number; activeListings: number; totalViews: number; totalSold: number }

  const recentOrders = db.prepare(
    `SELECT o.id, o.created_at, o.status, oi.title, oi.quantity, oi.unit_price, oi.seller_payout, oi.id as item_id
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.seller_id = ?
     ORDER BY o.created_at DESC LIMIT 10`,
  ).all(sellerId)

  const revenue = db.prepare(
    `SELECT
      COALESCE(SUM(oi.seller_payout), 0) as netPayout,
      COALESCE(SUM(oi.unit_price * oi.quantity), 0) as grossRevenue,
      COALESCE(SUM(oi.platform_fee), 0) as platformFeesPaid
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.seller_id = ? AND o.status = 'paid'`,
  ).get(sellerId) as { netPayout: number; grossRevenue: number; platformFeesPaid: number }

  const user = req.userRow!
  res.json({
    stats: {
      ...stats,
      revenue: revenue.netPayout || revenue.grossRevenue,
      grossRevenue: revenue.grossRevenue,
      platformFeesPaid: revenue.platformFeesPaid,
    },
    verified: (user.verified ?? 0) === 1,
    stripeOnboarded: (user.stripe_onboarded ?? 0) === 1,
    recentOrders,
  })
})

router.get('/listings', (req, res) => {
  const rows = db.prepare('SELECT * FROM listings WHERE seller_id = ? ORDER BY listed_at DESC').all(
    req.userRow!.id,
  ) as ListingRow[]
  const listings = rows.map((row) => rowToListing(row, req.userRow!))
  res.json({ listings })
})

router.get('/orders', (req, res) => {
  const orders = db.prepare(
    `SELECT o.id, o.created_at, o.status, o.shipping_name, o.shipping_city, o.shipping_state,
            oi.id as item_id, oi.title, oi.quantity, oi.unit_price, oi.shipping_cost
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.seller_id = ?
     ORDER BY o.created_at DESC`,
  ).all(req.userRow!.id)

  res.json({ orders })
})

export default router
