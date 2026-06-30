#!/usr/bin/env bash
set -euo pipefail
cd /var/www/valuescan
export $(grep -E '^WHMCS_' .env | xargs)
node <<'NODE'
import { getOrCreateWhmcsClient } from './server/lib/whmcs-service.js'
import { getAuthenticatedInvoicePaymentUrl } from './server/lib/whmcs-service.js'
import { initDb, db } from './server/db.js'

initDb()
const user = db.prepare("SELECT id, email, name, whmcs_client_id FROM users WHERE email = 'admin@demo.com'").get()
if (!user) { console.error('No admin user'); process.exit(1) }
const clientId = await getOrCreateWhmcsClient(user)
const url = await getAuthenticatedInvoicePaymentUrl(clientId, 1, { returnUrl: 'https://valuescan.online/account' })
console.log('SSO URL ok:', url.startsWith('http'), url.slice(0, 80) + '...')
NODE
