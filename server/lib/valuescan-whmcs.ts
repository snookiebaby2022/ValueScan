import { db } from '../db.js'
import { VALUESCAN } from '../config/valuescan.js'
import {
  createWhmcsApiInvoice,
  getAuthenticatedInvoicePaymentUrl,
  getOrCreateWhmcsClient,
  getPaypalGatewayModule,
  getInvoiceStatus,
  isWhmcsConfigured,
} from './whmcs-service.js'
import { activatePlanFromWhmcs } from './valuescan-service.js'

const PLAN_AMOUNTS: Record<string, { name: string; pence: number }> = {
  pro: { name: 'ValueScan Pro', pence: 1900 },
  agency: { name: 'ValueScan Agency', pence: 4900 },
}

function useWhmcsBridge(): boolean {
  return !!(process.env.WHMCS_BRIDGE_URL?.trim() && process.env.VALUESCAN_BRIDGE_SECRET?.trim())
}

async function callWhmcsBridge<T extends Record<string, unknown>>(
  action: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const url = process.env.WHMCS_BRIDGE_URL!.trim()
  const secret = process.env.VALUESCAN_BRIDGE_SECRET!.trim()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ValueScan-Bridge-Secret': secret,
    },
    body: JSON.stringify({ action, ...body }),
  })

  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `WHMCS bridge failed (${res.status})`)
  }
  return data
}

export function isValueScanPaypalConfigured() {
  return useWhmcsBridge() || isWhmcsConfigured()
}

export async function isValueScanPaypalLive(): Promise<boolean> {
  if (useWhmcsBridge()) return !!(await getPaypalGatewayModule()) || !!process.env.WHMCS_PAYPAL_GATEWAY?.trim()
  if (!isWhmcsConfigured()) return false
  return !!(await getPaypalGatewayModule())
}

function formatGbp(pence: number): string {
  return (pence / 100).toFixed(2)
}

function buildReturnUrl(): string {
  return `${VALUESCAN.url.replace(/\/+$/, '')}/account?checkout=success`
}

export async function createValueScanWhmcsCheckout(userId: string, planSlug: string) {
  const plan = PLAN_AMOUNTS[planSlug]
  if (!plan) throw new Error('Invalid plan')

  const paypalGateway = await getPaypalGatewayModule()
  if (!paypalGateway) {
    throw new Error('PayPal is not enabled on WHMCS. Activate PayPal under Setup → Payments.')
  }

  const user = db.prepare('SELECT id, email, name, whmcs_client_id FROM users WHERE id = ?').get(userId) as {
    id: string; email: string; name: string; whmcs_client_id: number | null
  }
  if (!user) throw new Error('User not found')

  const pendingId = `vs-bill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let invoiceId: number
  let paymentUrl: string

  if (useWhmcsBridge()) {
    let clientId = user.whmcs_client_id
    if (!clientId) {
      const created = await callWhmcsBridge<{ clientId: number }>('get_or_create_client', {
        email: user.email,
        name: user.name,
      })
      clientId = created.clientId
      if (clientId > 0) {
        db.prepare('UPDATE users SET whmcs_client_id = ? WHERE id = ?').run(clientId, userId)
      }
    }

    const result = await callWhmcsBridge<{ invoiceId: number; paymentUrl: string }>('create_valuescan_invoice', {
      clientId,
      amount: formatGbp(plan.pence),
      description: `${plan.name} — 1 month subscription (${VALUESCAN.domain})`,
      notes: `ValueScan ${planSlug} plan — ${pendingId}`,
      paymentMethod: paypalGateway,
      returnUrl: buildReturnUrl(),
    })
    invoiceId = result.invoiceId
    paymentUrl = result.paymentUrl
  } else {
    const clientId = await getOrCreateWhmcsClient(user)
    const today = new Date().toISOString().slice(0, 10)
    invoiceId = await createWhmcsApiInvoice({
      userid: clientId,
      status: 'Unpaid',
      sendinvoice: '0',
      date: today,
      duedate: today,
      notes: `ValueScan ${planSlug} plan — ${pendingId}`,
      itemdescription0: `${plan.name} — 1 month subscription (${VALUESCAN.domain})`,
      itemamount0: formatGbp(plan.pence),
      itemtaxed0: '0',
      paymentmethod: paypalGateway,
    })
    paymentUrl = await getAuthenticatedInvoicePaymentUrl(clientId, invoiceId, {
      returnUrl: buildReturnUrl(),
      paymentMethod: paypalGateway,
    })
  }

  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO valuescan_billing_pending (id, user_id, plan_slug, whmcs_invoice_id, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(pendingId, userId, planSlug, invoiceId, now)

  return {
    url: paymentUrl,
    invoiceId,
    provider: 'whmcs' as const,
  }
}

export function completeValueScanWhmcsInvoice(invoiceId: number): boolean {
  const pending = db.prepare(`
    SELECT id, user_id, plan_slug, status FROM valuescan_billing_pending
    WHERE whmcs_invoice_id = ?
  `).get(invoiceId) as { id: string; user_id: string; plan_slug: string; status: string } | undefined

  if (!pending || pending.status === 'paid') return pending?.status === 'paid'

  activatePlanFromWhmcs(pending.user_id, pending.plan_slug, invoiceId)
  db.prepare(`
    UPDATE valuescan_billing_pending SET status = 'paid', paid_at = ? WHERE id = ?
  `).run(new Date().toISOString(), pending.id)
  return true
}

export async function syncUserWhmcsBilling(userId: string): Promise<boolean> {
  const pending = db.prepare(`
    SELECT whmcs_invoice_id FROM valuescan_billing_pending
    WHERE user_id = ? AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1
  `).get(userId) as { whmcs_invoice_id: number } | undefined

  if (!pending) return false

  let status: string
  if (useWhmcsBridge()) {
    const result = await callWhmcsBridge<{ status: string }>('get_invoice_status', {
      invoiceId: pending.whmcs_invoice_id,
    })
    status = result.status
  } else {
    status = await getInvoiceStatus(pending.whmcs_invoice_id)
  }

  if (status.toLowerCase() !== 'paid') return false
  return completeValueScanWhmcsInvoice(pending.whmcs_invoice_id)
}
