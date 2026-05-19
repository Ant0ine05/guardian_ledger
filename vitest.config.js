import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// Ce fichier est à la racine de guardian_ledger/.
// Le root Vite devient guardian_ledger/, ce qui permet à Vitest
// d'accéder librement aux fichiers dans tests/ ET src/frontend/src/.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/frontend/src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/frontend/**/*.test.js'],
  },
});
