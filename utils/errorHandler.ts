/**
 * Global Error Handler for ResumeAI Frontend
 * Provides centralized error handling, user-friendly messages, and error tracking
 */

import { getErrorMessageByType, getErrorSuggestion, isErrorRetryable, ErrorType } from './errorMessages';

// Re-export ErrorType for convenience
export { ErrorType };

export interface ErrorContext {
  type: ErrorType;
  message: string;
  userMessage: string;
  statusCode?: number;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: number;
  id: string;
}

export interface ErrorHandler {
  (error: ErrorContext): void;
}

class GlobalErrorHandlerService {
  private errorHandlers: Set<ErrorHandler> = new Set();
  private errorHistory: ErrorContext[] = [];
  private maxHistorySize = 50;

  /**
   * Initialize error handler service
   */
  static initialize(): GlobalErrorHandlerService {
    const instance = new GlobalErrorHandlerService();

    // Setup global error listeners
    window.addEventListener('error', (event) => {
      instance.handleError(event.error || new Error(event.message));
    });

    window.addEventListener('unhandledrejection', (event) => {
      instance.handleError(event.reason || new Error('Unhandled Promise Rejection'));
    });

    return instance;
  }

  /**
   * Register error handler callback
   */
  subscribe(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Handle and process errors
   */
  handleError(error: any, context?: Record<string, any>): ErrorContext {
    const errorContext = this.parseError(error, context);

    // Add to history
    this.addToHistory(errorContext);

    // Notify all handlers
    this.errorHandlers.forEach((handler) => {
      try {
        handler(errorContext);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });

    return errorContext;
  }

  /**
   * Parse error into standardized context
   */
  private parseError(error: any, additionalContext?: Record<string, any>): ErrorContext {
    const id = this.generateErrorId();
    const timestamp = Date.now();

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const messageMap = getErrorMessageByType(ErrorType.NETWORK);
      return {
        type: ErrorType.NETWORK,
        message: error.message,
        userMessage: messageMap.userMessage,
        statusCode: 0,
        originalError: error,
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Handle API errors (with response)
    if (error.response) {
      const status = error.response.status;
      let errorType = ErrorType.API;
      let userMessage = 'An error occurred. Please try again.';

      switch (status) {
        case 400:
        case 422:
          errorType = ErrorType.VALIDATION;
          break;
        case 401:
          errorType = ErrorType.AUTH;
          break;
        case 403:
          errorType = ErrorType.PERMISSION;
          break;
        case 404:
          errorType = ErrorType.NOT_FOUND;
          break;
        case 408:
        case 504:
          errorType = ErrorType.TIMEOUT;
          break;
        case 500:
        case 502:
        case 503:
          errorType = ErrorType.SERVER;
          break;
      }

      const messageMap = getErrorMessageByType(errorType);
      userMessage = getErrorSuggestion(errorType, status);

      return {
        type: errorType,
        message: error.message,
        userMessage,
        statusCode: status,
        originalError: error,
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Handle timeout errors (including AbortError from AbortController)
    if (
      error.name === 'TimeoutError' ||
      error.name === 'AbortError' ||
      error.message.includes('timeout')
    ) {
      const messageMap = getErrorMessageByType(ErrorType.TIMEOUT);
      return {
        type: ErrorType.TIMEOUT,
        message: error.message,
        userMessage: messageMap.userMessage,
        originalError: error,
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messageMap = getErrorMessageByType(ErrorType.VALIDATION);
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        userMessage: messageMap.userMessage,
        originalError: error,
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Default unknown error
    const messageMap = getErrorMessageByType(ErrorType.UNKNOWN);
    return {
      type: ErrorType.UNKNOWN,
      message: error?.message || 'An unknown error occurred',
      userMessage: messageMap.userMessage,
      originalError: error instanceof Error ? error : new Error(String(error)),
      context: additionalContext,
      timestamp,
      id,
    };
  }

  /**
   * Add error to history
   */
  private addToHistory(error: ErrorContext): void {
    this.errorHistory.unshift(error);

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop();
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorType): ErrorContext[] {
    return this.errorHistory.filter((e) => e.type === type);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Report error to backend
   */
  async reportError(errorContext: ErrorContext): Promise<void> {
    try {
      const userAgent = navigator.userAgent;
      const url = window.location.href;

      const payload = {
        errorId: errorContext.id,
        type: errorContext.type,
        message: errorContext.message,
        statusCode: errorContext.statusCode,
        userAgent,
        url,
        timestamp: new Date(errorContext.timestamp).toISOString(),
        context: errorContext.context,
      };

      // Send to error tracking service (e.g., Sentry, LogRocket)
      // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(payload) });
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  }
}

// Export singleton instance
export const errorHandler = GlobalErrorHandlerService.initialize();

/**
 * Helper function to handle errors in async operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    errorHandler.handleError(error, context);
    return null;
  }
}

/**
 * Helper function to create validation error
 */
export function createValidationError(message: string, errors?: Record<string, string[]>): Error {
  const error = new Error(message);
  (error as any).name = 'ValidationError';
  (error as any).errors = errors;
  return error;
}

/**
 * Helper function to create timeout error
 */
export function createTimeoutError(ms: number): Error {
  const error = new Error(`Operation timed out after ${ms}ms`);
  (error as any).name = 'TimeoutError';
  return error;
}
