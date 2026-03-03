import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorDisplay from './ErrorDisplay';
import { ErrorType } from '../utils/errorHandler';

describe('ErrorDisplay Component', () => {
  const createMockError = (type: ErrorType = ErrorType.NETWORK) => ({
    type,
    message: 'Test error message',
    userMessage: 'This is a user-friendly error message',
    timestamp: Date.now(),
    id: 'test-error-1',
  });

  it('should render error message when error is provided', () => {
    const error = createMockError();
    const onDismiss = vi.fn();

    render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    expect(screen.getByText('This is a user-friendly error message')).toBeInTheDocument();
  });

  it('should not render when error is null', () => {
    const onDismiss = vi.fn();

    const { container } = render(<ErrorDisplay error={null} onDismiss={onDismiss} />);

    expect(container.firstChild).toBeNull();
  });

  it('should call onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    const error = createMockError();
    const onDismiss = vi.fn();

    render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    const closeButton = screen.getByLabelText('Close error message');
    await user.click(closeButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should auto-dismiss after specified time', async () => {
    const error = createMockError();
    const onDismiss = vi.fn();

    render(<ErrorDisplay error={error} onDismiss={onDismiss} autoDismissTime={100} />);

    expect(screen.getByText('This is a user-friendly error message')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalled();
      },
      { timeout: 500 },
    );
  });

  it('should not auto-dismiss when autoDismissTime is 0', async () => {
    const error = createMockError();
    const onDismiss = vi.fn();

    render(<ErrorDisplay error={error} onDismiss={onDismiss} autoDismissTime={0} />);

    await waitFor(
      () => {
        expect(onDismiss).not.toHaveBeenCalled();
      },
      { timeout: 200 },
    );
  });

  it('should display development message in development mode', async () => {
    const user = userEvent.setup();
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = createMockError();
    const onDismiss = vi.fn();

    render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    // In new version, debug message is hidden behind "Show Technical Details"
    const toggleButton = screen.getByText(/Technical Details/);
    await user.click(toggleButton);

    expect(screen.getByText('Test error message')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should show correct icon for network errors', () => {
    const error = createMockError(ErrorType.NETWORK);
    const onDismiss = vi.fn();

    const { container } = render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    const icon = container.querySelector('[role="img"], .material-symbols-outlined');
    expect(icon).toBeInTheDocument();
  });

  it('should handle error type changes', async () => {
    const onDismiss = vi.fn();
    let error = createMockError(ErrorType.NETWORK);

    const { rerender } = render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    expect(screen.getByText('This is a user-friendly error message')).toBeInTheDocument();

    error = createMockError(ErrorType.VALIDATION);
    rerender(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    expect(screen.getByText('This is a user-friendly error message')).toBeInTheDocument();
  });

  it('should display different colors for different error severities', () => {
    const onDismiss = vi.fn();

    // Validation error (warning)
    const { container: validationContainer } = render(
      <ErrorDisplay error={createMockError(ErrorType.VALIDATION)} onDismiss={onDismiss} />,
    );

    const validationAlert = validationContainer.querySelector('[role="alert"], .animate-in');
    expect(validationAlert).toHaveClass('bg-yellow-50');

    // Auth error (critical)
    const { container: authContainer } = render(
      <ErrorDisplay error={createMockError(ErrorType.AUTH)} onDismiss={onDismiss} />,
    );

    const authAlert = authContainer.querySelector('[role="alert"], .animate-in');
    expect(authAlert).toHaveClass('bg-red-50');
  });
});
