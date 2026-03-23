import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e/**', 'tests/visual/**'],
    // Worker configuration to prevent timeouts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Increase timeout for slow tests
    testTimeout: 30000,
    hookTimeout: 30000,
    // Track test results for flaky test detection
    onConsoleLog: (type, message) => {
      // Track console output for debugging
      if (message.includes('FAIL') || message.includes('failed')) {
        console.log(`[Test ${type}]: ${message}`);
      }
    },
  },
  resolve: {
    alias: {
      // Add alias for easier imports if needed
      '@mocks': path.resolve(__dirname, './__mocks__'),
    },
  },
  define: {
    'import.meta.env': JSON.stringify({
      VITE_API_URL: 'http://localhost:8000',
    }),
  },
});
