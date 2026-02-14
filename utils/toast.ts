import { toast, ToastOptions } from 'react-toastify';

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

export const showSuccessToast = (message: string, options?: ToastOptions) => {
  toast.success(message, {
    ...defaultOptions,
    ...options,
  });
};

export const showErrorToast = (message: string, options?: ToastOptions) => {
  toast.error(message, {
    ...defaultOptions,
    ...options,
  });
};

export const showInfoToast = (message: string, options?: ToastOptions) => {
  toast.info(message, {
    ...defaultOptions,
    ...options,
  });
};

export const showWarningToast = (message: string, options?: ToastOptions) => {
  toast.warn(message, {
    ...defaultOptions,
    ...options,
  });
};

export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', options?: ToastOptions) => {
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