import React, { useState, useEffect } from 'react';
import { ErrorContext, ErrorType } from '../utils/errorHandler';

interface ErrorDisplayProps {
  error: ErrorContext | null;
  onDismiss: () => void;
  autoDismissTime?: number;
}

/**
 * Component to display user-friendly error messages
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  autoDismissTime = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);

      // Auto-dismiss after timeout
      if (autoDismissTime > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismissTime);

        return () => clearTimeout(timer);
      }
    }
  }, [error, autoDismissTime]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!error || !isVisible) {
    return null;
  }

  const getIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return 'wifi_off';
      case ErrorType.AUTH:
        return 'lock_person';
      case ErrorType.PERMISSION:
        return 'block';
      case ErrorType.NOT_FOUND:
        return 'search_off';
      case ErrorType.TIMEOUT:
        return 'schedule';
      case ErrorType.SERVER:
        return 'cloud_off';
      case ErrorType.VALIDATION:
        return 'warning';
      default:
        return 'error';
    }
  };

  const getSeverity = (type: ErrorType) => {
    switch (type) {
      case ErrorType.VALIDATION:
      case ErrorType.NOT_FOUND:
        return 'warning'; // Yellow
      case ErrorType.AUTH:
      case ErrorType.PERMISSION:
        return 'error'; // Red
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
      case ErrorType.SERVER:
        return 'critical'; // Dark red
      default:
        return 'error';
    }
  };

  const severity = getSeverity(error.type);
  const bgColor =
    severity === 'critical'
      ? 'bg-red-100'
      : severity === 'error'
        ? 'bg-red-50'
        : 'bg-yellow-50';
  const borderColor =
    severity === 'critical'
      ? 'border-red-400'
      : severity === 'error'
        ? 'border-red-200'
        : 'border-yellow-200';
  const textColor =
    severity === 'critical'
      ? 'text-red-900'
      : severity === 'error'
        ? 'text-red-800'
        : 'text-yellow-800';
  const iconColor =
    severity === 'critical'
      ? 'text-red-600'
      : severity === 'error'
        ? 'text-red-500'
        : 'text-yellow-600';

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} border ${borderColor} ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 max-w-sm animate-in slide-in-from-top-2 fade-in`}
    >
      <span className={`material-symbols-outlined ${iconColor} flex-shrink-0 mt-0.5`}>
        {getIcon(error.type)}
      </span>
      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">Error</h3>
        <p className="text-sm">{error.userMessage}</p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs opacity-70 mt-1 font-mono">{error.message}</p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 hover:opacity-70 transition-opacity`}
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  );
};

export default ErrorDisplay;
