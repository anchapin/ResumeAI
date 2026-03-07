import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  errorHandler,
  ErrorType,
  withErrorHandling,
  createValidationError,
  createTimeoutError,
} from './errorHandler';

describe('Global Error Handler', () => {
  beforeEach(() => {
    errorHandler.clearErrorHistory();
  });

  describe('Error Parsing', () => {
    it('should parse network errors', () => {
      const error = new TypeError('Failed to fetch');
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.NETWORK);
      expect(context.userMessage).toContain('connect');
    });

    it('should parse validation errors (400)', () => {
      const error = {
        response: { status: 400 },
        message: 'Invalid input',
      };
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.VALIDATION);
      expect(context.statusCode).toBe(400);
    });

    it('should parse auth errors (401)', () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      };
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.AUTH);
      expect(context.statusCode).toBe(401);
    });

    it('should parse not found errors (404)', () => {
      const error = {
        response: { status: 404 },
        message: 'Not found',
      };
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.NOT_FOUND);
      expect(context.statusCode).toBe(404);
    });

    it('should parse permission errors (403)', () => {
      const error = {
        response: { status: 403 },
        message: 'Forbidden',
      };
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.PERMISSION);
      expect(context.statusCode).toBe(403);
    });

    it('should parse timeout errors (408)', () => {
      const error = {
        response: { status: 408 },
        message: 'Timeout',
      };
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.TIMEOUT);
    });

    it('should parse server errors (500)', () => {
      const error = {
        response: { status: 500 },
        message: 'Internal server error',
      };
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.SERVER);
      expect(context.statusCode).toBe(500);
    });

    it('should parse TimeoutError name', () => {
      const error = new Error('Operation timed out');
      error.name = 'TimeoutError';
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.TIMEOUT);
    });

    it('should parse ValidationError name', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.VALIDATION);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something went wrong');
      const context = errorHandler.handleError(error);

      expect(context.type).toBe(ErrorType.UNKNOWN);
      expect(context.userMessage).toBeDefined();
    });
  });

  describe('Error History', () => {
    it('should maintain error history', () => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));
      errorHandler.handleError(new Error('Error 3'));

      const history = errorHandler.getErrorHistory();
      expect(history.length).toBe(3);
    });

    it('should limit history size', () => {
      for (let i = 0; i < 60; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      const history = errorHandler.getErrorHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should clear error history', () => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));

      errorHandler.clearErrorHistory();
      const history = errorHandler.getErrorHistory();

      expect(history.length).toBe(0);
    });

    it('should filter errors by type', () => {
      const networkError = { message: 'Network error' };
      networkError.message = 'Failed to fetch';
      errorHandler.handleError(new TypeError('Failed to fetch'));

      errorHandler.handleError({
        response: { status: 400 },
        message: 'Validation error',
      });

      const networkErrors = errorHandler.getErrorsByType(ErrorType.NETWORK);
      expect(networkErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handlers', () => {
    it('should call registered error handlers', () => {
      const handler = vi.fn();
      errorHandler.subscribe(handler);

      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(handler).toHaveBeenCalled();
    });

    it('should unsubscribe error handlers', () => {
      const handler = vi.fn();
      const unsubscribe = errorHandler.subscribe(handler);

      unsubscribe();

      errorHandler.handleError(new Error('Test error'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle errors in handlers gracefully', () => {
      const brokenHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();

      errorHandler.subscribe(brokenHandler);
      errorHandler.subscribe(goodHandler);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      errorHandler.handleError(new Error('Test error'));

      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in error handler:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Error Context', () => {
    it('should generate unique error IDs', () => {
      const error1 = errorHandler.handleError(new Error('Error 1'));
      const error2 = errorHandler.handleError(new Error('Error 2'));

      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^err_/);
      expect(error2.id).toMatch(/^err_/);
    });

    it('should include timestamp in context', () => {
      const beforeTime = Date.now();
      const error = errorHandler.handleError(new Error('Test error'));
      const afterTime = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(error.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include additional context', () => {
      const additionalContext = { userId: '123', action: 'create' };
      const error = errorHandler.handleError(new Error('Test error'), additionalContext);

      expect(error.context).toEqual(additionalContext);
    });

    it('should preserve original error', () => {
      const originalError = new Error('Original error');
      const error = errorHandler.handleError(originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('withErrorHandling Helper', () => {
    it('should handle successful operations', async () => {
      const result = await withErrorHandling(async () => 'success');
      expect(result).toBe('success');
    });

    it('should handle failed operations', async () => {
      const result = await withErrorHandling(async () => {
        throw new Error('Operation failed');
      });

      expect(result).toBeNull();
      expect(errorHandler.getErrorHistory().length).toBe(1);
    });

    it('should pass context to error handler', async () => {
      const context = { operation: 'test' };
      await withErrorHandling(async () => {
        throw new Error('Failed');
      }, context);

      const error = errorHandler.getErrorHistory()[0];
      expect(error.context).toEqual(context);
    });
  });

  describe('Helper Functions', () => {
    it('should create validation error', () => {
      const error = createValidationError('Validation failed', {
        email: ['Invalid email format'],
        name: ['Name is required'],
      });

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect((error as any).errors).toBeDefined();
    });

    it('should create timeout error', () => {
      const error = createTimeoutError(5000);

      expect(error.name).toBe('TimeoutError');
      expect(error.message).toContain('5000');
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide user-friendly network error message', () => {
      const error = new TypeError('Failed to fetch');
      const context = errorHandler.handleError(error);

      expect(context.userMessage).not.toContain('TypeError');
      expect(context.userMessage).toContain('connect');
    });

    it('should provide user-friendly validation error message', () => {
      const error = { response: { status: 400 }, message: 'Bad request' };
      const context = errorHandler.handleError(error);

      expect(context.userMessage).toBe('Please check your input and try again.');
    });

    it('should provide user-friendly server error message', () => {
      const error = { response: { status: 500 }, message: 'Internal server error' };
      const context = errorHandler.handleError(error);

      expect(context.userMessage).toContain('team has been notified');
    });
  });
});
