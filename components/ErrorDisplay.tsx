import React, { useState, useEffect } from 'react';
import { ErrorContext, ErrorType } from '../utils/errorHandler';

interface ErrorDisplayProps {
  error: ErrorContext | null;
  onDismiss: () => void;
  onRetry?: () => void;
  autoDismissTime?: number;
  showDetails?: boolean;
}

/**
 * Component to display user-friendly error messages with actionable buttons
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  autoDismissTime = 5000,
  showDetails = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showExpandedDetails, setShowExpandedDetails] = useState(showDetails);
  const [isReporting, setIsReporting] = useState(false);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowExpandedDetails(false);
    onDismiss();
  };

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setShowExpandedDetails(showDetails);

      // Auto-dismiss after timeout (longer if there are actions to take)
      if (autoDismissTime > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setShowExpandedDetails(false);
          onDismiss();
        }, autoDismissTime);

        return () => clearTimeout(timer);
      }
    }
  }, [error, autoDismissTime, showDetails, onDismiss]);

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

  const getTitle = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.AUTH:
        return 'Authentication Error';
      case ErrorType.PERMISSION:
        return 'Permission Denied';
      case ErrorType.NOT_FOUND:
        return 'Not Found';
      case ErrorType.TIMEOUT:
        return 'Request Timeout';
      case ErrorType.SERVER:
        return 'Server Error';
      case ErrorType.VALIDATION:
        return 'Validation Error';
      default:
        return 'Error';
    }
  };

  const getActionButtons = (type: ErrorType) => {
    const actions: { label: string; action: string; icon: string }[] = [];

    switch (type) {
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        if (onRetry) {
          actions.push({ label: 'Retry', action: 'retry', icon: 'refresh' });
        }
        break;
      case ErrorType.AUTH:
        actions.push({ label: 'Sign In', action: 'signin', icon: 'login' });
        break;
      case ErrorType.SERVER:
      case ErrorType.UNKNOWN:
        if (onRetry) {
          actions.push({ label: 'Retry', action: 'retry', icon: 'refresh' });
        }
        actions.push({ label: 'Report Issue', action: 'report', icon: 'bug_report' });
        break;
    }

    return actions;
  };

  const handleAction = async (action: string) => {
    switch (action) {
      case 'retry':
        if (onRetry) {
          handleDismiss();
          onRetry();
        }
        break;
      case 'signin':
        handleDismiss();
        window.location.href = '/login';
        break;
      case 'report':
        await reportError();
        break;
    }
  };

  const reportError = async () => {
    setIsReporting(true);
    try {
      // Copy error details to clipboard for user to share
      const errorReport = `
Error ID: ${error.id}
Type: ${error.type}
Time: ${new Date(error.timestamp).toLocaleString()}
URL: ${window.location.href}
Message: ${error.message}
${error.context ? `\nContext: ${JSON.stringify(error.context, null, 2)}` : ''}
      `.trim();

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(errorReport);
        // Show toast or update message
        console.log('Error report copied to clipboard');
      }
    } catch (err) {
      console.error('Failed to copy error report:', err);
    } finally {
      setIsReporting(false);
    }
  };

  const severity = getSeverity(error.type);
  const bgColor =
    severity === 'critical' ? 'bg-red-100' : severity === 'error' ? 'bg-red-50' : 'bg-yellow-50';
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

  const actionButtons = getActionButtons(error.type);
  const title = getTitle(error.type);

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} border ${borderColor} ${textColor} px-4 py-3 rounded-lg shadow-lg max-w-md animate-in slide-in-from-top-2 fade-in`}
      role="alert"
      aria-live="assertive"
      aria-label={`${title}: ${error.userMessage}`}
    >
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined ${iconColor} flex-shrink-0 mt-0.5`}>
          {getIcon(error.type)}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-sm">{error.userMessage}</p>

          {/* Expanded Details Section */}
          {showExpandedDetails && error.context && (
            <div className="mt-2 pt-2 border-t border-current opacity-70">
              <p className="text-xs font-mono">
                {JSON.stringify(error.context, null, 2)}
              </p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs opacity-70 mt-1 font-mono">{error.message}</p>
          )}

          {/* Action Buttons */}
          {actionButtons.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {actionButtons.map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => handleAction(btn.action)}
                  disabled={isReporting && btn.action === 'report'}
                  className={`text-xs px-3 py-1 rounded font-medium transition-all ${
                    severity === 'critical'
                      ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                      : severity === 'error'
                        ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400'
                  }`}
                  aria-label={btn.label}
                >
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      {btn.icon}
                    </span>
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 hover:opacity-70 transition-opacity`}
          aria-label="Close error message"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
};

export default ErrorDisplay;
