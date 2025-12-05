import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl' // Importe o plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', 
    }),
    basicSsl() // Adicione o plugin aqui
  ],
  server: {
    host: true, 
    https: true, // Força HTTPS
    port: 5173   // Opcional: fixa a porta
  },
})