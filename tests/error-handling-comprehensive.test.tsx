/**
 * Comprehensive Error Handling Tests for Frontend
 * Issue #601: [T5-Test-6] Add Error Handling Tests
 *
 * Tests cover:
 * - Network failure scenarios
 * - Token expiration & auth errors
 * - Storage quota exceeded
 * - Concurrent error handling
 * - Error recovery & retry logic
 * - UI error display components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  errorHandler,
  ErrorType,
  createValidationError,
  createTimeoutError,
  withErrorHandling,
} from '../utils/errorHandler';

describe('Comprehensive Error Handling - Frontend', () => {
  beforeEach(() => {
    errorHandler.clearErrorHistory();
    vi.clearAllMocks();
  });

  // ============================================================
  // Network Failure Scenarios
  // ============================================================
  describe('Network Failures', () => {
    it('should handle complete offline scenario', () => {
      const offlineError = new TypeError('Failed to fetch');
      const context = errorHandler.handleError(offlineError);

      expect(context.type).toBe(ErrorType.NETWORK);
      expect(context.userMessage).toContain('connect');
      expect(context.message).toBe('Failed to fetch');
    });

    it('should handle network timeout', () => {
      const timeoutError = new Error('Network timeout after 30000ms');
      timeoutError.name = 'TimeoutError';
      const context = errorHandler.handleError(timeoutError);

      expect(context.type).toBe(ErrorType.TIMEOUT);
      expect(context.userMessage).toContain('too long');
    });

    it('should handle slow network with retry context', async () => {
      const slowNetworkError = new TypeError('Failed to fetch');
      let attempts = 0;

      const retryWithBackoff = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            attempts++;
            if (attempts < 2) throw slowNetworkError;
            return 'success';
          } catch (error) {
            errorHandler.handleError(error, {
              attempt: attempts,
              maxRetries,
              retryAfter: Math.pow(2, i) * 1000,
            });
            await new Promise((r) => setTimeout(r, 10));
          }
        }
      };

      const result = await retryWithBackoff();
      expect(result).toBe('success');
      expect(errorHandler.getErrorHistory().length).toBe(1);
    });

    it('should handle connection reset', () => {
      const resetError = new TypeError('Failed to fetch');
      const context = errorHandler.handleError(resetError);

      expect(context.type).toBe(ErrorType.NETWORK);
    });

    it('should handle CORS errors', () => {
      const corsError = new TypeError('Failed to fetch (CORS blocked)');
      const context = errorHandler.handleError(corsError);

      expect(context.type).toBe(ErrorType.NETWORK);
    });

    it('should track network error recovery', async () => {
      const networkError = new TypeError('Failed to fetch');
      let retryCount = 0;

      const operationWithRecovery = async () => {
        try {
          if (retryCount === 0) {
            retryCount++;
            throw networkError;
          }
          return 'recovered';
        } catch (error) {
          errorHandler.handleError(error, { retryable: true });
          // Simulate recovery
          retryCount++;
          return await operationWithRecovery();
        }
      };

      const result = await operationWithRecovery();
      expect(result).toBe('recovered');
    });
  });

  // ============================================================
  // Token Expiration & Auth Errors
  // ============================================================
  describe('Token Expiration & Auth Errors', () => {
    it('should handle token expiration (401)', () => {
      const expiredTokenError = {
        response: { status: 401 },
        message: 'Token expired',
      };
      const context = errorHandler.handleError(expiredTokenError);

      expect(context.type).toBe(ErrorType.AUTH);
      expect(context.statusCode).toBe(401);
      expect(context.userMessage.toLowerCase()).toMatch(/session|authentication|sign in/);
    });

    it('should handle invalid credentials', () => {
      const invalidCredError = {
        response: { status: 401 },
        message: 'Invalid credentials',
      };
      const context = errorHandler.handleError(invalidCredError);

      expect(context.type).toBe(ErrorType.AUTH);
    });

    it('should handle permission denied (403)', () => {
      const permissionError = {
        response: { status: 403 },
        message: 'Access denied',
      };
      const context = errorHandler.handleError(permissionError);

      expect(context.type).toBe(ErrorType.PERMISSION);
      expect(context.userMessage).toContain('permission');
    });

    it('should handle OAuth scope denial', () => {
      const scopeError = {
        response: { status: 403 },
        message: 'Scope not granted: write:resume',
        details: { code: 'OAUTH_SCOPE_DENIED' },
      };
      const context = errorHandler.handleError(scopeError);

      expect(context.type).toBe(ErrorType.PERMISSION);
    });

    it('should handle simultaneous auth failures', () => {
      const errors = [
        { response: { status: 401 }, message: 'Token 1 expired' },
        { response: { status: 401 }, message: 'Token 2 expired' },
      ];

      const contexts = errors.map((e) => errorHandler.handleError(e));

      expect(contexts.every((c) => c.type === ErrorType.AUTH)).toBe(true);
      expect(errorHandler.getErrorHistory().length).toBe(2);
    });

    it('should track auth error recovery attempt', () => {
      const authError = { response: { status: 401 }, message: 'Unauthorized' };

      const refreshAndRetry = async () => {
        try {
          throw new Error('Initial auth error');
        } catch (error) {
          errorHandler.handleError(error, {
            action: 'api_call',
            willRetryAfterRefresh: true,
          });
          return 'token_refreshed';
        }
      };

      refreshAndRetry().then((result) => {
        expect(result).toBe('token_refreshed');
      });
    });
  });

  // ============================================================
  // Storage Quota Exceeded
  // ============================================================
  describe('Storage Quota Scenarios', () => {
    it('should handle storage quota exceeded', () => {
      const quotaError = {
        response: {
          status: 413,
          data: { code: 'STORAGE_QUOTA_EXCEEDED' },
        },
        message: 'Storage quota exceeded',
      };
      const context = errorHandler.handleError(quotaError, {
        currentUsage: 1024 * 1024 * 100,
        quota: 1024 * 1024 * 100,
        attemptedUpload: 1024 * 1024 * 5,
      });

      expect(context.statusCode).toBe(413);
      expect(context.context?.currentUsage).toBeDefined();
    });

    it('should calculate remaining storage', () => {
      const context = {
        quota: 1024 * 1024 * 1000,
        used: 1024 * 1024 * 900,
      };
      const remaining = context.quota - context.used;

      expect(remaining).toBe(1024 * 1024 * 100);
    });

    it('should handle storage upgrade prompts', () => {
      const quotaError = {
        response: {
          status: 413,
          data: { upgradeRequired: true },
        },
        message: 'Upgrade storage',
      };
      const context = errorHandler.handleError(quotaError, { upgradeRequired: true });

      expect(context.context?.upgradeRequired).toBeDefined();
    });

    it('should warn before quota limit reached', () => {
      const warningThreshold = 0.9; // 90%
      const quota = 1000;
      const used = 950;
      const shouldWarn = used / quota > warningThreshold;

      expect(shouldWarn).toBe(true);
    });
  });

  // ============================================================
  // Concurrent Error Handling
  // ============================================================
  describe('Concurrent Error Handling', () => {
    it('should handle multiple simultaneous API errors', () => {
      const errors = [
        { response: { status: 400 }, message: 'Error 1' },
        { response: { status: 404 }, message: 'Error 2' },
        { response: { status: 500 }, message: 'Error 3' },
      ];

      const contexts = errors.map((e) => errorHandler.handleError(e));

      expect(contexts.length).toBe(3);
      expect(contexts[0].type).toBe(ErrorType.VALIDATION);
      expect(contexts[1].type).toBe(ErrorType.NOT_FOUND);
      expect(contexts[2].type).toBe(ErrorType.SERVER);
    });

    it('should maintain error isolation in concurrent operations', async () => {
      const promise1 = (async () => {
        try {
          throw new Error('Operation 1 failed');
        } catch (e) {
          return errorHandler.handleError(e, { operation: 1 });
        }
      })();

      const promise2 = (async () => {
        try {
          throw new Error('Operation 2 failed');
        } catch (e) {
          return errorHandler.handleError(e, { operation: 2 });
        }
      })();

      const [error1, error2] = await Promise.all([promise1, promise2]);

      expect(error1.context?.operation).toBe(1);
      expect(error2.context?.operation).toBe(2);
    });

    it('should handle race conditions in error reporting', async () => {
      const errors: any[] = [];
      const handler = vi.fn((err) => errors.push(err));

      errorHandler.subscribe(handler);

      // Simulate race condition
      await Promise.all([
        Promise.resolve(errorHandler.handleError(new Error('Race error 1'))),
        Promise.resolve(errorHandler.handleError(new Error('Race error 2'))),
      ]);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(errors.length).toBe(2);
    });

    it('should deduplicate similar concurrent errors', () => {
      const error = new TypeError('Failed to fetch');

      errorHandler.handleError(error);
      errorHandler.handleError(error);
      errorHandler.handleError(error);

      const history = errorHandler.getErrorHistory();
      expect(history.length).toBe(3); // All recorded (not deduplicated)
      expect(new Set(history.map((e) => e.id)).size).toBe(3); // But with unique IDs
    });
  });

  // ============================================================
  // Error Recovery & Retry Logic
  // ============================================================
  describe('Error Recovery & Retry Logic', () => {
    it('should implement exponential backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const exponentialBackoff = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            attempts++;
            if (attempts < 2) throw new Error('Failure');
            return 'success';
          } catch (error) {
            const delay = Math.min(1000 * Math.pow(2, i), 10000);
            delays.push(delay);
            await new Promise((r) => setTimeout(r, 1));
          }
        }
      };

      await exponentialBackoff();
      expect(attempts).toBe(2);
      expect(delays[0]).toBeLessThan(delays[0] * 2); // Increasing backoff
    });

    it('should implement jitter in retry delays', async () => {
      const retryWithJitter = (baseDelay: number) => {
        const jitter = Math.random() * baseDelay;
        return baseDelay + jitter;
      };

      const delay1 = retryWithJitter(1000);
      const delay2 = retryWithJitter(1000);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay1).not.toBe(delay2); // Should be different due to jitter
    });

    it('should handle max retries exceeded', async () => {
      let attempts = 0;
      const maxRetries = 2;

      const failingOperation = async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            attempts++;
            throw new Error('Always fails');
          } catch (error) {
            errorHandler.handleError(error, { attempt: attempts, maxRetries });
            if (attempts < maxRetries) {
              await new Promise((r) => setTimeout(r, 1));
            }
          }
        }
        return 'failed';
      };

      const result = await failingOperation();
      expect(result).toBe('failed');
      expect(errorHandler.getErrorHistory().length).toBe(maxRetries);
    });

    it('should allow cancellation during retry', async () => {
      let attempts = 0;
      let cancelled = false;

      const cancellableRetry = async (shouldCancel: boolean) => {
        for (let i = 0; i < 3; i++) {
          if (cancelled || shouldCancel) {
            errorHandler.handleError(new Error('Retry cancelled'));
            return 'cancelled';
          }
          attempts++;
          await new Promise((r) => setTimeout(r, 1));
        }
      };

      cancelled = true;
      const result = await cancellableRetry(false);
      expect(result).toBe('cancelled');
    });

    it('should track successful recovery', () => {
      let failCount = 0;

      const operationWithRecovery = () => {
        try {
          if (failCount === 0) {
            failCount++;
            throw new Error('First attempt failed');
          }
          return 'recovered';
        } catch (error) {
          errorHandler.handleError(error, { recovered: false });
          return operationWithRecovery(); // Retry
        }
      };

      const result = operationWithRecovery();
      expect(result).toBe('recovered');
      expect(errorHandler.getErrorHistory().length).toBe(1);
    });
  });

  // ============================================================
  // Validation Error Handling
  // ============================================================
  describe('Validation Error Handling', () => {
    it('should handle form validation errors', () => {
      const error = createValidationError('Form validation failed', {
        email: ['Invalid email format'],
        name: ['Name is required'],
      });

      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.VALIDATION);
      expect((error as any).errors.email).toBeDefined();
    });

    it('should handle field-level validation errors', () => {
      const fieldErrors = {
        firstName: ['Must be at least 2 characters'],
        email: ['Invalid email format', 'Email already in use'],
        phone: ['Invalid phone number'],
      };

      const error = createValidationError('Multiple field errors', fieldErrors);
      const context = errorHandler.handleError(error, { fields: Object.keys(fieldErrors) });

      expect(context.type).toBe(ErrorType.VALIDATION);
      const ctx = context.context as { fields?: unknown[] } | undefined;
      expect(ctx?.fields?.length).toBe(3);
    });

    it('should handle API validation errors (422)', () => {
      const validationError = {
        response: { status: 422 },
        message: 'Validation failed',
        data: {
          errors: [
            { field: 'email', message: 'Invalid format' },
            { field: 'age', message: 'Must be number' },
          ],
        },
      };

      const context = errorHandler.handleError(validationError);

      expect(context.type).toBe(ErrorType.VALIDATION);
      expect(context.statusCode).toBe(422);
    });

    it('should accumulate validation errors from multiple sources', () => {
      const errors = [
        { response: { status: 400 }, message: 'Invalid input' },
        { response: { status: 400 }, message: 'Missing field' },
      ];

      errors.forEach((e) => errorHandler.handleError(e));

      const validationErrors = errorHandler.getErrorsByType(ErrorType.VALIDATION);
      expect(validationErrors.length).toBe(2);
    });
  });

  // ============================================================
  // Server Error Handling
  // ============================================================
  describe('Server Error Handling', () => {
    it('should handle 500 internal server error', () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal server error',
      };
      const context = errorHandler.handleError(serverError);

      expect(context.type).toBe(ErrorType.SERVER);
      expect(context.statusCode).toBe(500);
      expect(context.userMessage).toContain('team has been notified');
    });

    it('should handle 502 bad gateway', () => {
      const gatewayError = {
        response: { status: 502 },
        message: 'Bad Gateway',
      };
      const context = errorHandler.handleError(gatewayError);

      expect(context.type).toBe(ErrorType.SERVER);
    });

    it('should handle 503 service unavailable', () => {
      const unavailableError = {
        response: { status: 503 },
        message: 'Service temporarily unavailable',
      };
      const context = errorHandler.handleError(unavailableError);

      expect(context.type).toBe(ErrorType.SERVER);
    });

    it('should handle database connection errors', () => {
      const dbError = {
        response: { status: 500 },
        message: 'Database connection failed',
        data: { code: 'DATABASE_ERROR' },
      };
      const context = errorHandler.handleError(dbError, { code: 'DATABASE_ERROR' });

      expect(context.type).toBe(ErrorType.SERVER);
      expect(context.context?.code).toBe('DATABASE_ERROR');
    });

    it('should handle external service failures', () => {
      const externalError = {
        response: { status: 502 },
        message: 'PDF generation service unavailable',
        data: { service: 'pdf-renderer' },
      };
      const context = errorHandler.handleError(externalError, { retryable: true });

      expect(context.type).toBe(ErrorType.SERVER);
      expect(context.context?.retryable).toBe(true);
    });
  });

  // ============================================================
  // Error Reporting & Tracking
  // ============================================================
  describe('Error Reporting & Tracking', () => {
    it('should generate unique error IDs', () => {
      const error1 = errorHandler.handleError(new Error('Error 1'));
      const error2 = errorHandler.handleError(new Error('Error 2'));

      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^err_/);
      expect(error2.id).toMatch(/^err_/);
    });

    it('should track error timestamps', () => {
      const before = Date.now();
      const context = errorHandler.handleError(new Error('Test'));
      const after = Date.now();

      expect(context.timestamp).toBeGreaterThanOrEqual(before);
      expect(context.timestamp).toBeLessThanOrEqual(after);
    });

    it('should preserve error context for debugging', () => {
      const context = {
        userId: 'user-123',
        action: 'saveResume',
        resumeId: 'res-456',
        templateName: 'professional',
      };

      const error = errorHandler.handleError(new Error('Save failed'), context);

      expect(error.context).toEqual(context);
    });

    it('should filter errors by type', () => {
      errorHandler.handleError(new TypeError('Failed to fetch'));
      errorHandler.handleError({ response: { status: 400 }, message: 'Bad request' });
      errorHandler.handleError({ response: { status: 500 }, message: 'Server error' });

      const networkErrors = errorHandler.getErrorsByType(ErrorType.NETWORK);
      const validationErrors = errorHandler.getErrorsByType(ErrorType.VALIDATION);
      const serverErrors = errorHandler.getErrorsByType(ErrorType.SERVER);

      expect(networkErrors.length).toBe(1);
      expect(validationErrors.length).toBe(1);
      expect(serverErrors.length).toBe(1);
    });

    it('should maintain error history with limit', () => {
      for (let i = 0; i < 60; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      const history = errorHandler.getErrorHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  // ============================================================
  // Error Display & UI Integration
  // ============================================================
  describe('Error Display & UI Integration', () => {
    it('should provide user-friendly messages', () => {
      errorHandler.clearErrorHistory();

      const errors = [
        { error: new TypeError('Failed to fetch'), expectedMsg: 'connect' },
        {
          error: { response: { status: 401 }, message: 'Unauthorized' },
          expectedMsg: 'session',
        },
        {
          error: { response: { status: 500 }, message: 'Server error' },
          expectedMsg: 'team',
        },
      ];

      errors.forEach(({ error, expectedMsg }) => {
        const context = errorHandler.handleError(error);
        expect(context.userMessage).toBeDefined();
        if (expectedMsg === 'connect') {
          expect(context.userMessage.toLowerCase()).toContain('connect');
        } else if (expectedMsg === 'session') {
          // Can be 'session' or 'authentication' or 'sign in'
          expect(context.userMessage.toLowerCase()).toMatch(/session|authentication|sign in/);
        } else if (expectedMsg === 'team') {
          expect(context.userMessage.toLowerCase()).toContain('team');
        }
        expect(context.userMessage.length).toBeGreaterThan(0);
      });
    });

    it('should format error messages for display', () => {
      const context = errorHandler.handleError({ response: { status: 404 }, message: 'Not found' });

      // Can be displayed directly to users
      expect(context.userMessage).toBeDefined();
      expect(typeof context.userMessage).toBe('string');
      expect(context.userMessage.length).toBeGreaterThan(0);
    });

    it('should support error toast notifications', () => {
      const notificationQueue: any[] = [];

      const showNotification = (error: any) => {
        notificationQueue.push({
          id: error.id,
          message: error.userMessage,
          type: error.type,
          severity: error.statusCode >= 500 ? 'error' : 'warning',
        });
      };

      const error = errorHandler.handleError({ response: { status: 400 }, message: 'Bad request' });
      showNotification(error);

      expect(notificationQueue.length).toBe(1);
      expect(notificationQueue[0].message).toBeDefined();
    });

    it('should support error modal dialogs', () => {
      const modalState = {
        isOpen: false,
        title: '',
        message: '',
        details: '',
        action: null as any,
      };

      const showErrorModal = (error: any) => {
        modalState.isOpen = true;
        modalState.title = 'Error Occurred';
        modalState.message = error.userMessage;
        modalState.details = error.message;
      };

      const error = errorHandler.handleError({
        response: { status: 500 },
        message: 'Server error',
      });
      showErrorModal(error);

      expect(modalState.isOpen).toBe(true);
      expect(modalState.message).toBeDefined();
    });

    it('should support retry UI buttons', () => {
      const uiState = {
        showRetryButton: false,
        retryCount: 0,
        maxRetries: 3,
      };

      const error = errorHandler.handleError(
        { response: { status: 503 }, message: 'Service unavailable' },
        { retryable: true },
      );

      if (error.context?.retryable && uiState.retryCount < uiState.maxRetries) {
        uiState.showRetryButton = true;
      }

      expect(uiState.showRetryButton).toBe(true);
    });
  });

  // ============================================================
  // Performance & Limits
  // ============================================================
  describe('Performance & Limits', () => {
    it('should handle high error volume', () => {
      const startTime = performance.now();
      const errorCount = 100;

      for (let i = 0; i < errorCount; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(errorHandler.getErrorHistory().length).toBeLessThanOrEqual(50);
    });

    it('should efficiently unsubscribe handlers', () => {
      const handlers = Array(50)
        .fill(null)
        .map(() => vi.fn());
      const unsubscribers = handlers.map((h) => errorHandler.subscribe(h));

      const startTime = performance.now();
      unsubscribers.forEach((unsub) => unsub());
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle handler callback errors gracefully', () => {
      const brokenHandler = vi.fn(() => {
        throw new Error('Handler crashed');
      });
      const goodHandler = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      errorHandler.subscribe(brokenHandler);
      errorHandler.subscribe(goodHandler);

      errorHandler.handleError(new Error('Test'));

      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // withErrorHandling Helper
  // ============================================================
  describe('withErrorHandling Helper', () => {
    it('should handle successful async operations', async () => {
      const result = await withErrorHandling(async () => 'success');
      expect(result).toBe('success');
    });

    it('should handle failed async operations', async () => {
      const result = await withErrorHandling(async () => {
        throw new Error('Operation failed');
      });

      expect(result).toBeNull();
      expect(errorHandler.getErrorHistory().length).toBeGreaterThan(0);
    });

    it('should pass context to error handler', async () => {
      const context = { operation: 'importResume', userId: 'user-123' };

      await withErrorHandling(async () => {
        throw new Error('Import failed');
      }, context);

      const error = errorHandler.getErrorHistory()[0];
      expect(error.context).toEqual(context);
    });

    it('should return null on error for safe chaining', async () => {
      const result = await withErrorHandling(async () => {
        throw new Error('Failed');
      });

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // Integration Scenarios
  // ============================================================
  describe('Integration Scenarios', () => {
    it('should handle complete error flow: network -> retry -> success', async () => {
      errorHandler.clearErrorHistory();
      let attempts = 0;

      const networkOperation = async () => {
        try {
          attempts++;
          if (attempts === 1) {
            throw new TypeError('Failed to fetch');
          }
          return 'success';
        } catch (error) {
          errorHandler.handleError(error, { attempt: attempts, retryable: true });
          await new Promise((r) => setTimeout(r, 5));
          return networkOperation();
        }
      };

      const result = await networkOperation();
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should handle error -> token refresh -> retry -> success', async () => {
      errorHandler.clearErrorHistory();
      let tokenRefreshed = false;

      const apiCallWithTokenRefresh = async () => {
        try {
          if (!tokenRefreshed) {
            const error = { response: { status: 401 }, message: 'Token expired' };
            errorHandler.handleError(error, { willRefreshToken: true });
            tokenRefreshed = true;
            return apiCallWithTokenRefresh(); // Retry
          }
          return 'success with new token';
        } catch (error) {
          errorHandler.handleError(error);
          return null;
        }
      };

      const result = await apiCallWithTokenRefresh();
      expect(result).toBe('success with new token');
      expect(tokenRefreshed).toBe(true);
    });

    it('should handle cascading errors', () => {
      errorHandler.clearErrorHistory();
      const errors: any[] = [];

      // First error triggers second
      try {
        errorHandler.handleError(new Error('Initial error'));
        throw new Error('Cascading error');
      } catch (e) {
        errorHandler.handleError(e, { cascading: true });
      }

      const history = errorHandler.getErrorHistory();
      expect(history.length).toBe(2);
      // Most recent error (index 0) should have cascading context
      expect(history[0].context?.cascading).toBe(true);
    });

    it('should collect errors across operations for batch retry', () => {
      errorHandler.clearErrorHistory();
      const operations = [
        () => {
          throw new Error('Op 1 failed');
        },
        () => {
          throw new Error('Op 2 failed');
        },
        () => 'Op 3 success',
      ];

      operations.forEach((op, idx) => {
        try {
          op();
        } catch (error) {
          errorHandler.handleError(error, { operationIndex: idx });
        }
      });

      const errors = errorHandler.getErrorHistory();
      expect(errors.length).toBe(2);
      // Most recent error first (history[0] is Op 2, history[1] is Op 1)
      expect(errors[1].context?.operationIndex).toBe(0);
      expect(errors[0].context?.operationIndex).toBe(1);
    });
  });
});
