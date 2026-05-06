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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.js'],
      exclude: ['**/node_modules/**', '**/dist/**', 'tests/**', 'shared/**'],
      // Ratchet floor: set just below current baseline (measured 2026-05-06).
      // Raise these when coverage improves; never lower without a written reason.
      thresholds: {
        statements: 16,
        branches: 13,
        functions: 18,
        lines: 19,
      },
    },
  },
});
