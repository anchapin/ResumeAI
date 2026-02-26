import React from 'react';
import {
  errorHandler,
  ErrorType,
  createValidationError,
  createTimeoutError,
} from '../utils/errorHandler';

/**
 * Test panel for demonstrating and testing error handling
 * Remove from production code
 */
export const ErrorTestPanel: React.FC = () => {
  const triggerNetworkError = () => {
    errorHandler.handleError(new TypeError('Failed to fetch from server'), {
      action: 'testNetworkError',
    });
  };

  const triggerValidationError = () => {
    errorHandler.handleError(
      {
        response: { status: 400 },
        message: 'Validation failed',
      },
      { action: 'testValidationError' },
    );
  };

  const triggerAuthError = () => {
    errorHandler.handleError(
      {
        response: { status: 401 },
        message: 'Unauthorized access',
      },
      { action: 'testAuthError' },
    );
  };

  const triggerPermissionError = () => {
    errorHandler.handleError(
      {
        response: { status: 403 },
        message: 'Forbidden resource',
      },
      { action: 'testPermissionError' },
    );
  };

  const triggerNotFoundError = () => {
    errorHandler.handleError(
      {
        response: { status: 404 },
        message: 'Resource not found',
      },
      { action: 'testNotFoundError' },
    );
  };

  const triggerTimeoutError = () => {
    errorHandler.handleError(
      {
        response: { status: 408 },
        message: 'Request timeout',
      },
      { action: 'testTimeoutError' },
    );
  };

  const triggerServerError = () => {
    errorHandler.handleError(
      {
        response: { status: 500 },
        message: 'Internal server error',
      },
      { action: 'testServerError' },
    );
  };

  const triggerUnknownError = () => {
    errorHandler.handleError(new Error('An unexpected error occurred'), {
      action: 'testUnknownError',
    });
  };

  const triggerValidationErrorWithDetails = () => {
    const error = createValidationError('Form validation failed', {
      email: ['Invalid email format'],
      password: ['Password must be at least 8 characters'],
    });
    errorHandler.handleError(error, { action: 'testValidationWithDetails' });
  };

  const triggerTimeoutErrorCustom = () => {
    const error = createTimeoutError(5000);
    errorHandler.handleError(error, { action: 'testTimeoutCustom' });
  };

  const clearHistory = () => {
    errorHandler.clearErrorHistory();
    console.log('Error history cleared');
  };

  const showHistory = () => {
    const history = errorHandler.getErrorHistory();
    console.table(
      history.map((e) => ({
        id: e.id,
        type: e.type,
        message: e.message.substring(0, 50),
        timestamp: new Date(e.timestamp).toLocaleTimeString(),
      })),
    );
  };

  return (
    <div className="p-6 bg-slate-100 rounded-lg border-2 border-slate-300 max-w-4xl mx-auto my-6">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Error Handler Test Panel</h2>
      <p className="text-sm text-slate-600 mb-4">
        This panel is for testing error handling. Each button triggers a different error type.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <button
          onClick={triggerNetworkError}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm font-semibold"
        >
          🌐 Network Error
        </button>
        <button
          onClick={triggerValidationError}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-sm font-semibold"
        >
          ⚠️ Validation Error (400)
        </button>
        <button
          onClick={triggerAuthError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-semibold"
        >
          🔐 Auth Error (401)
        </button>
        <button
          onClick={triggerPermissionError}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-semibold"
        >
          🚫 Permission Error (403)
        </button>
        <button
          onClick={triggerNotFoundError}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition text-sm font-semibold"
        >
          🔍 Not Found Error (404)
        </button>
        <button
          onClick={triggerTimeoutError}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-sm font-semibold"
        >
          ⏱️ Timeout Error (408)
        </button>
        <button
          onClick={triggerServerError}
          className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition text-sm font-semibold"
        >
          ☠️ Server Error (500)
        </button>
        <button
          onClick={triggerUnknownError}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm font-semibold"
        >
          ❓ Unknown Error
        </button>
        <button
          onClick={triggerValidationErrorWithDetails}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm font-semibold"
        >
          📋 Validation (with details)
        </button>
        <button
          onClick={triggerTimeoutErrorCustom}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm font-semibold"
        >
          ⏲️ Timeout (custom)
        </button>
      </div>

      <div className="border-t border-slate-300 pt-4">
        <h3 className="text-lg font-semibold mb-3 text-slate-800">Utilities</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={showHistory}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-semibold"
          >
            📊 Show History (Console)
          </button>
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm font-semibold"
          >
            🗑️ Clear History
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-200 rounded text-xs text-slate-700 font-mono">
        <p>Check browser console for detailed error information</p>
        <p>Errors appear in top-right corner and auto-dismiss after 5 seconds</p>
      </div>
    </div>
  );
};

export default ErrorTestPanel;
