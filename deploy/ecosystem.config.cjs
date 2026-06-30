const fs = require('fs')
const path = require('path')

const appDir = process.env.MARKETPLACE_DIR || '/var/www/marketplace-hub'

function loadEnvFile(filePath) {
  const env = {}
  if (!fs.existsSync(filePath)) return env
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const fileEnv = loadEnvFile(path.join(appDir, '.env'))

module.exports = {
  apps: [
    {
      name: 'printablelistings',
      cwd: appDir,
      script: 'node_modules/.bin/tsx',
      args: 'server/index.ts',
      env: {
        NODE_ENV: 'production',
        PORT: '4020',
        MARKETPLACE_API_PORT: '4020',
        CLIENT_URL: 'https://printablelistings.xyz',
        SITE_URL: 'https://printablelistings.xyz',
        VITE_SITE_URL: 'https://printablelistings.xyz',
        // WHMCS live PayPal — set in .env on server (not committed)
        // WHMCS_URL, WHMCS_API_IDENTIFIER, WHMCS_API_SECRET, WHMCS_WEBHOOK_SECRET
        ...fileEnv,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
    },
  ],
}
