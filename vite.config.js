import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Esta linha força o novo transformador JSX, removendo o aviso
      jsxRuntime: 'automatic', 
    }),
  ],
  server: {
    host: true,
  },
});