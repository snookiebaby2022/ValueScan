# WHMCS billing for Printable Listings

Checkout uses your WHMCS install (**https://billing.nexlify.live**) for **live PayPal** and other gateways.

## Quick enable (production)

1. Fill WHMCS credentials in marketplace `.env` (see below).
2. Run `npm run verify:paypal` — confirms API + PayPal gateway.
3. On the WHMCS server: `bash deploy/ensure-live-paypal.sh` (or copy the hook manually).
4. Rebuild and restart: `npm run build && pm2 reload printablelistings`.

## 1. WHMCS Admin API credentials

In WHMCS: **Setup → Staff Management → Manage API Credentials** — create credentials with at least:

- `AddClient`, `GetClientsDetails`
- `CreateInvoice`, `GetInvoice`, `GetInvoices`
- `GetPaymentMethods` (auto-detects PayPal module name)

Add to marketplace `.env`:

```env
WHMCS_URL=https://billing.nexlify.live
WHMCS_API_IDENTIFIER=your-api-identifier
WHMCS_API_SECRET=your-api-secret
WHMCS_API_ACCESS_KEY=          # optional — from configuration.php
WHMCS_WEBHOOK_SECRET=          # random secret shared with the InvoicePaid hook
WHMCS_PAYPAL_GATEWAY=paypal    # optional — auto-detected when GetPaymentMethods works
CLIENT_URL=https://printablelistings.xyz
SITE_URL=https://printablelistings.xyz
```

`WHMCS_WEBHOOK_SECRET` must match `PRINTABLELISTINGS_WEBHOOK_SECRET` on the WHMCS server.

## 2. PayPal in WHMCS

**Setup → Payments → Payment Gateways** — activate **PayPal** (or PayPal Checkout) in **Live** mode with your PayPal business credentials.

Verify gateway module name:

```bash
npm run verify:paypal
```

## 3. Webhook secret + hook (one command)

On your PC (generates secret in `.env` + WHMCS config file):

```bash
npm run setup:webhook
```

On the **billing server** (copies hook + secret to WHMCS):

```bash
bash deploy/install-whmcs-hook.sh
```

Or manually copy to `/var/www/whmcs/includes/hooks/`:

- `printablelistings-invoice-paid.php`
- `printablelistings.local.php` (generated — contains your webhook secret)

## 4. Invoice paid hook (manual alternative)

Copy `includes/hooks/printablelistings-invoice-paid.php` into your WHMCS `includes/hooks/` directory.

On the WHMCS server, set environment variables (or edit the file):

- `PRINTABLELISTINGS_API_URL` — e.g. `https://printablelistings.xyz/api/whmcs/webhook` (local dev: `http://localhost:4020/api/whmcs/webhook`)
- `PRINTABLELISTINGS_WEBHOOK_SECRET` — same as `WHMCS_WEBHOOK_SECRET` in marketplace `.env`

Ensure **PayPal** (or your preferred gateway) is active under **Setup → Payments → Payment Gateways**.

## 3. Flow

1. Buyer selects **PayPal** at checkout.
2. Marketplace creates a pending order and a WHMCS invoice via the Admin API.
3. Buyer is redirected to `viewinvoice.php` on your WHMCS billing domain.
4. After payment, the hook notifies the marketplace API; the return URL also triggers a status sync on `/checkout/success`.
