# Request Timeout Implementation Guide

This guide explains the request timeout feature implemented to prevent hanging requests in ResumeAI.

## Overview

Timeouts prevent requests from hanging indefinitely, improving user experience by:

- Returning 504 Gateway Timeout after 30 seconds on the backend
- Aborting requests after 10-15 seconds on the frontend
- Handling errors gracefully with user-friendly messages

## Architecture

### Backend (FastAPI)

- **Middleware**: `resume-api/middleware/timeout.py`
- **Defaults**: 30 second timeout for standard requests
- **Extended Timeouts**:
  - PDF generation: 60 seconds
  - AI operations (tailoring, ATS): 45 seconds
- **Response**: 504 Gateway Timeout with error details

### Frontend (React)

- **Utility**: `utils/fetch-timeout.ts`
- **Timeouts**:
  - PDF generation: 15 seconds
  - AI operations: 15 seconds
  - Standard API calls: 10 seconds
  - Quick operations: 5 seconds
- **Mechanism**: AbortController with automatic cleanup

## Usage

### Frontend: Using fetch with timeout

```typescript
import { fetchWithTimeout, TIMEOUT_CONFIG, isTimeoutError } from './utils/fetch-timeout';

// Example 1: Using predefined timeout
async function fetchData() {
  try {
    const response = await fetchWithTimeout(
      '/api/data',
      { method: 'GET' },
      TIMEOUT_CONFIG.STANDARD, // 10 seconds
    );
    return await response.json();
  } catch (error) {
    if (isTimeoutError(error)) {
      console.error('Request timed out after 10 seconds');
    } else {
      console.error('Other error:', error);
    }
  }
}

// Example 2: Custom timeout
async function generatePDF(resumeData) {
  try {
    const response = await fetchWithTimeout(
      '/api/pdf',
      {
        method: 'POST',
        body: JSON.stringify(resumeData),
      },
      15000, // 15 seconds for PDF
    );
    return await response.blob();
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error('PDF generation took too long. Please try again.');
    }
    throw error;
  }
}
```

### Frontend: Using AbortController directly

```typescript
import { createTimeoutAbortController, clearTimeoutAbortController } from './utils/fetch-timeout';

async function fetchWithManualAbort() {
  const controller = createTimeoutAbortController(5000); // 5 second timeout

  try {
    const response = await fetch('/api/data', {
      signal: controller.signal,
    });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request was aborted due to timeout');
    }
    throw error;
  } finally {
    // Always clean up the timeout
    clearTimeoutAbortController(controller);
  }
}
```

### Frontend: API Client Integration

The `api-client.ts` automatically uses timeouts:

```typescript
// These functions automatically use appropriate timeouts:
import { generatePDF, tailorResume, getVariants } from './utils/api-client';

// PDF generation uses 15 second timeout
const pdf = await generatePDF(resumeData, 'modern');

// Tailoring uses 15 second timeout (AI operation)
const tailored = await tailorResume(resumeData, jobDescription);

// Getting variants uses 10 second timeout (standard)
const variants = await getVariants();
```

### Backend: Testing Timeout Behavior

```bash
# Run timeout middleware tests
cd resume-api
python -m pytest tests/test_timeout_middleware.py -v

# Expected output:
# test_timeout_middleware_fast_request PASSED
# test_timeout_middleware_timeout_request PASSED
# test_timeout_middleware_medium_request PASSED
# test_timeout_middleware_with_extended_timeout PASSED
```

### Backend: Timeout Response Format

When a request times out, the backend returns:

```json
{
  "detail": "Request timeout: took longer than 30 seconds",
  "error_code": "REQUEST_TIMEOUT",
  "timeout_seconds": 30
}
```

Status code: **504 Gateway Timeout**

## Configuration

### Frontend Timeout Values (TIMEOUT_CONFIG)

| Timeout          | Duration   | Use Case                 |
| ---------------- | ---------- | ------------------------ |
| `QUICK`          | 5 seconds  | Quick metadata fetches   |
| `STANDARD`       | 10 seconds | Normal API calls         |
| `PDF_GENERATION` | 15 seconds | PDF generation           |
| `AI_OPERATION`   | 15 seconds | AI tailoring, ATS checks |
| `NONE`           | 0          | No timeout               |

### Backend Timeout Configuration

Edit `resume-api/middleware/timeout.py` to adjust:

```python
# Default timeout in seconds (30s)
DEFAULT_REQUEST_TIMEOUT = 30

# Endpoints with extended timeouts
EXTENDED_TIMEOUT_ENDPOINTS = {
    "/v1/render/pdf": 60,   # PDF generation needs more time
    "/v1/tailor": 45,        # AI tailoring needs more time
}
```

Or set in `main.py`:

```python
# Add timeout middleware with custom timeout
app.add_middleware(TimeoutMiddleware, timeout_seconds=30)
```

## Error Handling

### Frontend Error Integration

The error handler automatically recognizes timeout errors:

```typescript
import { GlobalErrorHandler, ErrorType } from './utils/errorHandler';

GlobalErrorHandler.subscribe((error) => {
  if (error.type === ErrorType.TIMEOUT) {
    // Show user-friendly message
    showToast('Request timed out. Please try again.');
  }
});

// In try/catch
try {
  const response = await fetchWithTimeout(url, options, 10000);
} catch (error) {
  const errorContext = GlobalErrorHandler.handleError(error);
  if (errorContext.type === ErrorType.TIMEOUT) {
    // Handle timeout specifically
  }
}
```

### Backend Error Logging

Timeouts are logged with context:

```
WARNING: request_timeout
path=/v1/render/pdf
method=POST
timeout_seconds=60
```

## Testing

### Frontend Tests

```bash
# Run fetch-timeout utility tests
npm test -- utils/fetch-timeout.test.ts

# Run API client timeout integration tests
npm test -- tests/api-client-timeout.test.ts
```

### Backend Tests

Tests verify:

- ✅ Fast requests complete successfully
- ✅ Slow requests timeout with 504 status
- ✅ Requests completing before timeout succeed
- ✅ Extended timeouts work for specific endpoints
- ✅ Multiple sequential requests handle timeouts correctly

## Performance Considerations

1. **Backend**: Timeout prevents resource exhaustion from hanging requests
2. **Frontend**: AbortController is lightweight and automatically cleans up
3. **Memory**: Timeouts are cleared when requests complete or timeout
4. **Network**: Browser's built-in AbortController mechanism is efficient

## Common Issues

### Issue: Request times out even though server responds quickly

**Solution**: Check if the network is slow or if the server is processing slowly. Increase timeout if needed, but investigate the root cause.

### Issue: PDF generation times out

**Solution**: PDF_GENERATION has 15 second timeout on frontend, 60 second on backend. The longer backend timeout allows the frontend to report timeout first.

### Issue: Frontend shows timeout but backend processes request

**Solution**: This is expected. The frontend AbortController stops waiting, but the backend continues processing. The request will complete on the server.

## Monitoring

Timeouts are tracked in monitoring:

- **Metric**: `request_timeout` warning logs
- **Analytics**: Timeout events recorded if analytics enabled
- **Metrics**: HTTP 504 status code tracked in Prometheus (if enabled)

## Future Improvements

1. Add timeout configuration per endpoint via decorators
2. Implement exponential backoff for timeout retries
3. Add timeout metrics dashboard
4. Support streaming response with progressive timeouts
5. Add websocket timeout handling

## References

- [Frontend Timeout Utility](../utils/fetch-timeout.ts)
- [Backend Timeout Middleware](../resume-api/middleware/timeout.py)
- [API Client](../utils/api-client.ts)
- [Error Handler](../utils/errorHandler.ts)
