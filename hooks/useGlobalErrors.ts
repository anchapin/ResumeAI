import { useState, useEffect, useCallback } from 'react';
import { errorHandler, ErrorContext, ErrorHandler } from '../utils/errorHandler';

/**
 * Hook to subscribe to global errors and manage display state
 */
export function useGlobalErrors() {
  const [currentError, setCurrentError] = useState<ErrorContext | null>(null);
  const [errorHistory, setErrorHistory] = useState<ErrorContext[]>([]);

  useEffect(() => {
    // Subscribe to error handler
    const unsubscribe = errorHandler.subscribe((error: ErrorContext) => {
      // Set current error to display
      setCurrentError(error);

      // Update history
      setErrorHistory(errorHandler.getErrorHistory());

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[GlobalError]', {
          type: error.type,
          message: error.message,
          userMessage: error.userMessage,
          id: error.id,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const dismissError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const clearHistory = useCallback(() => {
    errorHandler.clearErrorHistory();
    setErrorHistory([]);
  }, []);

  return {
    currentError,
    dismissError,
    errorHistory,
    clearHistory,
  };
}
