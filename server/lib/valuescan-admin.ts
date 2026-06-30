import bcrypt from 'bcryptjs'
import { db } from '../db.js'

const LEGACY_DEMO_ADMIN = 'admin@demo.com'

/** Sync ValueScan admin from VALUESCAN_ADMIN_EMAIL + VALUESCAN_ADMIN_PASSWORD. */
export function syncValueScanAdmin() {
  const email = process.env.VALUESCAN_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.VALUESCAN_ADMIN_PASSWORD

  if (!email || !password) {
    ensureLegacyDemoAdmin()
    return
  }

  if (password.length < 10) {
    console.warn('[ValueScan] VALUESCAN_ADMIN_PASSWORD should be at least 10 characters')
  }

  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined

  if (existing) {
    db.prepare(`
      UPDATE users SET password_hash = ?, role = 'admin', name = 'ValueScan Admin' WHERE id = ?
    `).run(hash, existing.id)
  } else {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, member_since, rating, review_count, verified, created_at)
      VALUES (?, ?, ?, 'ValueScan Admin', 'admin', ?, 5.0, 0, 1, ?)
    `).run(crypto.randomUUID(), email, hash, new Date().getFullYear().toString(), now)
  }

  if (email !== LEGACY_DEMO_ADMIN) {
    db.prepare(`UPDATE users SET role = 'buyer' WHERE email = ? AND role = 'admin'`).run(LEGACY_DEMO_ADMIN)
  }
}

function ensureLegacyDemoAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(LEGACY_DEMO_ADMIN)
  if (existing) return
  const hash = bcrypt.hashSync('demo123', 10)
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, location, member_since, rating, review_count,
      verified, feedback_positive, feedback_total, total_sales, seller_tier, created_at)
     VALUES (?, ?, ?, ?, 'admin', 'London, UK', '2020', 5.0, 0, 1, 0, 0, 0, 'elite', ?)`,
  ).run(crypto.randomUUID(), LEGACY_DEMO_ADMIN, hash, 'Site Admin', now)
}
