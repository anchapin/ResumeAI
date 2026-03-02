/**
 * Tests for Error Display Enhancements (Issue #605)
 * Tests for error messaging, action buttons, context display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { ErrorType, ErrorContext } from '../utils/errorHandler';
import {
  getErrorMessageByType,
  getErrorSuggestion,
  isErrorRetryable,
  doesErrorRequireAction,
  formatValidationErrors,
} from '../utils/errorMessages';

const createErrorContext = (type: ErrorType, overrides?: Partial<ErrorContext>): ErrorContext => ({
  type,
  message: 'Test error message',
  userMessage: 'User-friendly error message',
  timestamp: Date.now(),
  id: 'err_test_123',
  ...overrides,
});

describe('Error Display Enhancements', () => {
  describe('Error Message Mapping', () => {
    it('should provide user-friendly messages for each error type', () => {
      const errorTypes = [
        ErrorType.NETWORK,
        ErrorType.API,
        ErrorType.VALIDATION,
        ErrorType.AUTH,
        ErrorType.NOT_FOUND,
        ErrorType.PERMISSION,
        ErrorType.SERVER,
        ErrorType.TIMEOUT,
        ErrorType.UNKNOWN,
      ];

      errorTypes.forEach((type) => {
        const message = getErrorMessageByType(type);
        expect(message).toBeDefined();
        expect(message.title).toBeDefined();
        expect(message.userMessage).toBeDefined();
        expect(message.icon).toBeDefined();
        expect(['critical', 'error', 'warning']).toContain(message.severity);
      });
    });

    it('should provide contextual suggestions based on error type', () => {
      const suggestion = getErrorSuggestion(ErrorType.NETWORK);
      expect(suggestion).toBeTruthy();
      expect(suggestion.length > 0).toBe(true);

      const authSuggestion = getErrorSuggestion(ErrorType.AUTH);
      expect(authSuggestion).toBeTruthy();
    });

    it('should provide HTTP status-specific suggestions', () => {
      const suggestion401 = getErrorSuggestion(ErrorType.AUTH, 401);
      expect(suggestion401).toContain('authentication');

      const suggestion403 = getErrorSuggestion(ErrorType.PERMISSION, 403);
      expect(suggestion403).toContain('permission');
    });

    it('should identify retryable errors', () => {
      expect(isErrorRetryable(ErrorType.NETWORK)).toBe(true);
      expect(isErrorRetryable(ErrorType.TIMEOUT)).toBe(true);
      expect(isErrorRetryable(ErrorType.SERVER)).toBe(true);

      expect(isErrorRetryable(ErrorType.AUTH)).toBe(false);
      expect(isErrorRetryable(ErrorType.VALIDATION)).toBe(false);
    });

    it('should identify errors that require user action', () => {
      expect(doesErrorRequireAction(ErrorType.AUTH)).toBe(true);
      expect(doesErrorRequireAction(ErrorType.PERMISSION)).toBe(true);
      expect(doesErrorRequireAction(ErrorType.VALIDATION)).toBe(true);

      expect(doesErrorRequireAction(ErrorType.NETWORK)).toBe(false);
      expect(doesErrorRequireAction(ErrorType.NOT_FOUND)).toBe(false);
    });

    it('should format validation errors for display', () => {
      const errors = {
        email: ['Invalid email format'],
        password: ['Too short', 'Must contain uppercase'],
      };

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('email');
      expect(formatted).toContain('Invalid email format');
      expect(formatted).toContain('password');
    });
  });

  describe('Error Display Component', () => {
    it('should render error display with title and message', () => {
      const error = createErrorContext(ErrorType.NETWORK);
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('User-friendly error message')).toBeInTheDocument();
    });

    it('should display different titles for different error types', () => {
      const testCases = [
        { type: ErrorType.NETWORK, title: 'Connection Error' },
        { type: ErrorType.AUTH, title: 'Authentication Error' },
        { type: ErrorType.PERMISSION, title: 'Permission Denied' },
        { type: ErrorType.NOT_FOUND, title: 'Not Found' },
        { type: ErrorType.TIMEOUT, title: 'Request Timeout' },
        { type: ErrorType.SERVER, title: 'Server Error' },
        { type: ErrorType.VALIDATION, title: 'Validation Error' },
      ];

      testCases.forEach(({ type, title }) => {
        const { unmount } = render(
          <ErrorDisplay error={createErrorContext(type)} onDismiss={vi.fn()} />
        );
        expect(screen.getByText(title)).toBeInTheDocument();
        unmount();
      });
    });

    it('should show retry button for network errors', () => {
      const error = createErrorContext(ErrorType.NETWORK);
      const onRetry = vi.fn();
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} onRetry={onRetry} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should show sign in button for auth errors', () => {
      const error = createErrorContext(ErrorType.AUTH);
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should show report issue button for server errors', () => {
      const error = createErrorContext(ErrorType.SERVER);
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const error = createErrorContext(ErrorType.TIMEOUT);
      const onRetry = vi.fn();
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should dismiss error when close button is clicked', async () => {
      const error = createErrorContext(ErrorType.NETWORK);
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      const closeButton = screen.getByRole('button', { name: /close error/i });
      await userEvent.click(closeButton);

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should show expanded context details when enabled', () => {
      const error = createErrorContext(ErrorType.SERVER, {
        context: { code: 500, endpoint: '/api/test' },
      });
      const onDismiss = vi.fn();

      const { rerender } = render(
        <ErrorDisplay error={error} onDismiss={onDismiss} showDetails={false} />
      );

      expect(screen.queryByText(/code/)).not.toBeInTheDocument();

      rerender(<ErrorDisplay error={error} onDismiss={onDismiss} showDetails={true} />);

      expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('should auto-dismiss after timeout', async () => {
      const error = createErrorContext(ErrorType.VALIDATION);
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} autoDismissTime={100} />);

      expect(screen.getByText('Validation Error')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(onDismiss).toHaveBeenCalled();
        },
        { timeout: 200 }
      );
    });

    it('should not auto-dismiss when autoDismissTime is 0', async () => {
      const error = createErrorContext(ErrorType.NETWORK);
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} autoDismissTime={0} />);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should display development-only error details', () => {
      const error = createErrorContext(ErrorType.UNKNOWN, {
        message: 'Internal error details',
      });
      const onDismiss = vi.fn();

      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { unmount } = render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      // In development, technical details are shown
      expect(screen.getByText('Internal error details')).toBeInTheDocument();

      unmount();
      process.env.NODE_ENV = oldEnv;
    });

    it('should have proper accessibility attributes', () => {
      const error = createErrorContext(ErrorType.NETWORK);
      const onDismiss = vi.fn();

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'assertive');
      expect(alertElement).toHaveAttribute('aria-label');
    });

    it('should copy error report to clipboard on report click', async () => {
      const error = createErrorContext(ErrorType.SERVER, {
        context: { details: 'Server overloaded' },
      });
      const onDismiss = vi.fn();

      // Mock clipboard API
      const writeTextMock = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      const reportButton = screen.getByRole('button', { name: /report issue/i });
      await userEvent.click(reportButton);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
      });
    });
  });

  describe('Error Action Handling', () => {
    it('should navigate to login on sign in button click', async () => {
      const error: ErrorContext = {
        type: ErrorType.AUTH,
        message: 'Unauthorized',
        userMessage: 'Please sign in',
        timestamp: Date.now(),
        id: 'err_auth_123',
      };
      const onDismiss = vi.fn();

      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await userEvent.click(signInButton);

      expect(window.location.href).toBe('/login');
    });
  });

  describe('Error Severity Levels', () => {
    it('should apply appropriate styling for critical errors', () => {
      const error = createErrorContext(ErrorType.SERVER);
      const onDismiss = vi.fn();

      const { container } = render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      // Critical errors should have red styling
      const alertBox = container.querySelector('[role="alert"]');
      expect(alertBox?.className).toContain('bg-red-100');
    });

    it('should apply appropriate styling for warning errors', () => {
      const error = createErrorContext(ErrorType.VALIDATION);
      const onDismiss = vi.fn();

      const { container } = render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      // Warning errors should have yellow styling
      const alertBox = container.querySelector('[role="alert"]');
      expect(alertBox?.className).toContain('bg-yellow-50');
    });
  });
});
