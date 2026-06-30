#!/usr/bin/env bash
# Set ValueScan admin credentials on the VPS .env and reload PM2.
# Usage: bash deploy/set-valuescan-admin.sh [email] [password]
set -euo pipefail

REMOTE="${VALUESCAN_VPS:-root@85.17.162.54}"
ENV_FILE="${VALUESCAN_ENV:-/var/www/valuescan/.env}"
EMAIL="${1:-admin@valuescan.online}"
PASS="${2:-}"

if [ -z "$PASS" ]; then
  PASS="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
  GENERATED=1
fi

ssh "$REMOTE" "bash -s" <<EOF
set -e
touch "$ENV_FILE"
grep -q '^VALUESCAN_ADMIN_EMAIL=' "$ENV_FILE" && sed -i 's|^VALUESCAN_ADMIN_EMAIL=.*|VALUESCAN_ADMIN_EMAIL=$EMAIL|' "$ENV_FILE" || echo 'VALUESCAN_ADMIN_EMAIL=$EMAIL' >> "$ENV_FILE"
grep -q '^VALUESCAN_ADMIN_PASSWORD=' "$ENV_FILE" && sed -i 's|^VALUESCAN_ADMIN_PASSWORD=.*|VALUESCAN_ADMIN_PASSWORD=$PASS|' "$ENV_FILE" || echo 'VALUESCAN_ADMIN_PASSWORD=$PASS' >> "$ENV_FILE"
cd /var/www/valuescan
pm2 startOrReload deploy/ecosystem-valuescan.config.cjs --update-env
pm2 save
EOF

echo ""
echo "Admin URL:  https://valuescan.online/admin"
echo "Sign in:    https://valuescan.online/login"
echo "Email:      $EMAIL"
echo "Password:   $PASS"
if [ "${GENERATED:-0}" = 1 ]; then
  echo ""
  echo "Save this password — it will not be shown again."
fi
