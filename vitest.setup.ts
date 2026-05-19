import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

// Mock import.meta.env for Vitest - this must work with Vite's build
(global as any).importMeta = {
  env: {
    VITE_API_URL: 'http://localhost:8000',
  },
};

// Also set up global import for compatibility
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:8000',
      },
    },
  },
  writable: true,
});

// Note: MSW requires browser environment (window, Worker)
// For browser tests, import tests/mocks/msw-setup.ts which handles this properly
// This setup file handles Node.js test environment (server-side rendering tests)

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Polyfill DataTransfer for tests
if (typeof DataTransfer === 'undefined') {
  class DataTransfer {
    items = {
      add: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn(),
    };
    files = [];
    setData = vi.fn();
    getData = vi.fn();
    clearData = vi.fn();
    types = [];
  }
  (global as any).DataTransfer = DataTransfer;
}

// Polyfill FormData for tests if it's missing in jsdom
if (typeof FormData === 'undefined') {
  class MockFormData {
    append = vi.fn();
    delete = vi.fn();
    get = vi.fn();
    getAll = vi.fn();
    has = vi.fn();
    set = vi.fn();
    forEach = vi.fn();
    entries = vi.fn();
    keys = vi.fn();
    values = vi.fn();
  }
  (global as any).FormData = MockFormData;
  if (typeof window !== 'undefined') {
    (window as any).FormData = MockFormData;
  }
}
