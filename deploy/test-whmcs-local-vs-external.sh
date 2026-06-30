#!/usr/bin/env bash
set -euo pipefail
cd /var/www/valuescan
set -a
source .env
set +a

echo "=== External (via Cloudflare) ==="
curl -4 -s -X POST "${WHMCS_URL%/}/includes/api.php" \
  -d "action=GetPaymentMethods" \
  -d "identifier=${WHMCS_API_IDENTIFIER}" \
  -d "secret=${WHMCS_API_SECRET}" \
  -d "responsetype=json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result'), d.get('message','')[:80])"

echo "=== Local HTTPS (127.0.0.1 + Host header) ==="
LOCAL=$(curl -4 -sk -X POST "https://127.0.0.1/includes/api.php" \
  -H "Host: billing.nexlify.live" \
  -d "action=GetPaymentMethods" \
  -d "identifier=${WHMCS_API_IDENTIFIER}" \
  -d "secret=${WHMCS_API_SECRET}" \
  -d "responsetype=json")
echo "$LOCAL" | head -c 300
echo ""
echo "$LOCAL" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result'), d.get('message','')[:80])" 2>/dev/null || echo "(not json)"
