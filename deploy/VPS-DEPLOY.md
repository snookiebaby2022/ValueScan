# Deploy Printable Listings to VPS

## Problem
`printablelistings.xyz` shows **Umami login** because nginx proxies the domain to Umami (`:3002`), not the marketplace (`:4020`).

## Step 1 — Upload project from Windows

```powershell
cd C:\Users\lizzi\Projects\marketplace-hub

# Upload app (excludes node_modules — npm ci on server)
scp -r deploy server src public index.html package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts .env root@YOUR_VPS_IP:/var/www/marketplace-hub/
```

Or use rsync if available:

```powershell
rsync -avz --exclude node_modules --exclude dist --exclude .git `
  C:\Users\lizzi\Projects\marketplace-hub\ `
  root@YOUR_VPS_IP:/var/www/marketplace-hub/
```

## Step 2 — Fix nginx + start app (on VPS)

```bash
# Upload fix script
# (from PC): scp deploy/fix-printablelistings-domain.sh root@YOUR_VPS_IP:/root/

ssh root@YOUR_VPS_IP

mkdir -p /var/www/marketplace-hub
bash /root/fix-printablelistings-domain.sh
```

## Step 3 — Verify

```bash
curl -s https://printablelistings.xyz/api/health
curl -sI https://printablelistings.xyz/login | grep -i x-powered-by
```

- `/api/health` should return `"site":"printablelistings.xyz"`
- **No** `x-powered-by: Next.js`

## Umami (optional)

Point **`stats.printablelistings.xyz`** DNS to the same VPS. Umami stays on port 3002.
