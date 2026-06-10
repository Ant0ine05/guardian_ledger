import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Racine du monorepo (guardian_ledger/) pour que Vitest trouve les fichiers tests/
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Aliases explicites pour que Vite trouve ces packages depuis tests/frontend/
      // (Vite remonte depuis le fichier test et ne passe jamais par src/frontend/node_modules/)
      'vue': fileURLToPath(new URL('./node_modules/vue', import.meta.url)),
      '@vue/test-utils': fileURLToPath(new URL('./node_modules/@vue/test-utils', import.meta.url)),
      'vue-router': fileURLToPath(new URL('./node_modules/vue-router', import.meta.url)),
    },
  },
  server: {
    fs: {
      // Autorise Vitest à accéder aux fichiers dans tests/ (hors du root src/frontend/)
      allow: ['../..'],
    },
  },
  test: {
    root: REPO_ROOT,
    environment: 'jsdom',
    globals: true,
    include: ['tests/frontend/**/*.test.js'],
  },
})
