import { db, type UserRow } from '../db.js'
import { getFeeSettings } from '../config/fees.js'

export type VerificationRow = {
  id: string
  user_id: string
  legal_name: string
  phone: string
  country: string
  business_type: string
  id_doc_path: string | null
  selfie_path: string | null
  business_doc_path: string | null
  status: string
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export function accountAgeDays(user: UserRow) {
  const created = new Date(user.created_at).getTime()
  return Math.floor((Date.now() - created) / 86400000)
}

export function sellerFeedbackPercent(user: UserRow) {
  const total = user.feedback_total ?? 0
  if (total === 0) return 0
  const positive = user.feedback_positive ?? 0
  return Math.round((positive / total) * 1000) / 10
}

export function meetsAutoVerifyRules(user: UserRow) {
  const rules = getFeeSettings()
  const sales = user.total_sales ?? 0
  const feedback = sellerFeedbackPercent(user)
  const age = accountAgeDays(user)

  if (sales >= rules.autoVerifyMinSales && feedback >= rules.autoVerifyMinFeedback) return 'sales_feedback'
  if (age >= rules.autoVerifyMinAccountDays && sales >= rules.autoVerifyMinSales) return 'tenure_sales'
  return null
}

export function approveSeller(userId: string, reviewedBy: string | null, status: 'approved' | 'auto_approved', notes?: string) {
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET verified = 1, seller_tier = COALESCE(NULLIF(seller_tier, 'standard'), 'verified') WHERE id = ?`,
  ).run(userId)
  db.prepare(
    `UPDATE seller_verifications SET status = ?, reviewed_by = ?, reviewed_at = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ?
     WHERE user_id = ?`,
  ).run(status, reviewedBy, now, notes ?? null, now, userId)
}

export function rejectSeller(userId: string, reviewedBy: string, notes: string) {
  const now = new Date().toISOString()
  db.prepare('UPDATE users SET verified = 0 WHERE id = ?').run(userId)
  db.prepare(
    `UPDATE seller_verifications SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, admin_notes = ?, updated_at = ?
     WHERE user_id = ?`,
  ).run(reviewedBy, now, notes, now, userId)
}

export function rowToVerification(row: VerificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    legalName: row.legal_name,
    phone: row.phone,
    country: row.country,
    businessType: row.business_type,
    idDocPath: row.id_doc_path,
    selfiePath: row.selfie_path,
    businessDocPath: row.business_doc_path,
    status: row.status,
    adminNotes: row.admin_notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
