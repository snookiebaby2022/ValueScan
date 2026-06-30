import { Router } from 'express'
import { db } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { syncOrderWhmcsPayment } from '../lib/whmcs-service.js'

const router = Router()

router.use(authRequired)

router.get('/', (req, res) => {
  const orders = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
  ).all(req.user!.userId) as Array<Record<string, unknown>>

  const result = orders.map((order) => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id as string)
    const deliveries = db.prepare(
      'SELECT * FROM digital_deliveries WHERE user_id = ? AND order_item_id IN (SELECT id FROM order_items WHERE order_id = ?)',
    ).all(req.user!.userId, order.id as string)
    return {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      shippingTotal: order.shipping_total,
      platformFee: order.platform_fee ?? 0,
      buyerProtectionFee: order.buyer_protection_fee ?? 0,
      vatAmount: order.vat_amount ?? 0,
      total: order.total,
      currency: order.currency ?? 'GBP',
      paymentMethod: order.payment_method ?? 'card',
      shipping: {
        name: order.shipping_name,
        line1: order.shipping_line1,
        line2: order.shipping_line2,
        city: order.shipping_city,
        county: order.shipping_county ?? order.shipping_state,
        postcode: order.shipping_postcode ?? order.shipping_zip,
      },
      items,
      digitalDeliveries: deliveries,
      createdAt: order.created_at,
    }
  })

  res.json({ orders: result })
})

router.get('/:id/confirm', async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(
    req.params.id, req.user!.userId,
  ) as Record<string, unknown> | undefined
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }

  if (order.status === 'pending_payment' && order.whmcs_invoice_id) {
    try {
      await syncOrderWhmcsPayment(req.params.id)
    } catch {
      // WHMCS unreachable — return current order state
    }
    const refreshed = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown>
    if (refreshed) Object.assign(order, refreshed)
  }
  const deliveries = db.prepare(
    'SELECT delivery_note, listing_id FROM digital_deliveries WHERE user_id = ? AND order_item_id IN (SELECT id FROM order_items WHERE order_id = ?)',
  ).all(req.user!.userId, req.params.id) as Array<{ delivery_note: string; listing_id: string }>

  res.json({
    order: {
      id: order.id,
      status: order.status,
      total: order.total,
      platformFee: order.platform_fee ?? 0,
      digitalDeliveries: deliveries.map((d) => ({ note: d.delivery_note, listingId: d.listing_id })),
    },
  })
})

export default router
