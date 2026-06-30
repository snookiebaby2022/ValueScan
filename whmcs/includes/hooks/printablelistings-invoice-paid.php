<?php
/**
 * Printable Listings — notify marketplace when a WHMCS invoice is paid (PayPal, card, etc.).
 *
 * Install (billing.nexlify.live):
 *   bash deploy/install-whmcs-hook.sh
 * Or copy this file + printablelistings.local.php to WHMCS includes/hooks/
 */
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
