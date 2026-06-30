#!/usr/bin/env bash
# Enable live PayPal checkout via WHMCS on production VPS.
# Run from marketplace-hub root after WHMCS API credentials exist in .env.
#
#   bash deploy/ensure-live-paypal.sh
set -euo pipefail

APP_DIR="${MARKETPLACE_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
WHMCS_ROOT="${WHMCS_ROOT:-/var/www/whmcs}"
HOOK_SRC="$APP_DIR/whmcs/includes/hooks/printablelistings-invoice-paid.php"
HOOK_DEST="$WHMCS_ROOT/includes/hooks/printablelistings-invoice-paid.php"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Create .env from .env.example and set WHMCS_* credentials first." >&2
  exit 1
fi

echo "=== Verify WHMCS + PayPal ==="
node scripts/verify-whmcs-paypal.mjs

echo ""
echo "=== Install WHMCS InvoicePaid hook ==="
if [[ -f "$HOOK_DEST" ]]; then
  cp "$HOOK_SRC" "$HOOK_DEST"
  echo "Updated $HOOK_DEST"
else
  if [[ ! -d "$WHMCS_ROOT/includes/hooks" ]]; then
    echo "WHMCS not found at $WHMCS_ROOT — copy hook manually:" >&2
    echo "  $HOOK_SRC → billing server includes/hooks/" >&2
  else
    cp "$HOOK_SRC" "$HOOK_DEST"
    echo "Installed $HOOK_DEST"
  fi
fi

# Load webhook secret from .env for WHMCS server env snippet
WEBHOOK_SECRET="$(grep -E '^WHMCS_WEBHOOK_SECRET=' .env | cut -d= -f2- | tr -d '"'"'" || true)"
SITE_URL="$(grep -E '^SITE_URL=' .env | cut -d= -f2- | tr -d '"'"'" || echo 'https://printablelistings.xyz')"

echo ""
echo "=== WHMCS server environment (billing.nexlify.live) ==="
echo "Add to PHP-FPM pool env, Apache SetEnv, or /etc/environment:"
echo "  PRINTABLELISTINGS_API_URL=${SITE_URL%/}/api/whmcs/webhook"
echo "  PRINTABLELISTINGS_WEBHOOK_SECRET=${WEBHOOK_SECRET:-<set WHMCS_WEBHOOK_SECRET in .env>}"

echo ""
echo "=== Rebuild marketplace ==="
npm run build
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env 2>/dev/null || echo "Start manually: NODE_ENV=production npm run start:server"

echo ""
echo "=== Done ==="
echo "Checkout → PayPal should redirect to WHMCS invoice with PayPal button."
echo "Test: sign in → add item → checkout → Pay with PayPal"
