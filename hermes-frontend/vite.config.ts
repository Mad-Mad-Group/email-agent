import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// Optional HTTPS — use certs if they exist, otherwise plain HTTP
const certPath = '.cert/cert.pem'
const keyPath = '.cert/key.pem'
const httpsConfig =
  fs.existsSync(certPath) && fs.existsSync(keyPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined

// /api → backend。dev（vite）同 preview（build 完睇 dist）都要用同一組，
// 唔係嘅話靜態伺服器會拿 SPA fallback 回 index.html，
// 令 /api/events 變 text/html（EventSource 收唔到）、其他 API 回 HTML（.map is not a function）。
const apiProxy = {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
    // SSE 係長連線，唔可以有 timeout
    timeout: 0,
    proxyTimeout: 0,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['i18next-browser-languagedetector'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    https: httpsConfig,
    proxy: apiProxy,
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    https: httpsConfig,
    proxy: apiProxy,
  },
})
