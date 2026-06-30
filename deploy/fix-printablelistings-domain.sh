#!/usr/bin/env bash
# Fix printablelistings.xyz showing Umami instead of the marketplace.
# Run on VPS as root:
#   bash fix-printablelistings-domain.sh
set -euo pipefail

DOMAIN="printablelistings.xyz"
APP_DIR="${MARKETPLACE_DIR:-/var/www/marketplace-hub}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
SITE_CONF="$NGINX_AVAILABLE/printablelistings.xyz"
CERT="/etc/letsencrypt/live/printablelistings.xyz/fullchain.pem"

write_http_vhost() {
  cat >"$SITE_CONF" <<'NGINX'
upstream printablelistings_app {
    server 127.0.0.1:4020;
    keepalive 8;
}

server {
    listen 80;
    listen [::]:80;
    server_name printablelistings.xyz www.printablelistings.xyz;

    location / {
        proxy_pass http://printablelistings_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
NGINX
}

write_https_vhost() {
  cat >"$SITE_CONF" <<'NGINX'
upstream printablelistings_app {
    server 127.0.0.1:4020;
    keepalive 8;
}

server {
    listen 80;
    listen [::]:80;
    server_name printablelistings.xyz www.printablelistings.xyz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name printablelistings.xyz www.printablelistings.xyz;

    ssl_certificate /etc/letsencrypt/live/printablelistings.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/printablelistings.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://printablelistings_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
NGINX
}

echo "=== Fix ${DOMAIN} (Umami → marketplace) ==="

for f in "$NGINX_AVAILABLE"/* "$NGINX_ENABLED"/*; do
  [[ -f "$f" ]] || continue
  if grep -q "printablelistings.xyz" "$f" 2>/dev/null && grep -q "3002" "$f" 2>/dev/null; then
    if grep -qE "server_name[^;]*printablelistings\.xyz" "$f" && ! grep -q "stats.printablelistings.xyz" "$f"; then
      echo "DISABLE (Umami on apex): $f"
      rm -f "$NGINX_ENABLED/$(basename "$f")"
    fi
  fi
done

echo "--- Installing nginx vhost ---"
if [[ -f "$CERT" ]]; then
  write_https_vhost
  echo "Using existing SSL cert."
else
  write_http_vhost
  echo "HTTP-only vhost (no SSL cert yet)."
fi

ln -sf "$SITE_CONF" "$NGINX_ENABLED/printablelistings.xyz"

if curl -sf "http://127.0.0.1:3002/api/heartbeat" >/dev/null 2>&1; then
  cat >"$NGINX_AVAILABLE/stats.printablelistings.xyz" <<'STATS'
server {
    listen 80;
    listen [::]:80;
    server_name stats.printablelistings.xyz;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
STATS
  ln -sf "$NGINX_AVAILABLE/stats.printablelistings.xyz" "$NGINX_ENABLED/stats.printablelistings.xyz"
fi

nginx -t
systemctl reload nginx
echo "Nginx reloaded (HTTP)."

if [[ ! -f "$CERT" ]]; then
  echo ""
  echo "--- Requesting SSL certificate ---"
  if certbot --nginx -d printablelistings.xyz -d www.printablelistings.xyz \
      --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
    echo "SSL installed via certbot."
  else
    echo "certbot failed (common with Cloudflare proxy)."
    echo "Try: Cloudflare DNS → grey cloud (DNS only) for @ and www, then re-run:"
    echo "  certbot --nginx -d printablelistings.xyz -d www.printablelistings.xyz"
    echo "Site may still work on HTTP port 80 for now."
  fi
fi

if [[ -f "$APP_DIR/package.json" ]]; then
  echo ""
  echo "--- Starting marketplace ---"
  cd "$APP_DIR"
  if [[ ! -d node_modules ]]; then npm ci; fi
  npm run build
  if command -v pm2 >/dev/null; then
    pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env 2>/dev/null || \
      pm2 start "$APP_DIR/deploy/ecosystem.config.cjs"
    pm2 save
  fi
else
  echo ""
  echo "WARNING: Upload app to $APP_DIR and re-run, or start manually."
fi

echo ""
if curl -sf "http://127.0.0.1:4020/api/health" >/dev/null 2>&1; then
  echo "✓ App on :4020"
  curl -s "http://127.0.0.1:4020/api/health"
else
  echo "✗ App not running on :4020 — upload marketplace files first"
fi
echo ""
echo "Done."
