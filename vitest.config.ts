import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      // Add alias for easier imports if needed
      '@mocks': path.resolve(__dirname, './__mocks__'),
    },
  },
});
