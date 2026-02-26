# API Error Response Examples

This document provides concrete examples of all error response types from the standardized error schema.

## Validation Error with Field-Level Details

**Request:**

```bash
curl -X POST https://api.resumeai.com/v1/render/pdf \
  -H "X-API-KEY: rai_test123" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_data": {
      "email": "invalid-email",
      "phone": "123"
    }
  }'
```

**Response: 422 Unprocessable Entity**

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "request_id": "req_a1b2c3d4e5f6g7h8",
  "timestamp": "2024-02-26T13:40:22.892Z",
  "status": 422,
  "path": "/v1/render/pdf",
  "method": "POST",
  "field_errors": [
    {
      "field": "resume_data.email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    },
    {
      "field": "resume_data.phone",
      "message": "Phone number too short",
      "code": "VALIDATION_ERROR"
    },
    {
      "field": "variant",
      "message": "This field is required",
      "code": "MISSING_FIELD"
    }
  ]
}
```

## Missing API Key

**Request:**

```bash
curl -X POST https://api.resumeai.com/v1/render/pdf \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response: 401 Unauthorized**

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Authentication required",
  "request_id": "req_xyz789abc123def",
  "timestamp": "2024-02-26T13:41:15.123Z",
  "status": 401,
  "path": "/v1/render/pdf",
  "method": "POST"
}
```

## Invalid API Key

**Request:**

```bash
curl -X POST https://api.resumeai.com/v1/render/pdf \
  -H "X-API-KEY: invalid_key_xyz" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response: 401 Unauthorized**

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Invalid API key",
  "request_id": "req_invalid1key2error",
  "timestamp": "2024-02-26T13:42:30.456Z",
  "status": 401,
  "path": "/v1/render/pdf",
  "method": "POST"
}
```

## Resource Not Found

**Request:**

```bash
curl -X GET https://api.resumeai.com/v1/resumes/nonexistent-id \
  -H "X-API-KEY: rai_test123"
```

**Response: 404 Not Found**

```json
{
  "error_code": "RESUME_NOT_FOUND",
  "message": "Resume not found",
  "request_id": "req_notfound001234567",
  "timestamp": "2024-02-26T13:43:45.789Z",
  "status": 404,
  "path": "/v1/resumes/nonexistent-id",
  "method": "GET"
}
```

## Rate Limit Exceeded

**Scenario:** User makes 11 requests when limit is 10/minute

**Request:**

```bash
# 11th request within rate limit window
curl -X POST https://api.resumeai.com/v1/render/pdf \
  -H "X-API-KEY: rai_test123" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response: 429 Too Many Requests**

```json
{
  "error_code": "RATE_LIMITED",
  "message": "Rate limit exceeded. Please retry after a short delay.",
  "request_id": "req_ratelimit2024feb26",
  "timestamp": "2024-02-26T13:44:00.000Z",
  "status": 429,
  "path": "/v1/render/pdf",
  "method": "POST",
  "details": {
    "retry_after_seconds": 60
  }
}
```

**Response Headers:**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-Request-ID: req_ratelimit2024feb26
```

## PDF Generation Failed

**Scenario:** LaTeX compilation error during PDF rendering

**Response: 500 Internal Server Error**

```json
{
  "error_code": "PDF_GENERATION_FAILED",
  "message": "PDF generation failed",
  "request_id": "req_pdfgen1error23456789",
  "timestamp": "2024-02-26T13:45:12.345Z",
  "status": 500,
  "path": "/v1/render/pdf",
  "method": "POST",
  "details": {
    "template": "modern",
    "reason": "LaTeX compilation error",
    "error_type": "pdflatex"
  }
}
```

## Invalid PDF Template

**Request:**

```bash
curl -X POST https://api.resumeai.com/v1/render/pdf \
  -H "X-API-KEY: rai_test123" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_data": {...},
    "variant": "nonexistent-template"
  }'
```

**Response: 400 Bad Request**

```json
{
  "error_code": "PDF_INVALID_TEMPLATE",
  "message": "Invalid PDF template",
  "request_id": "req_invalidtemplate001",
  "timestamp": "2024-02-26T13:46:20.567Z",
  "status": 400,
  "path": "/v1/render/pdf",
  "method": "POST",
  "details": {
    "requested_template": "nonexistent-template",
    "available_templates": ["modern", "classic", "minimal", "tech"]
  }
}
```

## Resume Locked

**Scenario:** Another user is currently editing the resume

**Request:**

```bash
curl -X PUT https://api.resumeai.com/v1/resumes/123 \
  -H "X-API-KEY: rai_test123" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response: 409 Conflict**

```json
{
  "error_code": "RESUME_LOCKED",
  "message": "Resume is locked and cannot be modified",
  "request_id": "req_lockedresume123456",
  "timestamp": "2024-02-26T13:47:30.789Z",
  "status": 409,
  "path": "/v1/resumes/123",
  "method": "PUT",
  "details": {
    "locked_by_user": "user_abc123",
    "lock_expires_at": "2024-02-26T13:55:30.000Z",
    "message": "Resume is currently being edited by another user"
  }
}
```

## Access Forbidden

**Scenario:** User tries to access resume owned by another user

**Request:**

```bash
curl -X GET https://api.resumeai.com/v1/resumes/other-user-resume \
  -H "X-API-KEY: rai_test123"
```

**Response: 403 Forbidden**

```json
{
  "error_code": "FORBIDDEN",
  "message": "Access denied",
  "request_id": "req_forbidden_access123",
  "timestamp": "2024-02-26T13:48:40.901Z",
  "status": 403,
  "path": "/v1/resumes/other-user-resume",
  "method": "GET",
  "details": {
    "reason": "Resume is owned by another user",
    "owned_by": "user_xyz789"
  }
}
```

## OAuth Error - Invalid Code

**Scenario:** OAuth authorization code expired or invalid

**Request:**

```bash
curl -X POST https://api.resumeai.com/v1/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "expired_code_123",
    "state": "random_state_456"
  }'
```

**Response: 400 Bad Request**

```json
{
  "error_code": "OAUTH_INVALID_CODE",
  "message": "Invalid OAuth authorization code",
  "request_id": "req_oauth_invalid_code01",
  "timestamp": "2024-02-26T13:49:50.123Z",
  "status": 400,
  "path": "/v1/oauth/callback",
  "method": "POST",
  "details": {
    "provider": "github",
    "reason": "Authorization code expired"
  }
}
```

## OAuth Error - State Mismatch

**Scenario:** OAuth state parameter doesn't match (CSRF attack detection)

**Response: 400 Bad Request**

```json
{
  "error_code": "OAUTH_INVALID_STATE",
  "message": "OAuth state mismatch",
  "request_id": "req_oauth_state_mismatch01",
  "timestamp": "2024-02-26T13:50:55.234Z",
  "status": 400,
  "path": "/v1/oauth/callback",
  "method": "POST",
  "details": {
    "provider": "github",
    "reason": "State parameter validation failed - possible CSRF attack"
  }
}
```

## OAuth Error - Scope Denied

**Scenario:** User denied required OAuth scopes

**Response: 403 Forbidden**

```json
{
  "error_code": "OAUTH_SCOPE_DENIED",
  "message": "OAuth scope was denied",
  "request_id": "req_oauth_scope_denied001",
  "timestamp": "2024-02-26T13:51:59.345Z",
  "status": 403,
  "path": "/v1/oauth/callback",
  "method": "POST",
  "details": {
    "provider": "linkedin",
    "required_scope": "r_liteprofile r_emailaddress",
    "message": "User denied access to profile information"
  }
}
```

## Database Error

**Scenario:** Database connection failure or query error

**Response: 500 Internal Server Error**

```json
{
  "error_code": "DATABASE_ERROR",
  "message": "Database error",
  "request_id": "req_db_error_2024feb26",
  "timestamp": "2024-02-26T13:52:59.456Z",
  "status": 500,
  "path": "/v1/resumes",
  "method": "POST",
  "details": {
    "error_type": "ConnectionError",
    "message": "Unable to connect to database"
  }
}
```

## External Service Error

**Scenario:** AI API (OpenAI, Claude, Gemini) returned an error

**Response: 502 Bad Gateway**

```json
{
  "error_code": "EXTERNAL_SERVICE_ERROR",
  "message": "External service error",
  "request_id": "req_ai_service_error123",
  "timestamp": "2024-02-26T13:53:59.567Z",
  "status": 502,
  "path": "/v1/tailor",
  "method": "POST",
  "details": {
    "service": "openai",
    "error": "Rate limit exceeded",
    "retry_after": 60
  }
}
```

## Service Unavailable

**Scenario:** Server is under maintenance or temporarily unavailable

**Response: 503 Service Unavailable**

```json
{
  "error_code": "SERVICE_UNAVAILABLE",
  "message": "Service temporarily unavailable",
  "request_id": "req_maintenance_2024feb26",
  "timestamp": "2024-02-26T13:54:59.678Z",
  "status": 503,
  "path": "/v1/render/pdf",
  "method": "POST",
  "details": {
    "reason": "Scheduled maintenance",
    "expected_recovery": "2024-02-26T14:00:00.000Z"
  }
}
```

## Unexpected Server Error

**Scenario:** Unhandled exception in application

**Response: 500 Internal Server Error**

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Internal server error",
  "request_id": "req_unexpected_error_001",
  "timestamp": "2024-02-26T13:55:59.789Z",
  "status": 500,
  "path": "/v1/render/pdf",
  "method": "POST",
  "details": {
    "error_type": "AttributeError"
  }
}
```

**Support Message:** Please contact support with request_id: `req_unexpected_error_001`

## Using Request IDs

### For Debugging

Include the `request_id` in all support requests:

```
Customer: "I'm getting an error when trying to generate a PDF"
Support: "What's the request_id from the error?"
Customer: "req_a1b2c3d4e5f6g7h8"
Support: "Let me look up that request in our logs..."
```

### For Monitoring

Extract request_ids from error responses for correlation:

```bash
# Check logs for a specific request
grep -r "req_a1b2c3d4e5f6g7h8" /var/log/api/
```

### For Metrics

Track errors by error_code for analytics:

```python
error_code = response.json()["error_code"]
metrics.increment(f"api_errors_{error_code}")
```

## Common Patterns

### 1. Always Check field_errors

```python
if response.status_code == 422:
    data = response.json()
    if data.get("field_errors"):
        for field_error in data["field_errors"]:
            print(f"Error in {field_error['field']}: {field_error['message']}")
```

### 2. Implement Retry Logic

```python
if response.status_code == 429:
    data = response.json()
    retry_after = data.get("details", {}).get("retry_after_seconds", 60)
    time.sleep(retry_after)
    # Retry request
```

### 3. Log Request IDs

```python
if response.status_code >= 400:
    data = response.json()
    logger.error(
        "API error",
        request_id=data["request_id"],
        error_code=data["error_code"],
        status=data["status"]
    )
```

## Testing Error Responses

### Test Validation Error

```bash
curl -X POST https://localhost:8000/v1/render/pdf \
  -H "X-API-KEY: test_key" \
  -H "Content-Type: application/json" \
  -d '{"resume_data": {}}'
```

### Test Missing API Key

```bash
curl -X POST https://localhost:8000/v1/render/pdf \
  -H "Content-Type: application/json" \
  -d '{"resume_data": {}}'
```

### Test Rate Limit

```bash
# Make 11 requests rapidly (if limit is 10/minute)
for i in {1..11}; do
  curl -X POST https://localhost:8000/v1/render/pdf \
    -H "X-API-KEY: test_key" \
    -H "Content-Type: application/json" \
    -d '{"resume_data": {}, "variant": "modern"}'
done
```

## Summary

All error responses follow this consistent structure:

- ✅ `error_code` - Machine-readable error type
- ✅ `message` - Human-readable error description
- ✅ `request_id` - Unique identifier for tracking
- ✅ `timestamp` - When the error occurred
- ✅ `status` - HTTP status code
- ✅ `path` & `method` - Which endpoint had the error
- ✅ `field_errors` - Details about validation failures
- ✅ `details` - Additional context for debugging

Always include the `request_id` when contacting support or reporting issues.
