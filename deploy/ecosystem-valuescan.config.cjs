/**
 * ValueScan production — PM2 runs backend/server.js (not server/index.ts).
 * Frontend is pre-built locally into dist/ and uploaded by push-valuescan.ps1.
 */
const fs = require('fs')
const path = require('path')

const appDir = process.env.VALUESCAN_DIR || '/var/www/valuescan'
const backendDir = path.join(appDir, 'backend')

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
      name: 'valuescan',
      cwd: backendDir,
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: '4030',
        VALUESCAN_URL: 'https://valuescan.online',
        VALUESCAN_DOMAIN: 'valuescan.online',
        DB_PATH: path.join(backendDir, 'valuescan.db'),
        ...fileEnv,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '384M',
    },
  ],
}
