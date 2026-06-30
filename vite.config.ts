import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isValueScan = process.env.VITE_APP_MODE === 'valuescan' || process.env.APP_MODE === 'valuescan'
const API_PORT = Number(
  process.env.VALUESCAN_API_PORT ?? process.env.MARKETPLACE_API_PORT ?? process.env.PORT ?? (isValueScan ? 4030 : 4020),
)
const CLIENT_PORT = Number(
  process.env.VITE_PORT ?? process.env.VALUESCAN_CLIENT_PORT ?? process.env.MARKETPLACE_CLIENT_PORT ?? (isValueScan ? 5190 : 5180),
)

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react'
          if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) return 'router'
          if (id.includes('node_modules/framer-motion/')) return 'motion'
          if (id.includes('node_modules/lucide-react/')) return 'icons'
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: CLIENT_PORT,
    host: true,
    allowedHosts: [
      'printablelistings.xyz',
      'www.printablelistings.xyz',
      'valuescan.online',
      'www.valuescan.online',
      'localhost',
    ],
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/uploads': `http://localhost:${API_PORT}`,
      '/sitemap.xml': `http://localhost:${API_PORT}/sitemap.xml`,
    },
  },
  preview: {
    port: CLIENT_PORT,
    host: true,
    allowedHosts: [
      'printablelistings.xyz',
      'www.printablelistings.xyz',
      'valuescan.online',
      'www.valuescan.online',
      'localhost',
    ],
  },
})
