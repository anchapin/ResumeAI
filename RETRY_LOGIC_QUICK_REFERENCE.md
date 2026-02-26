# Retry Logic - Quick Reference Guide

## TL;DR

Automatic retry with exponential backoff is now built into all API calls. Transient failures (5xx, 408, 429) retry automatically. Non-recoverable errors (4xx except 408/429) fail immediately.

---

## Frontend Usage

### Default (Recommended)
```typescript
import { fetchWithRetry } from './utils/retryLogic';

// Uses defaults: 3 retries, 100ms initial, 2x backoff, 10% jitter
const response = await fetchWithRetry('/api/endpoint');
```

### Custom Configuration
```typescript
const response = await fetchWithRetry('/api/endpoint', 
  { method: 'POST', headers: { ... } },
  {
    maxRetries: 5,         // More retries for critical operations
    initialDelay: 500,     // Longer delay for rate-limited endpoints
    maxDelay: 30000,       // 30 second max
    jitterFraction: 0.2,   // 20% variance
  }
);
```

### Already Integrated in API Client
```typescript
// These already have retry logic built-in:
await generatePDF(resumeData);           // ✅ retries
await getVariants();                     // ✅ retries
await tailorResume(data, jobDesc);       // ✅ retries
await checkATSScore(data, jobDesc);      // ✅ retries
// ... and more
```

### Error Handling
```typescript
try {
  const response = await fetchWithRetry('/api/endpoint');
} catch (error) {
  if (error instanceof RetryError) {
    console.error(`Failed after ${error.attemptCount} attempts`);
    console.error(`HTTP ${error.statusCode || 'network error'}`);
  }
}
```

---

## Backend Usage

### Decorator Pattern (Recommended)
```python
from lib.utils.retry import retry_with_backoff, RetryConfig

@retry_with_backoff(
    RetryConfig(max_retries=3, initial_delay=0.1)
)
async def fetch_external_data():
    async with httpx.AsyncClient() as client:
        response = await client.get('https://api.example.com/data')
        response.raise_for_status()
        return response.json()
```

### Manual Invocation
```python
from lib.utils.retry import retry_async_call, RetryConfig

result = await retry_async_call(
    my_function,
    arg1, arg2,
    config=RetryConfig(max_retries=5, initial_delay=0.2)
)
```

### Error Handling
```python
from lib.utils.retry import RetryError

try:
    result = await retry_async_call(my_func)
except RetryError as e:
    print(f"Failed after {e.attempt_count} attempts")
    print(f"Last error: {e.last_error}")
```

---

## Retry Behavior

### What Retries (Automatic)
- ✅ HTTP 500 (Internal Server Error)
- ✅ HTTP 502 (Bad Gateway)
- ✅ HTTP 503 (Service Unavailable)
- ✅ HTTP 504 (Gateway Timeout)
- ✅ HTTP 408 (Request Timeout)
- ✅ HTTP 429 (Too Many Requests)
- ✅ Network errors (connection, timeout)

### What Doesn't Retry (Fails Immediately)
- ❌ HTTP 400 (Bad Request)
- ❌ HTTP 401 (Unauthorized)
- ❌ HTTP 403 (Forbidden)
- ❌ HTTP 404 (Not Found)
- ❌ HTTP 2xx (Success)
- ❌ Validation errors

### Timing Example (3 retries, defaults)
```
Request 1: Immediate
  ↓ Error: 503
Wait: 100-110ms

Request 2: After ~110ms
  ↓ Error: 503
Wait: 200-220ms

Request 3: After ~330ms
  ↓ Error: 503
Wait: 400-440ms

Request 4: After ~770ms
  ↓ Error: 503
  → Throw RetryError after 770ms total delay
```

---

## Configuration Options

| Option | Default | Range | Purpose |
|--------|---------|-------|---------|
| `maxRetries` | 3 | 0-10 | Number of retries after initial attempt |
| `initialDelay` | 100ms | 50-1000ms | Starting delay between retries |
| `maxDelay` | 10s | 1-60s | Ceiling for backoff delays |
| `backoffMultiplier` | 2 | 1.5-3 | Exponential growth factor |
| `jitterFraction` | 0.1 | 0-0.5 | Random variance (0-10%) |

### Preset Configurations

**Fast Endpoints (Low Latency)**
```typescript
{ maxRetries: 2, initialDelay: 50, maxDelay: 5000 }
```

**Slow Endpoints (High Latency)**
```typescript
{ maxRetries: 5, initialDelay: 500, maxDelay: 30000 }
```

**Rate-Limited Endpoints**
```typescript
{ maxRetries: 5, initialDelay: 1000, maxDelay: 60000 }
```

**Critical Operations**
```typescript
{ maxRetries: 5, initialDelay: 100, maxDelay: 20000 }
```

---

## Logging

### Frontend Console Messages
```
Retryable status 503 for POST /api/generate-pdf. Attempt 1/3, retrying in 105ms
Retryable status 429 for GET /api/variants. Attempt 1/3, retrying in 103ms
Network error for POST /api/tailor: TypeError: Failed to fetch. Attempt 1/3, retrying in 108ms
```

### Backend Log Messages
```
Retryable error in fetch_user_data: ConnectionError: Connection refused. Attempt 1/3, retrying in 0.10s
Retryable error in fetch_user_data: TimeoutError: Request timed out. Attempt 2/3, retrying in 0.25s
```

---

## Testing Locally

### Test Retry Behavior
```bash
# Run frontend retry tests (21 tests)
npm test -- utils/retryLogic.test.ts

# Run backend retry tests (30+ tests) - when pytest installed
cd resume-api && python -m pytest tests/test_retry.py -v
```

### Simulate Failures
```typescript
// Frontend: Mock 503 error
global.fetch = vi.fn().mockRejectedValueOnce(
  new Response('Service Unavailable', { status: 503 })
);
const response = await fetchWithRetry('/api/endpoint');
// Will retry and eventually fail with clear error message
```

---

## Common Issues & Solutions

### Issue: Requests taking too long
**Solution:** Increase `initialDelay` only if network is slow, not for validation errors

### Issue: Too many retries
**Solution:** Decrease `maxRetries` to 2 for user-facing operations

### Issue: All retries failing
**Solution:** Check if error is retryable. Non-retryable errors (4xx) won't be retried

### Issue: Need different retry per endpoint
**Solution:** Pass custom config to `fetchWithRetry()` or `retry_async_call()`

---

## Performance Tips

✅ **Good Practices**
- Use defaults for most endpoints
- Only increase retries for critical operations
- Keep initialDelay under 500ms for user-facing ops
- Test with real network conditions

❌ **Anti-Patterns**
- Setting maxRetries > 5 (diminishing returns)
- initialDelay > 1000ms for fast endpoints (user perceives slowness)
- Retrying non-idempotent operations (use with caution)
- Ignoring non-retryable errors (fix validation instead)

---

## Monitoring

### Metrics to Track
1. **Retry rate** - % of requests that retry
2. **Success rate** - % of retries that succeed
3. **Failure rate** - % that fail after max retries
4. **Average delay** - total time added by retries

### How to Collect
```typescript
// Frontend - intercept and log
const response = await fetchWithRetry(url, opts, config);
metrics.recordRetryMetrics(response);

// Backend - use logging hooks
@retry_with_backoff()
async def my_func():
    # Logs automatically on retry
    pass
```

---

## Integration Checklist

- [x] Retry logic implemented ✅
- [x] Tests passing (21 frontend) ✅
- [x] API client integrated ✅
- [x] Error handling in place ✅
- [x] Logging configured ✅
- [x] Documentation complete ✅
- [x] Build verified ✅

---

## Further Reading

- **Full Guide:** `RETRY_LOGIC_IMPLEMENTATION.md`
- **Test Results:** `RETRY_LOGIC_TEST_RESULTS.md`
- **Implementation:** `IMPLEMENTATION_SUMMARY_ISSUE_394.md`
- **Source Code:**
  - Frontend: `utils/retryLogic.ts`
  - Tests: `utils/retryLogic.test.ts`
  - Backend: `resume-api/lib/utils/retry.py`
  - Backend Tests: `resume-api/tests/test_retry.py`

---

## FAQ

**Q: Do I need to change existing code?**
A: No! Retry is automatic for API client functions. For custom fetch calls, use `fetchWithRetry()`.

**Q: Will this retry forever?**
A: No, it respects `maxRetries` and then throws `RetryError`.

**Q: What if my operation isn't idempotent?**
A: Only use retry on idempotent operations (GET, read-only). Avoid on write operations without careful handling.

**Q: Can I disable retry?**
A: Yes, use `maxRetries: 0` in config.

**Q: Does retry affect performance?**
A: Only on failure. Success cases have no overhead (0ms delay).

---

**Status:** ✅ Production Ready
**Tests:** ✅ 21/21 Passing
**Integration:** ✅ Complete
