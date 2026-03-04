import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

// Note: MSW requires browser environment (window, Worker)
// For browser tests, import tests/mocks/msw-setup.ts which handles this properly
// This setup file handles Node.js test environment (server-side rendering tests)

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
