import { Router } from 'express'
import { db } from '../db.js'
import { adminRequired } from '../middleware/auth.js'
import {
  assignUserPlan,
  getAdminAnalytics,
  getPlanById,
  listPlans,
  listSubscriptions,
  listUsersWithoutSub,
  updatePlan,
} from '../lib/valuescan-service.js'
import { listSupportTickets, updateSupportTicket } from '../lib/support-tickets.js'

const router = Router()
router.use(adminRequired)

router.get('/analytics', (_req, res) => {
  res.json(getAdminAnalytics())
})

router.get('/plans', (_req, res) => {
  res.json({ plans: listPlans(false) })
})

router.put('/plans/:id', (req, res) => {
  try {
    const body = req.body ?? {}
    const plan = updatePlan(req.params.id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      priceGbp: typeof body.priceGbp === 'number' ? body.priceGbp : undefined,
      scansPerDay: typeof body.scansPerDay === 'number' ? body.scansPerDay : undefined,
      features: Array.isArray(body.features) ? body.features.filter((f: unknown) => typeof f === 'string') : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    })
    res.json({ plan })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' })
  }
})

router.get('/scans', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  let rows: unknown[]
  let total: number

  if (q) {
    const pattern = `%${q}%`
    total = (db.prepare(`SELECT COUNT(*) as c FROM audit_scans WHERE url LIKE ? OR final_url LIKE ?`).get(pattern, pattern) as { c: number }).c
    rows = db.prepare(`
      SELECT id, url, final_url, overall_score, created_at, client_ip, user_id, plan_slug
      FROM audit_scans
      WHERE url LIKE ? OR final_url LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(pattern, pattern, limit, offset)
  } else {
    total = (db.prepare('SELECT COUNT(*) as c FROM audit_scans').get() as { c: number }).c
    rows = db.prepare(`
      SELECT id, url, final_url, overall_score, created_at, client_ip, user_id, plan_slug
      FROM audit_scans
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset)
  }

  res.json({ scans: rows, total, limit, offset })
})

router.delete('/scans/:id', (req, res) => {
  const result = db.prepare('DELETE FROM audit_scans WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Scan not found' })
    return
  }
  res.json({ ok: true })
})

router.get('/subscriptions', (_req, res) => {
  res.json({
    subscriptions: listSubscriptions(),
    unassignedUsers: listUsersWithoutSub().map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.created_at,
    })),
  })
})

router.post('/subscriptions', (req, res) => {
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : ''

  if (!userId || !planId) {
    res.status(400).json({ error: 'userId and planId are required' })
    return
  }

  if (!getPlanById(planId)) {
    res.status(400).json({ error: 'Plan not found' })
    return
  }

  try {
    assignUserPlan(userId, planId, req.user!.userId)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Assignment failed' })
  }
})

router.patch('/subscriptions/:userId/cancel', (req, res) => {
  db.prepare(`UPDATE valuescan_subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`)
    .run(new Date().toISOString(), req.params.userId)
  res.json({ ok: true })
})

router.get('/support/tickets', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'all'
  const valid = ['all', 'open', 'in_progress', 'resolved']
  const filter = valid.includes(status) ? status as 'all' | 'open' | 'in_progress' | 'resolved' : 'all'
  res.json({ tickets: listSupportTickets(filter) })
})

router.patch('/support/tickets/:id', async (req, res) => {
  const body = req.body ?? {}
  const status = typeof body.status === 'string' ? body.status : undefined
  if (status && !['open', 'in_progress', 'resolved'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  const adminNotes = body.adminNotes === null || typeof body.adminNotes === 'string' ? body.adminNotes : undefined
  try {
    const ticket = await updateSupportTicket(req.params.id, {
      status: status as 'open' | 'in_progress' | 'resolved' | undefined,
      adminNotes,
    })
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }
    res.json({ ticket })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' })
  }
})

export default router
