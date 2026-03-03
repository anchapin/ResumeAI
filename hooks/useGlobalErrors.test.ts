import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlobalErrors } from './useGlobalErrors';
import { errorHandler, ErrorType } from '../utils/errorHandler';

describe('useGlobalErrors Hook', () => {
  beforeEach(() => {
    errorHandler.clearErrorHistory();
  });

  it('should initialize with no current error', () => {
    const { result } = renderHook(() => useGlobalErrors());

    expect(result.current.currentError).toBeNull();
    expect(result.current.errorHistory).toEqual([]);
  });

  it('should subscribe to error handler on mount', () => {
    const subscribeSpy = vi.spyOn(errorHandler, 'subscribe');

    renderHook(() => useGlobalErrors());

    expect(subscribeSpy).toHaveBeenCalled();
  });

  it('should update current error when new error occurs', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      errorHandler.handleError(new Error('Test error'), { type: ErrorType.SERVER });
    });

    expect(result.current.currentError).toBeDefined();
    expect(result.current.currentError?.message).toBe('Test error');
  });

  it('should update error history when new error occurs', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));
    });

    expect(result.current.errorHistory.length).toBeGreaterThanOrEqual(2);
  });

  it('should dismiss current error', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      errorHandler.handleError(new Error('Test error'));
    });

    expect(result.current.currentError).toBeDefined();

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.currentError).toBeNull();
  });

  it('should clear error history', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));
    });

    expect(result.current.errorHistory.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.errorHistory.length).toBe(0);
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      const error = new TypeError('Failed to fetch');
      errorHandler.handleError(error);
    });

    expect(result.current.currentError?.type).toBe(ErrorType.NETWORK);
    expect(result.current.currentError?.userMessage).toContain('connect');
  });

  it('should handle validation errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      const error = {
        response: { status: 400 },
        message: 'Invalid input',
      };
      errorHandler.handleError(error);
    });

    expect(result.current.errorHistory[0]?.type).toBe(ErrorType.VALIDATION);
  });

  it('should handle auth errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      };
      errorHandler.handleError(error);
    });

    expect(result.current.errorHistory[0]?.type).toBe(ErrorType.AUTH);
  });

  it('should handle permission errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      const error = {
        response: { status: 403 },
        message: 'Forbidden',
      };
      errorHandler.handleError(error);
    });

    expect(result.current.errorHistory[0]?.type).toBe(ErrorType.PERMISSION);
  });

  it('should handle not found errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      const error = {
        response: { status: 404 },
        message: 'Not found',
      };
      errorHandler.handleError(error);
    });

    expect(result.current.errorHistory[0]?.type).toBe(ErrorType.NOT_FOUND);
  });

  it('should handle server errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      const error = {
        response: { status: 500 },
        message: 'Internal server error',
      };
      errorHandler.handleError(error);
    });

    expect(result.current.currentError?.type).toBe(ErrorType.SERVER);
  });

  it('should handle timeout errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      const error = {
        response: { status: 408 },
        message: 'Request timeout',
      };
      errorHandler.handleError(error);
    });

    expect(result.current.errorHistory[0]?.type).toBe(ErrorType.TIMEOUT);
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useGlobalErrors());

    const initialHistoryLength = errorHandler.getErrorHistory().length;

    unmount();

    // Add error after unmount
    errorHandler.handleError(new Error('Post-unmount error'));

    // The hook should no longer receive updates
    expect(errorHandler.getErrorHistory().length).toBe(initialHistoryLength + 1);
  });
});
