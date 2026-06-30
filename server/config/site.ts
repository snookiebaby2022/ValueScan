/** Server-side site config — https://printablelistings.xyz */
export const SITE = {
  name: 'Printable Listings',
  domain: 'printablelistings.xyz',
  url: process.env.SITE_URL ?? 'https://printablelistings.xyz',
  allowedOrigins: [
    'https://printablelistings.xyz',
    'https://www.printablelistings.xyz',
    'https://valuescan.online',
    'https://www.valuescan.online',
    'http://localhost:5180',
    'http://127.0.0.1:5180',
  ],
} as const
