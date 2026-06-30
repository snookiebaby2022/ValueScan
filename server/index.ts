import './env.js'

import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import { initDb } from './db.js'
import { SITE } from './config/site.js'
import { VALUESCAN } from './config/valuescan.js'
import { isValueScanMode } from './config/app-mode.js'
import { PORTS, clientOrigin } from './config/ports.js'
import authRoutes from './routes/auth.js'
import listingRoutes from './routes/listings.js'
import cartRoutes from './routes/cart.js'
import orderRoutes from './routes/orders.js'
import sellerRoutes from './routes/seller.js'
import categoryRoutes from './routes/categories.js'
import watchlistRoutes from './routes/watchlist.js'
import offerRoutes from './routes/offers.js'
import bidRoutes from './routes/bids.js'
import adminRoutes from './routes/admin.js'
import verificationRoutes from './routes/verification.js'
import stripeRoutes, { stripeWebhookRouter } from './routes/stripe-routes.js'
import whmcsRoutes from './routes/whmcs-routes.js'
import sitemapRoutes from './routes/sitemap.js'
import auditRoutes from './routes/audit.js'
import auditAdminRoutes from './routes/audit-admin.js'
import { apiV1Router } from './routes/audit-features.js'
import valuescanSeoRoutes from './routes/valuescan-seo.js'
import valuescanBillingRoutes, { valuescanBillingWebhook } from './routes/valuescan-billing.js'
import growthRoutes from './routes/growth-routes.js'
import { startMonitorWorker } from './lib/monitor-worker.js'
import { startGrowthWorker } from './lib/growth-worker.js'
import { securityHeaders } from './middleware/security-headers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const valueScanOnly = isValueScanMode()

initDb()

const app = express()
app.disable('x-powered-by')
app.use(securityHeaders)

const allowedOrigins = valueScanOnly
  ? [
      VALUESCAN.url,
      `https://www.${VALUESCAN.domain}`,
      clientOrigin(),
      `http://localhost:${PORTS.CLIENT}`,
      `http://127.0.0.1:${PORTS.CLIENT}`,
    ]
  : [
      ...SITE.allowedOrigins,
      VALUESCAN.url,
      `https://www.${VALUESCAN.domain}`,
      clientOrigin(),
      `http://localhost:${PORTS.CLIENT}`,
      `http://127.0.0.1:${PORTS.CLIENT}`,
    ]

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(null, false)
  },
  credentials: true,
}))

if (!valueScanOnly) {
  app.use('/api/stripe', stripeWebhookRouter)
} else {
  app.use('/api/billing', valuescanBillingWebhook)
}
app.use(express.json())
if (valueScanOnly) {
  app.use(valuescanSeoRoutes)
} else {
  app.use(sitemapRoutes)
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
}

app.get('/api/health', (_req, res) => {
  if (valueScanOnly) {
    res.json({
      ok: true,
      app: 'valuescan',
      site: VALUESCAN.domain,
      url: VALUESCAN.url,
      ports: { api: PORTS.API, client: PORTS.CLIENT },
    })
    return
  }
  res.json({
    ok: true,
    currency: 'GBP',
    region: 'UK',
    site: SITE.domain,
    url: SITE.url,
    ports: { api: PORTS.API, client: PORTS.CLIENT },
    note: 'Uses ports 4020/5180 to avoid Nexlify (3000/3001)',
  })
})

app.use('/api/auth', authRoutes)
if (valueScanOnly) {
  app.use('/api/billing', valuescanBillingRoutes)
  app.use('/api/whmcs', whmcsRoutes)
  app.use('/api/growth', growthRoutes)
}
app.use('/api/audit/admin', auditAdminRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/v1', apiV1Router)

if (!valueScanOnly) {
  app.use('/api/categories', categoryRoutes)
  app.use('/api/listings', listingRoutes)
  app.use('/api/cart', cartRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/seller', sellerRoutes)
  app.use('/api/watchlist', watchlistRoutes)
  app.use('/api/offers', offerRoutes)
  app.use('/api/bids', bidRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/verification', verificationRoutes)
  app.use('/api/stripe', stripeRoutes)
  app.use('/api/whmcs', whmcsRoutes)
}

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  const spaPattern = valueScanOnly
    ? /^(?!\/api\/).*/
    : /^(?!\/api\/|\/uploads\/|\/sitemap\.xml).*/
  app.get(spaPattern, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORTS.API, () => {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  const label = valueScanOnly ? `ValueScan (${VALUESCAN.domain})` : `Marketplace (${SITE.domain})`
  console.log(`${label} API at http://localhost:${PORTS.API} (${mode})`)
  if (mode === 'development') {
    console.log(`Frontend dev: http://localhost:${PORTS.CLIENT}`)
  }
  if (valueScanOnly || process.env.ENABLE_MONITORS !== 'false') {
    startMonitorWorker()
  }
  if (valueScanOnly) {
    startGrowthWorker()
  }
})
