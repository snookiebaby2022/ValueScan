#!/usr/bin/env bash
set -euo pipefail
sleep 3
echo "=== billing/config ==="
curl -s http://127.0.0.1:4030/api/billing/config
echo
echo "=== whmcs/config ==="
curl -s http://127.0.0.1:4030/api/whmcs/config
echo

HOOKS="/var/www/whmcs/includes/hooks"
SECRET="$(grep '^WHMCS_WEBHOOK_SECRET=' /var/www/valuescan/.env | cut -d= -f2- | tr -d '\r')"
cat > "$HOOKS/valuescan.local.php" <<EOF
<?php
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}
define('VALUESCAN_API_URL', 'https://valuescan.online/api/whmcs/webhook');
define('VALUESCAN_WEBHOOK_SECRET', '${SECRET}');
EOF
chmod 640 "$HOOKS/valuescan.local.php"
echo "=== WHMCS hook ==="
ls -la "$HOOKS/valuescan"*
