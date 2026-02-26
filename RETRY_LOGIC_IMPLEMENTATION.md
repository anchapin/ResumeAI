# Retry Logic with Exponential Backoff - Implementation

## Overview
This document describes the implementation of retry logic with exponential backoff for API calls in ResumeAI.

## Problem Solved
- **Before**: API calls failed immediately on network issues or transient server errors
- **After**: Automatic retries with exponential backoff prevent failures from temporary network issues

## Configuration

### Default Settings
- **Max Retries**: 3 attempts
- **Initial Delay**: 100ms
- **Max Delay**: 10 seconds
- **Backoff Multiplier**: 2x (exponential)
- **Jitter**: 10% random variance (prevents thundering herd)

### Retryable Status Codes
The following HTTP status codes trigger automatic retries:
- `408` - Request Timeout
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout

Non-retryable 4xx errors (400, 401, 403, 404) fail immediately without retry.

## Implementation Details

### Frontend (`src/lib/retryLogic.ts`)

The `retryWithBackoff()` function wraps fetch requests:

```typescript
import { fetchWithRetry, RetryConfig } from './retryLogic';

// Use default config
const response = await fetchWithRetry('/api/endpoint');

// Or customize config
const response = await fetchWithRetry('/api/endpoint', {}, {
  maxRetries: 5,
  initialDelay: 200,
  maxDelay: 20000,
});
```

**Backoff Calculation**:
```
delay = initialDelay * (2 ^ attemptNumber) + jitter
delay = min(delay, maxDelay)
jitter = random(0, delay * 0.1)
```

**Retry Sequence Example** (with 3 max retries):
1. Request attempt → 500 error
2. Wait 100-110ms → Attempt 2 → 500 error
3. Wait 200-220ms → Attempt 3 → 500 error
4. Wait 400-440ms → Attempt 4 → Success (or fail after 4 attempts)

### Backend (`resume-api/lib/utils/retry.py`)

The `retry_with_backoff()` decorator wraps async functions:

```python
from lib.utils.retry import retry_with_backoff, RetryConfig

# Use default config
@retry_with_backoff()
async def fetch_external_api():
    # Your async code
    pass

# Or customize config
@retry_with_backoff(RetryConfig(max_retries=5, initial_delay=0.2))
async def fetch_external_api():
    # Your async code
    pass
```

## Integration with API Client

The API client (`utils/api-client.ts`) automatically uses retry logic for all requests:

```typescript
// These functions now have built-in retry logic:
- generatePDF()
- getVariants()
- tailorResume()
- checkATSScore()
// ... and more
```

## Error Handling

### RetryError (Frontend)
When all retries are exhausted, a `RetryError` is thrown:

```typescript
try {
  const response = await fetchWithRetry(url);
} catch (error) {
  if (error instanceof RetryError) {
    console.error(`Failed after ${error.attemptCount} attempts`);
    console.error(`Status code: ${error.statusCode}`);
    console.error(`Last error: ${error.lastAttemptError?.message}`);
  }
}
```

### RetryError (Backend)
Similar error structure for backend:

```python
from lib.utils.retry import RetryError

try:
    result = await retry_async_call(my_func, config=RetryConfig(max_retries=3))
except RetryError as e:
    print(f"Failed after {e.attempt_count} attempts: {e.last_error}")
```

## Logging

### Frontend
Retry attempts are logged to console.warn():
```
Retryable status 503 for POST /api/endpoint. Attempt 1/3, retrying in 105ms
```

### Backend
Retry attempts are logged via Python logging:
```
Retryable error in fetch_data: Connection refused. Attempt 1/3, retrying in 0.15s
```

## Testing

### Frontend Tests
Run tests with:
```bash
npm test -- utils/retryLogic.test.ts
```

Tests cover:
- ✅ Exponential backoff calculation
- ✅ Jitter application
- ✅ Retryable status codes (5xx, 408, 429)
- ✅ Non-retryable 4xx errors (400, 401, 403, 404)
- ✅ Network error retries
- ✅ Max retry limit respected
- ✅ Error messages and attempt counts

### Backend Tests
Run tests with:
```bash
cd resume-api && python -m pytest tests/test_retry.py -v
```

Tests cover:
- ✅ Exponential backoff calculation
- ✅ Jitter application
- ✅ Async function retries
- ✅ Sync function retries
- ✅ Retryable exception detection
- ✅ Max retry limit respected
- ✅ Error details in exceptions

## Performance Impact

### Network Efficiency
- **With retries**: Failed requests that succeed on retry save round-trip cost
- **Without retries**: Failed requests are lost, user must retry manually

### Timing
The worst-case delay for 3 retries with defaults:
```
Attempt 1: 0ms
Attempt 2: wait 100-110ms → 100-110ms total
Attempt 3: wait 200-220ms → 300-330ms total
Attempt 4: wait 400-440ms → 700-770ms total
```

Maximum total time: ~1 second for 3 retries + network latency.

## Example Usage

### Frontend - Tailoring Resume
```typescript
try {
  const tailored = await tailorResume(
    resumeData,
    jobDescription,
    companyName,
    jobTitle
  );
  // Automatically retries on 5xx, 408, 429 status codes
  console.log('Resume tailored successfully');
} catch (error) {
  // Only thrown after all retries exhausted
  console.error('Failed to tailor resume:', error);
  showErrorToast('Could not tailor resume. Please try again.');
}
```

### Backend - External API Call
```python
from lib.utils.retry import retry_with_backoff, RetryConfig

@retry_with_backoff(RetryConfig(max_retries=5))
async def get_user_profile(user_id: str):
    # This will retry on ConnectionError, TimeoutError, etc.
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.example.com/users/{user_id}",
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()

# Usage
profile = await get_user_profile("user123")
```

## Monitoring

### Metrics to Track
1. **Retry rate**: Percentage of requests that require retries
2. **Retry success rate**: Percentage of retries that succeed
3. **Exhausted retries**: Count of requests failing after max retries
4. **Retry delay percentiles**: P50, P95, P99 retry times

These can be added to monitoring middleware for detailed insights.

## Future Enhancements

1. **Metrics collection**: Track retry rates and success rates
2. **Circuit breaker pattern**: Stop retrying if service is down
3. **Adaptive backoff**: Adjust delay based on service health
4. **Retry budget**: Limit total retry time across requests
5. **Configurable per-endpoint**: Different retry policies for different endpoints

## Files Changed

### Created Files
- `utils/retryLogic.ts` - Frontend retry logic
- `utils/retryLogic.test.ts` - Frontend retry tests (21 tests)
- `resume-api/lib/utils/retry.py` - Backend retry logic
- `resume-api/tests/test_retry.py` - Backend retry tests

### Modified Files
- `utils/api-client.ts` - Integrated retry logic into API calls

## Verification Checklist
- ✅ Frontend tests pass (21/21)
- ✅ Exponential backoff calculation correct
- ✅ Jitter applied consistently
- ✅ Retryable status codes identified
- ✅ Non-retryable errors fail immediately
- ✅ Max retry limit respected
- ✅ Error messages include attempt count
- ✅ Logging for debugging
