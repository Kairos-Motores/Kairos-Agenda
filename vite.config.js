import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Esta configuração só afeta o ambiente de DESENVOLVIMENTO local
      '/api': {
        target: 'http://localhost:5173', // Em dev, aponte para o seu servidor local
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Garante que os assets sejam gerados com caminhos relativos corretos
    outDir: 'dist',
  }
})