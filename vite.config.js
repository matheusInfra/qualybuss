// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Esta linha força o uso do novo transformador JSX
      jsxRuntime: 'automatic', 
    }),
  ],
  server: {
    host: true,
  },
});