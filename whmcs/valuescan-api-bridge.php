<?php
/**
 * ValueScan ↔ WHMCS internal bridge (same-server only).
 * Uses localAPI — no external API IP allowlist required.
 *
 * Install: copy to /var/www/whmcs/valuescan-api-bridge.php
 * Nginx: allow only 127.0.0.1 (see deploy/nginx-valuescan-bridge.conf snippet)
 */
declare(strict_types=1);

define('CLIENTAREA', true);
require_once __DIR__ . '/init.php';

header('Content-Type: application/json');

if (($_SERVER['REMOTE_ADDR'] ?? '') !== '127.0.0.1' && ($_SERVER['REMOTE_ADDR'] ?? '') !== '::1') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$configFile = __DIR__ . '/includes/hooks/valuescan-bridge.local.php';
if (is_readable($configFile)) {
    require $configFile;
}

$secret = defined('VALUESCAN_BRIDGE_SECRET')
    ? VALUESCAN_BRIDGE_SECRET
    : (getenv('VALUESCAN_BRIDGE_SECRET') ?: '');

$provided = $_SERVER['HTTP_X_VALUESCAN_BRIDGE_SECRET'] ?? '';
if ($secret === '' || !hash_equals($secret, $provided)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required']);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$action = $input['action'] ?? '';

function bridgeError(string $msg, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function requireField(array $input, string $key): mixed
{
    if (!isset($input[$key]) || $input[$key] === '') {
        bridgeError("Missing field: {$key}");
    }
    return $input[$key];
}

switch ($action) {
    case 'ping':
        echo json_encode(['ok' => true]);
        break;

    case 'get_or_create_client':
        $email = (string) requireField($input, 'email');
        $name = (string) requireField($input, 'name');
        $parts = preg_split('/\s+/', trim($name), 2);
        $firstname = $parts[0] ?? 'Customer';
        $lastname = $parts[1] ?? 'User';

        $existing = localAPI('GetClientsDetails', ['email' => $email, 'stats' => false]);
        if (($existing['result'] ?? '') === 'success') {
            $clientId = (int) ($existing['client']['id'] ?? $existing['userid'] ?? 0);
            if ($clientId > 0) {
                echo json_encode(['clientId' => $clientId]);
                break;
            }
        }

        $created = localAPI('AddClient', [
            'firstname' => $firstname,
            'lastname' => $lastname,
            'email' => $email,
            'password2' => bin2hex(random_bytes(16)),
            'address1' => 'Digital customer',
            'city' => 'London',
            'state' => 'Greater London',
            'postcode' => 'SW1A 1AA',
            'country' => 'GB',
            'phonenumber' => '0000000000',
        ]);
        if (($created['result'] ?? '') !== 'success') {
            bridgeError($created['message'] ?? 'AddClient failed', 502);
        }
        echo json_encode(['clientId' => (int) ($created['clientid'] ?? 0)]);
        break;

    case 'create_valuescan_invoice':
        $clientId = (int) requireField($input, 'clientId');
        $amount = (string) requireField($input, 'amount');
        $description = (string) requireField($input, 'description');
        $notes = (string) ($input['notes'] ?? '');
        $paymentMethod = (string) requireField($input, 'paymentMethod');
        $returnUrl = (string) requireField($input, 'returnUrl');
        $today = date('Y-m-d');

        $invoice = localAPI('CreateInvoice', [
            'userid' => $clientId,
            'status' => 'Unpaid',
            'sendinvoice' => false,
            'date' => $today,
            'duedate' => $today,
            'notes' => $notes,
            'itemdescription0' => $description,
            'itemamount0' => $amount,
            'itemtaxed0' => false,
            'paymentmethod' => $paymentMethod,
        ]);

        if (($invoice['result'] ?? '') !== 'success') {
            bridgeError($invoice['message'] ?? 'CreateInvoice failed', 502);
        }

        $invoiceId = (int) ($invoice['invoiceid'] ?? 0);
        if ($invoiceId <= 0) {
            bridgeError('No invoice ID returned', 502);
        }

        $path = 'viewinvoice.php?id=' . $invoiceId
            . '&paymentmethod=' . rawurlencode($paymentMethod)
            . '&returnurl=' . rawurlencode($returnUrl);

        $sso = localAPI('CreateSsoToken', [
            'client_id' => $clientId,
            'destination' => 'sso:custom_redirect',
            'sso_redirect_path' => $path,
        ]);

        if (($sso['result'] ?? '') !== 'success' || empty($sso['redirect_url'])) {
            bridgeError($sso['message'] ?? 'CreateSsoToken failed', 502);
        }

        echo json_encode([
            'invoiceId' => $invoiceId,
            'paymentUrl' => $sso['redirect_url'],
        ]);
        break;

    case 'get_invoice_status':
        $invoiceId = (int) requireField($input, 'invoiceId');
        $inv = localAPI('GetInvoice', ['invoiceid' => $invoiceId]);
        if (($inv['result'] ?? '') !== 'success') {
            bridgeError($inv['message'] ?? 'GetInvoice failed', 502);
        }
        echo json_encode(['status' => $inv['status'] ?? 'Unknown']);
        break;

    default:
        bridgeError('Unknown action');
}
