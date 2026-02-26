// Frontend error handler with user-friendly messages

export type ErrorType = 
  | 'network' | 'api' | 'validation' | 'storage' 
  | 'auth' | 'timeout' | 'permission' | 'notfound' | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  originalError?: Error;
  timestamp: Date;
}

class GlobalErrorHandler {
  private errors: AppError[] = [];
  private maxErrors = 50;

  public handleError(error: unknown): AppError {
    const appError = this.classifyError(error);
    this.errors.push(appError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    return appError;
  }

  private classifyError(error: unknown): AppError {
    const timestamp = new Date();

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: 'network',
        message: error.message,
        userMessage: 'Network error. Please check your connection.',
        originalError: error,
        timestamp
      };
    }

    if (error instanceof Error) {
      return {
        type: 'unknown',
        message: error.message,
        userMessage: 'An unexpected error occurred. Please try again.',
        originalError: error,
        timestamp
      };
    }

    return {
      type: 'unknown',
      message: String(error),
      userMessage: 'An unexpected error occurred.',
      timestamp
    };
  }

  public getErrors(): AppError[] {
    return [...this.errors];
  }

  public clearErrors(): void {
    this.errors = [];
  }
}

export const globalErrorHandler = new GlobalErrorHandler();

export function setupGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.handleError(event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    globalErrorHandler.handleError(event.error);
  });
}
