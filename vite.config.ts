import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'src/public',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  define: {
    __LAST_UPDATED__: JSON.stringify(new Date().toISOString()),
  }
});
