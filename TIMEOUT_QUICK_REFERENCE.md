# Request Timeout - Quick Reference

## 🎯 What Was Implemented

Request timeouts prevent hanging requests on both frontend (React) and backend (FastAPI).

## 📊 Timeout Values

| Layer        | Endpoint         | Timeout | Status Code |
| ------------ | ---------------- | ------- | ----------- |
| **Frontend** | PDF Generation   | 15s     | AbortError  |
| **Frontend** | AI Operations    | 15s     | AbortError  |
| **Frontend** | Standard API     | 10s     | AbortError  |
| **Frontend** | Quick Operations | 5s      | AbortError  |
| **Backend**  | Default          | 30s     | 504         |
| **Backend**  | PDF Rendering    | 60s     | 504         |
| **Backend**  | AI Tailoring     | 45s     | 504         |
| **Backend**  | ATS Check        | 45s     | 504         |

## 🚀 Quick Usage

### Frontend - Fetch with Timeout

```typescript
import { fetchWithTimeout, TIMEOUT_CONFIG } from './utils/fetch-timeout';

// Basic usage
const response = await fetchWithTimeout(
  '/api/data',
  { method: 'GET' },
  TIMEOUT_CONFIG.STANDARD, // 10 seconds
);
```

### Frontend - API Client (Already Has Timeouts)

```typescript
import { generatePDF, tailorResume } from './utils/api-client';

// Automatically uses PDF_GENERATION timeout (15s)
const pdf = await generatePDF(resumeData, 'modern');

// Automatically uses AI_OPERATION timeout (15s)
const tailored = await tailorResume(resumeData, jobDescription);
```

### Error Handling

```typescript
import { isTimeoutError } from './utils/fetch-timeout';

try {
  const response = await fetchWithTimeout(url, options, 10000);
} catch (error) {
  if (isTimeoutError(error)) {
    console.error('Request timed out after 10 seconds');
  }
}
```

## 🔧 Configuration

### Frontend - Custom Timeout

Edit `utils/fetch-timeout.ts`:

```typescript
export const TIMEOUT_CONFIG = Object.freeze({
  QUICK: 5000, // Adjust these values
  STANDARD: 10000,
  PDF_GENERATION: 15000,
  AI_OPERATION: 15000,
  NONE: 0,
});
```

### Backend - Custom Timeout

Edit `resume-api/middleware/timeout.py`:

```python
DEFAULT_REQUEST_TIMEOUT = 30  # Change default timeout

EXTENDED_TIMEOUT_ENDPOINTS = {
    "/v1/render/pdf": 60,
    "/v1/tailor": 45,
    # Add more endpoints with extended timeouts
}
```

Or in `main.py`:

```python
app.add_middleware(TimeoutMiddleware, timeout_seconds=30)
```

## 📝 Files Added/Modified

### New Files

- `utils/fetch-timeout.ts` - Frontend timeout utility
- `utils/fetch-timeout.test.ts` - Tests (17 cases, all passing)
- `resume-api/middleware/timeout.py` - Backend timeout middleware
- `resume-api/tests/test_timeout_middleware.py` - Tests (7 cases)
- `tests/api-client-timeout.test.ts` - Integration tests (9 cases)
- `docs/TIMEOUT_IMPLEMENTATION.md` - Full documentation
- `TIMEOUT_IMPLEMENTATION_SUMMARY.md` - Implementation summary

### Modified Files

- `utils/api-client.ts` - Uses fetchWithTimeout in 4 functions
- `utils/errorHandler.ts` - Recognizes AbortError as timeout
- `resume-api/main.py` - Added TimeoutMiddleware

## ✅ Tests

### Run Frontend Tests

```bash
npm test -- utils/fetch-timeout.test.ts
npm test -- tests/api-client-timeout.test.ts
```

### Run Backend Tests

```bash
cd resume-api
python -m pytest tests/test_timeout_middleware.py -v
```

## 🎓 Examples

### Example 1: Generate PDF with Timeout Handling

```typescript
async function generateAndDownloadPDF() {
  try {
    const pdfBlob = await generatePDF(resumeData, variant);
    downloadBlob(pdfBlob, 'resume.pdf');
  } catch (error) {
    if (isTimeoutError(error)) {
      showError('PDF generation took too long. Try again.');
    } else {
      showError('Failed to generate PDF: ' + error.message);
    }
  }
}
```

### Example 2: Create Custom Timeout

```typescript
import { createTimeoutAbortController, clearTimeoutAbortController } from './utils/fetch-timeout';

async function customFetch() {
  const controller = createTimeoutAbortController(5000); // 5 seconds
  try {
    const response = await fetch('/api/data', {
      signal: controller.signal,
    });
    return response.json();
  } finally {
    clearTimeoutAbortController(controller);
  }
}
```

### Example 3: Integrate with Error Handler

```typescript
import { GlobalErrorHandler, ErrorType } from './utils/errorHandler';

GlobalErrorHandler.subscribe((error) => {
  if (error.type === ErrorType.TIMEOUT) {
    showNotification({
      type: 'warning',
      message: error.userMessage,
      duration: 5000,
    });
  }
});
```

## 🐛 Troubleshooting

| Issue                             | Solution                                          |
| --------------------------------- | ------------------------------------------------- |
| Request times out too quickly     | Increase TIMEOUT_CONFIG value                     |
| Backend times out before frontend | Adjust EXTENDED_TIMEOUT_ENDPOINTS                 |
| AbortError not recognized         | Check errorHandler.ts includes 'AbortError' check |
| Tests failing                     | Run `npm install && npm test`                     |
| Build fails                       | Run `npm run build` to check TypeScript           |

## 📚 Documentation

Full documentation: [TIMEOUT_IMPLEMENTATION.md](./docs/TIMEOUT_IMPLEMENTATION.md)

## 🔗 Key Components

1. **Frontend Utility**: `utils/fetch-timeout.ts`
   - Creates AbortController with timeout
   - Provides fetchWithTimeout wrapper
   - Detects timeout errors

2. **Backend Middleware**: `resume-api/middleware/timeout.py`
   - Enforces request timeouts using asyncio.wait_for
   - Returns 504 on timeout
   - Logs timeout events

3. **API Client**: `utils/api-client.ts`
   - Uses fetchWithTimeout automatically
   - Applies correct timeout for each operation
   - Integrated with error handling

4. **Error Handler**: `utils/errorHandler.ts`
   - Recognizes AbortError and TimeoutError
   - Provides user-friendly messages
   - Tracks timeout events

## ⚡ Performance

- **Memory**: ~1KB per request (AbortController)
- **CPU**: Uses native browser timeout (no polling)
- **Network**: No additional overhead
- **Cleanup**: Automatic (no leaks)

## 🚢 Deployment

- No database changes needed
- No environment variables required
- Backwards compatible
- Safe to deploy immediately

---

**Issue**: #386  
**Status**: ✅ Complete  
**Test Coverage**: 26 tests passing  
**Documentation**: Complete
