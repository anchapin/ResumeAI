# API Error Codes Reference

## Standard Error Response Format

All errors return a consistent JSON structure:

```json
{
  "error_code": "ERR_CODE",
  "error_message": "Human readable message",
  "request_id": "req_abc123",
  "http_status": 400,
  "timestamp": "2024-02-26T13:40:22.892Z",
  "path": "/v1/endpoint"
}
```

## Error Codes

| Code | HTTP | Message | Description |
|------|------|---------|-------------|
| ERR_AUTH_MISSING_KEY | 401 | API key is required | No API key provided |
| ERR_AUTH_INVALID_KEY | 401 | Invalid API key | API key not found or invalid |
| ERR_RATE_LIMIT_EXCEEDED | 429 | Rate limit exceeded | Too many requests |
| ERR_VALIDATION_FAILED | 400 | Validation failed | Request validation error |
| ERR_NOT_FOUND | 404 | Resource not found | Resource does not exist |
| ERR_SERVER_ERROR | 500 | Internal server error | Unexpected server error |
| ERR_TIMEOUT | 504 | Request timeout | Operation timed out |

## Request ID Tracking

Every API error includes a `request_id` that can be used to:
- Track errors through logs
- Link frontend errors to backend logs
- Debug multi-step operations

Example: `req_a1b2c3d4e5f6g7h8`
