/**
 * Global Error Handler for ResumeAI Frontend
 * Provides centralized error handling, user-friendly messages, and error tracking
 */

import { ErrorContextData } from '../types';
import {
  getErrorMessageByType,
  getErrorSuggestion,
  isErrorRetryable,
  ErrorType,
} from './errorMessages';

// Custom error interfaces for better type safety
export interface ValidationError extends Error {
  name: 'ValidationError';
  errors?: Record<string, string[]>;
}

export interface TimeoutError extends Error {
  name: 'TimeoutError';
}

// Re-export ErrorType for convenience
export { ErrorType };

export interface ErrorContext {
  type: ErrorType;
  message: string;
  userMessage: string;
  statusCode?: number;
  originalError?: Error;
  context?: Record<string, unknown>;
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
  handleError(error: unknown, context?: Record<string, unknown>): ErrorContext {
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
  private parseError(error: unknown, additionalContext?: Record<string, unknown>): ErrorContext {
    const id = this.generateErrorId();
    const timestamp = Date.now();

    if (additionalContext?.type) {
      const errorType = additionalContext.type as ErrorType;
      const messageMap = getErrorMessageByType(errorType);
      const errorMessage = error instanceof Error ? error.message : String(error || '');
      return {
        type: errorType,
        message: errorMessage || messageMap.userMessage,
        userMessage: messageMap.userMessage,
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: additionalContext,
        timestamp,
        id,
      };
    }

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
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as Record<string, unknown>;
      const response = err.response as Record<string, unknown> | undefined;
      const status = response?.status as number | undefined;
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
      userMessage = messageMap.userMessage;

      const errorMessage = error instanceof Error ? error.message : String(err.message || '');
      return {
        type: errorType,
        message: errorMessage,
        userMessage,
        statusCode: status,
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Handle timeout errors (including AbortError from AbortController)
    const errName = error instanceof Error ? error.name : '';
    const errMessage = error instanceof Error ? error.message : String(error || '');
    if (errName === 'TimeoutError' || errName === 'AbortError' || errMessage.includes('timeout')) {
      const messageMap = getErrorMessageByType(ErrorType.TIMEOUT);
      return {
        type: ErrorType.TIMEOUT,
        message: errMessage,
        userMessage: messageMap.userMessage,
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Handle validation errors
    if (errName === 'ValidationError') {
      const messageMap = getErrorMessageByType(ErrorType.VALIDATION);
      return {
        type: ErrorType.VALIDATION,
        message: errMessage,
        userMessage: messageMap.userMessage,
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Default unknown error
    const errorType = (additionalContext?.type as ErrorType) || ErrorType.UNKNOWN;
    const messageMap = getErrorMessageByType(errorType);
    return {
      type: errorType as ErrorType,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      userMessage: error instanceof Error ? error.message : messageMap.userMessage,
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
  context?: Record<string, unknown>,
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
export function createValidationError(
  message: string,
  errors?: Record<string, string[]>,
): ValidationError {
  const error = new Error(message) as ValidationError;
  error.name = 'ValidationError';
  error.errors = errors;
  return error;
}

/**
 * Helper function to create timeout error
 */
export function createTimeoutError(ms: number): TimeoutError {
  const error = new Error(`Operation timed out after ${ms}ms`) as TimeoutError;
  error.name = 'TimeoutError';
  return error;
}
