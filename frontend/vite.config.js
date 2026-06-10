import { defineConfig } from 'vite'

// Vite config: proxy /api/* to backend to avoid CORS and hostname issues.
export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
