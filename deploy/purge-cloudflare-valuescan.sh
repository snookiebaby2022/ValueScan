#!/bin/bash
# Purge Cloudflare cache and verify DNS for valuescan.online
#
# Usage:
#   CF_API_TOKEN=your_token bash deploy/purge-cloudflare-valuescan.sh
#
# Create token at: Cloudflare Dashboard → My Profile → API Tokens
# Permissions needed: Zone → Cache Purge → Purge, Zone → DNS → Read, Zone → Zone → Read

set -euo pipefail

DOMAIN="${1:-valuescan.online}"
ORIGIN_IP="${2:-85.17.162.54}"

if [ -z "${CF_API_TOKEN:-}" ]; then
  echo "ERROR: Set CF_API_TOKEN (Cloudflare → My Profile → API Tokens)"
  echo ""
  echo "Or fix manually in Cloudflare Dashboard:"
  echo "  1. Workers & Pages → remove valuescan.online from any Pages project"
  echo "  2. DNS → valuescan.online A record → ${ORIGIN_IP} (proxied orange cloud OK)"
  echo "  3. Caching → Purge Everything"
  exit 1
fi

API="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json")

echo "=== Cloudflare fix for ${DOMAIN} ==="

zone=$(curl -s "${auth[@]}" "${API}/zones?name=${DOMAIN}" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).result[0]?.id ?? ''")
if [ -z "$zone" ]; then
  echo "ERROR: Could not find Cloudflare zone for ${DOMAIN}"
  exit 1
fi
echo "Zone ID: $zone"

echo ""
echo "--- DNS records ---"
curl -s "${auth[@]}" "${API}/zones/${zone}/dns_records?type=A&name=${DOMAIN}" \
  | node -pe "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); r.result.forEach(x=>console.log(x.type, x.name, '->', x.content, x.proxied?'(proxied)':'(dns-only)')); ''"

echo ""
echo "--- Purging cache ---"
purge=$(curl -s -X POST "${auth[@]}" "${API}/zones/${zone}/purge_cache" -d '{"purge_everything":true}')
echo "$purge" | node -pe "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); r.success ? 'Purge OK' : 'Purge FAILED: '+JSON.stringify(r.errors)"

echo ""
echo "--- Verify (should show index-Bb9NhFiR.js, NOT index-B5rdrrry.js) ---"
sleep 3
html=$(curl -s "https://${DOMAIN}/")
echo "$html" | grep -oE 'src="[^"]*assets[^"]*"' | head -1 || echo "(no asset tag found)"

echo ""
echo "If still old bundle (./assets/index-B5rdrrry.js):"
echo "  → Workers & Pages → disconnect ${DOMAIN} from any Pages deployment"
