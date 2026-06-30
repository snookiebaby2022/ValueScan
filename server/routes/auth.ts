import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db, publicUser, type UserRow } from '../db.js'
import { authRequired, signToken } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req, res) => {
  const { email, password, name, role = 'buyer', location } = req.body as {
    email?: string
    password?: string
    name?: string
    role?: string
    location?: string
  }

  if (!email?.trim() || !password || !name?.trim()) {
    res.status(400).json({ error: 'Email, password, and name are required' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  const userRole = role === 'seller' ? 'seller' : 'buyer'
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim())
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const id = crypto.randomUUID()
  const year = new Date().getFullYear().toString()
  const isSeller = userRole === 'seller'
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, location, member_since, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    email.toLowerCase().trim(),
    bcrypt.hashSync(password, 10),
    name.trim(),
    userRole,
    location?.trim() ?? null,
    year,
    isSeller ? 0 : 0,
    new Date().toISOString(),
  )

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow
  const token = signToken(user)
  res.status(201).json({ token, user: publicUser(user) })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as UserRow | undefined
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  res.json({ token: signToken(user), user: publicUser(user) })
})

router.get('/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.userRow!) })
})

export default router
