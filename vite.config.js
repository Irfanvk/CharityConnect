import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_CHARITY_APP_BASE_URL || 'http://localhost:8000';
  let backendApiPattern = null;
  try {
    if (backendUrl) {
      const backendOrigin = new URL(backendUrl).origin;
      const escapedBackendOrigin = backendOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      backendApiPattern = new RegExp(`^${escapedBackendOrigin}/api/.*`);
    }
  } catch {
    backendApiPattern = null;
  }
  
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
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      // Keep production bundle compatible with older iOS Safari builds.
      target: ['es2017', 'safari12'],
      // Production build optimizations — esbuild is faster and lighter than terser
      minify: 'esbuild',
      esbuildOptions: {
        drop: ['console', 'debugger'],
      },
      // Code splitting for better caching
      rollupOptions: {
        maxParallelFileOps: 2,
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
      legacy({
        targets: ['defaults', 'ios >= 12', 'safari >= 12'],
        // Reduce polyfill size — only add what's actually used
        modernPolyfills: false,
        renderLegacyChunks: false,
      }),
      react(),
      VitePWA({
        // Manual registration lets main.jsx skip iOS; avoids stale-cache blank screens.
        registerType: 'prompt',
        injectRegister: 'null',
        manifestFilename: 'manifest.json',
        workbox: {
          cleanupOutdatedCaches: true,
          // Don't force-take control on update — prevents cache mismatch blanks.
          skipWaiting: false,
          clientsClaim: false,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          runtimeCaching: [
            {
              // Relative API calls: network-first, fallback to cache when offline.
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-runtime-cache',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            ...(backendApiPattern
              ? [{
                  // Remote backend API responses in production.
                  urlPattern: backendApiPattern,
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'api-origin-runtime-cache',
                    networkTimeoutSeconds: 10,
                    expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                }]
              : []),
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'image-runtime-cache',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ]
  };
});