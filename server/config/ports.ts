import { isValueScanMode } from './app-mode.js'

const defaultApi = isValueScanMode() ? 4030 : 4020
const defaultClient = isValueScanMode() ? 5190 : 5180

/** API/client ports — marketplace 4020/5180, ValueScan 4030/5190 (avoids Nexlify 3000/3001). */
export const PORTS = {
  API: Number(process.env.PORT ?? process.env.VALUESCAN_API_PORT ?? process.env.MARKETPLACE_API_PORT ?? defaultApi),
  CLIENT: Number(process.env.VITE_PORT ?? process.env.VALUESCAN_CLIENT_PORT ?? process.env.MARKETPLACE_CLIENT_PORT ?? defaultClient),
} as const

export function clientOrigin() {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL
  if (isValueScanMode()) return process.env.VALUESCAN_URL ?? `http://localhost:${PORTS.CLIENT}`
  return `http://localhost:${PORTS.CLIENT}`
}
