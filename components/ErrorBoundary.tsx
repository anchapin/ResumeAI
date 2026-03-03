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
 * ErrorFallback component that catches JavaScript errors in its child component tree.
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

      // Default fallback UI using unified styling
      return (
        <ErrorFallback
          error={this.state.error || new Error('Unknown error')}
          resetError={this.handleRetry}
        />
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
 * Consistent with ErrorDisplay styling
 */
export function ErrorFallback({
  error,
  resetError,
  message,
}: ErrorFallbackProps): React.ReactElement {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50/50 border border-red-100 rounded-3xl m-6 shadow-sm">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-red-600 text-4xl">bug_report</span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>

      <p className="text-slate-600 text-center mb-8 max-w-md">
        {message ||
          error?.message ||
          "An unexpected application error occurred. We've been notified and are looking into it."}
      </p>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        {resetError && (
          <button
            onClick={resetError}
            className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Try Again
          </button>
        )}

        <button
          onClick={() => (window.location.href = '/dashboard')}
          className="w-full py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Back to Dashboard
        </button>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors flex items-center gap-1"
        >
          {showDetails ? 'Hide' : 'Show'} Technical Details
          <span className="material-symbols-outlined text-[16px]">
            {showDetails ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {showDetails && (
          <div className="mt-4 w-full p-4 bg-slate-900 rounded-xl text-[10px] font-mono text-emerald-400 overflow-auto max-h-48 shadow-inner border border-slate-800 animate-in fade-in slide-in-from-top-2">
            <div className="opacity-50 mb-2">{/* Error Stack Trace */}</div>
            {error?.stack || error?.message || 'No stack trace available'}
          </div>
        )}
      </div>
    </div>
  );
}
