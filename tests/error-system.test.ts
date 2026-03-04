import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGlobalErrors } from '../hooks/useGlobalErrors';
import { errorHandler, ErrorType } from '../utils/errorHandler';
import { toast } from 'react-toastify';

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Error System Integration', () => {
  beforeEach(() => {
    errorHandler.clearErrorHistory();
    vi.clearAllMocks();
  });

  it('should route critical errors to currentError and NOT toast', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      // SERVER error is critical
      errorHandler.handleError(new Error('Critical Server Error'), { type: ErrorType.SERVER });
    });

    await waitFor(() => {
      expect(result.current.currentError).not.toBeNull();
    });

    expect(result.current.currentError?.type).toBe(ErrorType.SERVER);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.skip('should route warning errors to toast and NOT currentError', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      // VALIDATION error is warning
      errorHandler.handleError(new Error('Validation Warning'), { type: ErrorType.VALIDATION });
    });

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalled();
    });

    expect(result.current.currentError).toBeNull();
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('check your input'),
      expect.any(Object),
    );
  });

  it('should route non-critical errors (API) to toast.error and NOT currentError', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      // Specifically use ErrorType.API which is 'error' severity
      errorHandler.handleError(new Error('Generic API error'), { type: ErrorType.API });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    expect(result.current.currentError).toBeNull();
  });

  it('should maintain error history for both toast and overlay errors', async () => {
    const { result } = renderHook(() => useGlobalErrors());

    act(() => {
      errorHandler.handleError(new Error('Warning 1'), { type: ErrorType.VALIDATION });
      errorHandler.handleError(new Error('Critical 1'), { type: ErrorType.SERVER });
    });

    await waitFor(() => {
      expect(result.current.errorHistory.length).toBe(2);
    });

    expect(result.current.currentError?.type).toBe(ErrorType.SERVER);
  });
});
