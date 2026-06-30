import nodemailer from 'nodemailer'
import { VALUESCAN } from '../config/valuescan.js'

const SMTP_HOST = process.env.SMTP_HOST ?? ''
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587)
const SMTP_USER = process.env.SMTP_USER ?? ''
const SMTP_PASS = process.env.SMTP_PASS ?? ''
const SMTP_FROM = process.env.SMTP_FROM ?? VALUESCAN.email

function getTransport() {
  if (!SMTP_HOST) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })
}

export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }) {
  const transport = getTransport()
  if (!transport) {
    console.log(`[ValueScan email] To: ${opts.to} | ${opts.subject}\n${opts.text}`)
    return { sent: false, logged: true }
  }
  await transport.sendMail({
    from: SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, '<br>'),
  })
  return { sent: true, logged: false }
}

export async function sendScoreDropAlert(opts: {
  to: string
  url: string
  oldScore: number
  newScore: number
  reportUrl: string
}) {
  const drop = opts.oldScore - opts.newScore
  return sendEmail({
    to: opts.to,
    subject: `[ValueScan] Score dropped ${drop} pts — ${opts.url}`,
    text: `Your monitored site ${opts.url} score changed from ${opts.oldScore} to ${opts.newScore} (${drop} point drop).\n\nView report: ${opts.reportUrl}`,
  })
}

export async function sendSupportTicket(opts: { email: string; subject: string; message: string; userName?: string }) {
  return sendEmail({
    to: VALUESCAN.email,
    subject: `[ValueScan Support] ${opts.subject}`,
    text: `From: ${opts.userName ?? 'User'} <${opts.email}>\n\n${opts.message}`,
  })
}

export async function sendTeamInviteEmail(opts: { to: string; ownerName: string; acceptUrl: string }) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.ownerName} invited you to their ValueScan team`,
    text: `${opts.ownerName} invited you to join their ValueScan Agency team.\n\nSign in or register, then accept:\n${opts.acceptUrl}`,
    html: `<p><strong>${opts.ownerName}</strong> invited you to join their ValueScan Agency team.</p><p><a href="${opts.acceptUrl}">Accept invitation</a></p>`,
  })
}

export async function sendGrowthDigest(opts: {
  to: string
  siteUrl: string
  articlesPublished: number
  linksLive: number
  campaignsActive: number
  avgLlmScore: number
  autopilot: boolean
}) {
  return sendEmail({
    to: opts.to,
    subject: `[ValueScan] Growth update — ${opts.siteUrl}`,
    text: [
      `Growth ${opts.autopilot ? 'autopilot' : 'automation'} run complete for ${opts.siteUrl}.`,
      `Articles live: ${opts.articlesPublished}`,
      `Backlinks live: ${opts.linksLive}`,
      `Marketing campaigns active: ${opts.campaignsActive}`,
      `Avg AI visibility: ${opts.avgLlmScore}/100`,
      '',
      `Dashboard: ${process.env.VALUESCAN_URL ?? 'https://valuescan.online'}/grow`,
    ].join('\n'),
  })
}
