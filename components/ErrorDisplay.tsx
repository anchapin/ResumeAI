import React, { useState, useEffect } from 'react';
import { ErrorContext, ErrorType } from '../utils/errorHandler';
import { getErrorMessageByType, getErrorSuggestion } from '../utils/errorMessages';

interface ErrorDisplayProps {
  /** The error context to display */
  error: ErrorContext | null;
  /** Callback when error is dismissed */
  onDismiss: () => void;
  /** Optional callback for retry action */
  onRetry?: () => void;
  /** Time in ms before auto-dismiss (0 to disable) */
  autoDismissTime?: number;
  /** Whether to show technical details by default */
  showDetails?: boolean;
}

/**
 * Component to display user-friendly error messages with actionable buttons.
 * Implements WCAG 2.1 accessibility guidelines with proper ARIA attributes.
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  autoDismissTime = 5000,
  showDetails = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showExpandedDetails, setShowExpandedDetails] = useState(
    showDetails || process.env.NODE_ENV === 'development',
  );
  const [isReporting, setIsReporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowExpandedDetails(false);
    onDismiss();
  };

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setShowExpandedDetails(showDetails || process.env.NODE_ENV === 'development');

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

  const errorInfo = getErrorMessageByType(error.type);
  const suggestion = getErrorSuggestion(error.type, error.statusCode);

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
        actions.push({ label: 'Support', action: 'support', icon: 'contact_support' });
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
      case 'support':
        window.open('https://support.resumeai.com', '_blank');
        break;
    }
  };

  const copyErrorId = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(error.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-semibold text-sm">{title}</h3>
            <span className="text-[10px] opacity-60 font-mono flex items-center gap-1">
              ID: {error.id.split('_').pop()?.substring(0, 8)}
              <button
                onClick={copyErrorId}
                className="hover:opacity-100 opacity-50 transition-opacity"
                title="Copy Error ID"
              >
                <span className="material-symbols-outlined text-[12px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </span>
          </div>

          <p className="text-sm leading-tight">{error.userMessage}</p>

          {suggestion && (
            <p className="text-xs mt-1.5 font-medium opacity-90 italic">💡 {suggestion}</p>
          )}

          {/* Expanded Details Section */}
          {(error.context || process.env.NODE_ENV === 'development') && (
            <div className="mt-2">
              <button
                onClick={() => setShowExpandedDetails(!showExpandedDetails)}
                className="text-[10px] font-semibold uppercase tracking-wider opacity-60 hover:opacity-100 flex items-center gap-0.5"
              >
                {showExpandedDetails ? 'Hide' : 'Show'} Technical Details
                <span className="material-symbols-outlined text-[14px]">
                  {showExpandedDetails ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {showExpandedDetails && (
                <div className="mt-2 p-2 bg-black/5 rounded text-[10px] font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                  {error.context && (
                    <div className="mb-2">
                      <div className="font-bold opacity-50 uppercase mb-0.5">Context:</div>
                      {JSON.stringify(error.context, null, 2)}
                    </div>
                  )}
                  {process.env.NODE_ENV === 'development' && (
                    <div>
                      <div className="font-bold opacity-50 uppercase mb-0.5">Debug Message:</div>
                      {error.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {actionButtons.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {actionButtons.map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => handleAction(btn.action)}
                  disabled={isReporting && btn.action === 'report'}
                  className={`text-xs px-3 py-1 rounded font-medium transition-all shadow-sm ${
                    severity === 'critical'
                      ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                      : severity === 'error'
                        ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400'
                  }`}
                  aria-label={btn.label}
                >
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">{btn.icon}</span>
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 hover:opacity-70 transition-opacity p-0.5`}
          aria-label="Close error message"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
};

export default ErrorDisplay;
