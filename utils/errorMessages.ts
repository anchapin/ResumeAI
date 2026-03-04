/**
 * Comprehensive Error Message Mapping
 * Provides user-friendly messages for all error types
 */

// Import type from errorHandler to avoid circular dependency
// ErrorType is re-exported from errorHandler
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  API = 'API_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTH = 'AUTH_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  SERVER = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  STORAGE = 'STORAGE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export interface ErrorMessageMap {
  title: string;
  userMessage: string;
  suggestion?: string;
  icon: string;
  severity: 'critical' | 'error' | 'warning';
}

export const ERROR_MESSAGES: Record<ErrorType, ErrorMessageMap> = {
  [ErrorType.NETWORK]: {
    title: 'Connection Error',
    userMessage: 'Unable to connect to the server. Please check your internet connection.',
    suggestion: "Try refreshing the page or check if you're connected to the internet.",
    icon: 'wifi_off',
    severity: 'critical',
  },
  [ErrorType.API]: {
    title: 'API Error',
    userMessage: 'An error occurred while communicating with the server.',
    suggestion: 'Please try again or contact support if the problem persists.',
    icon: 'api',
    severity: 'error',
  },
  [ErrorType.VALIDATION]: {
    title: 'Validation Error',
    userMessage: 'Please check your input and try again.',
    suggestion: 'Make sure all required fields are filled correctly.',
    icon: 'warning',
    severity: 'warning',
  },
  [ErrorType.AUTH]: {
    title: 'Authentication Error',
    userMessage: 'Your session has expired. Please log in again.',
    suggestion: 'Click "Sign In" to authenticate.',
    icon: 'lock_person',
    severity: 'error',
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Not Found',
    userMessage: 'The requested item could not be found.',
    suggestion: 'The resource may have been deleted or the URL may be incorrect.',
    icon: 'search_off',
    severity: 'warning',
  },
  [ErrorType.PERMISSION]: {
    title: 'Permission Denied',
    userMessage: 'You do not have permission to perform this action.',
    suggestion: 'Contact your administrator if you believe you should have access.',
    icon: 'block',
    severity: 'error',
  },
  [ErrorType.SERVER]: {
    title: 'Server Error',
    userMessage: 'An error occurred on the server. Our team has been notified.',
    suggestion: 'Please try again in a few moments or report the issue if it continues.',
    icon: 'cloud_off',
    severity: 'critical',
  },
  [ErrorType.TIMEOUT]: {
    title: 'Request Timeout',
    userMessage: 'The request took too long. Please try again.',
    suggestion: 'Your connection may be slow. Try the action again.',
    icon: 'schedule',
    severity: 'warning',
  },
  [ErrorType.STORAGE]: {
    title: 'Storage Error',
    userMessage: 'An error occurred while saving your data locally.',
    suggestion: 'Try clearing some browser space or check your browser settings.',
    icon: 'storage',
    severity: 'critical',
  },
  [ErrorType.UNKNOWN]: {
    title: 'Unknown Error',
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    suggestion: 'If the problem persists, please report this error to support.',
    icon: 'error',
    severity: 'error',
  },
};
/**
 * Get error message details by type
 * @param type - The error type
 * @returns Error message mapping with title, userMessage, suggestion, icon, and severity
 */
export function getErrorMessageByType(type: ErrorType): ErrorMessageMap {
  return ERROR_MESSAGES[type] || ERROR_MESSAGES[ErrorType.UNKNOWN];
}
/**
 * Format validation errors for display
 * @param errors - Record of field names to error message arrays
 * @returns Formatted error string with field names and messages
 */
export function formatValidationErrors(errors: Record<string, string[]>): string {
  const errorList = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n');
  return errorList;
}
/**
 * Get contextual suggestion based on error type and code
 * @param type - The error type
 * @param statusCode - Optional HTTP status code
 * @returns Suggestion message for the user
 */
export function getErrorSuggestion(type: ErrorType, statusCode?: number): string {
  const baseMessage = ERROR_MESSAGES[type];

  if (!statusCode) {
    return baseMessage.suggestion || baseMessage.userMessage;
  }

  switch (statusCode) {
    case 400:
      return 'There was an error with your request. Please review the information you provided.';
    case 401:
      return 'Your authentication has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to access this resource.';
    case 404:
      return 'The requested resource could not be found.';
    case 408:
    case 504:
      return 'The server took too long to respond. Please try again.';
    case 429:
      return "You've made too many requests. Please wait a moment before trying again.";
    case 500:
    case 502:
    case 503:
      return 'The server is experiencing issues. Our team has been notified.';
    default:
      return baseMessage.suggestion || 'An unexpected error occurred.';
  }
}
/**
 * Check if error is retryable
 * @param type - The error type
 * @param statusCode - Optional HTTP status code
 * @returns True if the error can be retried
 */
export function isErrorRetryable(type: ErrorType, statusCode?: number): boolean {
  // Retryable error types
  const retryableTypes = [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER];

  if (retryableTypes.includes(type)) {
    return true;
  }

  // Specific retryable status codes
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  return retryableStatuses.includes(statusCode || 0);
}
/**
 * Check if error requires user action
 * @param type - The error type
 * @returns True if user needs to take action
 */
export function doesErrorRequireAction(type: ErrorType): boolean {
  return [ErrorType.AUTH, ErrorType.PERMISSION, ErrorType.VALIDATION].includes(type);
}
/**
 * Get context-specific action label
 * @param type - The error type
 * @returns Label for the action button, or null if no action needed
 */
export function getActionLabel(type: ErrorType): string | null {
  switch (type) {
    case ErrorType.AUTH:
      return 'Sign In';
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
      return 'Retry';
    case ErrorType.SERVER:
    case ErrorType.UNKNOWN:
      return 'Report Issue';
    default:
      return null;
  }
}
