# Deploy ValueScan (redesign) — local build → VPS
# Usage: .\deploy\push-valuescan.ps1
#        .\deploy\push-valuescan.ps1 -SeedAdmin
#
# Layout on VPS (/var/www/valuescan):
#   dist/     ← built React app (from local npm run build)
#   backend/  ← Node API (PM2 runs backend/server.js)
#   public/   ← static assets copied into dist at build time + extras
#   deploy/   ← nginx, pm2, scripts
#   .env      ← secrets (never overwritten)

param(
  [switch]$SeedAdmin,
  [string]$Host_ = "85.17.162.54",
  [string]$User = "root",
  [string]$Remote = "/var/www/valuescan"
)

$ErrorActionPreference = "Stop"
$Local = (Resolve-Path "$PSScriptRoot\..").Path

Write-Host "=== ValueScan deploy ===" -ForegroundColor Cyan
Write-Host "Local:  $Local"
Write-Host "Target: ${User}@${Host_}:${Remote} (port 4030)"
Write-Host ""

# ── 1. Build frontend locally ───────────────────────────────────
Write-Host "Building frontend (npm run build)..." -ForegroundColor Yellow
Push-Location $Local
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
} finally {
  Pop-Location
}

$distIndex = Join-Path $Local "dist\index.html"
if (-not (Test-Path $distIndex)) { throw "dist/index.html missing - build failed" }
if ((Select-String -Path $distIndex -Pattern 'src="/assets/' -Quiet) -eq $false) {
  Write-Warning "dist/index.html should use absolute /assets/ paths (vite base: '/')"
}

# ── 2. Upload deployable artifacts only ─────────────────────────
Write-Host ""
Write-Host "Uploading to VPS..." -ForegroundColor Yellow
ssh "${User}@${Host_}" "mkdir -p $Remote/backend $Remote/dist $Remote/public $Remote/deploy"

$dirs = @("dist", "backend", "public", "deploy")
foreach ($d in $dirs) {
  $path = Join-Path $Local $d
  if (-not (Test-Path $path)) { Write-Warning "Skip missing: $d"; continue }
  Write-Host "  -> $d/"
  scp -r $path "${User}@${Host_}:${Remote}/"
}

# ── 3. Install API deps + restart ───────────────────────────────
Write-Host ""
Write-Host "Installing backend deps and restarting PM2..." -ForegroundColor Yellow

$remoteScript = @"
set -e
cd $Remote
if [ ! -f .env ]; then
  cp deploy/valuescan.env.example .env
  echo 'WARNING: Created .env from example — set JWT_SECRET and VALUESCAN_ADMIN_PASSWORD!'
fi
# nginx (www-data) must read uploaded dist/
chmod -R a+rX dist
cd backend
npm ci --omit=dev
cd ..
if [ -f deploy/nginx-valuescan.online.conf ]; then
  cp deploy/nginx-valuescan.online.conf /etc/nginx/sites-available/valuescan.online
  ln -sf /etc/nginx/sites-available/valuescan.online /etc/nginx/sites-enabled/valuescan.online
  nginx -t && systemctl reload nginx
fi
pm2 startOrReload deploy/ecosystem-valuescan.config.cjs --update-env
pm2 save
sleep 2
echo ''
echo '--- health ---'
curl -s http://127.0.0.1:4030/api/health || echo 'health check failed'
echo ''
echo '--- admin-login assets (must be /assets/, not ./assets/) ---'
grep -o 'src="[^"]*assets[^"]*"' dist/index.html | head -1
echo ''
echo '--- nginx origin (port 80) ---'
curl -s -H 'Host: valuescan.online' http://127.0.0.1/admin-login | grep -o 'src="[^"]*assets[^"]*"' | head -1 || echo 'nginx check failed'
echo ''
echo '--- pm2 ---'
pm2 describe valuescan | grep -E 'status|script path|cwd' || true
"@

if ($SeedAdmin) {
  $remoteScript += @"

echo ''
echo '--- seed admin ---'
cd $Remote/backend && node seed.js
"@
}

ssh "${User}@${Host_}" $remoteScript

Write-Host ""
Write-Host "Done. https://valuescan.online" -ForegroundColor Green
Write-Host "Admin: https://valuescan.online/admin-login"
Write-Host ""
Write-Host "Source of truth: LOCAL repo -> this script -> VPS"
Write-Host "Do not edit /var/www/valuescan by hand without syncing back to local."
