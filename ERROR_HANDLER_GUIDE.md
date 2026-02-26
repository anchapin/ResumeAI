# Frontend Global Error Handler - Issue #384

## Overview
Centralized error handling for frontend with user-friendly messages.

## Features
- ✅ Automatic error classification
- ✅ User-friendly messages
- ✅ Global unhandled rejection listener
- ✅ Error logging and history
- ✅ React ErrorBoundary integration

## Usage

### Setup in App.tsx
```tsx
import { setupGlobalErrorHandlers } from './utils/errorHandler';

useEffect(() => {
  setupGlobalErrorHandlers();
}, []);
```

### Display Errors
Errors automatically trigger UI notifications with friendly messages.

## Error Types
- **Network**: Connection errors
- **API**: 4xx/5xx responses
- **Validation**: Input validation failures
- **Storage**: localStorage quota exceeded
- **Auth**: Authentication/authorization errors
- **Timeout**: Request timeout
- **Permission**: Permission denied
- **NotFound**: 404 errors
- **Unknown**: Unexpected errors

## Testing
See tests/error-handler-integration.test.tsx for test examples.
