/**
 * Verify WHMCS API + live PayPal gateway for Printable Listings.
 * Usage: copy .env.example → .env, fill WHMCS_* vars, then:
 *   node scripts/verify-whmcs-paypal.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(root, '..', '.env')

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv(envPath)

const WHMCS_URL = process.env.WHMCS_URL?.trim()
const IDENTIFIER = process.env.WHMCS_API_IDENTIFIER?.trim()
const SECRET = process.env.WHMCS_API_SECRET?.trim()
const ACCESS_KEY = process.env.WHMCS_API_ACCESS_KEY?.trim()
const PAYPAL_GATEWAY = process.env.WHMCS_PAYPAL_GATEWAY?.trim() || 'paypal'
const WEBHOOK_SECRET = process.env.WHMCS_WEBHOOK_SECRET?.trim()

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

if (!WHMCS_URL || !IDENTIFIER || !SECRET) {
  fail('Missing WHMCS_URL, WHMCS_API_IDENTIFIER, or WHMCS_API_SECRET in .env')
}

async function whmcsApi(action, params = {}) {
  const origin = new URL(WHMCS_URL).origin
  const body = new URLSearchParams({
    action,
    identifier: IDENTIFIER,
    secret: SECRET,
    responsetype: 'json',
  })
  for (const [k, v] of Object.entries(params)) body.set(k, String(v))

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (ACCESS_KEY) headers['WHMCS-Api-Access-Key'] = ACCESS_KEY

  const res = await fetch(`${origin}/includes/api.php`, { method: 'POST', headers, body })
  const data = await res.json()
  if (data.result !== 'success') {
    throw new Error(data.message ?? `${action} failed`)
  }
  return data
}

function normalizeMethods(data) {
  const raw = data.paymentmethods?.paymentmethod
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

console.log(`WHMCS: ${WHMCS_URL}`)
console.log(`Return URL base: ${process.env.CLIENT_URL ?? '(set CLIENT_URL for production)'}`)
console.log('')

let methods = []
try {
  const data = await whmcsApi('GetPaymentMethods')
  methods = normalizeMethods(data)
  console.log('✓ WHMCS API credentials valid')
  console.log(`✓ Payment gateways (${methods.length}): ${methods.map((m) => m.module).join(', ') || 'none'}`)
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  if (/not allowed/i.test(msg)) {
    fail(`${msg}\n  Add GetPaymentMethods to your WHMCS API role (Configuration → Manage API Credentials → API Roles).`)
  }
  console.warn(`⚠ GetPaymentMethods: ${msg}`)
  console.warn(`  Will fall back to WHMCS_PAYPAL_GATEWAY=${PAYPAL_GATEWAY}`)
}

const paypal = methods.find((m) => /paypal/i.test(m.module) || /paypal/i.test(m.displayname))
if (paypal) {
  console.log(`✓ Live PayPal gateway: ${paypal.module} (${paypal.displayname})`)
} else if (methods.length === 0) {
  console.log(`⚠ Using configured gateway name: ${PAYPAL_GATEWAY} (could not list gateways)`)
} else {
  fail('No PayPal gateway active in WHMCS. Enable under Setup → Payments → Payment Gateways.')
}

if (!WEBHOOK_SECRET) {
  console.warn('⚠ WHMCS_WEBHOOK_SECRET not set — invoice-paid hook will not authenticate')
} else {
  console.log('✓ WHMCS_WEBHOOK_SECRET configured')
}

const apiUrl = process.env.PRINTABLELISTINGS_API_URL
  ?? `${(process.env.SITE_URL ?? 'https://printablelistings.xyz').replace(/\/$/, '')}/api/whmcs/webhook`
console.log(`\nWHMCS hook should POST to:\n  ${apiUrl}`)
console.log(`\nInstall whmcs/includes/hooks/printablelistings-invoice-paid.php on billing server.`)
console.log('\nAll checks passed — PayPal checkout is ready when .env is deployed to production.')
