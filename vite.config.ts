import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    optimizeDeps: {
      exclude: ['docs'],
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: './vitest.setup.ts',
      include: ['**/*.test.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**', '**/*.spec.ts'],
      singleFork: true,
      testTimeout: 15000,
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.test.{ts,tsx}',
          '**/*.bench.test.{ts,tsx}',
          '**/dist/',
          '**/build/',
          '**/coverage/',
          '**/docs/',
          'vitest.config.ts',
          'vite.config.ts',
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'ResumeAI',
          short_name: 'ResumeAI',
          description: 'AI-Powered Resume Tailoring & Interview Practice',
          theme_color: '#4f46e5',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.resumeai\.com\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                backgroundSync: {
                  name: 'api-sync',
                  options: {
                    maxRetentionTime: 60 * 24, // 24 hours
                  },
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunk for core dependencies
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor';
            }
            // UI libraries chunk
            if (
              id.includes('node_modules/react-toastify') ||
              id.includes('node_modules/recharts') ||
              id.includes('node_modules/react-markdown')
            ) {
              return 'ui-libs';
            }
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
  };
});
