# Configure Stripe + SMTP on the ValueScan VPS
# Usage (PowerShell — set secrets first, never commit these):
#
#   $env:STRIPE_SECRET_KEY = "sk_live_xxxx"
#   $env:STRIPE_WEBHOOK_SECRET = "whsec_xxxx"   # optional if setup script creates webhook
#   $env:SMTP_HOST = "smtp.resend.com"
#   $env:SMTP_USER = "resend"
#   $env:SMTP_PASS = "re_xxxx"
#   $env:SMTP_FROM = "hello@valuescan.online"
#   .\deploy\configure-valuescan-secrets.ps1

$ErrorActionPreference = "Stop"
$Host_ = "85.17.162.54"
$User = "root"
$RemoteEnv = "/var/www/valuescan/.env"

if (-not $env:STRIPE_SECRET_KEY) {
  Write-Host "STRIPE_SECRET_KEY is required."
  Write-Host ""
  Write-Host "Get keys from: https://dashboard.stripe.com/apikeys"
  Write-Host "Then re-run with env vars set (see script header)."
  exit 1
}

Write-Host "Uploading setup scripts..."
scp "$PSScriptRoot/setup-valuescan-billing.sh" "${User}@${Host_}:/var/www/valuescan/deploy/"
scp "$PSScriptRoot/setup-valuescan-smtp.sh" "${User}@${Host_}:/var/www/valuescan/deploy/"

function Set-RemoteEnv {
  param([string]$Key, [string]$Value)
  if (-not $Value) { return }
  $escaped = $Value -replace "'", "'\''"
  ssh "${User}@${Host_}" @"
if grep -q '^${Key}=' $RemoteEnv; then
  sed -i 's|^${Key}=.*|${Key}=${escaped}|' $RemoteEnv
else
  echo '${Key}=${escaped}' >> $RemoteEnv
fi
"@
}

Write-Host "Updating /var/www/valuescan/.env ..."
Set-RemoteEnv "STRIPE_SECRET_KEY" $env:STRIPE_SECRET_KEY
Set-RemoteEnv "STRIPE_WEBHOOK_SECRET" $env:STRIPE_WEBHOOK_SECRET
Set-RemoteEnv "STRIPE_VALUESCAN_PRO_PRICE_ID" $env:STRIPE_VALUESCAN_PRO_PRICE_ID
Set-RemoteEnv "STRIPE_VALUESCAN_AGENCY_PRICE_ID" $env:STRIPE_VALUESCAN_AGENCY_PRICE_ID

if ($env:SMTP_PASS) {
  Set-RemoteEnv "SMTP_HOST" ($env:SMTP_HOST ?? "smtp.resend.com")
  Set-RemoteEnv "SMTP_PORT" ($env:SMTP_PORT ?? "587")
  Set-RemoteEnv "SMTP_USER" ($env:SMTP_USER ?? "resend")
  Set-RemoteEnv "SMTP_PASS" $env:SMTP_PASS
  Set-RemoteEnv "SMTP_FROM" ($env:SMTP_FROM ?? "hello@valuescan.online")
}

Write-Host "Running Stripe setup (webhook + prices)..."
ssh "${User}@${Host_}" "chmod +x /var/www/valuescan/deploy/setup-valuescan-*.sh && bash /var/www/valuescan/deploy/setup-valuescan-billing.sh"

Write-Host ""
Write-Host "--- Verification ---"
ssh "${User}@${Host_}" "curl -s http://127.0.0.1:4030/api/billing/config ; echo ; curl -s https://valuescan.online/api/billing/config"
Write-Host ""
Write-Host "Done. Test checkout at https://valuescan.online/pricing (sign in first)."
