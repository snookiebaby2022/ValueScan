import { db, calcVat, type ListingRow } from '../db.js'
import { calcBuyerProtectionFee, calcPlatformFee } from '../config/fees.js'

export type CartLine = { listing_id: string; quantity: number } & ListingRow

export type OrderTotals = {
  subtotal: number
  shippingTotal: number
  platformFee: number
  buyerProtectionFee: number
  vatAmount: number
  total: number
}

export function computeOrderTotals(cartRows: CartLine[]): OrderTotals {
  let subtotal = 0
  let shippingTotal = 0
  for (const row of cartRows) {
    subtotal += row.price * row.quantity
    const isDigital = (row.listing_kind ?? 'physical') === 'digital'
    if (!isDigital) shippingTotal += row.shipping_free ? 0 : row.shipping_cost
  }
  const platformFee = calcPlatformFee(subtotal)
  const buyerProtectionFee = calcBuyerProtectionFee(subtotal)
  const vatAmount = calcVat(subtotal + platformFee + buyerProtectionFee)
  const total = subtotal + shippingTotal + platformFee + buyerProtectionFee + vatAmount
  return { subtotal, shippingTotal, platformFee, buyerProtectionFee, vatAmount, total }
}

export function createPendingOrder(
  userId: string,
  cartRows: CartLine[],
  totals: OrderTotals,
  paymentMethod: string,
  shipping: { name: string; line1: string; line2: string | null; city: string; county: string; postcode: string },
) {
  const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`
  const now = new Date().toISOString()

  db.transaction(() => {
    db.prepare(
      `INSERT INTO orders (id, user_id, status, subtotal, shipping_total, total, vat_amount, platform_fee,
        buyer_protection_fee, currency, payment_method, shipping_name, shipping_line1, shipping_line2,
        shipping_city, shipping_state, shipping_zip, shipping_county, shipping_postcode, created_at)
       VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, 'GBP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      orderId, userId, totals.subtotal, totals.shippingTotal, totals.total, totals.vatAmount,
      totals.platformFee, totals.buyerProtectionFee, paymentMethod,
      shipping.name, shipping.line1, shipping.line2, shipping.city, shipping.county, shipping.postcode,
      shipping.county, shipping.postcode, now,
    )

    const insertItem = db.prepare(
      `INSERT INTO order_items (id, order_id, listing_id, seller_id, title, quantity, unit_price, shipping_cost, platform_fee, seller_payout)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    for (const row of cartRows) {
      const itemSubtotal = row.price * row.quantity
      const itemPlatformFee = totals.subtotal > 0
        ? Math.round((itemSubtotal / totals.subtotal) * totals.platformFee * 100) / 100
        : 0
      const itemPayout = Math.round((itemSubtotal - itemPlatformFee) * 100) / 100
      const isDigital = (row.listing_kind ?? 'physical') === 'digital'
      insertItem.run(
        crypto.randomUUID(), orderId, row.listing_id, row.seller_id, row.title, row.quantity, row.price,
        isDigital ? 0 : (row.shipping_free ? 0 : row.shipping_cost),
        itemPlatformFee, itemPayout,
      )
    }
  })()

  return { orderId, createdAt: now }
}

export function completeOrderPayment(orderId: string) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as {
    id: string; user_id: string; status: string
  } | undefined
  if (!order) return null
  if (order.status === 'paid') {
    return { orderId, alreadyPaid: true, digitalDeliveries: [] as Array<{ note: string; listingId: string }> }
  }
  if (order.status !== 'pending_payment') return null

  const items = db.prepare(
    `SELECT oi.id as item_id, oi.listing_id, oi.quantity, oi.seller_id, l.digital_delivery, l.listing_kind
     FROM order_items oi JOIN listings l ON oi.listing_id = l.id WHERE oi.order_id = ?`,
  ).all(orderId) as Array<{
    item_id: string; listing_id: string; quantity: number; seller_id: string
    digital_delivery: string | null; listing_kind: string
  }>

  const now = new Date().toISOString()
  const digitalDeliveries: Array<{ note: string; listingId: string }> = []

  db.transaction(() => {
    for (const item of items) {
      db.prepare('UPDATE listings SET stock = stock - ?, sold = sold + ? WHERE id = ?').run(
        item.quantity, item.quantity, item.listing_id,
      )
      db.prepare('UPDATE users SET total_sales = COALESCE(total_sales, 0) + ? WHERE id = ?').run(
        item.quantity, item.seller_id,
      )
      const isDigital = (item.listing_kind ?? 'physical') === 'digital'
      if (isDigital && item.digital_delivery) {
        db.prepare(
          `INSERT INTO digital_deliveries (id, order_item_id, user_id, listing_id, delivery_note, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(crypto.randomUUID(), item.item_id, order.user_id, item.listing_id, item.digital_delivery, now)
        digitalDeliveries.push({ note: item.digital_delivery, listingId: item.listing_id })
      }
    }
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id)
    db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId)
  })()

  return { orderId, alreadyPaid: false, digitalDeliveries }
}

export function fulfillDemoOrder(
  userId: string,
  cartRows: CartLine[],
  totals: OrderTotals,
  paymentMethod: string,
  shipping: { name: string; line1: string; line2: string | null; city: string; county: string; postcode: string },
) {
  const { orderId } = createPendingOrder(userId, cartRows, totals, paymentMethod, shipping)
  const result = completeOrderPayment(orderId)!
  return { orderId, digitalDeliveries: result.digitalDeliveries }
}
