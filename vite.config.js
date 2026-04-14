import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages: https://eiasash.github.io/InternalMedicine/
  base: '/InternalMedicine/',

  server: {
    port: 3737,
    open: '/pnimit-mega.html',
  },

  build: {
    rollupOptions: {
      input: 'pnimit-mega.html',
    },
    outDir: 'dist',
    emptyOutDir: true,
  },

  // Disable default publicDir — build script copies static assets
  publicDir: false,

  test: {
    globals: true,
  },
});
