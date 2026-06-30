# ValueScan PayPal setup (WHMCS)

PayPal checkout on **valuescan.online** uses your WHMCS install at **https://billing.nexlify.live**.

## What happens when a user clicks Pay with PayPal

1. ValueScan creates a WHMCS invoice (£19 Pro / £49 Agency)
2. User is SSO-logged into WHMCS and sent **directly to PayPal**
3. After payment, WHMCS fires the invoice-paid hook → ValueScan activates the plan for 30 days

## Your checklist (WHMCS admin)

### 1. Whitelist the ValueScan server IP

**Setup → Staff Management → Manage API Credentials** → edit the API key used by ValueScan.

Add this IP to the allow list:

```
85.17.162.54
```

If checkout still fails with “Invalid IP”, the server may be using IPv6 — add your VPS IPv6 or contact your host.

### 2. API role permissions

The API role must allow at least:

- `AddClient`
- `GetClientsDetails`
- `CreateInvoice`
- `GetInvoice`
- `GetPaymentMethods`
- **`CreateSsoToken`** ← required for PayPal redirect (easy to miss)

### 3. PayPal gateway (live)

**Setup → Payments → Payment Gateways** → enable **PayPal** (module name is usually `paypal_ppcpv`).

- Mode: **Live**
- PayPal business account connected
- Currency: **GBP**

ValueScan `.env` should include:

```env
WHMCS_PAYPAL_GATEWAY=paypal_ppcpv
```

### 4. Invoice-paid webhook (one-time)

On the WHMCS server (`/var/www/whmcs/includes/hooks/`):

- `valuescan-invoice-paid.php`
- `valuescan.local.php` with `VALUESCAN_WEBHOOK_SECRET` matching `WHMCS_WEBHOOK_SECRET` in `/var/www/valuescan/.env`

Install from the marketplace-hub repo:

```bash
bash /var/www/valuescan/deploy/install-valuescan-whmcs-hook.sh
```

### 5. Sync WHMCS credentials to ValueScan

On the VPS:

```bash
bash /var/www/valuescan/deploy/setup-valuescan-whmcs-env.sh
```

Then reload PM2:

```bash
cd /var/www/valuescan
pm2 startOrReload deploy/ecosystem-valuescan.config.cjs --update-env
```

## Verify

```bash
bash /var/www/valuescan/deploy/test-valuescan-paypal-checkout.sh
```

Success returns JSON with a `url` starting with `https://billing.nexlify.live/oauth/singlesignon.php...`

Failure `Invalid IP` → fix step 1.  
Failure `CreateSsoToken` / permission → fix step 2.

## Test in browser

1. Sign in at https://valuescan.online (e.g. `admin@demo.com` / `demo123`)
2. Pricing → **Pay with PayPal** on Pro
3. Complete PayPal payment
4. Account page should show **Pro** plan active

If the plan does not update, open Account (it syncs pending invoices) or check WHMCS **Utilities → Logs → Module Log** and **Activity Log** for hook errors.
