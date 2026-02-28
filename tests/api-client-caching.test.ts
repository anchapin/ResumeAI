/**
 * Tests for variants caching in API client.
 * Issue #540: Fix API Client Inefficient Fetching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getVariants, invalidateVariantsCache, type VariantMetadata } from '../utils/api-client';

vi.mock('../utils/fetch-timeout', () => ({
  fetchWithTimeout: vi.fn(),
  TIMEOUT_CONFIG: {
    QUICK: 5000,
    STANDARD: 10000,
    PDF_GENERATION: 15000,
    AI_OPERATION: 15000,
    NONE: 0,
  },
}));

vi.mock('../utils/retryLogic', () => ({
  fetchWithRetry: vi.fn(),
}));

const mockVariants: VariantMetadata[] = [
  {
    name: 'modern',
    display_name: 'Modern',
    description: 'Modern template',
    category: 'standard',
    style: 'clean',
    features: ['ats-friendly', 'minimalist'],
    recommended_for: ['tech', 'startup'],
    color_schemes: [
      { name: 'blue', primary: [30, 58, 138], accent: [59, 130, 246], secondary: [147, 197, 253] },
    ],
  },
  {
    name: 'classic',
    display_name: 'Classic',
    description: 'Classic template',
    category: 'traditional',
    style: 'formal',
    features: ['professional', 'conservative'],
    recommended_for: ['finance', 'corporate'],
    color_schemes: [
      { name: 'black', primary: [17, 24, 39], accent: [75, 85, 99], secondary: [156, 163, 175] },
    ],
  },
];

describe('Variants Caching (Issue #540)', () => {
  let fetchWithTimeout: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    invalidateVariantsCache();
    const { fetchWithTimeout: ft } = await import('../utils/fetch-timeout');
    fetchWithTimeout = vi.mocked(ft);
  });

  afterEach(() => {
    vi.clearAllMocks();
    invalidateVariantsCache();
  });

  describe('Initial Fetch (Cache Miss)', () => {
    it('should fetch variants from API on first call', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      const result = await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/v1/variants'),
        expect.objectContaining({ headers: expect.any(Object) }),
        10000,
      );
      expect(result).toEqual(mockVariants);
    });

    it('should fetch variants with filters', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      const result = await getVariants({ category: 'standard', search: 'modern' });

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('category=standard'),
        expect.objectContaining({ headers: expect.any(Object) }),
        10000,
      );
      expect(result).toEqual(mockVariants);
    });

    it('should handle API errors on fetch', async () => {
      const mockResponse = new Response(JSON.stringify({ detail: 'Server error' }), {
        status: 500,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      await expect(getVariants()).rejects.toThrow('Failed to fetch variants');
    });
  });

  describe('Cache Hit', () => {
    it('should return cached data on subsequent call with same filters', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      const firstCall = await getVariants();
      const secondCall = await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(firstCall).toEqual(mockVariants);
      expect(secondCall).toEqual(mockVariants);
    });

    it('should return cached data with same filter parameters', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      const firstCall = await getVariants({ category: 'standard' });
      const secondCall = await getVariants({ category: 'standard' });

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(firstCall).toEqual(secondCall);
    });

    it('should not fetch when cache is still valid', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      await getVariants();
      await getVariants();
      await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Miss (Different Filters)', () => {
    it('should fetch again when filters change', async () => {
      const mockResponse1 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[1]] }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const firstCall = await getVariants({ category: 'standard' });
      const secondCall = await getVariants({ category: 'traditional' });

      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
      expect(firstCall).toEqual([mockVariants[0]]);
      expect(secondCall).toEqual([mockVariants[1]]);
    });

    it('should handle different search parameters', async () => {
      const mockResponse1 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[1]] }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      await getVariants({ search: 'modern' });
      await getVariants({ search: 'classic' });

      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle tags parameter correctly', async () => {
      const mockResponse1 = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      await getVariants({ tags: ['ats-friendly', 'minimalist'] });
      await getVariants({ tags: ['professional'] });

      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
      expect(fetchWithTimeout).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('tags=ats-friendly%2Cminimalist'),
        expect.any(Object),
        10000,
      );
      expect(fetchWithTimeout).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('tags=professional'),
        expect.any(Object),
        10000,
      );
    });
  });

  describe('Cache Invalidation', () => {
    it('should clear cache when invalidateVariantsCache is called', async () => {
      const mockResponse1 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[1]] }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const firstCall = await getVariants();
      invalidateVariantsCache();
      const secondCall = await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
      expect(firstCall).toEqual([mockVariants[0]]);
      expect(secondCall).toEqual([mockVariants[1]]);
    });

    it('should allow fresh fetch after invalidation', async () => {
      const mockResponse1 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[1]] }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      await getVariants();
      invalidateVariantsCache();
      await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple invalidations', async () => {
      const mockResponse1 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[1]] }), {
        status: 200,
      });
      const mockResponse3 = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)
        .mockResolvedValueOnce(mockResponse3);

      await getVariants();
      invalidateVariantsCache();
      await getVariants();
      invalidateVariantsCache();
      await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cache Expiration', () => {
    it('should expire cache after 5 minutes', async () => {
      vi.useFakeTimers();
      const mockResponse1 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[1]] }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const firstCall = await getVariants();

      vi.advanceTimersByTime(5 * 60 * 1000 - 1);

      const secondCall = await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(firstCall).toEqual([mockVariants[0]]);
      expect(secondCall).toEqual([mockVariants[0]]);

      vi.advanceTimersByTime(1);

      const thirdCall = await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
      expect(thirdCall).toEqual([mockVariants[1]]);

      vi.useRealTimers();
    });

    it('should fetch fresh data after cache expires', async () => {
      vi.useFakeTimers();
      const mockResponse1 = new Response(JSON.stringify({ variants: [mockVariants[0]] }), {
        status: 200,
      });
      const mockResponse2 = new Response(JSON.stringify({ variants: [mockVariants[1]] }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      await getVariants();

      vi.advanceTimersByTime(5 * 60 * 1000 + 100);

      const result = await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockVariants[1]]);

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty variants array', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: [] }), { status: 200 });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      const result = await getVariants();

      expect(result).toEqual([]);
      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    });

    it('should handle no filters', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      const result = await getVariants({});

      expect(result).toEqual(mockVariants);
      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    });

    it('should cache empty filter results', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: [] }), { status: 200 });
      fetchWithTimeout.mockResolvedValueOnce(mockResponse);

      const firstCall = await getVariants();
      const secondCall = await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(firstCall).toEqual([]);
      expect(secondCall).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should be faster for cached calls', async () => {
      const mockResponse = new Response(JSON.stringify({ variants: mockVariants }), {
        status: 200,
      });
      fetchWithTimeout.mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100));
      });

      const start1 = performance.now();
      await getVariants();
      const duration1 = performance.now() - start1;

      const start2 = performance.now();
      await getVariants();
      const duration2 = performance.now() - start2;

      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(duration2).toBeLessThan(duration1);
    });
  });
});
