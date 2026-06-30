import { Router } from 'express'
import express from 'express'
import { db, type ListingRow } from '../db.js'
import { authRequired, sellerRequired } from '../middleware/auth.js'
import {
  createConnectOnboardingLink,
  createCheckoutSession,
  createFeaturedCheckoutSession,
  getConnectAccountStatus,
  isStripeConfigured,
  verifyWebhook,
} from '../lib/stripe-service.js'
import {
  completeOrderPayment,
  computeOrderTotals,
  createPendingOrder,
  fulfillDemoOrder,
  type CartLine,
} from '../lib/order-service.js'
import {
  createFeaturedInvoice,
  createOrderInvoice,
  getPaypalGatewayModule,
  getWhmcsOrigin,
  isWhmcsConfigured,
} from '../lib/whmcs-service.js'
import { getFeeSettings, gbpToPence } from '../config/fees.js'

const router = Router()

router.get('/config', async (_req, res) => {
  const fees = getFeeSettings()
  const whmcsEnabled = isWhmcsConfigured()
  const paypalGateway = whmcsEnabled ? await getPaypalGatewayModule() : null
  res.json({
    stripeEnabled: isStripeConfigured(),
    whmcsEnabled,
    paypalEnabled: !!paypalGateway,
    paypalGateway: paypalGateway ?? undefined,
    billingUrl: getWhmcsOrigin() ?? undefined,
    fees,
  })
})

router.get('/connect/status', sellerRequired, async (req, res) => {
  const user = req.userRow!
  const status = await getConnectAccountStatus(user.stripe_account_id ?? null)
  res.json({ ...status, accountId: user.stripe_account_id ?? null })
})

router.post('/connect/onboard', sellerRequired, async (req, res) => {
  const user = req.userRow!
  try {
    const result = await createConnectOnboardingLink(user.id, user.email, user.stripe_account_id ?? null)
    if (result.accountId && result.accountId !== user.stripe_account_id) {
      db.prepare('UPDATE users SET stripe_account_id = ? WHERE id = ?').run(result.accountId, user.id)
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Stripe Connect failed' })
  }
})

router.post('/checkout', authRequired, async (req, res) => {
  const userId = req.user!.userId
  const body = req.body as {
    name?: string; line1?: string; line2?: string; city?: string; county?: string; postcode?: string
    paymentMethod?: string
  }

  const cartRows = db.prepare(
    `SELECT c.listing_id, c.quantity, l.* FROM cart_items c JOIN listings l ON c.listing_id = l.id WHERE c.user_id = ?`,
  ).all(userId) as CartLine[]

  if (cartRows.length === 0) {
    res.status(400).json({ error: 'Your basket is empty' })
    return
  }

  const allDigital = cartRows.every((r) => (r.listing_kind ?? 'physical') === 'digital')
  if (!allDigital && (!body.name?.trim() || !body.line1?.trim() || !body.city?.trim() || !body.county?.trim() || !body.postcode?.trim())) {
    res.status(400).json({ error: 'Complete UK delivery address is required' })
    return
  }

  for (const row of cartRows) {
    if (row.quantity > row.stock) {
      res.status(400).json({ error: `Not enough stock for "${row.title}"` })
      return
    }
  }

  const totals = computeOrderTotals(cartRows)
  const paymentMethod = body.paymentMethod ?? 'card'
  const shipping = {
    name: body.name?.trim() ?? 'Digital buyer',
    line1: body.line1?.trim() ?? 'Digital delivery',
    line2: body.line2?.trim() ?? null,
    city: body.city?.trim() ?? '—',
    county: body.county?.trim() ?? '—',
    postcode: body.postcode?.trim()?.toUpperCase() ?? '—',
  }

  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string }

  if (isWhmcsConfigured() && (paymentMethod === 'paypal' || paymentMethod === 'whmcs')) {
    const paypalGateway = await getPaypalGatewayModule()
    if (!paypalGateway) {
      res.status(503).json({
        error: 'Live PayPal is not available. Enable PayPal in WHMCS (Setup → Payments) and check WHMCS API credentials.',
      })
      return
    }
    const { orderId } = createPendingOrder(userId, cartRows, totals, paymentMethod, shipping)
    try {
      const invoice = await createOrderInvoice({
        userId,
        orderId,
        cartRows,
        totals,
        preferPaypal: paymentMethod === 'paypal',
      })
      res.json({ demo: false, orderId, checkoutUrl: invoice.paymentUrl, provider: 'whmcs', totals })
      return
    } catch (err) {
      db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(orderId)
      res.status(502).json({ error: err instanceof Error ? err.message : 'WHMCS invoice failed' })
      return
    }
  }

  if (paymentMethod === 'paypal' || paymentMethod === 'whmcs') {
    res.status(503).json({ error: 'PayPal / WHMCS billing is not configured. Add WHMCS API credentials to .env.' })
    return
  }

  if (isStripeConfigured() && paymentMethod === 'card') {
    const { orderId } = createPendingOrder(userId, cartRows, totals, paymentMethod, shipping)
    const lineItems = [{
      price_data: {
        currency: 'gbp',
        product_data: { name: `Order ${orderId} — Printable Listings` },
        unit_amount: gbpToPence(totals.total),
      },
      quantity: 1,
    }]
    const session = await createCheckoutSession({
      orderId,
      lineItems,
      platformFeePence: gbpToPence(totals.platformFee),
      customerEmail: user.email,
    })
    if (session) {
      db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId)
      res.json({ demo: false, orderId, checkoutUrl: session.url, totals })
      return
    }
  }

  const { orderId, digitalDeliveries } = fulfillDemoOrder(userId, cartRows, totals, paymentMethod, shipping)
  res.status(201).json({
    demo: true,
    orderId,
    order: { id: orderId, total: totals.total, ...totals, digitalDeliveries },
  })
})

router.post('/featured/:listingId', sellerRequired, async (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ? AND seller_id = ?').get(
    req.params.listingId, req.userRow!.id,
  ) as ListingRow | undefined
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' })
    return
  }

  const fees = getFeeSettings()
  const purchaseId = crypto.randomUUID()
  const now = new Date().toISOString()
  const until = new Date(Date.now() + fees.featuredDays * 86400000).toISOString()

  db.prepare(
    `INSERT INTO featured_purchases (id, listing_id, seller_id, amount, days, status, featured_until, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(purchaseId, listing.id, req.userRow!.id, fees.featuredPriceGbp, fees.featuredDays, until, now)

  if (isStripeConfigured()) {
    const session = await createFeaturedCheckoutSession({
      purchaseId,
      listingTitle: listing.title,
      amountGbp: fees.featuredPriceGbp,
      sellerEmail: req.userRow!.email,
      listingId: listing.id,
    })
    if (session) {
      db.prepare('UPDATE featured_purchases SET stripe_session_id = ? WHERE id = ?').run(session.id, purchaseId)
      res.json({ demo: false, checkoutUrl: session.url, amount: fees.featuredPriceGbp, days: fees.featuredDays })
      return
    }
  }

  if (isWhmcsConfigured()) {
    try {
      const invoice = await createFeaturedInvoice({
        userId: req.userRow!.id,
        purchaseId,
        listingTitle: listing.title,
        amountGbp: fees.featuredPriceGbp,
        days: fees.featuredDays,
      })
      res.json({
        demo: false,
        checkoutUrl: invoice.paymentUrl,
        amount: fees.featuredPriceGbp,
        days: fees.featuredDays,
        provider: 'whmcs',
      })
      return
    } catch (err) {
      db.prepare("UPDATE featured_purchases SET status = 'cancelled' WHERE id = ?").run(purchaseId)
      res.status(502).json({ error: err instanceof Error ? err.message : 'WHMCS invoice failed' })
      return
    }
  }

  db.prepare(
    `UPDATE featured_purchases SET status = 'paid' WHERE id = ?`,
  ).run(purchaseId)
  db.prepare('UPDATE listings SET featured = 1, featured_until = ? WHERE id = ?').run(until, listing.id)
  res.json({
    demo: true,
    message: `Listing featured for ${fees.featuredDays} days`,
    featuredUntil: until,
    amount: fees.featuredPriceGbp,
  })
})

export const stripeWebhookRouter = Router()
stripeWebhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'] as string
    const event = verifyWebhook(req.body as Buffer, sig)
    if (!event) {
      res.status(400).send('Webhook error')
      return
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { id: string; metadata?: { orderId?: string; type?: string; purchaseId?: string; listingId?: string } }
      const meta = session.metadata ?? {}

      if (meta.type === 'featured' && meta.purchaseId && meta.listingId) {
        const purchase = db.prepare('SELECT * FROM featured_purchases WHERE id = ?').get(meta.purchaseId) as {
          featured_until: string; listing_id: string
        } | undefined
        if (purchase) {
          db.prepare("UPDATE featured_purchases SET status = 'paid' WHERE id = ?").run(meta.purchaseId)
          db.prepare('UPDATE listings SET featured = 1, featured_until = ? WHERE id = ?').run(
            purchase.featured_until, purchase.listing_id,
          )
        }
      } else if (meta.orderId) {
        db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, meta.orderId)
        completeOrderPayment(meta.orderId)
      }
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as { id: string; details_submitted?: boolean; payouts_enabled?: boolean }
      if (account.details_submitted) {
        db.prepare('UPDATE users SET stripe_onboarded = ? WHERE stripe_account_id = ?').run(
          account.payouts_enabled ? 1 : 0, account.id,
        )
      }
    }

    res.json({ received: true })
  },
)

export default router
