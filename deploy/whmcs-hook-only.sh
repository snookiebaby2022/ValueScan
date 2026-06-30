#!/usr/bin/env bash
# Install Printable Listings WHMCS hook — run on billing server (no marketplace-hub required).
#
#   export WHMCS_WEBHOOK_SECRET='paste-from-marketplace-.env'
#   export SITE_URL='https://printablelistings.xyz'
#   bash whmcs-hook-only.sh
#
# Or one line:
#   WHMCS_WEBHOOK_SECRET='your-secret' SITE_URL='https://printablelistings.xyz' bash whmcs-hook-only.sh
set -euo pipefail

WHMCS_ROOT="${WHMCS_ROOT:-/var/www/whmcs}"
HOOKS="$WHMCS_ROOT/includes/hooks"
SECRET="${WHMCS_WEBHOOK_SECRET:-}"
SITE_URL="${SITE_URL:-https://printablelistings.xyz}"
API_URL="${PRINTABLELISTINGS_API_URL:-${SITE_URL%/}/api/whmcs/webhook}"

if [[ -z "$SECRET" ]]; then
  echo "Set WHMCS_WEBHOOK_SECRET (same value as marketplace .env)" >&2
  exit 1
fi

if [[ ! -d "$HOOKS" ]]; then
  echo "WHMCS hooks folder not found: $HOOKS" >&2
  echo "Set WHMCS_ROOT if WHMCS is elsewhere." >&2
  exit 1
fi

mkdir -p "$HOOKS"

cat >"$HOOKS/printablelistings.local.php" <<EOF
<?php
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}
define('PRINTABLELISTINGS_API_URL', '${API_URL}');
define('PRINTABLELISTINGS_WEBHOOK_SECRET', '${SECRET}');
EOF
chmod 640 "$HOOKS/printablelistings.local.php"

cat >"$HOOKS/printablelistings-invoice-paid.php" <<'EOFPHP'
<?php
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

$localConfig = __DIR__ . '/printablelistings.local.php';
if (is_readable($localConfig)) {
    require_once $localConfig;
}

add_hook('InvoicePaid', 1, function (array $vars) {
    $invoiceId = (int) ($vars['invoiceid'] ?? 0);
    if ($invoiceId <= 0) {
        return;
    }

    $apiUrl = defined('PRINTABLELISTINGS_API_URL')
        ? PRINTABLELISTINGS_API_URL
        : (getenv('PRINTABLELISTINGS_API_URL') ?: 'https://printablelistings.xyz/api/whmcs/webhook');

    $secret = defined('PRINTABLELISTINGS_WEBHOOK_SECRET')
        ? PRINTABLELISTINGS_WEBHOOK_SECRET
        : (getenv('PRINTABLELISTINGS_WEBHOOK_SECRET') ?: '');

    if ($secret === '') {
        logActivity('Printable Listings hook: secret not set — skipped invoice ' . $invoiceId);
        return;
    }

    $payload = json_encode(['invoiceId' => $invoiceId]);

    if (function_exists('curl_init')) {
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-WHMCS-API-Key: ' . $secret,
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code < 200 || $code >= 300) {
            logActivity('Printable Listings hook: HTTP ' . $code . ' for invoice ' . $invoiceId . ' — ' . substr((string) $body, 0, 120));
        }
        return;
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nX-WHMCS-API-Key: {$secret}\r\n",
            'content' => $payload,
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ]);
    @file_get_contents($apiUrl, false, $ctx);
});
EOFPHP

echo "Installed:"
echo "  $HOOKS/printablelistings-invoice-paid.php"
echo "  $HOOKS/printablelistings.local.php"
echo "Webhook URL: $API_URL"
echo "Done."
