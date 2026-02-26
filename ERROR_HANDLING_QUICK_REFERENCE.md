# Error Handling Quick Reference

## Quick Start

### 1. Error Handling Already Works Automatically

- Global error listeners are initialized in App.tsx
- All uncaught errors are caught and displayed
- No additional setup needed for most cases

### 2. Use the Hook to Access Error State

```tsx
import { useGlobalErrors } from './hooks/useGlobalErrors';

function MyComponent() {
  const { currentError, dismissError, errorHistory, clearHistory } = useGlobalErrors();

  return <div>{currentError && <p>{currentError.userMessage}</p>}</div>;
}
```

### 3. Manually Trigger Errors

```tsx
import { errorHandler } from './utils/errorHandler';

// Simple error
errorHandler.handleError(new Error('Something went wrong'));

// With context
errorHandler.handleError(error, { action: 'saveResume', userId: '123' });

// Validation error
import { createValidationError } from './utils/errorHandler';
const error = createValidationError('Invalid input', {
  email: ['Invalid format'],
});
errorHandler.handleError(error);
```

## Error Types

| Type       | When               | Message                                          |
| ---------- | ------------------ | ------------------------------------------------ |
| NETWORK    | Connection fails   | "Unable to connect to the server..."             |
| VALIDATION | 400/422 status     | "Please check your input and try again."         |
| AUTH       | 401 status         | "Your session has expired. Please log in again." |
| PERMISSION | 403 status         | "You do not have permission..."                  |
| NOT_FOUND  | 404 status         | "The requested item could not be found."         |
| TIMEOUT    | 408/504 status     | "The request took too long. Please try again."   |
| SERVER     | 500/502/503 status | "An error occurred on the server..."             |
| UNKNOWN    | Other errors       | "An unexpected error occurred..."                |

## Testing Errors

### In Browser Console

```javascript
// Trigger network error
fetch('http://invalid-domain.com/api').catch((e) => console.error(e));

// Trigger custom error
import { errorHandler } from './utils/errorHandler';
errorHandler.handleError(new Error('Test error'));
```

### Using ErrorTestPanel

1. Import ErrorTestPanel in App.tsx
2. Click buttons to test each error type
3. Watch error notifications appear

### Run Tests

```bash
npm test
```

## File Locations

| File                            | Purpose                    |
| ------------------------------- | -------------------------- |
| `utils/errorHandler.ts`         | Core error service         |
| `components/ErrorDisplay.tsx`   | Error UI component         |
| `hooks/useGlobalErrors.ts`      | React hook for error state |
| `components/ErrorTestPanel.tsx` | Testing utility            |
| `App.tsx`                       | Integration point          |

## Customization

### Change Auto-dismiss Time

```tsx
<ErrorDisplay
  error={error}
  onDismiss={handleDismiss}
  autoDismissTime={10000} // 10 seconds
/>
```

### Add Custom Error Type

1. Add to `ErrorType` enum in `errorHandler.ts`
2. Add case in `parseError()` method
3. Add icon in `ErrorDisplay.tsx` `getIcon()`
4. Add severity in `getSeverity()`

### Change Error Message

Edit the `userMessage` in appropriate case in `parseError()`:

```typescript
case 401:
  return {
    type: ErrorType.AUTH,
    userMessage: 'Your custom message here',
    // ...
  };
```

## Common Patterns

### Catch API Errors

```tsx
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  errorHandler.handleError(error);
}
```

### Async Operation with Error Handling

```tsx
import { withErrorHandling } from './utils/errorHandler';

const result = await withErrorHandling(() => fetch('/api/data').then((r) => r.json()), {
  action: 'fetchData',
});
if (result) {
  // Success
}
```

### Form Validation

```tsx
import { createValidationError } from './utils/errorHandler';

const validateForm = (data) => {
  const errors = {};
  if (!data.email) errors.email = ['Email required'];
  if (Object.keys(errors).length > 0) {
    throw createValidationError('Validation failed', errors);
  }
};
```

## Debugging

### View Error History

```javascript
// In browser console
import { errorHandler } from './utils/errorHandler';
console.table(errorHandler.getErrorHistory());
```

### View Specific Error Type

```javascript
import { errorHandler, ErrorType } from './utils/errorHandler';
console.log(errorHandler.getErrorsByType(ErrorType.NETWORK));
```

### Clear History

```javascript
errorHandler.clearErrorHistory();
```

## Development Tips

### See All Error Details

Development mode shows:

- `[GlobalError]` prefix in console
- Full error message
- Error ID
- Timestamp
- Additional context

### Disable Auto-dismiss

```tsx
<ErrorDisplay
  error={error}
  onDismiss={handleDismiss}
  autoDismissTime={0} // Disable auto-dismiss
/>
```

### Log Errors to Console

```typescript
// In errorHandler.ts, handleError() method
if (process.env.NODE_ENV === 'development') {
  console.error('[Error]', errorContext);
}
```

## Production Checklist

- [x] Error handler initialized
- [x] Global listeners active
- [x] ErrorBoundary wraps app
- [x] Error messages friendly (no technical jargon)
- [x] Console logging safe (no secrets exposed)
- [x] Error UI styled professionally
- [x] Tests passing
- [x] Build succeeding

## Troubleshooting

### Errors Not Appearing?

1. Check App.tsx has ErrorDisplay component
2. Verify useGlobalErrors hook is called
3. Check browser console for initialization errors

### Wrong Message Showing?

1. Check error type classification in parseError()
2. Verify status code handling
3. Review error object structure

### Auto-dismiss Not Working?

1. Check autoDismissTime is > 0
2. Verify error isn't manually dismissed first
3. Check browser console for React errors

## More Info

- Full implementation: `ISSUE_384_IMPLEMENTATION.md`
- Testing guide: `ERROR_HANDLER_TESTING.md`
- Test files: `*.test.ts` and `*.test.tsx`
