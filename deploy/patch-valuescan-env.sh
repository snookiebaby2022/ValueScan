#!/bin/bash
ENV=/var/www/valuescan/.env
append_if_missing() {
  grep -q "^$1=" "$ENV" 2>/dev/null || echo "$1=" >> "$ENV"
}
append_if_missing STRIPE_SECRET_KEY
append_if_missing STRIPE_WEBHOOK_SECRET
append_if_missing STRIPE_VALUESCAN_PRO_PRICE_ID
append_if_missing STRIPE_VALUESCAN_AGENCY_PRICE_ID
append_if_missing WHMCS_URL
append_if_missing WHMCS_API_IDENTIFIER
append_if_missing WHMCS_API_SECRET
append_if_missing WHMCS_API_ACCESS_KEY
append_if_missing WHMCS_WEBHOOK_SECRET
append_if_missing WHMCS_PAYPAL_GATEWAY
append_if_missing SMTP_HOST
append_if_missing SMTP_PORT
append_if_missing SMTP_USER
append_if_missing SMTP_PASS
append_if_missing SMTP_FROM
echo "Stripe/SMTP keys present in .env:"
grep -E "^(STRIPE|SMTP)" "$ENV" | cut -d= -f1
