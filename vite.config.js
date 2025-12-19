import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      basicSsl() // Mantém HTTPS se você precisa dele
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'swr'],
            ui: ['framer-motion', 'react-hot-toast', 'react-imask', 'react-hook-form', 'zod'],
            pdf: ['pdfjs-dist', 'pdf-lib'],
            charts: ['chart.js', 'react-chartjs-2', 'date-fns', 'react-big-calendar']
          }
        }
      }
    },
    server: {
      host: true,
      https: true, // Habilita HTTPS devido ao basicSsl
      port: 5173,
      proxy: {
        '/api-supa': {
          target: env.VITE_SUPABASE_URL, // Agora vai ler o IP correto do .env
          changeOrigin: true,
          ws: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-supa/, ''),
        },
      },
    }
  };
});