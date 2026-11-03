import { defineConfig } from 'vite';

export default defineConfig({
  // Three.js alone is ~550 kB minified; that's expected for this game.
  build: { chunkSizeWarningLimit: 900 },
});
