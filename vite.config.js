import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pomodoro',
        short_name: 'Pomodoro',
        description: 'Focus timer with analytics',
        theme_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'static-assets' }
          },
          {
            urlPattern: ({ url }) => url.origin === 'http://localhost:4000',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 2,
              // GET cache; POST queuing is set in the next entry
            }
          },
          // Queue API POSTs while offline and replay when back online
          {
            urlPattern: ({ url }) => url.origin === 'http://localhost:4000' && /\/api\//.test(url.pathname),
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'api-post-queue',
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ]
});
