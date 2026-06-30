import { db } from '../db.js'
import { sendEmail } from './email-service.js'

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved'

export type SupportTicket = {
  id: string
  userId: string
  userEmail: string
  userName: string
  subject: string
  message: string
  status: SupportTicketStatus
  adminNotes: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

function mapRow(r: {
  id: string
  user_id: string
  user_email: string
  user_name: string
  subject: string
  message: string
  status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}): SupportTicket {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    userName: r.user_name,
    subject: r.subject,
    message: r.message,
    status: r.status as SupportTicketStatus,
    adminNotes: r.admin_notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
  }
}

export function createSupportTicket(
  userId: string,
  email: string,
  name: string,
  subject: string,
  message: string,
): SupportTicket {
  const id = `vs-tkt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO valuescan_support_tickets
    (id, user_id, user_email, user_name, subject, message, status, admin_notes, created_at, updated_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, 'open', NULL, ?, ?, NULL)
  `).run(id, userId, email, name, subject, message, now, now)
  return mapRow(db.prepare('SELECT * FROM valuescan_support_tickets WHERE id = ?').get(id) as Parameters<typeof mapRow>[0])
}

export function listSupportTickets(status?: SupportTicketStatus | 'all', limit = 100): SupportTicket[] {
  if (status && status !== 'all') {
    return (db.prepare(`
      SELECT * FROM valuescan_support_tickets WHERE status = ?
      ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC
      LIMIT ?
    `).all(status, limit) as Parameters<typeof mapRow>[0][]).map(mapRow)
  }
  return (db.prepare(`
    SELECT * FROM valuescan_support_tickets
    ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC
    LIMIT ?
  `).all(limit) as Parameters<typeof mapRow>[0][]).map(mapRow)
}

export function getSupportTicketStats() {
  const rows = db.prepare(`
    SELECT status, COUNT(*) as c FROM valuescan_support_tickets GROUP BY status
  `).all() as { status: string; c: number }[]
  const counts = { open: 0, in_progress: 0, resolved: 0, total: 0 }
  for (const r of rows) {
    if (r.status in counts) counts[r.status as keyof typeof counts] = r.c
    counts.total += r.c
  }
  return counts
}

export async function updateSupportTicket(
  id: string,
  body: { status?: SupportTicketStatus; adminNotes?: string | null },
): Promise<SupportTicket | null> {
  const row = db.prepare('SELECT * FROM valuescan_support_tickets WHERE id = ?').get(id) as Parameters<typeof mapRow>[0] | undefined
  if (!row) return null

  const now = new Date().toISOString()
  const status = body.status ?? (row.status as SupportTicketStatus)
  const adminNotes = body.adminNotes !== undefined ? body.adminNotes : row.admin_notes
  const resolvedAt = status === 'resolved' ? (row.resolved_at ?? now) : null

  db.prepare(`
    UPDATE valuescan_support_tickets
    SET status = ?, admin_notes = ?, updated_at = ?, resolved_at = ?
    WHERE id = ?
  `).run(status, adminNotes, now, resolvedAt, id)

  const updated = mapRow(db.prepare('SELECT * FROM valuescan_support_tickets WHERE id = ?').get(id) as Parameters<typeof mapRow>[0])

  if (status === 'resolved' && row.status !== 'resolved') {
    await sendEmail({
      to: updated.userEmail,
      subject: `[ValueScan] Support ticket resolved — ${updated.subject}`,
      text: [
        `Hi ${updated.userName},`,
        '',
        `Your support request "${updated.subject}" has been marked resolved.`,
        adminNotes ? `\nNotes from our team:\n${adminNotes}\n` : '',
        'Reply to this email if you still need help.',
        '',
        '— ValueScan Support',
      ].join('\n'),
    })
  }

  return updated
}
