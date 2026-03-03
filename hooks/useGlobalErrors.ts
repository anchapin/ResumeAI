import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { errorHandler, ErrorContext } from '../utils/errorHandler';
import { ERROR_MESSAGES } from '../utils/errorMessages';

/**
 * Hook to subscribe to global errors and manage display state
 */
export function useGlobalErrors() {
  const [currentError, setCurrentError] = useState<ErrorContext | null>(null);
  const [errorHistory, setErrorHistory] = useState<ErrorContext[]>([]);

  useEffect(() => {
    // Subscribe to error handler
    const unsubscribe = errorHandler.subscribe((error: ErrorContext) => {
      const errorInfo = ERROR_MESSAGES[error.type];
      const severity = errorInfo?.severity || 'error';

      // Set current error for critical display (overlay)
      if (severity === 'critical') {
        setCurrentError(error);
      } else {
        // Show non-critical errors as toasts
        const toastOptions = {
          toastId: error.id, // Prevent duplicates
          autoClose: severity === 'warning' ? 3000 : 5000,
        };

        if (severity === 'warning') {
          toast.warning(error.userMessage, toastOptions);
        } else {
          toast.error(error.userMessage, toastOptions);
        }
      }

      // Update history
      setErrorHistory(errorHandler.getErrorHistory());

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`[GlobalError][${severity.toUpperCase()}]`, {
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
