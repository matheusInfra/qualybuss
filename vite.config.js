import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Corrige o aviso "outdated JSX transform"
      jsxRuntime: 'automatic', 
    }),
    basicSsl()
  ],
  server: {
    host: true,
    https: true,
    port: 5173,
    // AQUI ESTÁ A MÁGICA DO TÚNEL (PROXY)
    proxy: {
      '/api-supa': {
        target: 'http://192.168.2.211:8000', // Endereço do seu Supabase HTTP
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-supa/, '') // Remove o prefixo ao enviar
      }
    }
  },
})