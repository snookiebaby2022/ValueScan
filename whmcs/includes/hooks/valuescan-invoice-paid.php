<?php
/**
 * ValueScan — notify valuescan.online when a WHMCS invoice is paid (PayPal, etc.).
 *
 * Install on billing.nexlify.live alongside the Printable Listings hook.
 */
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

$localConfig = __DIR__ . '/valuescan.local.php';
if (is_readable($localConfig)) {
    require_once $localConfig;
}

add_hook('InvoicePaid', 1, function (array $vars) {
    $invoiceId = (int) ($vars['invoiceid'] ?? 0);
    if ($invoiceId <= 0) {
        return;
    }

    $apiUrl = defined('VALUESCAN_API_URL')
        ? VALUESCAN_API_URL
        : (getenv('VALUESCAN_API_URL') ?: 'https://valuescan.online/api/whmcs/webhook');

    $secret = defined('VALUESCAN_WEBHOOK_SECRET')
        ? VALUESCAN_WEBHOOK_SECRET
        : (getenv('VALUESCAN_WEBHOOK_SECRET') ?: '');

    if ($secret === '') {
        logActivity('ValueScan hook: secret not set — skipped invoice ' . $invoiceId);
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
            logActivity('ValueScan hook: HTTP ' . $code . ' for invoice ' . $invoiceId . ' — ' . substr((string) $body, 0, 120));
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
