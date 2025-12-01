import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Esta linha corrige o aviso "outdated JSX transform"
      jsxRuntime: 'automatic', 
    })
  ],
  server: {
    host: true,
  },
})