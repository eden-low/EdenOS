import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'icons/favicon.ico',
        'icons/edenos-icon.svg',
        'icons/apple-touch-icon-180x180.png',
        'icons/pwa-64x64.png',
      ],
      manifest: {
        id: '/',
        name: 'EdenOS',
        short_name: 'EdenOS',
        description: 'A private personal operating system for money, movement, and progress.',
        theme_color: '#090c13',
        background_color: '#090c13',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css}'],
        // HLS playback already requires an online media source. Keep its large,
        // dynamically imported runtime out of the app-shell precache.
        globIgnores: ['assets/hls-*.js'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
