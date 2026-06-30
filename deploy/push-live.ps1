# Deploy latest Printable Listings to VPS
# Usage: .\deploy\push-live.ps1
# Requires: OpenSSH (scp/ssh) — built into Windows 10+

$ErrorActionPreference = "Stop"
$Host_ = "85.17.162.54"
$User = "root"
$Remote = "/var/www/marketplace-hub"
$Local = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (Test-Path "$PSScriptRoot\..\src") { $Local = (Resolve-Path "$PSScriptRoot\..").Path }

Write-Host "Deploying from: $Local"
Write-Host "Target: ${User}@${Host_}:${Remote}"

ssh "${User}@${Host_}" "mkdir -p $Remote"

$files = @(
  "src", "server", "public", "deploy",
  "index.html", "package.json", "package-lock.json",
  "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", "vite.config.ts"
)

foreach ($f in $files) {
  $path = Join-Path $Local $f
  if (-not (Test-Path $path)) { Write-Warning "Skip missing: $f"; continue }
  Write-Host "Uploading $f ..."
  scp -r $path "${User}@${Host_}:${Remote}/"
}

if (Test-Path (Join-Path $Local ".env")) {
  Write-Host "Uploading .env ..."
  scp (Join-Path $Local ".env") "${User}@${Host_}:${Remote}/.env"
}

Write-Host "Building and restarting on server ..."
ssh "${User}@${Host_}" @"
set -e
cd $Remote
npm ci
npm run build
pm2 startOrReload deploy/ecosystem.config.cjs --update-env 2>/dev/null || pm2 start deploy/ecosystem.config.cjs
pm2 save
echo '---'
curl -s http://127.0.0.1:4020/api/health | head -c 120
echo ''
grep -o 'All-in-one[^<]*' dist/index.html 2>/dev/null || echo '(check dist built)'
"@

Write-Host ""
Write-Host "Done. Hard-refresh https://printablelistings.xyz (Ctrl+Shift+R)"
