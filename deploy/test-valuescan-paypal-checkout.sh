#!/usr/bin/env bash
# Test ValueScan PayPal checkout API on VPS
set -euo pipefail
BASE="http://127.0.0.1:4030"

echo "=== Login ==="
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"demo123"}' | python3 -c "import json,sys; print(json.load(sys.stdin).get('token',''))")
if [ -z "$TOKEN" ]; then echo "Login failed"; exit 1; fi
echo "Token ok"

echo "=== PayPal checkout ==="
curl -s -X POST "$BASE/api/billing/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"planSlug":"pro","paymentMethod":"paypal"}'
echo
