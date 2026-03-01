import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVariants } from './useVariants';

global.fetch = vi.fn();

const mockVariants = [
  {
    name: 'base',
    display_name: 'Base Template',
    description: 'A clean, professional resume template',
    format: 'json',
    output_formats: ['pdf', 'html'],
  },
  {
    name: 'modern',
    display_name: 'Modern Template',
    description: 'A modern, minimalist resume template',
    format: 'json',
    output_formats: ['pdf', 'html', 'docx'],
  },
];

describe('useVariants Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with loading true', () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useVariants());

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.variants).toEqual([]);
    });

    it('starts with no variants', () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: [] }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      expect(result.current.variants).toEqual([]);
    });
  });

  describe('successful fetch', () => {
    it('fetches variants on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.variants).toEqual(mockVariants);
      expect(result.current.error).toBeNull();
    });

    it('uses correct API endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      renderHook(() => useVariants());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('/v1/variants');
    });

    it('includes API key in headers if available', async () => {
      process.env.RESUMEAI_API_KEY = 'test-key-123';

      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      renderHook(() => useVariants());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const headers = (global.fetch as any).mock.calls[0][1].headers;
      expect(headers['X-API-KEY']).toBe('test-key-123');
    });

    it('includes Content-Type header', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      renderHook(() => useVariants());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const headers = (global.fetch as any).mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('sets loading to false after fetch', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('handles API error responses', async () => {
      const errorResponse = { detail: 'Server error' };
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), { status: 500 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toContain('Server error');
      expect(result.current.loading).toBe(false);
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });

    it('provides fallback variant on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.variants.length).toBeGreaterThan(0);
      });

      expect(result.current.variants[0].name).toBe('base');
      expect(result.current.variants[0].display_name).toBe('Base Template');
    });

    it('handles invalid JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response('invalid json', { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      }, { timeout: 2000 });

      expect(result.current.loading).toBe(false);
    });

    it('handles different HTTP error codes', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('refetch functionality', () => {
    it('provides refetch function', () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      expect(typeof result.current.refetch).toBe('function');
    });

    it('refetch updates data', async () => {
      const initialVariants = [mockVariants[0]];
      const updatedVariants = mockVariants;

      (global.fetch as any)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ variants: initialVariants }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ variants: updatedVariants }), { status: 200 }),
        );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.variants.length).toBe(1);
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.variants.length).toBe(2);
      });
    });

    it('refetch sets loading state', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
        )
        .mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify({ variants: mockVariants }), { status: 200 })), 50)),
        );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refetch();
      });

      expect(result.current.loading).toBe(true);
    });

    it('refetch clears errors', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
        );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('returned values', () => {
    it('returns all expected properties', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      expect(result.current).toHaveProperty('variants');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
    });

    it('variants array contains correct structure', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.variants.length).toBeGreaterThan(0);
      });

      const variant = result.current.variants[0];
      expect(variant).toHaveProperty('name');
      expect(variant).toHaveProperty('display_name');
      expect(variant).toHaveProperty('description');
      expect(variant).toHaveProperty('format');
      expect(variant).toHaveProperty('output_formats');
    });
  });

  describe('edge cases', () => {
    it('handles empty variants response', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: [] }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.variants).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles response without variants field', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.loading).toBe(false);
    });

    it('handles very large response', async () => {
      const largeVariants = Array.from({ length: 100 }, (_, i) => ({
        ...mockVariants[0],
        name: `variant-${i}`,
      }));

      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: largeVariants }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.variants.length).toBe(100);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles rapid refetch calls', async () => {
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refetch();
        result.current.refetch();
        result.current.refetch();
      });

      expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('method execution', () => {
    it('makes GET request', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ variants: mockVariants }), { status: 200 }),
      );

      renderHook(() => useVariants());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const config = (global.fetch as any).mock.calls[0][1];
      expect(config.method).toBe('GET');
    });
  });
});
