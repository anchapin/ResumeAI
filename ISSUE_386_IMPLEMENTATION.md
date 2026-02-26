# Issue #386 - API Timeout Protection Implementation

## Summary
Implemented comprehensive timeout protection for both backend and frontend APIs to prevent hanging requests and ensure user experience reliability.

## Implementation Details

### 1. Backend Timeout Middleware (30s)
**File:** `resume-api/middleware/timeout.py`

- **Default Timeout:** 30 seconds for all requests
- **Extended Timeouts:**
  - `/v1/render/pdf`: 60 seconds (PDF generation is resource-intensive)
  - `/v1/tailor`: 45 seconds (AI operations need more time)

**Features:**
- Uses `asyncio.wait_for()` to enforce timeouts
- Returns 504 Gateway Timeout on timeout
- Logs timeout events with path, method, and timeout duration
- Configurable timeout per endpoint via `EXTENDED_TIMEOUT_ENDPOINTS`

**Middleware Integration (main.py):**
```python
# Add timeout middleware first (must be added before other middleware)
app.add_middleware(TimeoutMiddleware, timeout_seconds=30)

# Add error handling middleware (must be added before monitoring)
app.add_middleware(ErrorHandlingMiddleware)
```

### 2. Frontend AbortSignal Implementation (15s)
**File:** `utils/fetch-timeout.ts`

Provides utility functions for timeout-aware fetch requests:

```typescript
// Standard timeout values
export const TIMEOUT_CONFIG = {
  QUICK: 5000,              // 5s for quick operations
  STANDARD: 10000,          // 10s for standard API calls
  PDF_GENERATION: 15000,    // 15s for PDF generation
  AI_OPERATION: 15000,      // 15s for AI operations (tailor, ATS, etc.)
  NONE: 0,                  // No timeout
}
```

**Key Functions:**
- `createTimeoutAbortController(timeoutMs)` - Creates AbortController with timeout
- `fetchWithTimeout(url, options, timeoutMs)` - Fetch wrapper with timeout support
- `isTimeoutError(error)` - Detects if error is a timeout error
- `clearTimeoutAbortController(controller)` - Cleanup helper

### 3. API Client Integration
**File:** `utils/api-client.ts`

All API calls use the timeout utilities:

```typescript
// PDF Generation - 15s timeout
export async function generatePDF(
  resumeData: ResumeDataForAPI, 
  variant: string = 'modern'
): Promise<Blob> {
  const response = await fetchWithTimeout(`${API_URL}/v1/render/pdf`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, variant }),
  }, TIMEOUT_CONFIG.PDF_GENERATION);  // 15000ms
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'PDF generation failed' }));
    throw new Error(error.detail || 'Failed to generate PDF');
  }
  return response.blob();
}

// AI Tailoring - 15s timeout
export async function tailorResume(
  resumeData: ResumeDataForAPI,
  jobDescription: string,
  companyName?: string,
  jobTitle?: string
): Promise<TailoredResumeResponse> {
  const response = await fetchWithTimeout(`${API_URL}/v1/tailor`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, job_description: jobDescription, company_name: companyName, job_title: jobTitle }),
  }, TIMEOUT_CONFIG.AI_OPERATION);  // 15000ms
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Resume tailoring failed' }));
    throw new Error(error.detail || 'Failed to tailor resume');
  }
  return response.json();
}
```

### 4. Test Coverage
**File:** `tests/api-client-timeout.test.ts`

Comprehensive test suite with 9 passing tests:

**Test Coverage:**
- ✅ PDF generation uses 15s timeout (PDF_GENERATION)
- ✅ Tailor resume uses 15s timeout (AI_OPERATION)
- ✅ Get variants uses 10s timeout (STANDARD)
- ✅ ATS check uses 15s timeout (AI_OPERATION)
- ✅ Timeout errors are properly identified
- ✅ Non-timeout errors are distinct from timeout errors
- ✅ Timeout errors are thrown correctly
- ✅ 504 responses from server are handled
- ✅ API error responses are parsed and thrown

**Run Tests:**
```bash
npm test -- tests/api-client-timeout.test.ts
# ✓ tests/api-client-timeout.test.ts (9 tests) 20ms
# Test Files  1 passed (1)
# Tests  9 passed (9)
```

## Timeout Flow Diagram

```
Client Request (Editor.tsx)
    ↓
generatePDF() in api-client.ts
    ↓
fetchWithTimeout(..., TIMEOUT_CONFIG.PDF_GENERATION=15s)
    ↓
createTimeoutAbortController(15000ms)
    ↓
fetch(url, { signal: controller.signal })
    ↓
[Two possible outcomes]
    ├─ Response within 15s → Blob returned to caller
    ├─ Timeout after 15s   → AbortError thrown
    └─ Other error        → Error thrown
    
    ↓ (Network request to backend)
    
Resume API Backend
    ↓
TimeoutMiddleware (30s default timeout)
    ↓
/v1/render/pdf endpoint (60s extended timeout)
    ↓
[Two possible outcomes]
    ├─ PDF generated within 60s → Response sent to client
    └─ Timeout after 60s        → 504 Gateway Timeout returned
```

## Configuration

### Environment Variables
No new environment variables needed. Timeouts are hardcoded based on operation type.

### Endpoint-Specific Timeouts
Edit `resume-api/middleware/timeout.py` to adjust:
```python
EXTENDED_TIMEOUT_ENDPOINTS = {
    "/v1/render/pdf": 60,  # Adjust PDF timeout here
    "/v1/tailor": 45,      # Adjust tailor timeout here
}
```

Edit `utils/fetch-timeout.ts` to adjust frontend timeouts:
```typescript
export const TIMEOUT_CONFIG = {
    PDF_GENERATION: 15000,  // Adjust frontend PDF timeout here
    AI_OPERATION: 15000,    // Adjust frontend AI timeout here
}
```

## Error Handling

### Backend Timeout Error Response (504)
```json
{
  "detail": "Request timeout: took longer than 60 seconds",
  "error_code": "REQUEST_TIMEOUT",
  "timeout_seconds": 60
}
```

### Frontend Timeout Error
When a timeout occurs in the browser:
1. AbortError is thrown from fetch
2. API client catches and throws meaningful error message
3. Component should handle with try/catch and show user-friendly message

**Example:**
```typescript
try {
  const pdfBlob = await generatePDF(convertToAPIData(resumeData), selectedVariant);
} catch (error) {
  if (isTimeoutError(error)) {
    showNotification('PDF generation took too long. Please try again.');
  } else {
    showNotification('Failed to generate PDF. Please check your connection.');
  }
}
```

## Files Modified

1. **resume-api/main.py**
   - Fixed merge conflict
   - Added TimeoutMiddleware import
   - Added ErrorHandlingMiddleware import
   - Middleware registration order: Timeout → Error Handling → Monitoring → Security

2. **resume-api/middleware/timeout.py** (existing, verified)
   - Enforces 30s default timeout
   - Extended timeouts for expensive operations
   - Returns 504 on timeout

3. **utils/fetch-timeout.ts** (existing, verified)
   - Timeout utilities already implemented
   - PDF_GENERATION: 15s timeout config
   - AI_OPERATION: 15s timeout config

4. **utils/api-client.ts** (existing, verified)
   - All API calls use fetchWithTimeout
   - generatePDF uses TIMEOUT_CONFIG.PDF_GENERATION
   - tailorResume uses TIMEOUT_CONFIG.AI_OPERATION

5. **tests/api-client-timeout.test.ts** (existing, verified)
   - Complete test coverage
   - 9 tests passing

## Verification Checklist

✅ Backend timeout middleware (30s default, 60s PDF, 45s tailor)
✅ Frontend AbortSignal (15s PDF, 15s AI operations)
✅ Merge conflict resolved in main.py
✅ Both middlewares imported and registered
✅ Tests passing (9/9)
✅ Frontend build successful (no errors)
✅ API client using timeout utilities
✅ generatePDF uses 15s timeout
✅ tailorResume uses 15s timeout
✅ Error handling for timeout scenarios
✅ Fallback to 504 if backend exceeds timeout

## Performance Impact

- **Minimal overhead:** Timeout enforcement adds negligible latency
- **Network resilience:** Prevents hanging connections consuming resources
- **User experience:** Clear timeout feedback instead of indefinite waiting
- **Backend protection:** Prevents resource exhaustion from slow/stalled requests

## Known Limitations

1. WebSocket connections not covered by timeout middleware (by design - WebSockets are persistent)
2. Extended timeouts for PDF/AI may still timeout on slow networks
3. No automatic retry on timeout (handled by retry logic in fetchWithRetry)

## Future Enhancements

1. Configurable timeouts via environment variables
2. Per-user timeout overrides (premium feature)
3. Client-side timeout analytics/metrics
4. Exponential backoff for timeout retries
5. Server-sent events for long-running operations
6. Server-side timeout hooks for cleanup

## Deployment Notes

- No database migrations needed
- No new dependencies required
- Backward compatible with existing code
- Safe to deploy without service interruption
- Monitor logs for REQUEST_TIMEOUT errors during initial rollout
