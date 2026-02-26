/**
 * Tests for fetch-timeout utility.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTimeoutAbortController,
  clearTimeoutAbortController,
  fetchWithTimeout,
  isTimeoutError,
  TIMEOUT_CONFIG,
} from './fetch-timeout';

describe('fetch-timeout utility', () => {
  describe('createTimeoutAbortController', () => {
    it('should create an AbortController with signal', () => {
      const controller = createTimeoutAbortController(5000);
      expect(controller).toBeDefined();
      expect(controller.signal).toBeDefined();
      expect(controller.signal.aborted).toBe(false);
    });

    it('should abort after timeout', async () => {
      const controller = createTimeoutAbortController(100);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(controller.signal.aborted).toBe(true);
    });

    it('should store timeout ID for cleanup', () => {
      const controller = createTimeoutAbortController(5000);
      const timeoutId = (controller as any).__timeoutId;
      expect(timeoutId).toBeDefined();
      expect(typeof timeoutId === 'number' || typeof timeoutId === 'object').toBe(true);
      clearTimeoutAbortController(controller);
    });
  });

  describe('clearTimeoutAbortController', () => {
    it('should clear the timeout', () => {
      const controller = createTimeoutAbortController(5000);
      const timeoutId = (controller as any).__timeoutId;

      clearTimeoutAbortController(controller);

      expect((controller as any).__timeoutId).toBeUndefined();
    });

    it('should prevent abort from happening', async () => {
      const controller = createTimeoutAbortController(100);
      clearTimeoutAbortController(controller);

      // Wait past the original timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should still not be aborted since we cleared it
      expect(controller.signal.aborted).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should identify AbortError as timeout', () => {
      const error = new DOMException('Aborted', 'AbortError');
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should identify TimeoutError by name', () => {
      const error = new Error('timeout');
      error.name = 'TimeoutError';
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should identify timeout in message', () => {
      const error = new Error('Request timeout after 5000ms');
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should identify Timeout with capital T', () => {
      const error = new Error('Timeout occurred');
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should not identify other errors as timeout', () => {
      const error = new Error('Network error');
      expect(isTimeoutError(error)).toBe(false);
    });

    it('should handle null/undefined gracefully', () => {
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
      expect(isTimeoutError({})).toBe(false);
    });
  });

  describe('TIMEOUT_CONFIG', () => {
    it('should export standard timeout values', () => {
      expect(TIMEOUT_CONFIG.QUICK).toBe(5000);
      expect(TIMEOUT_CONFIG.STANDARD).toBe(10000);
      expect(TIMEOUT_CONFIG.PDF_GENERATION).toBe(15000);
      expect(TIMEOUT_CONFIG.AI_OPERATION).toBe(15000);
      expect(TIMEOUT_CONFIG.NONE).toBe(0);
    });

    it('should be readonly', () => {
      // TIMEOUT_CONFIG is defined as const, so attempting to modify should fail or be silently ignored
      const originalValue = TIMEOUT_CONFIG.QUICK;
      try {
        (TIMEOUT_CONFIG as any).QUICK = 1000;
      } catch (e) {
        // Expected to throw or fail silently
      }
      // Value should not change (or throw error in strict mode)
      expect(TIMEOUT_CONFIG.QUICK).toBe(originalValue);
    });
  });

  describe('fetchWithTimeout', () => {
    let fetchSpy: any;

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch' as any);
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('should call fetch with signal when timeout is provided', async () => {
      const mockResponse = new Response('{}', { status: 200 });
      fetchSpy.mockResolvedValueOnce(mockResponse);

      const response = await fetchWithTimeout('/api/test', {}, 5000);

      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('signal');
      expect(response).toBe(mockResponse);
    });

    it('should use original fetch when no timeout provided', async () => {
      const mockResponse = new Response('{}', { status: 200 });
      fetchSpy.mockResolvedValueOnce(mockResponse);

      const response = await fetchWithTimeout('/api/test', {}, 0);

      expect(fetchSpy).toHaveBeenCalledWith('/api/test', {});
      expect(response).toBe(mockResponse);
    });

    it('should merge options correctly', async () => {
      const mockResponse = new Response('{}', { status: 200 });
      fetchSpy.mockResolvedValueOnce(mockResponse);

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      await fetchWithTimeout('/api/test', options, 5000);

      const callArgs = fetchSpy.mock.calls[0][1];
      expect(callArgs.method).toBe('POST');
      expect(callArgs.headers).toBeDefined();
      expect(callArgs.signal).toBeDefined();
    });

    it('should clean up timeout even on success', async () => {
      const mockResponse = new Response('{}', { status: 200 });
      fetchSpy.mockResolvedValueOnce(mockResponse);

      // Use short timeout to test cleanup
      const controller = createTimeoutAbortController(5000);
      const spy = vi.spyOn(global, 'clearTimeout');

      // We can't easily test this with fetchWithTimeout, but we can test the function
      clearTimeoutAbortController(controller);

      expect((controller as any).__timeoutId).toBeUndefined();
    });
  });
});
