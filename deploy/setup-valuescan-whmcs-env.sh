#!/usr/bin/env bash
# Copy WHMCS credentials from marketplace .env to ValueScan .env on VPS
set -euo pipefail

VS_ENV="${VS_ENV:-/var/www/valuescan/.env}"
MP_ENV="${MP_ENV:-/var/www/marketplace-hub/.env}"

if [[ ! -f "$VS_ENV" ]]; then
  echo "Missing $VS_ENV" >&2
  exit 1
fi

get_env() {
  local file="$1" key="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r'
}

set_env() {
  local key="$1" val="$2"
  if [[ -z "$val" ]]; then return; fi
  if grep -q "^${key}=" "$VS_ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$VS_ENV"
  else
    echo "${key}=${val}" >> "$VS_ENV"
  fi
}

for key in WHMCS_URL WHMCS_API_IDENTIFIER WHMCS_API_SECRET WHMCS_API_ACCESS_KEY WHMCS_WEBHOOK_SECRET WHMCS_PAYPAL_GATEWAY; do
  val="$(get_env "$MP_ENV" "$key" 2>/dev/null || true)"
  if [[ -z "$val" ]]; then
    val="$(get_env "$VS_ENV" "$key" 2>/dev/null || true)"
  fi
  set_env "$key" "$val"
done

echo "WHMCS credentials synced to $VS_ENV"
cd /var/www/valuescan
pm2 startOrReload deploy/ecosystem-valuescan.config.cjs --update-env
pm2 save
echo "Done. Verify: curl -s http://127.0.0.1:4030/api/billing/config"
