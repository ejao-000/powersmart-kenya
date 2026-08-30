import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// The frontend is a separate app from the Go backend (pure API, no static
// serving). In development, Vite proxies every /api request to the backend so
// the browser only ever talks to http://localhost:3000 (no CORS involved).
// In production, build with `npm run build` and serve frontend/dist from any
// static host, pointing window.POWERSMART_API at the backend API URL.
const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Root "/" is the marketing landing page; the customer portal
        // (login/register/dashboard) lives at /app.html.
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
  server: {
    port: 3000,
    // Fail loudly if :3000 is already in use instead of silently jumping to
    // :3001 — a second dev server that ends up on another port looks like a
    // broken frontend-backend connection.
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
})
