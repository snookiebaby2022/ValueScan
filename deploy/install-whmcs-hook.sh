#!/usr/bin/env bash
# Install Printable Listings WHMCS InvoicePaid hook on billing.nexlify.live
set -euo pipefail

APP_DIR="${MARKETPLACE_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
WHMCS_ROOT="${WHMCS_ROOT:-/var/www/whmcs}"
HOOKS="$WHMCS_ROOT/includes/hooks"

echo "=== Printable Listings WHMCS hook ==="

if [[ ! -d "$HOOKS" ]]; then
  echo "WHMCS hooks dir not found: $HOOKS" >&2
  echo "Set WHMCS_ROOT=/path/to/whmcs" >&2
  exit 1
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "Missing $APP_DIR/.env" >&2
  exit 1
fi

cd "$APP_DIR"
node scripts/setup-webhook.mjs

cp "$APP_DIR/whmcs/includes/hooks/printablelistings-invoice-paid.php" "$HOOKS/"
cp "$APP_DIR/whmcs/includes/hooks/printablelistings.local.php" "$HOOKS/"
cp "$APP_DIR/whmcs/includes/hooks/valuescan-invoice-paid.php" "$HOOKS/"

WEBHOOK_SECRET="$(grep -E '^WHMCS_WEBHOOK_SECRET=' "$APP_DIR/.env" | cut -d= -f2- | tr -d '"'"'" || true)"
VALUESCAN_URL="${VALUESCAN_URL:-https://valuescan.online}"
cat > "$HOOKS/valuescan.local.php" <<EOF
<?php
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}
define('VALUESCAN_API_URL', '${VALUESCAN_URL%/}/api/whmcs/webhook');
define('VALUESCAN_WEBHOOK_SECRET', '${WEBHOOK_SECRET}');
EOF

chmod 640 "$HOOKS/printablelistings.local.php" 2>/dev/null || true
chmod 640 "$HOOKS/valuescan.local.php" 2>/dev/null || true

echo ""
echo "Installed:"
echo "  $HOOKS/printablelistings-invoice-paid.php"
echo "  $HOOKS/printablelistings.local.php"
echo "  $HOOKS/valuescan-invoice-paid.php"
echo "  $HOOKS/valuescan.local.php"
echo ""
echo "Done — PayPal payments notify printablelistings.xyz and valuescan.online when invoices are paid."
