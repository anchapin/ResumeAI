import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
            lines: 60,
            functions: 60,
            branches: 60,
            statements: 60,
          },
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60,
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
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
              if (id.includes('node_modules/react-toastify') || 
                  id.includes('node_modules/recharts') ||
                  id.includes('node_modules/react-markdown')) {
                return 'ui-libs';
              }
            }
          }
        },
        chunkSizeWarningLimit: 500
      }
    };
});
