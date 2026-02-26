import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree.
 * Prevents the entire app from crashing due to unhandled errors.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you could send to error reporting service here
    // e.g., Sentry, Bugsnag, etc.
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-xl m-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
            <h2 className="text-xl font-bold text-red-700">Something went wrong</h2>
          </div>
          <p className="text-red-600 text-center mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Props for ErrorFallback component
 */
interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  message?: string;
}

/**
 * A reusable fallback UI component for use with ErrorBoundary
 */
export function ErrorFallback({
  error,
  resetError,
  message,
}: ErrorFallbackProps): React.ReactElement {
  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-xl m-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
        <h2 className="text-xl font-bold text-red-700">Something went wrong</h2>
      </div>
      <p className="text-red-600 text-center mb-4 max-w-md">
        {message || error?.message || 'An unexpected error occurred'}
      </p>
      {resetError && (
        <button
          onClick={resetError}
          className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
