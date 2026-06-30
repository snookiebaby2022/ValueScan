# Deploy ValueScan — valuescan.online

ValueScan runs separately from Printable Listings.

| Resource | ValueScan |
|----------|-----------|
| Directory | `/var/www/valuescan` |
| Port | **4030** |
| PM2 name | **valuescan** |
| Domain | **valuescan.online** |
| API | `backend/server.js` |
| UI | `dist/` (built locally) |
| Database | `backend/valuescan.db` |

See [VALUESCAN-LAYOUT.md](./VALUESCAN-LAYOUT.md) for local vs VPS explanation.

## Deploy from Windows

```powershell
cd C:\Users\lizzi\Projects\marketplace-hub
.\deploy\push-valuescan.ps1
```

Or:

```powershell
npm run deploy:valuescan
```

Create / reset admin user:

```powershell
.\deploy\push-valuescan.ps1 -SeedAdmin
```

## First-time VPS setup

1. Copy `.env` on server (or let script create from example):

```bash
nano /var/www/valuescan/.env
# Set JWT_SECRET, VALUESCAN_ADMIN_EMAIL, VALUESCAN_ADMIN_PASSWORD
```

2. Nginx:

```bash
cp /var/www/valuescan/deploy/nginx-valuescan.online.conf /etc/nginx/sites-available/valuescan.online
ln -sf /etc/nginx/sites-available/valuescan.online /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d valuescan.online -d www.valuescan.online
```

## Verify

```bash
curl -s http://127.0.0.1:4030/api/health
pm2 describe valuescan
```

Expected health:

```json
{"ok":true,"app":"valuescan","runtime":"backend/server.js","port":4030}
```

## Local dev

```powershell
# API (port 4030)
cd backend && npm install && npm run dev

# Frontend (new terminal, from repo root)
npm run dev
```

## Admin

- Login: https://valuescan.online/admin-login
- Dashboard: https://valuescan.online/admin
- Email: `VALUESCAN_ADMIN_EMAIL` from `.env` (default `admin@valuescan.online`)
- Password: `VALUESCAN_ADMIN_PASSWORD` from `.env`

## Cloudflare (if the site looks stale or admin login is blank)

The VPS origin must serve the app — not an old Cloudflare Pages build.

1. **DNS** → `valuescan.online` A record → `85.17.162.54` (proxied is fine).
2. **Workers & Pages** → remove `valuescan.online` as a custom domain on any Pages project (otherwise CF serves an old static deploy instead of the VPS).
3. **Caching** → Purge Everything for the zone after deploy.
4. **SSL/TLS** → Full (strict) is OK once nginx has the `valuescan.online` certificate (see nginx config in this folder).

Quick check from your machine (bypasses Cloudflare):

```bash
curl -sk --resolve valuescan.online:443:85.17.162.54 https://valuescan.online/admin-login | grep script
```

You should see `src="/assets/...js"` (absolute path). If Cloudflare still shows `./assets/...`, the edge cache or Pages binding is still wrong.
