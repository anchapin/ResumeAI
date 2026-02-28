import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../../pages/Settings';

// Mock clipboard API
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock useTheme hook
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: vi.fn(),
    theme: 'light',
  }),
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock authenticated token
    localStorage.setItem('resumeai_access_token', 'mock-token');

    // Default mock implementation for fetch
    mockFetch.mockImplementation(async (url) => {
      if (url.includes('/api-keys') && !url.includes('/api-keys/')) {
        // List keys
        return {
          ok: true,
          json: async () => ({ keys: [], total: 0 }),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      };
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('allows copying the new API key with feedback', async () => {
    // Override mock for this specific test
    mockFetch.mockImplementation(async (url, options) => {
      // Create Key Request
      if (url.endsWith('/api-keys') && options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            id: 1,
            api_key: 'rai_test_key_12345',
            name: 'Test Key',
            key_prefix: 'rai_test',
            createdAt: new Date().toISOString(),
            rate_limit: '100/minute',
            rate_limit_daily: 1000,
          }),
        };
      }

      // List Keys Request
      if (url.endsWith('/api-keys') && (!options || options.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({ keys: [], total: 0 }),
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      };
    });

    await act(async () => {
      render(<Settings />);
    });

    // Open create key modal
    const newKeyButton = screen.getByText('New API Key');
    fireEvent.click(newKeyButton);

    // Fill in key name
    const nameInput = screen.getByPlaceholderText('e.g., Development Key, Production Key');
    fireEvent.change(nameInput, { target: { value: 'Test Key' } });

    // Create key
    const createButton = screen.getByText('Create API Key');
    await act(async () => {
      fireEvent.click(createButton);
    });

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('API key created successfully!')).toBeInTheDocument();
    });

    // Find copy button
    const copyButton = screen.getByText('Copy');
    expect(copyButton).toBeInTheDocument();

    // Click copy
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Verify clipboard write
    expect(mockWriteText).toHaveBeenCalledWith('rai_test_key_12345');

    // Verify button text changes (this will fail until implemented)
    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    // Verify check icon appears
    const checkIcon = within(copyButton).getByText('check');
    expect(checkIcon).toBeInTheDocument();
  });
});
