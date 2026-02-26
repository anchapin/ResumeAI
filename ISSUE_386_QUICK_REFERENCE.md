# Issue #386 - Quick Reference

## What Was Implemented

Complete API timeout protection with 30s backend timeout and 15s frontend AbortSignal.

## Key Files

| File | Purpose | Timeout |
|------|---------|---------|
| `resume-api/middleware/timeout.py` | Backend timeout enforcer | 30s default, 60s PDF, 45s AI |
| `utils/fetch-timeout.ts` | Frontend timeout utilities | 15s PDF, 15s AI ops |
| `utils/api-client.ts` | API calls using timeout | Uses fetch-timeout |
| `tests/api-client-timeout.test.ts` | Comprehensive tests | 9/9 passing ✅ |

## Timeout Configuration

### Backend (Python)
```python
# resume-api/middleware/timeout.py
DEFAULT_REQUEST_TIMEOUT = 30  # Default for all endpoints

EXTENDED_TIMEOUT_ENDPOINTS = {
    "/v1/render/pdf": 60,   # PDF generation
    "/v1/tailor": 45,       # AI tailoring
}
```

### Frontend (TypeScript)
```typescript
// utils/fetch-timeout.ts
export const TIMEOUT_CONFIG = {
    QUICK: 5000,              // 5s
    STANDARD: 10000,          // 10s
    PDF_GENERATION: 15000,    // 15s ← PDF calls use this
    AI_OPERATION: 15000,      // 15s ← Tailor/ATS use this
    NONE: 0,
}
```

## How It Works

### PDF Generation Flow
```
User clicks "Download PDF"
    ↓
Editor.tsx calls generatePDF()
    ↓
api-client.ts: fetchWithTimeout(..., TIMEOUT_CONFIG.PDF_GENERATION)
    ↓
fetch with AbortSignal (15s timeout)
    ↓
If response within 15s → PDF blob returned
If timeout after 15s → AbortError thrown
    ↓
If backend exceeds 60s → 504 returned
```

### Error Handling
```typescript
try {
  const pdfBlob = await generatePDF(data, variant);
} catch (error) {
  if (isTimeoutError(error)) {
    // Handle timeout (show "taking too long" message)
  } else {
    // Handle other errors (network, server error, etc.)
  }
}
```

## Testing

Run the timeout tests:
```bash
npm test -- tests/api-client-timeout.test.ts
```

All tests passing:
- ✅ generatePDF uses 15s timeout
- ✅ tailorResume uses 15s timeout
- ✅ getVariants uses 10s timeout
- ✅ checkATSScore uses 15s timeout
- ✅ Timeout errors properly identified
- ✅ Error responses parsed correctly

## Deployment Notes

No configuration needed. Just deploy:
1. Backend changes are in main.py (merged)
2. Frontend changes are in utils/ (existing)
3. Tests are in tests/ (existing)

Monitor logs for `REQUEST_TIMEOUT` errors during initial rollout.

## Troubleshooting

### "PDF generation takes longer than 15s"
Solution: User network is slow. This is working as designed.
- Backend gives 60s to actually generate
- Frontend shows timeout after 15s to avoid user frustration
- Consider retrying or showing better UX

### "Backend returning 504"
Solution: Request exceeded 30s (or extended timeout)
- Check if operation is genuinely slow
- Increase EXTENDED_TIMEOUT_ENDPOINTS if needed
- Consider async operation pattern (queue + webhook)

### "Tests failing"
Solution: Run build first
```bash
npm run build
npm test
```

## Monitoring

Look for these in logs:
- `request_timeout` - Backend timeout occurred
- `timeout_middleware_error` - Error in timeout handling

Example backend log:
```
logger.warning("request_timeout", 
  path="/v1/render/pdf",
  method="POST",
  timeout_seconds=60
)
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Editor Component (React)                │
│  - User clicks "Download PDF"                   │
│  - Calls generatePDF(data, variant)             │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│     api-client.ts (API Layer)                   │
│  - fetchWithTimeout(url, opts, 15000)           │
│  - Adds headers, auth, request body             │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│     fetch-timeout.ts (Timeout Layer)            │
│  - Creates AbortController(15s)                 │
│  - Passes signal to fetch()                     │
│  - Returns response or throws error             │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
    Response              Timeout/Error
       │                       │
       └───────────┬───────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│     Network (HTTP)                              │
│  POST /v1/render/pdf                            │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│     Backend API (FastAPI)                       │
│  - TimeoutMiddleware(60s for PDF)               │
│  - Routes to /v1/render/pdf                     │
│  - Generates PDF                                │
│  - Returns response or 504                      │
└─────────────────────────────────────────────────┘
```

## Common Mistakes to Avoid

❌ Don't increase frontend timeout above backend timeout
❌ Don't hardcode timeout values (use TIMEOUT_CONFIG)
❌ Don't catch all errors without checking timeout
❌ Don't remove timeout protection
❌ Don't forget to add headers to fetch calls

✅ Do use TIMEOUT_CONFIG constants
✅ Do use isTimeoutError() to detect timeouts
✅ Do provide user feedback on timeout
✅ Do monitor timeout logs
✅ Do test with slow networks

## Future Improvements

1. Add timeout analytics/metrics
2. Configurable timeouts via settings
3. Exponential backoff on timeout
4. Queue system for long-running operations
5. WebSocket support for progress updates
6. Server-sent events for streaming results
