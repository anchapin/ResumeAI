# Error Handling Testing Guide (Issue #384)

## Overview

This document provides instructions for testing the centralized error handling system implemented for the ResumeAI frontend.

## Components

### 1. **Error Handler Service** (`utils/errorHandler.ts`)
- Centralized error management
- Error type classification
- User-friendly message mapping
- Error history tracking
- Global event listeners for unhandled errors and promise rejections

### 2. **Error Display Component** (`components/ErrorDisplay.tsx`)
- User-friendly error UI
- Auto-dismissable notifications
- Error severity-based styling
- Development mode error details

### 3. **useGlobalErrors Hook** (`hooks/useGlobalErrors.ts`)
- React hook for subscribing to global errors
- Current error state management
- Error history access

## Error Types & Messages

| Type | Status Code | User Message | Icon |
|------|-------------|--------------|------|
| NETWORK | 0 | "Unable to connect to the server..." | wifi_off |
| VALIDATION | 400/422 | "Please check your input and try again." | warning |
| AUTH | 401 | "Your session has expired. Please log in again." | lock_person |
| PERMISSION | 403 | "You do not have permission to perform this action." | block |
| NOT_FOUND | 404 | "The requested item could not be found." | search_off |
| TIMEOUT | 408/504 | "The request took too long. Please try again." | schedule |
| SERVER | 500/502/503 | "An error occurred on the server. Our team has been notified." | cloud_off |
| API | Other | "An error occurred. Please try again." | error |
| UNKNOWN | - | "An unexpected error occurred. Please try again or contact support." | error |

## Testing Instructions

### 1. Manual Testing in Browser

#### Test Network Error
```javascript
// In browser console:
fetch('http://invalid-domain-12345.com/api/test')
  .catch(e => console.error(e));
```
Expected: Network error toast appears with wifi_off icon

#### Test API Validation Error
```javascript
// Simulate API response
const mockError = {
  response: { status: 400 },
  message: 'Invalid request'
};
// Trigger in your app code to test
```

#### Test Auth Error (401)
```javascript
const mockError = {
  response: { status: 401 },
  message: 'Unauthorized'
};
// Should show "Your session has expired" message
```

#### Test Permission Error (403)
```javascript
const mockError = {
  response: { status: 403 },
  message: 'Forbidden'
};
// Should show permission denied message
```

#### Test Server Error (500)
```javascript
const mockError = {
  response: { status: 500 },
  message: 'Internal server error'
};
// Should show "Our team has been notified" message
```

#### Test Timeout Error (408)
```javascript
const mockError = {
  response: { status: 408 },
  message: 'Request timeout'
};
// Should show timeout message with schedule icon
```

#### Test Unknown Error
```javascript
// In browser console:
throw new Error('Something unexpected happened');
```

### 2. Automated Testing

#### Run Full Test Suite
```bash
npm test
```

#### Run Specific Test File
```bash
npm test utils/errorHandler.test.ts
npm test components/ErrorDisplay.test.tsx
npm test hooks/useGlobalErrors.test.ts
```

#### Run Tests with Coverage
```bash
npm test -- --coverage
```

### 3. Integration Testing Scenarios

#### Scenario 1: Network Failure During Resume Save
1. Open Editor page
2. Make changes to resume
3. Turn off internet/block API requests
4. Try to save
5. Expected: User-friendly network error message appears

#### Scenario 2: Session Expiration
1. Simulate 401 response from API
2. Expected: Auth error message with session expiration text
3. Verify error can be dismissed
4. Verify error auto-dismisses after 5 seconds

#### Scenario 3: Multiple Errors
1. Trigger multiple errors in quick succession
2. Expected: Only most recent error is displayed
3. Verify error history is maintained internally
4. Check `errorHandler.getErrorHistory()` in console

#### Scenario 4: Error Recovery
1. Trigger an error
2. Dismiss the error
3. Trigger another action successfully
4. Expected: Success state reached, no residual error UI

### 4. Console Testing

#### View Error History
```javascript
// In browser console
import { errorHandler } from './utils/errorHandler.ts';
console.log(errorHandler.getErrorHistory());
```

#### Get Errors by Type
```javascript
import { errorHandler, ErrorType } from './utils/errorHandler.ts';
console.log(errorHandler.getErrorsByType(ErrorType.NETWORK));
```

#### Trigger Test Error
```javascript
import { errorHandler } from './utils/errorHandler.ts';
errorHandler.handleError(new Error('Test error message'));
```

### 5. Visual Verification Checklist

- [ ] Error messages are user-friendly (no technical jargon)
- [ ] Error colors match severity (yellow for warnings, red for errors)
- [ ] Icons correspond to error types
- [ ] Close button works and dismisses error
- [ ] Error auto-dismisses after 5 seconds
- [ ] Multiple errors show latest one first
- [ ] Error display is positioned consistently (top-right)
- [ ] No raw console errors visible to users
- [ ] Development mode shows technical details
- [ ] Production mode hides technical details

## Error Flow Diagram

```
User Action / API Call
         ↓
    Error Occurs
         ↓
Global Error Listener
(window.error / unhandledrejection)
         ↓
errorHandler.handleError()
         ↓
Error Classification & Message Mapping
         ↓
Error History Tracking
         ↓
Notify Subscribers (useGlobalErrors hooks)
         ↓
Update React State
         ↓
ErrorDisplay Component Renders
         ↓
User Sees Friendly Message
         ↓
Auto-dismiss or Manual Dismiss
```

## Development Notes

### Adding New Error Types

1. Add to `ErrorType` enum in `utils/errorHandler.ts`
2. Add mapping in `parseError()` method
3. Add icon mapping in `ErrorDisplay.tsx`
4. Add tests in `errorHandler.test.ts`
5. Update this documentation

### Customizing Error Messages

Edit the `parseError()` method in `utils/errorHandler.ts`:

```typescript
case 'YOUR_STATUS_CODE':
  return {
    type: ErrorType.YOUR_TYPE,
    message: error.message,
    userMessage: 'Your custom user-friendly message',
    statusCode: status,
    originalError: error,
    context: additionalContext,
    timestamp,
    id,
  };
```

### Error Severity Levels

Errors are automatically categorized by severity:
- **Warning** (Yellow): Validation errors, not found
- **Error** (Red): Auth, permission errors
- **Critical** (Dark Red): Network, timeout, server errors

Customize in `ErrorDisplay.tsx` `getSeverity()` method.

## Performance Considerations

- Error history limited to 50 items (configurable in `GlobalErrorHandlerService`)
- Auto-dismiss time: 5000ms (configurable per ErrorDisplay component)
- No external API calls by default (can be enabled for error reporting)

## Browser Console Output

In development mode, errors logged with `[GlobalError]` prefix:

```
[GlobalError] {
  type: 'NETWORK_ERROR',
  message: 'Failed to fetch',
  userMessage: 'Unable to connect to the server. Please check your internet connection.',
  id: 'err_1708847396123_abc123def'
}
```

## Troubleshooting

### Errors Not Displaying
1. Check `useGlobalErrors()` hook is used in App component
2. Verify `ErrorDisplay` component is rendered
3. Check browser console for any initialization errors
4. Verify `errorHandler` singleton is initialized

### Wrong Error Messages
1. Check error classification in `parseError()` method
2. Verify status codes are correctly handled
3. Check error object structure matches expected format

### Tests Failing
1. Ensure `npm install` completed successfully
2. Run `npm test -- --no-coverage` to exclude coverage
3. Check Node version compatibility (v18+)

## Future Enhancements

- [ ] Error reporting to backend (Sentry/LogRocket)
- [ ] Error retry mechanism
- [ ] Error context enrichment with user/session info
- [ ] Error analytics and monitoring
- [ ] Error recovery suggestions
- [ ] Error notification preferences (email/SMS)
