# ValueScan — local vs VPS layout

## Source of truth

**Your PC (this repo) is the source of truth.**  
The VPS is a copy that gets updated by:

```powershell
.\deploy\push-valuescan.ps1
```

Never assume `/var/www/valuescan` matches your laptop unless you just deployed.

---

## What runs in production

| Layer | Local | VPS | Notes |
|-------|--------|-----|--------|
| **Website UI** | `src/` → `npm run build` → `dist/` | `dist/` | Same after deploy |
| **API** | `backend/server.js` | `backend/server.js` | PM2 runs this |
| **Database** | `backend/valuescan.db` (dev) | `backend/valuescan.db` | Lives on VPS only |
| **Secrets** | — | `.env` | VPS only, never committed |

**Not used in production anymore:** `server/index.ts` (old TypeScript app + growth worker).  
It may still exist on the VPS disk from older deploys but PM2 does not run it.

---

## Local development

```powershell
# Terminal 1 — API
cd backend
npm install
npm run dev

# Terminal 2 — frontend (proxies /api → :4030)
npm run dev
```

Open http://localhost:5173 (or the port Vite prints).

---

## Deploy checklist

1. Edit code locally (`src/`, `backend/`)
2. `npm run build` (or let `push-valuescan.ps1` do it)
3. `.\deploy\push-valuescan.ps1`
4. Hard-refresh browser or use incognito

First-time admin user:

```powershell
.\deploy\push-valuescan.ps1 -SeedAdmin
```

Uses `VALUESCAN_ADMIN_EMAIL` and `VALUESCAN_ADMIN_PASSWORD` from VPS `.env`.

---

## Files **not** uploaded by deploy

These stay local-only (on purpose):

- Root `package.json` (frontend tooling)
- `node_modules/`
- `server/` (legacy TypeScript stack)
- `src-backup-original/`

---

## Verify after deploy

```bash
curl -s http://127.0.0.1:4030/api/health
grep assets /var/www/valuescan/dist/index.html   # must show src="/assets/..."
pm2 describe valuescan                            # script: backend/server.js
```
