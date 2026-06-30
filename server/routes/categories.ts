import { Router } from 'express'
import { db } from '../db.js'
import { rowToCategory } from '../seed-categories.js'
import { sellerRequired } from '../middleware/auth.js'

const router = Router()

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY custom ASC, name ASC').all()
  res.json({ categories: rows.map((r) => rowToCategory(r as Parameters<typeof rowToCategory>[0])) })
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Category not found' })
    return
  }
  res.json({ category: rowToCategory(row as Parameters<typeof rowToCategory>[0]) })
})

router.post('/', sellerRequired, (req, res) => {
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

  const id = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || `cat-${crypto.randomUUID().slice(0, 6)}`

  if (db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) {
    res.status(409).json({ error: 'A category with a similar name already exists' })
    return
  }

  const subs = Array.isArray(subcategories) && subcategories.length > 0 ? subcategories : ['General']
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO categories (id, name, icon, color, kind, subcategories, custom, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(id, name.trim(), icon, color, kind, JSON.stringify(subs), req.userRow!.id, now)

  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)!
  res.status(201).json({ category: rowToCategory(row as Parameters<typeof rowToCategory>[0]) })
})

export default router
