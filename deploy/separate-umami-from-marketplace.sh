#!/usr/bin/env bash
# Fix printablelistings.xyz serving Umami instead of the marketplace.
# Run on the VPS as root after cloning marketplace-hub to /var/www/marketplace-hub.
#
#   bash /var/www/marketplace-hub/deploy/separate-umami-from-marketplace.sh
set -euo pipefail

APP_DIR="${MARKETPLACE_DIR:-/var/www/marketplace-hub}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
DOMAIN="printablelistings.xyz"
STATS_DOMAIN="stats.printablelistings.xyz"

echo "=== Separate Umami from ${DOMAIN} ==="

# 1. Remove printablelistings.xyz from any Umami / analytics vhost
for f in "$NGINX_AVAILABLE"/* "$NGINX_ENABLED"/*; do
  [[ -f "$f" ]] || continue
  if grep -q "printablelistings.xyz" "$f" && grep -q "3002" "$f"; then
    echo "Found Umami proxy for ${DOMAIN} in: $f"
    if grep -q "server_name.*printablelistings.xyz" "$f" && ! grep -q "stats.printablelistings.xyz" "$f"; then
      echo "  Disabling apex Umami vhost (marketplace should use this domain)."
      rm -f "$NGINX_ENABLED/$(basename "$f")"
    fi
  fi
done

# Also check common Umami install paths from stream-billing
for f in \
  "$NGINX_AVAILABLE/analytics.nexlify.live" \
  "$NGINX_AVAILABLE/umami.printablelistings.xyz" \
  "$NGINX_AVAILABLE/printablelistings.xyz"
do
  if [[ -f "$f" ]] && grep -q "3002" "$f" && grep -q "printablelistings.xyz" "$f"; then
    if grep -qE "server_name\s+printablelistings\.xyz" "$f"; then
      echo "Removing Umami apex config: $f"
      rm -f "$NGINX_ENABLED/$(basename "$f")"
    fi
  fi
done

# 2. Install marketplace vhost
cp "$APP_DIR/deploy/nginx-printablelistings.xyz.conf" "$NGINX_AVAILABLE/printablelistings.xyz"
ln -sf "$NGINX_AVAILABLE/printablelistings.xyz" "$NGINX_ENABLED/printablelistings.xyz"

# 3. Install Umami on stats subdomain (if Umami is running on :3002)
if curl -sf "http://127.0.0.1:3002/api/heartbeat" >/dev/null 2>&1; then
  cp "$APP_DIR/deploy/nginx-stats.printablelistings.xyz.conf" "$NGINX_AVAILABLE/stats.printablelistings.xyz"
  ln -sf "$NGINX_AVAILABLE/stats.printablelistings.xyz" "$NGINX_ENABLED/stats.printablelistings.xyz"
  echo "Umami stats vhost installed for ${STATS_DOMAIN}"
  echo "Add DNS A record: stats -> this server, then:"
  echo "  certbot --nginx -d ${STATS_DOMAIN}"
else
  echo "No Umami on :3002 — skipped stats vhost."
fi

nginx -t
systemctl reload nginx

# 4. Build and start marketplace
if [[ -d "$APP_DIR" ]]; then
  cd "$APP_DIR"
  if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "Created .env — edit JWT_SECRET and payment keys before going live."
  fi
  npm ci
  npm run build
  pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
  pm2 save
fi

echo ""
echo "=== Done ==="
echo "Marketplace nginx -> 127.0.0.1:4020"
echo "Verify: curl -sI https://${DOMAIN} | head -5"
echo "Should NOT show x-powered-by: Next.js (that was Umami)."
echo ""
echo "If HTTPS cert missing:"
echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "Umami dashboard (after DNS + cert): https://${STATS_DOMAIN}"
