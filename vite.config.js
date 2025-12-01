import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Esta configuração força o compilador moderno, removendo o aviso
      jsxRuntime: 'automatic', 
    })
  ],
  server: {
    host: true, // Garante que funcione em ambientes de rede/container
  },
})