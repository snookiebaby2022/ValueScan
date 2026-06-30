#!/bin/bash
# Add SPF + DMARC TXT records for valuescan.online via Cloudflare API
# Usage:
#   CF_API_TOKEN=xxx bash deploy/add-valuescan-dns-cloudflare.sh
# Or:
#   CF_EMAIL=you@example.com CF_GLOBAL_KEY=xxx bash deploy/add-valuescan-dns-cloudflare.sh

set -e

DOMAIN="${1:-valuescan.online}"
SPF='v=spf1 include:_spf.google.com include:amazonses.com include:spf.brevo.com ~all'
DMARC="v=DMARC1; p=none; rua=mailto:hello@${DOMAIN}; fo=1"

auth_header() {
  if [ -n "$CF_API_TOKEN" ]; then
    echo "Authorization: Bearer ${CF_API_TOKEN}"
  elif [ -n "$CF_EMAIL" ] && [ -n "$CF_GLOBAL_KEY" ]; then
    echo -X GET -H "X-Auth-Email: ${CF_EMAIL}" -H "X-Auth-Key: ${CF_GLOBAL_KEY}"
  else
    echo "Set CF_API_TOKEN or CF_EMAIL + CF_GLOBAL_KEY (Cloudflare dashboard → API Tokens)"
    exit 1
  fi
}

get_zone_id() {
  if [ -n "$CF_API_TOKEN" ]; then
    curl -s -H "Authorization: Bearer ${CF_API_TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
      | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).result[0]?.id ?? ''"
  else
    curl -s -H "X-Auth-Email: ${CF_EMAIL}" -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
      "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
      | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).result[0]?.id ?? ''"
  fi
}

upsert_txt() {
  local name="$1" content="$2"
  local zone="$3"
  local auth="$4"

  local existing
  if [ -n "$CF_API_TOKEN" ]; then
    existing=$(curl -s -H "Authorization: Bearer ${CF_API_TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${zone}/dns_records?type=TXT&name=${name}")
  else
    existing=$(curl -s -H "X-Auth-Email: ${CF_EMAIL}" -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
      "https://api.cloudflare.com/client/v4/zones/${zone}/dns_records?type=TXT&name=${name}")
  fi

  local id
  id=$(echo "$existing" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).result.find(r=>r.content.includes('${content:0:20}'))?.id ?? ''" 2>/dev/null || true)

  local payload
  payload=$(node -e "console.log(JSON.stringify({type:'TXT',name:'${name}',content:'${content}',ttl:3600}))")

  if [ -n "$id" ]; then
    echo "TXT ${name} already exists (id ${id})"
    return
  fi

  if [ -n "$CF_API_TOKEN" ]; then
    curl -s -X POST -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
      -d "$payload" "https://api.cloudflare.com/client/v4/zones/${zone}/dns_records" \
      | node -p "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!r.success) throw new Error(JSON.stringify(r.errors)); 'Created '+r.result.name"
  else
    curl -s -X POST -H "X-Auth-Email: ${CF_EMAIL}" -H "X-Auth-Key: ${CF_GLOBAL_KEY}" -H "Content-Type: application/json" \
      -d "$payload" "https://api.cloudflare.com/client/v4/zones/${zone}/dns_records" \
      | node -p "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!r.success) throw new Error(JSON.stringify(r.errors)); 'Created '+r.result.name"
  fi
}

ZONE=$(get_zone_id)
if [ -z "$ZONE" ]; then
  echo "Could not find Cloudflare zone for ${DOMAIN}"
  exit 1
fi

echo "Zone ID: ${ZONE}"
upsert_txt "${DOMAIN}" "$SPF" "$ZONE"
upsert_txt "_dmarc.${DOMAIN}" "$DMARC" "$ZONE"

echo ""
echo "Waiting 30s for DNS propagation..."
sleep 30
bash "$(dirname "$0")/setup-valuescan-dns.sh" "$DOMAIN"
