import Stripe from 'stripe'
import { VALUESCAN } from '../config/valuescan.js'
import { getStripe, isStripeConfigured } from './stripe-service.js'
import { activatePlanFromStripe, cancelStripeSubscription } from './valuescan-service.js'

const PLAN_AMOUNTS: Record<string, { name: string; pence: number }> = {
  pro: { name: 'ValueScan Pro', pence: 1900 },
  agency: { name: 'ValueScan Agency', pence: 4900 },
}

export function isValueScanBillingConfigured() {
  return isStripeConfigured()
}

export async function createValueScanCheckout(userId: string, email: string, planSlug: string) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not configured')

  const plan = PLAN_AMOUNTS[planSlug]
  if (!plan) throw new Error('Invalid plan')

  const priceId = planSlug === 'pro'
    ? process.env.STRIPE_VALUESCAN_PRO_PRICE_ID
    : process.env.STRIPE_VALUESCAN_AGENCY_PRICE_ID

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [{
        price_data: {
          currency: 'gbp',
          product_data: { name: plan.name, metadata: { planSlug } },
          unit_amount: plan.pence,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }]

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: lineItems,
    success_url: `${VALUESCAN.url}/account?checkout=success`,
    cancel_url: `${VALUESCAN.url}/pricing?checkout=cancelled`,
    metadata: { userId, planSlug, product: 'valuescan' },
    subscription_data: { metadata: { userId, planSlug, product: 'valuescan' } },
  })

  return { url: session.url, sessionId: session.id }
}

export async function createValueScanPortal(stripeCustomerId: string) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not configured')
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${VALUESCAN.url}/account`,
  })
  return { url: session.url }
}

export async function handleValueScanStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.product !== 'valuescan') return
      const userId = session.metadata.userId
      const planSlug = session.metadata.planSlug
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      if (userId && planSlug && subId) {
        activatePlanFromStripe(userId, planSlug, subId, customerId ?? null)
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.metadata?.product !== 'valuescan') return
      const userId = sub.metadata.userId
      const planSlug = sub.metadata.planSlug
      if (!userId || !planSlug) return
      if (sub.status === 'active' || sub.status === 'trialing') {
        activatePlanFromStripe(userId, planSlug, sub.id, typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null)
      } else if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
        cancelStripeSubscription(userId)
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.metadata?.product !== 'valuescan') return
      const userId = sub.metadata.userId
      if (userId) cancelStripeSubscription(userId)
      break
    }
    default:
      break
  }
}
