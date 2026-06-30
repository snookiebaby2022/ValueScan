import Stripe from 'stripe'
import { clientOrigin } from '../config/ports.js'
import { gbpToPence } from '../config/fees.js'

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

let _stripe: Stripe | null = null

export function getStripe() {
  if (!isStripeConfigured()) return null
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return _stripe
}

export async function createConnectOnboardingLink(userId: string, email: string, stripeAccountId: string | null) {
  const stripe = getStripe()
  if (!stripe) return { demo: true as const, url: null, accountId: null }

  let accountId = stripeAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { marketplaceUserId: userId },
    })
    accountId = account.id
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${clientOrigin()}/seller?stripe=refresh`,
    return_url: `${clientOrigin()}/seller?stripe=complete`,
    type: 'account_onboarding',
  })

  return { demo: false as const, url: link.url, accountId }
}

export async function getConnectAccountStatus(stripeAccountId: string | null) {
  const stripe = getStripe()
  if (!stripe || !stripeAccountId) {
    return { configured: isStripeConfigured(), onboarded: false, payoutsEnabled: false, demo: !isStripeConfigured() }
  }
  const account = await stripe.accounts.retrieve(stripeAccountId)
  return {
    configured: true,
    onboarded: account.details_submitted ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    demo: false,
  }
}

export async function createCheckoutSession(opts: {
  orderId: string
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
  platformFeePence: number
  customerEmail?: string
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()
  if (!stripe) return null

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'gbp',
    line_items: opts.lineItems,
    customer_email: opts.customerEmail,
    payment_intent_data: {
      application_fee_amount: opts.platformFeePence,
      metadata: { orderId: opts.orderId, ...opts.metadata },
    },
    success_url: `${clientOrigin()}/checkout/success?order=${opts.orderId}`,
    cancel_url: `${clientOrigin()}/checkout?cancelled=1`,
    metadata: { orderId: opts.orderId },
  })
  return session
}

export async function createFeaturedCheckoutSession(opts: {
  purchaseId: string
  listingTitle: string
  amountGbp: number
  sellerEmail: string
  listingId: string
}) {
  const stripe = getStripe()
  if (!stripe) return null

  return stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'gbp',
    customer_email: opts.sellerEmail,
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: { name: `Featured listing — ${opts.listingTitle.slice(0, 80)}` },
        unit_amount: gbpToPence(opts.amountGbp),
      },
      quantity: 1,
    }],
    success_url: `${clientOrigin()}/seller?featured=success&listing=${opts.listingId}`,
    cancel_url: `${clientOrigin()}/seller?featured=cancelled`,
    metadata: { type: 'featured', purchaseId: opts.purchaseId, listingId: opts.listingId },
  })
}

export function verifyWebhook(payload: Buffer, signature: string) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return null
  return stripe.webhooks.constructEvent(payload, signature, secret)
}
