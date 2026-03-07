import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_CHARITY_APP_BASE_URL || 'http://localhost:8000';
  const backendOrigin = new URL(backendUrl).origin;
  const escapedBackendOrigin = backendOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const backendApiPattern = new RegExp(`^${escapedBackendOrigin}/api/.*`);
  const isProd = mode === 'production';

  return {
    logLevel: isProd ? 'error' : 'warn',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      // Production build optimizations
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      // Code splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'radix-ui': ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            'form-handling': ['@hookform/resolvers', 'react-hook-form'],
            'query': ['@tanstack/react-query'],
          },
        },
      },
      // Reduce chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Source maps for debugging (set to false if not needed)
      sourcemap: false,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifestFilename: 'manifest.json',
        includeAssets: ['brand/CharityHub.svg', 'brand/CharityHub.png'],
        manifest: {
          name: 'CharityHub APP',
          short_name: 'CharityHub',
          description: 'Charity management and donation tracking application',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#10b981',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          runtimeCaching: [
            {
              // API calls: prioritize freshness, fallback to cache when offline.
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-runtime-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cache remote backend API responses in production deployments.
              urlPattern: backendApiPattern,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-origin-runtime-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'image-runtime-cache',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ]
        }
      }),
    ]
  };
});