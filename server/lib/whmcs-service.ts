import dns from 'node:dns'
import { db } from '../db.js'
import { clientOrigin } from '../config/ports.js'
import { completeOrderPayment, type CartLine, type OrderTotals } from './order-service.js'

// WHMCS API IP allowlists are usually IPv4 — prefer IPv4 for outbound API calls.
dns.setDefaultResultOrder('ipv4first')

type WhmcsResponse = {
  result: string
  message?: string
  [key: string]: unknown
}

export function getWhmcsOrigin(): string | null {
  const raw = process.env.WHMCS_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return raw.replace(/\/+$/, '')
  }
}

export function isWhmcsConfigured(): boolean {
  return !!(
    getWhmcsOrigin()
    && process.env.WHMCS_API_IDENTIFIER?.trim()
    && process.env.WHMCS_API_SECRET?.trim()
  )
}

export type WhmcsPaymentMethod = { module: string; displayname: string }

let paypalGatewayCache: { module: string; at: number } | null = null
const PAYPAL_GATEWAY_CACHE_MS = 5 * 60 * 1000

function normalizePaymentMethods(data: WhmcsResponse): WhmcsPaymentMethod[] {
  const raw = (data.paymentmethods as { paymentmethod?: WhmcsPaymentMethod | WhmcsPaymentMethod[] } | undefined)?.paymentmethod
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

export async function getActivePaymentMethods(): Promise<WhmcsPaymentMethod[]> {
  const data = await whmcsApi<WhmcsResponse>('GetPaymentMethods')
  return normalizePaymentMethods(data)
}

/** Resolve live PayPal gateway module name from WHMCS (cached). */
export async function getPaypalGatewayModule(): Promise<string | null> {
  if (!isWhmcsConfigured()) return null

  if (paypalGatewayCache && Date.now() - paypalGatewayCache.at < PAYPAL_GATEWAY_CACHE_MS) {
    return paypalGatewayCache.module
  }

  const configured = process.env.WHMCS_PAYPAL_GATEWAY?.trim()

  try {
    const methods = await getActivePaymentMethods()
    const match = methods.find(
      (m) => /paypal/i.test(m.module) || /paypal/i.test(m.displayname),
    )
    if (match) {
      paypalGatewayCache = { module: match.module, at: Date.now() }
      return match.module
    }
  } catch {
    // Fall back to env when API lacks GetPaymentMethods permission
  }

  if (configured) {
    paypalGatewayCache = { module: configured, at: Date.now() }
    return configured
  }

  return null
}

export async function isPaypalLive(): Promise<boolean> {
  return !!(await getPaypalGatewayModule())
}

function whmcsWebhookSecret(): string | null {
  const secret = process.env.WHMCS_WEBHOOK_SECRET?.trim() || process.env.WHMCS_API_SECRET?.trim()
  return secret || null
}

export function verifyWhmcsWebhook(requestSecret: string | undefined): boolean {
  const expected = whmcsWebhookSecret()
  if (!expected || !requestSecret) return false
  return requestSecret === expected
}

async function whmcsApi<T extends WhmcsResponse>(action: string, params: Record<string, string | number> = {}): Promise<T> {
  const origin = getWhmcsOrigin()
  if (!origin || !process.env.WHMCS_API_IDENTIFIER || !process.env.WHMCS_API_SECRET) {
    throw new Error('WHMCS is not configured')
  }

  const body = new URLSearchParams({
    action,
    identifier: process.env.WHMCS_API_IDENTIFIER,
    secret: process.env.WHMCS_API_SECRET,
    responsetype: 'json',
  })
  for (const [key, value] of Object.entries(params)) {
    body.set(key, String(value))
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  const accessKey = process.env.WHMCS_API_ACCESS_KEY?.trim()
  if (accessKey) headers['WHMCS-Api-Access-Key'] = accessKey

  const res = await fetch(`${origin}/includes/api.php`, { method: 'POST', headers, body })
  const data = (await res.json()) as T
  if (data.result !== 'success') {
    throw new Error(data.message ?? `WHMCS ${action} failed`)
  }
  return data
}

export async function createWhmcsApiInvoice(params: Record<string, string | number>): Promise<number> {
  const created = await whmcsApi<{ invoiceid?: number }>('CreateInvoice', params)
  const invoiceId = Number(created.invoiceid ?? 0)
  if (!invoiceId) throw new Error('WHMCS did not return an invoice ID')
  return invoiceId
}

function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstname: parts[0], lastname: 'Customer' }
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') }
}

export async function getOrCreateWhmcsClient(user: {
  id: string
  email: string
  name: string
  whmcs_client_id?: number | null
}): Promise<number> {
  if (user.whmcs_client_id) return user.whmcs_client_id

  try {
    const existing = await whmcsApi<{ client?: { id?: number }; userid?: number }>('GetClientsDetails', {
      email: user.email,
      stats: 'false',
    })
    const clientId = Number(existing.client?.id ?? existing.userid ?? 0)
    if (clientId > 0) {
      db.prepare('UPDATE users SET whmcs_client_id = ? WHERE id = ?').run(clientId, user.id)
      return clientId
    }
  } catch {
    // Client not found — create below
  }

  const { firstname, lastname } = splitName(user.name)
  const created = await whmcsApi<{ clientid?: number }>('AddClient', {
    firstname,
    lastname,
    email: user.email,
    password2: crypto.randomUUID(),
    address1: 'Digital buyer',
    city: 'London',
    state: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'GB',
    phonenumber: '0000000000',
  })

  const clientId = Number(created.clientid ?? 0)
  if (!clientId) throw new Error('WHMCS did not return a client ID')
  db.prepare('UPDATE users SET whmcs_client_id = ? WHERE id = ?').run(clientId, user.id)
  return clientId
}

function formatGbp(amount: number): string {
  return amount.toFixed(2)
}

export function buildInvoiceReturnUrl(orderId: string): string {
  const base = process.env.CLIENT_URL ?? clientOrigin()
  return `${base.replace(/\/+$/, '')}/checkout/success?order=${encodeURIComponent(orderId)}`
}

export function getInvoicePaymentUrl(invoiceId: number, returnUrl?: string): string {
  const origin = getWhmcsOrigin()!
  const url = new URL(`${origin}/viewinvoice.php`)
  url.searchParams.set('id', String(invoiceId))
  if (returnUrl) url.searchParams.set('returnurl', returnUrl)
  return url.toString()
}

function buildInvoiceViewPath(invoiceId: number, opts?: { returnUrl?: string; paymentMethod?: string }): string {
  const params = new URLSearchParams({ id: String(invoiceId) })
  if (opts?.returnUrl) params.set('returnurl', opts.returnUrl)
  if (opts?.paymentMethod) params.set('paymentmethod', opts.paymentMethod)
  return `viewinvoice.php?${params.toString()}`
}

/** SSO login link — required because WHMCS clients are created with random passwords. */
export async function getAuthenticatedInvoicePaymentUrl(
  clientId: number,
  invoiceId: number,
  opts?: { returnUrl?: string; paymentMethod?: string },
): Promise<string> {
  const path = buildInvoiceViewPath(invoiceId, opts)
  const data = await whmcsApi<{ redirect_url?: string }>('CreateSsoToken', {
    client_id: clientId,
    destination: 'sso:custom_redirect',
    sso_redirect_path: path,
  })
  const redirectUrl = data.redirect_url?.trim()
  if (!redirectUrl) throw new Error('WHMCS did not return an SSO payment URL')
  return redirectUrl
}

export async function createOrderInvoice(opts: {
  userId: string
  orderId: string
  cartRows: CartLine[]
  totals: OrderTotals
  preferPaypal?: boolean
}): Promise<{ invoiceId: number; paymentUrl: string }> {
  const user = db.prepare('SELECT id, email, name, whmcs_client_id FROM users WHERE id = ?').get(opts.userId) as {
    id: string; email: string; name: string; whmcs_client_id: number | null
  }

  const clientId = await getOrCreateWhmcsClient(user)
  const today = new Date().toISOString().slice(0, 10)
  const itemLines = [
    `Printable Listings order ${opts.orderId}`,
    ...opts.cartRows.map((r) => `${r.title} × ${r.quantity}`),
    `Platform fee £${formatGbp(opts.totals.platformFee)}`,
    `Buyer protection £${formatGbp(opts.totals.buyerProtectionFee)}`,
    opts.totals.shippingTotal > 0 ? `Delivery £${formatGbp(opts.totals.shippingTotal)}` : '',
    `VAT £${formatGbp(opts.totals.vatAmount)}`,
  ].filter(Boolean).join(' · ')

  const params: Record<string, string | number> = {
    userid: clientId,
    status: 'Unpaid',
    sendinvoice: '0',
    date: today,
    duedate: today,
    notes: `Printable Listings marketplace order ${opts.orderId}`,
    itemdescription0: itemLines.slice(0, 250),
    itemamount0: formatGbp(opts.totals.total),
    itemtaxed0: '0',
  }

  if (opts.preferPaypal) {
    const paypalGateway = await getPaypalGatewayModule()
    if (!paypalGateway) {
      throw new Error('PayPal is not enabled on WHMCS billing. Activate PayPal under Setup → Payments.')
    }
    params.paymentmethod = paypalGateway
  }

  const created = await whmcsApi<{ invoiceid?: number }>('CreateInvoice', params)
  const invoiceId = Number(created.invoiceid ?? 0)
  if (!invoiceId) throw new Error('WHMCS did not return an invoice ID')

  db.prepare('UPDATE orders SET whmcs_invoice_id = ? WHERE id = ?').run(invoiceId, opts.orderId)

  const paymentUrl = await getAuthenticatedInvoicePaymentUrl(clientId, invoiceId, {
    returnUrl: buildInvoiceReturnUrl(opts.orderId),
    paymentMethod: opts.preferPaypal ? params.paymentmethod as string | undefined : undefined,
  })

  return {
    invoiceId,
    paymentUrl,
  }
}

export async function createFeaturedInvoice(opts: {
  userId: string
  purchaseId: string
  listingTitle: string
  amountGbp: number
  days: number
  preferPaypal?: boolean
}): Promise<{ invoiceId: number; paymentUrl: string }> {
  const user = db.prepare('SELECT id, email, name, whmcs_client_id FROM users WHERE id = ?').get(opts.userId) as {
    id: string; email: string; name: string; whmcs_client_id: number | null
  }

  const clientId = await getOrCreateWhmcsClient(user)
  const today = new Date().toISOString().slice(0, 10)

  const featuredParams: Record<string, string | number> = {
    userid: clientId,
    status: 'Unpaid',
    sendinvoice: '0',
    date: today,
    duedate: today,
    notes: `Printable Listings featured listing ${opts.purchaseId}`,
    itemdescription0: `Featured listing (${opts.days} days): ${opts.listingTitle.slice(0, 120)}`,
    itemamount0: formatGbp(opts.amountGbp),
    itemtaxed0: '0',
  }

  if (opts.preferPaypal) {
    const paypalGateway = await getPaypalGatewayModule()
    if (paypalGateway) featuredParams.paymentmethod = paypalGateway
  }

  const created = await whmcsApi<{ invoiceid?: number }>('CreateInvoice', featuredParams)

  const invoiceId = Number(created.invoiceid ?? 0)
  if (!invoiceId) throw new Error('WHMCS did not return an invoice ID')

  db.prepare('UPDATE featured_purchases SET whmcs_invoice_id = ? WHERE id = ?').run(invoiceId, opts.purchaseId)

  const returnUrl = `${(process.env.CLIENT_URL ?? clientOrigin()).replace(/\/+$/, '')}/seller?featured=1`
  const paymentUrl = await getAuthenticatedInvoicePaymentUrl(clientId, invoiceId, {
    returnUrl,
    paymentMethod: typeof featuredParams.paymentmethod === 'string' ? featuredParams.paymentmethod : undefined,
  })
  return { invoiceId, paymentUrl }
}

export async function getInvoiceStatus(invoiceId: number): Promise<string> {
  const data = await whmcsApi<{ status?: string }>('GetInvoice', { invoiceid: invoiceId })
  return data.status ?? 'Unknown'
}

function completeFeaturedPurchase(purchaseId: string) {
  const purchase = db.prepare('SELECT * FROM featured_purchases WHERE id = ?').get(purchaseId) as {
    id: string; listing_id: string; featured_until: string; status: string
  } | undefined
  if (!purchase || purchase.status === 'paid') return

  db.prepare("UPDATE featured_purchases SET status = 'paid' WHERE id = ?").run(purchaseId)
  db.prepare('UPDATE listings SET featured = 1, featured_until = ? WHERE id = ?').run(
    purchase.featured_until, purchase.listing_id,
  )
}

export function completeWhmcsInvoice(invoiceId: number): {
  type: 'order' | 'featured' | 'none'
  orderId?: string
  digitalDeliveries?: Array<{ note: string; listingId: string }>
} {
  const order = db.prepare('SELECT id, status FROM orders WHERE whmcs_invoice_id = ?').get(invoiceId) as {
    id: string; status: string
  } | undefined

  if (order) {
    if (order.status === 'paid') {
      return { type: 'order', orderId: order.id, digitalDeliveries: [] }
    }
    const result = completeOrderPayment(order.id)
    return {
      type: 'order',
      orderId: order.id,
      digitalDeliveries: result?.digitalDeliveries ?? [],
    }
  }

  const purchase = db.prepare('SELECT id FROM featured_purchases WHERE whmcs_invoice_id = ?').get(invoiceId) as {
    id: string
  } | undefined
  if (purchase) {
    completeFeaturedPurchase(purchase.id)
    return { type: 'featured' }
  }

  return { type: 'none' }
}

export async function syncWhmcsInvoicePayment(invoiceId: number): Promise<boolean> {
  const status = await getInvoiceStatus(invoiceId)
  if (status.toLowerCase() !== 'paid') return false
  completeWhmcsInvoice(invoiceId)
  return true
}

export async function syncOrderWhmcsPayment(orderId: string): Promise<boolean> {
  const order = db.prepare('SELECT whmcs_invoice_id, status FROM orders WHERE id = ?').get(orderId) as {
    whmcs_invoice_id: number | null; status: string
  } | undefined
  if (!order?.whmcs_invoice_id || order.status === 'paid') return order?.status === 'paid'
  return syncWhmcsInvoicePayment(order.whmcs_invoice_id)
}
