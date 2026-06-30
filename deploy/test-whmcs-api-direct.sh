#!/usr/bin/env bash
set -euo pipefail
cd /var/www/valuescan
set -a
source .env
set +a

echo "Testing WHMCS API from $(curl -4 -s ifconfig.me) ..."
echo "Identifier: ${WHMCS_API_IDENTIFIER:0:12}..."

for ACTION in GetPaymentMethods CreateSsoToken; do
  echo "--- $ACTION ---"
  RESP=$(curl -4 -s -X POST "${WHMCS_URL%/}/includes/api.php" \
    -d "action=${ACTION}" \
    -d "identifier=${WHMCS_API_IDENTIFIER}" \
    -d "secret=${WHMCS_API_SECRET}" \
    -d "responsetype=json" \
    -d "client_id=1" \
    -d "destination=sso:custom_redirect" \
    -d "sso_redirect_path=viewinvoice.php?id=1")
  echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print('result:', d.get('result'), '|', d.get('message','')[:120])"
done
