import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://kairosagenda.vercel.app',
        changeOrigin: true,
        secure: true,
        bypass(req) {
          // Only proxy actual API calls — never JS/CSS/HTML
          if (req.headers.accept?.includes('text/html')) return req.url;
        }
      }
    }
  }
})
