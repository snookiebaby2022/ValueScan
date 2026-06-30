# Deploy printablelistings.xyz

## Problem

If `https://printablelistings.xyz` shows the **Umami** login page, the apex domain is proxied to Umami (`127.0.0.1:3002`) instead of the marketplace app.

**Fix:** marketplace on the root domain, Umami on a subdomain only.

| Host | Service | Port |
|------|---------|------|
| `printablelistings.xyz` | Marketplace (API + SPA) | `4020` |
| `www.printablelistings.xyz` | Same | `4020` |
| `stats.printablelistings.xyz` | Umami dashboard (optional) | `3002` |

## DNS (Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | Your VPS IP | Proxied OK |
| A | `www` | Your VPS IP | Proxied OK |
| A | `stats` | Your VPS IP | Proxied OK (only if using Umami) |

Remove any CNAME or Page Rule that sends `@` to Umami or another host.

## One-command fix on VPS

```bash
git clone <your-repo> /var/www/marketplace-hub   # or rsync from local
cd /var/www/marketplace-hub
bash deploy/separate-umami-from-marketplace.sh
certbot --nginx -d printablelistings.xyz -d www.printablelistings.xyz
```

## Manual steps

1. **Stop Umami using the apex domain** — edit nginx and remove `printablelistings.xyz` from any vhost that `proxy_pass`es to port `3002`.

2. **Install marketplace vhost**
   ```bash
   cp deploy/nginx-printablelistings.xyz.conf /etc/nginx/sites-available/printablelistings.xyz
   ln -sf /etc/nginx/sites-available/printablelistings.xyz /etc/nginx/sites-enabled/
   ```

3. **Move Umami to stats subdomain**
   ```bash
   cp deploy/nginx-stats.printablelistings.xyz.conf /etc/nginx/sites-available/stats.printablelistings.xyz
   ln -sf /etc/nginx/sites-available/stats.printablelistings.xyz /etc/nginx/sites-enabled/
   certbot --nginx -d stats.printablelistings.xyz
   ```

4. **Build and run app**
   ```bash
   cp .env.example .env   # set JWT_SECRET, WHMCS keys, etc.
   npm ci && npm run build
   pm2 startOrReload deploy/ecosystem.config.cjs
   pm2 save
   ```

5. **SSL for marketplace**
   ```bash
   certbot --nginx -d printablelistings.xyz -d www.printablelistings.xyz
   nginx -t && systemctl reload nginx
   ```

## Verify

```bash
curl -sI https://printablelistings.xyz | grep -iE 'HTTP|x-powered-by|server'
curl -s https://printablelistings.xyz/api/health
```

Expected:

- No `x-powered-by: Next.js` (that was Umami)
- `/api/health` returns `"site":"printablelistings.xyz"`

## Umami script tag for the marketplace

After creating a website in Umami for `printablelistings.xyz`, use the **stats** host in env (not the apex):

```env
VITE_UMAMI_URL=https://stats.printablelistings.xyz
VITE_UMAMI_WEBSITE_ID=<uuid-from-umami-dashboard>
```

Rebuild after changing env vars.
