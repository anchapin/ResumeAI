import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVariants } from './useVariants';
import * as apiClient from '../utils/api-client';

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
    localStorage.clear();
    (global.fetch as any).mockClear();
    vi.spyOn(apiClient, 'getHeaders').mockReturnValue({ 'Content-Type': 'application/json' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with loading true', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useVariants());

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.variants).toEqual([]);
    });

    it('starts with no variants', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ variants: [] }),
      });

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.variants).toEqual([]);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('successful fetch', () => {
    it('fetches variants on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ variants: mockVariants }),
      });

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.variants).toEqual(mockVariants);
        expect(result.current.loading).toBe(false);
      });
    });

    it('uses correct API endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ variants: mockVariants }),
      });

      renderHook(() => useVariants());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/variants'),
          expect.any(Object),
        );
      });
    });

    it('includes API key in headers if available', async () => {
      vi.spyOn(apiClient, 'getHeaders').mockReturnValue({
        'Content-Type': 'application/json',
        'X-API-KEY': 'test-key-123',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ variants: mockVariants }),
      });

      renderHook(() => useVariants());

      await waitFor(() => {
        const headers = (global.fetch as any).mock.calls[0][1].headers;
        expect(headers['X-API-KEY']).toBe('test-key-123');
      });
    });
  });

  describe('error handling', () => {
    it('handles API error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Server Error' }),
      });

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.error).toBe('Server Error');
        expect(result.current.loading).toBe(false);
      });
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.error).toBe('Network failure');
        expect(result.current.loading).toBe(false);
      });
    });

    it('provides fallback variant on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Down'));

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.variants).toHaveLength(1);
        expect(result.current.variants[0].name).toBe('base');
      });
    });

    it('handles invalid JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('refetch functionality', () => {
    it('provides refetch function', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ variants: mockVariants }),
      });

      const { result } = renderHook(() => useVariants());

      await waitFor(() => {
        expect(result.current.refetch).toBeDefined();
      });
    });

    it('refetch updates data', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ variants: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ variants: mockVariants }),
        });

      const { result } = renderHook(() => useVariants());

      await waitFor(() => expect(result.current.variants).toEqual([]));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.variants).toEqual(mockVariants);
    });
  });
});
