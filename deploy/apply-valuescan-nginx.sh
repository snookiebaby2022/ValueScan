#!/bin/bash
# Apply nginx hardening for valuescan.online (hide upstream Server header)
set -e

CONF="/etc/nginx/sites-available/valuescan.online"
SNIPPET='        proxy_hide_header Server;'

if [ ! -f "$CONF" ]; then
  echo "Missing $CONF — copy deploy/nginx-valuescan.online.conf first"
  exit 1
fi

if ! grep -q 'server_tokens off' /etc/nginx/nginx.conf 2>/dev/null; then
  if grep -q '^http {' /etc/nginx/nginx.conf; then
    sed -i '/^http {/a\    server_tokens off;' /etc/nginx/nginx.conf
    echo "Added server_tokens off to nginx.conf"
  fi
fi

for block in "$CONF" /etc/nginx/sites-enabled/valuescan.online; do
  [ -f "$block" ] || continue
  if ! grep -q 'proxy_hide_header Server' "$block"; then
    sed -i 's/proxy_hide_header X-Powered-By;/proxy_hide_header X-Powered-By;\n        proxy_hide_header Server;/' "$block"
    echo "Added proxy_hide_header Server to $block"
  fi
done

# Remove Server header entirely if headers-more module is available
if nginx -V 2>&1 | grep -q headers-more; then
  for block in "$CONF"; do
    if ! grep -q 'more_clear_headers Server' "$block"; then
      sed -i '/proxy_hide_header Server;/a\        more_clear_headers Server;' "$block"
      echo "Added more_clear_headers Server"
    fi
  done
fi

nginx -t
systemctl reload nginx
echo "Nginx reloaded."

echo ""
echo "Server header check:"
curl -sI "https://valuescan.online/" | grep -i '^server:' || echo "  (no Server header — good)"
