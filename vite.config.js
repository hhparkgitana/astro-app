import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build/renderer',
    rollupOptions: {
      external: ['better-sqlite3', 'electron']
    }
  },
  server: {
    port: 3456,  // Changed from 3000!
  },
  optimizeDeps: {
    exclude: ['better-sqlite3']
  }
});
