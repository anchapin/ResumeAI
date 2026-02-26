/**
 * Error Test Panel Component
 * Development utility for testing error handling
 */

import React, { useState } from 'react';
import { errorHandler, ErrorType, createValidationError, createTimeoutError } from '@/utils/errorHandler';

export const ErrorTestPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  const handleError = (error: Error, context?: Record<string, any>) => {
    errorHandler.handleError(error, context);
    setErrorCount(prev => prev + 1);
  };

  const triggerNetworkError = () => {
    const error = new TypeError('Failed to fetch');
    handleError(error, { endpoint: '/api/test', method: 'GET' });
  };

  const triggerValidationError = () => {
    const error = createValidationError('Form validation failed', {
      email: ['Invalid email format'],
      password: ['Password must be at least 8 characters'],
    });
    handleError(error);
  };

  const triggerTimeoutError = () => {
    const error = createTimeoutError(5000);
    handleError(error, { operation: 'fetchResume' });
  };

  const triggerAPIError = (status: number) => {
    const error = {
      response: { status },
      message: `HTTP ${status} Error`,
    };
    handleError(error as any);
  };

  const triggerUnhandledRejection = () => {
    Promise.reject(new Error('Unhandled promise rejection'));
  };

  const clearErrors = () => {
    errorHandler.clearErrorHistory();
    setErrorCount(0);
  };

  const errors = errorHandler.getErrorHistory();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-600 transition z-50"
        title="Error Test Panel (Dev Only)"
      >
        🐛 Error Test ({errorCount})
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 w-96 max-h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-100 p-3 border-b">
        <h3 className="font-bold text-gray-800">Error Test Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 font-bold"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 p-3 bg-gray-50">
        {/* Error Triggers */}
        <div className="mb-3">
          <h4 className="font-semibold text-sm mb-2">Trigger Errors:</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={triggerNetworkError}
              className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
            >
              Network Error
            </button>
            <button
              onClick={triggerValidationError}
              className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600"
            >
              Validation Error
            </button>
            <button
              onClick={triggerTimeoutError}
              className="bg-yellow-600 text-white text-xs px-2 py-1 rounded hover:bg-yellow-700"
            >
              Timeout Error
            </button>
            <button
              onClick={() => triggerAPIError(400)}
              className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
            >
              400 Error
            </button>
            <button
              onClick={() => triggerAPIError(401)}
              className="bg-purple-500 text-white text-xs px-2 py-1 rounded hover:bg-purple-600"
            >
              401 Error
            </button>
            <button
              onClick={() => triggerAPIError(500)}
              className="bg-red-700 text-white text-xs px-2 py-1 rounded hover:bg-red-800"
            >
              500 Error
            </button>
          </div>
        </div>

        {/* Error History */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Error History ({errors.length}):</h4>
            <button
              onClick={clearErrors}
              className="text-xs bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded"
            >
              Clear
            </button>
          </div>
          {errors.length === 0 ? (
            <p className="text-xs text-gray-500">No errors recorded</p>
          ) : (
            <div className="space-y-2">
              {errors.slice(0, 5).map(error => (
                <div
                  key={error.id}
                  className="text-xs bg-white border border-gray-200 rounded p-2"
                >
                  <div className="font-semibold text-gray-800">{error.type}</div>
                  <div className="text-gray-600 truncate">{error.message}</div>
                  {error.statusCode && (
                    <div className="text-gray-500">Status: {error.statusCode}</div>
                  )}
                  <div className="text-gray-400 text-xs mt-1">{error.id}</div>
                </div>
              ))}
              {errors.length > 5 && (
                <p className="text-xs text-gray-500">
                  +{errors.length - 5} more errors
                </p>
              )}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="border-t pt-2">
          <h4 className="font-semibold text-sm mb-2">Statistics:</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>Network: {errors.filter(e => e.type === ErrorType.NETWORK).length}</div>
            <div>Validation: {errors.filter(e => e.type === ErrorType.VALIDATION).length}</div>
            <div>API: {errors.filter(e => e.type === ErrorType.API).length}</div>
            <div>Server: {errors.filter(e => e.type === ErrorType.SERVER).length}</div>
            <div>Auth: {errors.filter(e => e.type === ErrorType.AUTH).length}</div>
            <div>Timeout: {errors.filter(e => e.type === ErrorType.TIMEOUT).length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorTestPanel;
