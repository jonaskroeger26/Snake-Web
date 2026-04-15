import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Creature Collect (GPS game) — use for Capacitor android:sync, not solanasnake.app.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, 'app');

export default defineConfig({
  root: 'app',
  publicDir: 'public',
  build: {
    outDir: '../dist-creature',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(appDir, 'index.html'),
      },
    },
  },
});
