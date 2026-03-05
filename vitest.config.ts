import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Configure mock file patterns
    mock: {
      // Enable automatic mocking for __mocks__ directories
      // Files in __mocks__ will be auto-mocked when the module is requested
      // This follows Jest's __mocks__ convention
    },
  },
  resolve: {
    alias: {
      // Add alias for easier imports if needed
      '@mocks': path.resolve(__dirname, './__mocks__'),
    },
  },
  resolve: {
    alias: {
      '@mocks': path.resolve(__dirname, './__mocks__'),
    },
  },
  define: {
    'import.meta.env': JSON.stringify({
      VITE_API_URL: 'http://localhost:8000',
    }),
  },
});
