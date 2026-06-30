/** ValueScan server config — https://valuescan.online */
export const VALUESCAN = {
  name: 'ValueScan',
  domain: process.env.VALUESCAN_DOMAIN ?? 'valuescan.online',
  url: process.env.VALUESCAN_URL ?? 'https://valuescan.online',
} as const
