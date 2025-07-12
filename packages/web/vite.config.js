import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import dayjs from 'dayjs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// read version from root package.json
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), '../../package.json'), 'utf8'));

// format build time as YYYY.MM.DD.HH.mm using dayjs
const formatBuildTime = () => {
  return dayjs().format('YYYY.MM.DD.HH.mm');
};

export default defineConfig({
  define: {
    // use VITE_ prefix for proper environment variable injection
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(formatBuildTime()),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(dayjs().toISOString()),
    'import.meta.env.VITE_PACKAGE_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'logo-192.svg', 'logo-512.svg'],
      manifest: {
        name: 'Spenicle - Simplify Spending, Maximize Savings',
        short_name: 'Spenicle',
        description: 'Simplify Spending, Maximize Savings with Spenicle',
        theme_color: '#e07a5f',
        background_color: '#f4f1de',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'logo-192.svg',
            type: 'image/svg+xml',
            sizes: '192x192',
            purpose: 'any maskable',
          },
          {
            src: 'logo-512.svg',
            type: 'image/svg+xml',
            sizes: '512x512',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: process.env.WEB_PORT,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
