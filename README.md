# Marketplace Hub

This repository currently contains the **ValueScan** SEO-tool frontend and supporting API. The original marketplace source is preserved in `src-backup-original/`.

## Current mode: ValueScan

- Frontend: React 18 + Vite + Tailwind
- API: `server/index.ts` (TypeScript, better-sqlite3) or `backend/server.js` (legacy sqlite3)
- Production API: `backend/server.js` on port **4030**
- Development client: port **5180** (marketplace mode) or **5190** (ValueScan mode)

## Run

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5180
- API: http://localhost:4020

For the legacy ValueScan backend:

```bash
npm run dev:valuescan
```

## Environment

Copy `.env.example` to `.env` and set at least:

```
JWT_SECRET=           # required — generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
VITE_GA_MEASUREMENT_ID= # optional
```

## Original Marketplace

The original Marketplace Hub React source lives in `src-backup-original/`. To restore it, replace `src/` with `src-backup-original/` and update `index.html` metadata accordingly.

## Tech

React 18 · Vite · Express · SQLite · JWT auth
