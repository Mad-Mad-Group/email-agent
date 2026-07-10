import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Scenario B: 0-setup access for office teammates via https://192.168.1.111:5173
  // 同事嘅 browser 直連入嚟 skip 自己 clone/run frontend
  // `host: true` == `0.0.0.0` (Vite alias for listen-all-interfaces)
  // `strictPort: true` 避免 Vite 撞去 5174 如果 5173 被佔
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    https: {
      key: fs.readFileSync('.cert/key.pem'),
      cert: fs.readFileSync('.cert/cert.pem'),
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
