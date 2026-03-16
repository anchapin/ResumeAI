/**
 * Tests for retry logic with exponential backoff
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateBackoffDelay,
  isRetryableStatus,
  sleep,
  retryWithBackoff,
  fetchWithRetry,
} from './retryLogic';

describe('Retry Logic', () => {
  describe('calculateBackoffDelay', () => {
    const config = {
      maxRetries: 3,
      initialDelay: 100,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterFraction: 0.1,
    };

    it('calculates exponential backoff correctly', () => {
      // Attempt 0: 100ms * 2^0 = 100ms
      const delay0 = calculateBackoffDelay(0, config);
      expect(delay0).toBeGreaterThanOrEqual(100);
      expect(delay0).toBeLessThanOrEqual(100 + 10); // 100 + 10% jitter

      // Attempt 1: 100ms * 2^1 = 200ms
      const delay1 = calculateBackoffDelay(1, config);
      expect(delay1).toBeGreaterThanOrEqual(200);
      expect(delay1).toBeLessThanOrEqual(200 + 20);

      // Attempt 2: 100ms * 2^2 = 400ms
      const delay2 = calculateBackoffDelay(2, config);
      expect(delay2).toBeGreaterThanOrEqual(400);
      expect(delay2).toBeLessThanOrEqual(400 + 40);
    });

    it('respects max delay cap', () => {
      // Very high attempt number should be capped at maxDelay
      const delay = calculateBackoffDelay(10, config);
      expect(delay).toBeLessThanOrEqual(config.maxDelay + config.maxDelay * 0.1);
    });

    it('applies jitter correctly', () => {
      // Run multiple times to verify jitter varies
      const delays = Array.from({ length: 5 }, () => calculateBackoffDelay(0, config));
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1); // Should have variation due to jitter
    });

    it('applies no jitter when jitterFraction is 0', () => {
      const noJitterConfig = { ...config, jitterFraction: 0 };
      const delay1 = calculateBackoffDelay(0, noJitterConfig);
      const delay2 = calculateBackoffDelay(0, noJitterConfig);
      expect(delay1).toBe(delay2);
      expect(delay1).toBe(100);
    });
  });

  describe('isRetryableStatus', () => {
    it('returns true for 5xx status codes', () => {
      expect(isRetryableStatus(500)).toBe(true);
      expect(isRetryableStatus(502)).toBe(true);
      expect(isRetryableStatus(503)).toBe(true);
      expect(isRetryableStatus(504)).toBe(true);
    });

    it('returns true for 408 Request Timeout', () => {
      expect(isRetryableStatus(408)).toBe(true);
    });

    it('returns true for 429 Too Many Requests', () => {
      expect(isRetryableStatus(429)).toBe(true);
    });

    it('returns false for other 4xx status codes', () => {
      expect(isRetryableStatus(400)).toBe(false);
      expect(isRetryableStatus(401)).toBe(false);
      expect(isRetryableStatus(403)).toBe(false);
      expect(isRetryableStatus(404)).toBe(false);
    });

    it('returns false for 2xx status codes', () => {
      expect(isRetryableStatus(200)).toBe(false);
      expect(isRetryableStatus(201)).toBe(false);
      expect(isRetryableStatus(204)).toBe(false);
    });
  });

  describe('sleep', () => {
    it('resolves after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(48); // Small buffer for timing variance
      expect(elapsed).toBeLessThan(100); // Allow some timing variance
    });
  });

  describe('retryWithBackoff', () => {
    let mockFetch: any;
    let fetchSpy: any;

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns response immediately on success', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await retryWithBackoff('http://test.com/api');
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns response on non-retryable 4xx error', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('not found', { status: 404 }));

      const response = await retryWithBackoff('http://test.com/api');
      expect(response.status).toBe(404);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx errors', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('error', { status: 500 }))
        .mockResolvedValueOnce(new Response('error', { status: 500 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await retryWithBackoff('http://test.com/api', {}, { maxRetries: 3 });
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('retries on 429 Too Many Requests', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await retryWithBackoff('http://test.com/api', {}, { maxRetries: 2 });
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('retries on 408 Request Timeout', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('timeout', { status: 408 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await retryWithBackoff('http://test.com/api', {}, { maxRetries: 2 });
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('retries on network error', async () => {
      const networkError = new Error('Network error');
      fetchSpy
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await retryWithBackoff('http://test.com/api', {}, { maxRetries: 2 });
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries exceeded', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('error', { status: 500 }))
        .mockResolvedValueOnce(new Response('error', { status: 500 }))
        .mockResolvedValueOnce(new Response('error', { status: 500 }))
        .mockResolvedValueOnce(new Response('error', { status: 500 }));

      await expect(retryWithBackoff('http://test.com/api', {}, { maxRetries: 2 })).rejects.toThrow(
        'Failed after 3 attempts',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('respects max retries configuration', async () => {
      fetchSpy.mockResolvedValue(new Response('error', { status: 500 }));

      await expect(
        retryWithBackoff('http://test.com/api', {}, { maxRetries: 1 }),
      ).rejects.toThrow();
      expect(fetchSpy).toHaveBeenCalledTimes(2); // initial + 1 retry
    });

    it('throws with detailed error information', async () => {
      fetchSpy.mockRejectedValue(new Error('Connection refused'));

      try {
        await retryWithBackoff('http://test.com/api', {}, { maxRetries: 0 });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.attemptCount).toBe(1);
        expect(error.lastAttemptError?.message).toContain('Connection refused');
      }
    });
  });

  describe('fetchWithRetry', () => {
    let fetchSpy: any;

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('wraps retryWithBackoff correctly', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await fetchWithRetry('http://test.com/api');
      expect(response.status).toBe(200);
    });

    it('passes through configuration options', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('success', { status: 200 }));

      const config = { maxRetries: 5, initialDelay: 50 };
      await fetchWithRetry('http://test.com/api', {}, config);

      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
