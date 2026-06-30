import { Router } from 'express'
import { db, rowToListing, type ListingRow, type UserRow } from '../db.js'
import { adminRequired } from '../middleware/auth.js'
import { rowToCategory, defaultCategories } from '../seed-categories.js'
import { approveSeller, rejectSeller, rowToVerification, type VerificationRow } from '../lib/verification-service.js'

const router = Router()
router.use(adminRequired)

function adminUserRow(u: UserRow) {
  const total = u.feedback_total ?? 0
  const positive = u.feedback_positive ?? 0
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    location: u.location,
    memberSince: u.member_since,
    rating: u.rating,
    reviewCount: u.review_count,
    verified: (u.verified ?? 0) === 1,
    feedbackPercent: total > 0 ? Math.round((positive / total) * 1000) / 10 : null,
    totalSales: u.total_sales ?? 0,
    sellerTier: u.seller_tier ?? 'standard',
    createdAt: u.created_at,
  }
}

router.get('/analytics', (_req, res) => {
  const summary = db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM users) as totalUsers,
      (SELECT COUNT(*) FROM users WHERE role = 'seller') as totalSellers,
      (SELECT COUNT(*) FROM users WHERE role = 'buyer') as totalBuyers,
      (SELECT COUNT(*) FROM listings) as totalListings,
      (SELECT COUNT(*) FROM listings WHERE stock > 0) as activeListings,
      (SELECT COUNT(*) FROM orders) as totalOrders,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'paid') as totalRevenue,
      (SELECT COALESCE(SUM(platform_fee), 0) FROM orders WHERE status = 'paid') as platformRevenue,
      (SELECT COUNT(DISTINCT seller_id) FROM listings WHERE stock > 0) as activeSellers,
      (SELECT COUNT(*) FROM categories) as totalCategories`,
  ).get() as Record<string, number>

  const ordersOverTime = db.prepare(
    `SELECT date(created_at) as date, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
     FROM orders
     WHERE created_at >= date('now', '-30 days')
     GROUP BY date(created_at)
     ORDER BY date ASC`,
  ).all()

  const signupsOverTime = db.prepare(
    `SELECT date(created_at) as date, COUNT(*) as count
     FROM users
     WHERE created_at >= date('now', '-30 days')
     GROUP BY date(created_at)
     ORDER BY date ASC`,
  ).all()

  const topCategories = db.prepare(
    `SELECT l.category as categoryId,
            COALESCE(c.name, l.category) as name,
            COUNT(DISTINCT oi.id) as orderCount,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
            COUNT(DISTINCT l.id) as listingCount
     FROM order_items oi
     JOIN listings l ON oi.listing_id = l.id
     LEFT JOIN categories c ON c.id = l.category
     GROUP BY l.category
     ORDER BY revenue DESC
     LIMIT 12`,
  ).all()

  const recentOrders = db.prepare(
    `SELECT o.id, o.status, o.total, o.created_at, u.name as buyer_name, u.email as buyer_email
     FROM orders o JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC LIMIT 8`,
  ).all()

  res.json({ summary, ordersOverTime, signupsOverTime, topCategories, recentOrders })
})

router.get('/users', (req, res) => {
  const role = req.query.role as string | undefined
  const q = (req.query.q as string | undefined)?.trim().toLowerCase()
  let sql = 'SELECT * FROM users WHERE 1=1'
  const params: string[] = []
  if (role && role !== 'all') {
    sql += ' AND role = ?'
    params.push(role)
  }
  if (q) {
    sql += ' AND (LOWER(email) LIKE ? OR LOWER(name) LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  sql += ' ORDER BY created_at DESC LIMIT 200'
  const rows = db.prepare(sql).all(...params) as UserRow[]
  res.json({ users: rows.map(adminUserRow) })
})

router.patch('/users/:id', (req, res) => {
  const { role, name, verified, sellerTier } = req.body as {
    role?: string
    name?: string
    verified?: boolean
    sellerTier?: string
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (user.role === 'admin' && role && role !== 'admin' && user.email === 'admin@demo.com') {
    res.status(400).json({ error: 'Cannot demote the primary admin account' })
    return
  }
  if (role && !['buyer', 'seller', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }
  db.prepare(
    `UPDATE users SET
      role = COALESCE(?, role),
      name = COALESCE(?, name),
      verified = COALESCE(?, verified),
      seller_tier = COALESCE(?, seller_tier)
     WHERE id = ?`,
  ).run(
    role ?? null,
    name?.trim() ?? null,
    verified !== undefined ? (verified ? 1 : 0) : null,
    sellerTier ?? null,
    req.params.id,
  )
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow
  res.json({ user: adminUserRow(updated) })
})

router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (user.email === 'admin@demo.com') {
    res.status(400).json({ error: 'Cannot delete the primary admin account' })
    return
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/listings', (req, res) => {
  const q = (req.query.q as string | undefined)?.trim().toLowerCase()
  let sql = `SELECT l.*, u.name as seller_name, u.email as seller_email
             FROM listings l JOIN users u ON l.seller_id = u.id WHERE 1=1`
  const params: string[] = []
  if (q) {
    sql += ' AND (LOWER(l.title) LIKE ? OR LOWER(l.id) LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  sql += ' ORDER BY l.listed_at DESC LIMIT 200'
  const rows = db.prepare(sql).all(...params) as (ListingRow & { seller_name: string; seller_email: string })[]
  const listings = rows.map((row) => {
    const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(row.seller_id) as UserRow
    return {
      ...rowToListing(row, seller),
      sellerEmail: row.seller_email,
    }
  })
  res.json({ listings })
})

router.patch('/listings/:id', (req, res) => {
  const { featured, stock, status } = req.body as { featured?: boolean; stock?: number; status?: string }
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as ListingRow | undefined
  if (!row) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }
  if (featured !== undefined) {
    db.prepare('UPDATE listings SET featured = ? WHERE id = ?').run(featured ? 1 : 0, req.params.id)
  }
  if (stock !== undefined) {
    db.prepare('UPDATE listings SET stock = ? WHERE id = ?').run(Math.max(0, stock), req.params.id)
  }
  if (status === 'removed') {
    db.prepare('UPDATE listings SET stock = 0 WHERE id = ?').run(req.params.id)
  }
  const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(row.seller_id) as UserRow
  const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as ListingRow
  res.json({ listing: rowToListing(updated, seller) })
})

router.delete('/listings/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM listings WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/categories', (_req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY custom ASC, name ASC').all()
  res.json({
    categories: rows.map((r) => rowToCategory(r as Parameters<typeof rowToCategory>[0])),
    defaultCount: defaultCategories.length,
  })
})

router.put('/categories/:id', (req, res) => {
  const { name, icon, color, kind, subcategories } = req.body as {
    name?: string
    icon?: string
    color?: string
    kind?: string
    subcategories?: string[]
  }
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Category not found' })
    return
  }
  const existing = row as { name: string; icon: string; color: string; kind: string; subcategories: string }
  db.prepare(
    `UPDATE categories SET name = ?, icon = ?, color = ?, kind = ?, subcategories = ? WHERE id = ?`,
  ).run(
    name?.trim() ?? existing.name,
    icon ?? existing.icon,
    color ?? existing.color,
    kind ?? existing.kind,
    JSON.stringify(Array.isArray(subcategories) && subcategories.length ? subcategories : JSON.parse(existing.subcategories)),
    req.params.id,
  )
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)!
  res.json({ category: rowToCategory(updated as Parameters<typeof rowToCategory>[0]) })
})

router.post('/categories', (req, res) => {
  const { name, icon = '📦', color = '#64748B', kind = 'physical', subcategories = [] } = req.body as {
    name?: string
    icon?: string
    color?: string
    kind?: string
    subcategories?: string[]
  }
  if (!name?.trim()) {
    res.status(400).json({ error: 'Category name is required' })
    return
  }
  const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
    || `cat-${crypto.randomUUID().slice(0, 6)}`
  if (db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) {
    res.status(409).json({ error: 'Category already exists' })
    return
  }
  const now = new Date().toISOString()
  const subs = Array.isArray(subcategories) && subcategories.length ? subcategories : ['General']
  db.prepare(
    `INSERT INTO categories (id, name, icon, color, kind, subcategories, custom, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(id, name.trim(), icon, color, kind, JSON.stringify(subs), req.userRow!.id, now)
  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)!
  res.status(201).json({ category: rowToCategory(created as Parameters<typeof rowToCategory>[0]) })
})

router.delete('/categories/:id', (req, res) => {
  const row = db.prepare('SELECT id, custom FROM categories WHERE id = ?').get(req.params.id) as { id: string; custom: number } | undefined
  if (!row) {
    res.status(404).json({ error: 'Category not found' })
    return
  }
  const inUse = db.prepare('SELECT COUNT(*) as c FROM listings WHERE category = ?').get(req.params.id) as { c: number }
  if (inUse.c > 0) {
    res.status(400).json({ error: `Category has ${inUse.c} listings — reassign them first` })
    return
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/orders', (req, res) => {
  const status = req.query.status as string | undefined
  let sql = `SELECT o.*, u.name as buyer_name, u.email as buyer_email
             FROM orders o JOIN users u ON o.user_id = u.id WHERE 1=1`
  const params: string[] = []
  if (status && status !== 'all') {
    sql += ' AND o.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY o.created_at DESC LIMIT 200'
  const orders = db.prepare(sql).all(...params) as Array<Record<string, unknown>>
  const enriched = orders.map((o) => {
    const items = db.prepare(
      'SELECT id, title, quantity, unit_price, shipping_cost, seller_id FROM order_items WHERE order_id = ?',
    ).all(o.id as string)
    return { ...o, items }
  })
  res.json({ orders: enriched })
})

router.patch('/orders/:id', (req, res) => {
  const { status } = req.body as { status?: string }
  const allowed = ['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(req.params.id)
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ ok: true, status })
})

router.get('/verifications', (_req, res) => {
  const rows = db.prepare(
    `SELECT v.*, u.name as user_name, u.email as user_email
     FROM seller_verifications v JOIN users u ON v.user_id = u.id
     ORDER BY CASE v.status WHEN 'pending' THEN 0 WHEN 'auto_approved' THEN 1 ELSE 2 END, v.updated_at DESC`,
  ).all() as Array<VerificationRow & { user_name: string; user_email: string }>

  res.json({
    verifications: rows.map((r) => ({
      ...rowToVerification(r),
      userName: r.user_name,
      userEmail: r.user_email,
    })),
  })
})

router.patch('/verifications/:userId', (req, res) => {
  const { action, notes } = req.body as { action?: 'approve' | 'reject'; notes?: string }
  const row = db.prepare('SELECT * FROM seller_verifications WHERE user_id = ?').get(req.params.userId) as VerificationRow | undefined
  if (!row) {
    res.status(404).json({ error: 'Verification not found' })
    return
  }
  if (action === 'approve') {
    approveSeller(req.params.userId, req.userRow!.id, 'approved', notes)
  } else if (action === 'reject') {
    if (!notes?.trim()) {
      res.status(400).json({ error: 'Rejection reason is required' })
      return
    }
    rejectSeller(req.params.userId, req.userRow!.id, notes.trim())
  } else {
    res.status(400).json({ error: 'Invalid action' })
    return
  }
  const updated = db.prepare('SELECT * FROM seller_verifications WHERE user_id = ?').get(req.params.userId) as VerificationRow
  res.json({ verification: rowToVerification(updated) })
})

export default router
