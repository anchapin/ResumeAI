import React from 'react';
import { toast, ToastOptions } from 'react-toastify';
import ActionableToast from '../src/utils/ActionableToast';
import { ToastAction } from '../src/types/toast';
import { ErrorType } from './errorMessages';

// Default toast options for consistent styling
const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};
/**
 * Custom toast utility functions for consistent notifications across the app
 */

/**
 * Display a success toast notification
 * @param message - The message to display
 * @param options - Optional toast options
 */
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  toast.success(message, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Display an error toast notification
 * @param message - The message to display
 * @param options - Optional toast options
 */
export const showErrorToast = (message: string, options?: ToastOptions) => {
  toast.error(message, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Display an info toast notification
 * @param message - The message to display
 * @param options - Optional toast options
 */
export const showInfoToast = (message: string, options?: ToastOptions) => {
  toast.info(message, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Display a warning toast notification
 * @param message - The message to display
 * @param options - Optional toast options
 */
export const showWarningToast = (message: string, options?: ToastOptions) => {
  toast.warn(message, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Display a toast notification with specified type
 * @param message - The message to display
 * @param type - The type of toast (success, error, info, warning)
 * @param options - Optional toast options
 */
export const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  options?: ToastOptions,
) => {
  switch (type) {
    case 'success':
      return showSuccessToast(message, options);
    case 'error':
      return showErrorToast(message, options);
    case 'info':
      return showInfoToast(message, options);
    case 'warning':
      return showWarningToast(message, options);
    default:
      return showInfoToast(message, options);
  }
};

/**
 * Display an actionable error toast with retry/download options
 * @param message - The error message to display
 * @param errorType - The type of error (determines action button)
 * @param onAction - Optional callback for the action button (retry, etc.)
 */
export const showActionableError = (
  message: string,
  errorType: ErrorType,
  onAction?: () => void,
) => {
  // Determine actions based on error type
  const actions: ToastAction[] = [];

  if (errorType === ErrorType.NETWORK || errorType === ErrorType.TIMEOUT) {
    actions.push({
      label: 'Retry',
      onClick: () => {
        if (onAction) onAction();
      },
      className: 'bg-blue-500 text-white hover:bg-blue-600',
    });
  } else if (errorType === ErrorType.STORAGE) {
    actions.push({
      label: 'Download Backup',
      onClick: () => {
        // Trigger download - handled by component
        if (onAction) onAction();
      },
      className: 'bg-green-500 text-white hover:bg-green-600',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (toast as any).error(message, {
    component: () =>
      React.createElement(ActionableToast, {
        toastProps: {
          closeToast: () => {},
          toastId: 0,
          isIn: true,
          style: {},
          props: { message, actions },
        },
        message,
        actions,
      }),
    autoClose: false, // Keep actionable toasts open until user dismisses
    closeOnClick: false,
  });
};
