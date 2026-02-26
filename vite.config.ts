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
        pool: 'forks',
        poolOptions: {
          forks: {
            singleFork: true,
          },
        },
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
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
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
