import { Router } from 'express'
import express from 'express'
import { authRequired } from '../middleware/auth.js'
import {
  createValueScanCheckout,
  createValueScanPortal,
  handleValueScanStripeEvent,
  isValueScanBillingConfigured,
} from '../lib/valuescan-stripe.js'
import {
  createValueScanWhmcsCheckout,
  isValueScanPaypalLive,
  syncUserWhmcsBilling,
} from '../lib/valuescan-whmcs.js'
import { getUserBillingInfo } from '../lib/valuescan-service.js'
import { getWhmcsOrigin, isWhmcsConfigured } from '../lib/whmcs-service.js'
import { verifyWebhook } from '../lib/stripe-service.js'

const router = Router()

export const valuescanBillingWebhook = Router()
valuescanBillingWebhook.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const event = verifyWebhook(req.body as Buffer, req.headers['stripe-signature'] as string)
      if (!event) {
        res.status(400).json({ error: 'Invalid webhook signature' })
        return
      }
      await handleValueScanStripeEvent(event)
      res.json({ received: true })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Webhook failed' })
    }
  },
)

router.get('/config', async (_req, res) => {
  const paypalEnabled = await isValueScanPaypalLive()
  res.json({
    stripeEnabled: isValueScanBillingConfigured(),
    whmcsEnabled: isWhmcsConfigured(),
    paypalEnabled,
    billingUrl: getWhmcsOrigin(),
  })
})

router.get('/me', authRequired, async (req, res) => {
  try {
    await syncUserWhmcsBilling(req.user!.userId)
  } catch {
    // WHMCS unreachable — return current billing state
  }
  res.json(getUserBillingInfo(req.user!.userId))
})

router.post('/checkout', authRequired, async (req, res) => {
  const planSlug = typeof req.body?.planSlug === 'string' ? req.body.planSlug : ''
  const paymentMethod = typeof req.body?.paymentMethod === 'string' ? req.body.paymentMethod : 'stripe'

  if (!['pro', 'agency'].includes(planSlug)) {
    res.status(400).json({ error: 'planSlug must be pro or agency' })
    return
  }

  try {
    if (paymentMethod === 'paypal') {
      const result = await createValueScanWhmcsCheckout(req.user!.userId, planSlug)
      res.json({ url: result.url, provider: result.provider, invoiceId: result.invoiceId })
      return
    }

    const result = await createValueScanCheckout(req.user!.userId, req.userRow!.email, planSlug)
    res.json({ url: result.url, sessionId: result.sessionId, provider: 'stripe' })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Checkout failed' })
  }
})

router.post('/portal', authRequired, async (req, res) => {
  const billing = getUserBillingInfo(req.user!.userId)
  if (!billing.stripeCustomerId) {
    res.status(400).json({ error: 'No active Stripe subscription' })
    return
  }
  try {
    const result = await createValueScanPortal(billing.stripeCustomerId)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Portal failed' })
  }
})

export default router
