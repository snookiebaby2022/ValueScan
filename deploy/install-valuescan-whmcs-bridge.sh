#!/usr/bin/env bash
# Install ValueScan WHMCS local API bridge (same-server — bypasses API IP allowlist)
set -euo pipefail

WHMCS_ROOT="${WHMCS_ROOT:-/var/www/whmcs}"
VS_ENV="${VS_ENV:-/var/www/valuescan/.env}"
APP_DIR="${APP_DIR:-/var/www/valuescan}"
BRIDGE="$WHMCS_ROOT/valuescan-api-bridge.php"
LOCAL="$WHMCS_ROOT/includes/hooks/valuescan-bridge.local.php"

echo "=== ValueScan WHMCS bridge ==="

cp "$APP_DIR/whmcs/valuescan-api-bridge.php" "$BRIDGE"
chown www-data:www-data "$BRIDGE"
chmod 640 "$BRIDGE"

# Generate or reuse bridge secret
if grep -q '^VALUESCAN_BRIDGE_SECRET=' "$VS_ENV" 2>/dev/null; then
  SECRET="$(grep '^VALUESCAN_BRIDGE_SECRET=' "$VS_ENV" | cut -d= -f2- | tr -d '\r')"
else
  SECRET="$(openssl rand -hex 32)"
  echo "VALUESCAN_BRIDGE_SECRET=$SECRET" >> "$VS_ENV"
  echo "Added VALUESCAN_BRIDGE_SECRET to $VS_ENV"
fi

cat > "$LOCAL" <<EOF
<?php
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}
define('VALUESCAN_BRIDGE_SECRET', '${SECRET}');
EOF
chown www-data:www-data "$LOCAL"
chmod 640 "$LOCAL"

# Dedicated localhost HTTP port — avoids billing.nexlify.live HTTP→HTTPS redirect
BRIDGE_PORT="${VALUESCAN_BRIDGE_PORT:-9187}"
NGINX_BRIDGE="/etc/nginx/sites-enabled/valuescan-whmcs-bridge.conf"
cat > "$NGINX_BRIDGE" <<EOF
server {
    listen 127.0.0.1:${BRIDGE_PORT};
    listen [::1]:${BRIDGE_PORT};
    server_name localhost;
    root ${WHMCS_ROOT};

    location = /valuescan-api-bridge.php {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTPS on;
        fastcgi_param HTTP_X_FORWARDED_PROTO https;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location / {
        return 404;
    }
}
EOF

nginx -t && systemctl reload nginx
echo "Nginx bridge on 127.0.0.1:${BRIDGE_PORT}"

BRIDGE_URL="http://127.0.0.1:${BRIDGE_PORT}/valuescan-api-bridge.php"
if grep -q '^WHMCS_BRIDGE_URL=' "$VS_ENV" 2>/dev/null; then
  sed -i "s|^WHMCS_BRIDGE_URL=.*|WHMCS_BRIDGE_URL=${BRIDGE_URL}|" "$VS_ENV"
else
  echo "WHMCS_BRIDGE_URL=${BRIDGE_URL}" >> "$VS_ENV"
fi

cd /var/www/valuescan
pm2 startOrReload deploy/ecosystem-valuescan.config.cjs --update-env
pm2 save

echo "Testing bridge..."
curl -4 -s -X POST "$BRIDGE_URL" \
  -H "X-ValueScan-Bridge-Secret: $SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action":"ping"}'
echo ""
echo "Done. PayPal checkout should work without WHMCS API IP allowlist."
