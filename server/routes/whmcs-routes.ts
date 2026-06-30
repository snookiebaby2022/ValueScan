import { Router } from 'express'
import {
  completeWhmcsInvoice,
  getPaypalGatewayModule,
  getWhmcsOrigin,
  isWhmcsConfigured,
  syncWhmcsInvoicePayment,
  verifyWhmcsWebhook,
} from '../lib/whmcs-service.js'
import { completeValueScanWhmcsInvoice } from '../lib/valuescan-whmcs.js'

const router = Router()

router.get('/config', async (_req, res) => {
  const whmcsEnabled = isWhmcsConfigured()
  const paypalGateway = whmcsEnabled ? await getPaypalGatewayModule() : null
  res.json({
    whmcsEnabled,
    paypalEnabled: !!paypalGateway,
    paypalGateway: paypalGateway ?? undefined,
    billingUrl: getWhmcsOrigin(),
    paypalViaWhmcs: !!paypalGateway,
  })
})

router.post('/webhook', async (req, res) => {
  const headerSecret = req.headers['x-whmcs-api-key'] as string | undefined
  const bodySecret = typeof req.body?.secret === 'string' ? req.body.secret : undefined
  const secret = headerSecret ?? bodySecret

  if (!verifyWhmcsWebhook(secret)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const invoiceId = Number(req.body?.invoiceId ?? req.body?.invoiceid ?? 0)
  if (!invoiceId) {
    res.status(400).json({ error: 'invoiceId required' })
    return
  }

  try {
    const paid = await syncWhmcsInvoicePayment(invoiceId)
    const result = completeWhmcsInvoice(invoiceId)
    const valuescan = completeValueScanWhmcsInvoice(invoiceId)
    res.json({ ok: true, paid, valuescan, ...result })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Webhook failed' })
  }
})

export default router
