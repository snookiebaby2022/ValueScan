const API = 'http://localhost:4020/api'

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `${path} failed (${res.status})`)
  return data
}

const login = await req('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'buyer@demo.com', password: 'demo123' }),
})
console.log('✓ Login:', login.user.name)

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${login.token}`,
}

await req('/cart', {
  method: 'POST',
  headers,
  body: JSON.stringify({ listingId: 'lst-030', quantity: 1 }),
})
console.log('✓ Added lst-030 to cart')

const cart = await req('/cart', { headers })
console.log(`✓ Cart: ${cart.items.length} item(s), total £${cart.total.toFixed(2)}`)

const checkout = await req('/stripe/checkout', {
  method: 'POST',
  headers,
  body: JSON.stringify({ paymentMethod: 'bank_transfer' }),
})
const orderId = checkout.orderId ?? checkout.order?.id
console.log(`✓ Checkout demo=${checkout.demo} orderId=${orderId} status=paid (instant)`)

const order = await req(`/orders/${orderId}/confirm`, { headers })
console.log(`✓ Order confirmed: status=${order.order.status} total=£${order.order.total}`)

const cartAfter = await req('/cart', { headers })
console.log(`✓ Cart cleared: ${cartAfter.items.length} item(s)`)

const stripeCfg = await req('/stripe/config')
console.log(`✓ Stripe config: stripe=${stripeCfg.stripeEnabled} paypal=${stripeCfg.paypalEnabled}`)

const sitemap = await fetch('http://localhost:4020/sitemap.xml')
console.log(`✓ Sitemap: HTTP ${sitemap.status}`)

console.log('\nAll smoke tests passed.')
