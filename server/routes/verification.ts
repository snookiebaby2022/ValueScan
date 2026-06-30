import { Router } from 'express'
import { db } from '../db.js'
import { authRequired, sellerRequired } from '../middleware/auth.js'
import { verificationUpload } from '../middleware/upload.js'
import {
  approveSeller,
  meetsAutoVerifyRules,
  rowToVerification,
  type VerificationRow,
} from '../lib/verification-service.js'

const router = Router()

router.get('/status', authRequired, (req, res) => {
  const user = req.userRow!
  const row = db.prepare('SELECT * FROM seller_verifications WHERE user_id = ?').get(user.id) as VerificationRow | undefined
  const autoEligible = user.role === 'seller' ? meetsAutoVerifyRules(user) : null
  res.json({
    verified: (user.verified ?? 0) === 1,
    verification: row ? rowToVerification(row) : null,
    autoVerifyEligible: autoEligible,
    stripeOnboarded: (user.stripe_onboarded ?? 0) === 1,
    stripeAccountId: user.stripe_account_id ?? null,
  })
})

router.post(
  '/apply',
  sellerRequired,
  verificationUpload.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'businessDocument', maxCount: 1 },
  ]),
  (req, res) => {
    const { legalName, phone, country = 'UK', businessType = 'individual' } = req.body as {
      legalName?: string
      phone?: string
      country?: string
      businessType?: string
    }

    if (!legalName?.trim() || !phone?.trim()) {
      res.status(400).json({ error: 'Legal name and phone are required' })
      return
    }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const idDoc = files?.idDocument?.[0]
    if (!idDoc) {
      res.status(400).json({ error: 'ID document (passport or driving licence) is required' })
      return
    }

    const user = req.userRow!
    const now = new Date().toISOString()
    const selfie = files?.selfie?.[0]
    const businessDoc = files?.businessDocument?.[0]

    const existing = db.prepare('SELECT id, status FROM seller_verifications WHERE user_id = ?').get(user.id) as
      | { id: string; status: string } | undefined

    if (existing && existing.status === 'pending') {
      res.status(409).json({ error: 'You already have a pending application' })
      return
    }

    const id = existing?.id ?? crypto.randomUUID()
    const autoRule = meetsAutoVerifyRules(user)
    const status = autoRule ? 'auto_approved' : 'pending'

    if (existing) {
      db.prepare(
        `UPDATE seller_verifications SET legal_name = ?, phone = ?, country = ?, business_type = ?,
          id_doc_path = ?, selfie_path = ?, business_doc_path = ?, status = ?, admin_notes = NULL,
          reviewed_by = NULL, reviewed_at = NULL, updated_at = ?
         WHERE user_id = ?`,
      ).run(
        legalName.trim(), phone.trim(), country.trim(), businessType,
        idDoc.path, selfie?.path ?? null, businessDoc?.path ?? null, status, now, user.id,
      )
    } else {
      db.prepare(
        `INSERT INTO seller_verifications (id, user_id, legal_name, phone, country, business_type,
          id_doc_path, selfie_path, business_doc_path, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id, user.id, legalName.trim(), phone.trim(), country.trim(), businessType,
        idDoc.path, selfie?.path ?? null, businessDoc?.path ?? null, status, now, now,
      )
    }

    db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone.trim(), user.id)

    if (autoRule) {
      approveSeller(user.id, null, 'auto_approved', `Auto-approved: ${autoRule}`)
    } else {
      db.prepare('UPDATE users SET verified = 0 WHERE id = ?').run(user.id)
    }

    const row = db.prepare('SELECT * FROM seller_verifications WHERE user_id = ?').get(user.id) as VerificationRow
    res.status(201).json({
      verification: rowToVerification(row),
      autoApproved: Boolean(autoRule),
      message: autoRule
        ? 'Application auto-approved — you can publish listings now.'
        : 'Application submitted — our team will review within 24–48 hours.',
    })
  },
)

export default router
