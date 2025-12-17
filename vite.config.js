import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Aumenta limite de aviso para 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa bibliotecas do núcleo (React)
          vendor: ['react', 'react-dom', 'react-router-dom', 'swr'],
          // Separa bibliotecas de UI pesadas
          ui: ['framer-motion', 'react-hot-toast', 'react-imask', 'react-hook-form', 'zod'],
          // Separa bibliotecas de PDF (O maior peso)
          pdf: ['pdfjs-dist', 'pdf-lib'],
          // Separa gráficos e datas
          charts: ['chart.js', 'react-chartjs-2', 'date-fns', 'react-big-calendar']
        }
      }
    }
  },
  server: {
    host: true // Permite acesso via IP na rede local
  }
});