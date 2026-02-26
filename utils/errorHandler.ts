
/**
 * Global Error Handler for ResumeAI Frontend
 * Provides centralized error handling, user-friendly messages, and error tracking
 */

export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  API = 'API_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTH = 'AUTH_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  SERVER = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

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
    this.errorHandlers.forEach(handler => {
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
      return {
        type: ErrorType.NETWORK,
        message: error.message,
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
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
      
      switch (status) {
        case 400:
        case 422:
          return {
            type: ErrorType.VALIDATION,
            message: error.message,
            userMessage: 'Please check your input and try again.',
            statusCode: status,
            originalError: error,
            context: additionalContext,
            timestamp,
            id,
          };
        
        case 401:
          return {
            type: ErrorType.AUTH,
            message: error.message,
            userMessage: 'Your session has expired. Please log in again.',
            statusCode: status,
            originalError: error,
            context: additionalContext,
            timestamp,
            id,
          };
        
        case 403:
          return {
            type: ErrorType.PERMISSION,
            message: error.message,
            userMessage: 'You do not have permission to perform this action.',
            statusCode: status,
            originalError: error,
            context: additionalContext,
            timestamp,
            id,
          };
        
        case 404:
           return {
             type: ErrorType.NOT_FOUND,
             message: error.message,
             userMessage: 'The requested item could not be found.',
             statusCode: status,
             originalError: error,
             context: additionalContext,
             timestamp,
             id,
           };
        
        case 408:
        case 504:
          return {
            type: ErrorType.TIMEOUT,
            message: error.message,
            userMessage: 'The request took too long. Please try again.',
            statusCode: status,
            originalError: error,
            context: additionalContext,
            timestamp,
            id,
          };
        
        case 500:
        case 502:
        case 503:
          return {
            type: ErrorType.SERVER,
            message: error.message,
            userMessage: 'An error occurred on the server. Our team has been notified.',
            statusCode: status,
            originalError: error,
            context: additionalContext,
            timestamp,
            id,
          };
        
        default:
          return {
            type: ErrorType.API,
            message: error.message,
            userMessage: 'An error occurred. Please try again.',
            statusCode: status,
            originalError: error,
            context: additionalContext,
            timestamp,
            id,
          };
      }
    }

    // Handle timeout errors (including AbortError from AbortController)
    if (error.name === 'TimeoutError' || error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        type: ErrorType.TIMEOUT,
        message: error.message,
        userMessage: 'The request took too long. Please try again.',
        originalError: error,
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        userMessage: 'Please check your input and try again.',
        originalError: error,
        context: additionalContext,
        timestamp,
        id,
      };
    }

    // Default unknown error
    return {
      type: ErrorType.UNKNOWN,
      message: error?.message || 'An unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
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
    return this.errorHistory.filter(e => e.type === type);
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
  context?: Record<string, any>
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
  errors?: Record<string, string[]>
): Error {
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
