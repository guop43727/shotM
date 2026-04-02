// vite.config.js
// REQ-CORE-016: Vite dev server with HMR
// REQ-CORE-017: npm run build outputs to dist/
// REQ-CORE-018: ≤3 JS chunks, each gzip ≤500KB

export default {
  base: './',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'vendor';
          }
          if (id.includes('src/')) {
            return 'game';
          }
        }
      }
    }
  }
};
