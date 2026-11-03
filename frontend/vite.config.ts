import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy API calls in development so cookies stay same-origin.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
