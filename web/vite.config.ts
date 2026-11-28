import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Spenicle',
        short_name: 'Spenicle',
        description: 'Log what you spent in two seconds; organize it later.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0908',
        theme_color: '#121110',
      },
      workbox: {
        // the shell is cached; /api is never cached, so no stale money
        navigateFallbackDenylist: [/^\/api\//],
        // fonts are precached for the two subsets the product can render — latin and
        // latin-ext — not every cyrillic or greek file the package ships
        globPatterns: [
          '**/*.{js,css,html,svg,webmanifest}',
          '**/*-latin-*-normal-*.woff2',
          '**/*-latin-ext-*-normal-*.woff2',
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // a vendor change should not invalidate the app chunk, and one 750 kB file
    // means every deploy re-downloads the router along with the screen that changed
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['@tanstack/react-router', '@tanstack/react-query'],
          ark: ['@ark-ui/react'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    // dev only: the browser talks to vite, vite talks to spenicle http
    proxy: { '/api': { target: 'http://127.0.0.1:8080' } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
