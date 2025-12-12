import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // Corrige o aviso "outdated JSX transform"
    }),
    basicSsl()
  ],
  server: {
    host: true,
    https: true,
    port: 5173,
    proxy: {
      '/api-supa': {
        target: 'http://192.168.2.211:8000', // Endereço do seu Supabase
        changeOrigin: true,
        secure: false,
        ws: true, // <--- CRÍTICO: Permite o Realtime funcionar via HTTPS
        rewrite: (path) => path.replace(/^\/api-supa/, '')
      }
    }
  },
})