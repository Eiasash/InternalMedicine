import { defineConfig } from 'vite';

export default defineConfig({
  // Dev server config — app still works as plain static files
  server: {
    port: 3737,
    open: '/pnimit-mega.html',
  },
  // Build config for future use (Phase 2 will wire this up)
  build: {
    rollupOptions: {
      input: 'pnimit-mega.html',
    },
    outDir: 'dist',
  },
  // Vitest config
  test: {
    globals: true,
  },
});
