# API Error Codes Reference

This document describes all standardized error codes used by the ResumeAI API.

## Overview

All API error responses follow a unified JSON structure:

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "request_id": "req_a1b2c3d4e5f6g7h8",
  "timestamp": "2024-02-26T13:40:22.892Z",
  "status": 400,
  "path": "/v1/render/pdf",
  "method": "POST",
  "field_errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    }
  ],
  "details": {}
}
```

### Response Fields

| Field          | Type    | Description                            | Required |
| -------------- | ------- | -------------------------------------- | -------- |
| `error_code`   | string  | Machine-readable error code            | Yes      |
| `message`      | string  | Human-readable error message           | Yes      |
| `request_id`   | string  | Unique request identifier for tracking | Yes      |
| `timestamp`    | string  | ISO 8601 timestamp when error occurred | Yes      |
| `status`       | integer | HTTP status code                       | Yes      |
| `path`         | string  | Request path                           | No       |
| `method`       | string  | HTTP method (GET, POST, etc.)          | No       |
| `field_errors` | array   | Field-specific validation errors       | No       |
| `details`      | object  | Additional error context/details       | No       |

## Error Code Categories

### Client Errors (4xx)

#### INVALID_REQUEST

- **HTTP Status:** 400
- **Description:** The request format is invalid
- **Example:** Malformed JSON body
- **Recovery:** Check request format and try again

#### VALIDATION_ERROR

- **HTTP Status:** 400 / 422
- **Description:** Request validation failed
- **Example:** Missing required fields, invalid data types
- **Recovery:** Check field_errors for specific issues and correct the request

#### MISSING_FIELD

- **HTTP Status:** 400
- **Description:** A required field is missing
- **Example:** `resume_data` field missing in PDF generation request
- **Recovery:** Include the required field in the request

#### INVALID_FORMAT

- **HTTP Status:** 400
- **Description:** A field has an invalid format
- **Example:** Email address format invalid
- **Recovery:** Use the correct format and retry

#### UNAUTHORIZED

- **HTTP Status:** 401
- **Description:** Authentication is required or invalid
- **Causes:**
  - Missing X-API-KEY header
  - Invalid API key
  - Expired token
- **Recovery:** Include valid API key or token in X-API-KEY header

#### FORBIDDEN

- **HTTP Status:** 403
- **Description:** Authenticated but not authorized for this resource
- **Example:** User doesn't have access to resume owned by another user
- **Recovery:** Use correct credentials or contact support

#### NOT_FOUND

- **HTTP Status:** 404
- **Description:** The requested resource doesn't exist
- **Examples:**
  - Resume with specified ID doesn't exist
  - PDF file not found
- **Recovery:** Verify the resource ID and try again

#### CONFLICT

- **HTTP Status:** 409
- **Description:** The request conflicts with the current state
- **Example:** Trying to update a resource that's being edited elsewhere
- **Recovery:** Wait and retry, or refresh the resource state

#### RATE_LIMITED

- **HTTP Status:** 429
- **Description:** Too many requests have been made in a short time
- **Recovery:** Wait for the time specified in Retry-After header before retrying

### Resume-Specific Errors (4xx)

#### RESUME_NOT_FOUND

- **HTTP Status:** 404
- **Description:** The specified resume doesn't exist
- **Recovery:** Verify the resume ID and check if it was deleted

#### RESUME_INVALID

- **HTTP Status:** 400
- **Description:** The resume data is invalid or corrupted
- **Examples:**
  - Missing required sections
  - Invalid data structure
- **Recovery:** Check the resume data and correct any issues

#### RESUME_LOCKED

- **HTTP Status:** 409
- **Description:** The resume is locked and cannot be modified
- **Causes:**
  - Another user is currently editing it
  - Resume is under processing
- **Recovery:** Wait for the lock to be released and try again

#### RESUME_ARCHIVED

- **HTTP Status:** 410 (Gone)
- **Description:** The resume is archived and cannot be modified
- **Recovery:** Unarchive the resume if you have permission

### PDF-Specific Errors (4xx/5xx)

#### PDF_GENERATION_FAILED

- **HTTP Status:** 500
- **Description:** PDF generation failed
- **Causes:**
  - Template error
  - LaTeX compilation error
  - Missing required resume fields
- **Recovery:** Check resume data is complete and valid, retry

#### PDF_NOT_FOUND

- **HTTP Status:** 404
- **Description:** The requested PDF file is not available
- **Recovery:** Regenerate the PDF by making a new render request

#### PDF_INVALID_TEMPLATE

- **HTTP Status:** 400
- **Description:** The specified PDF template is invalid or doesn't exist
- **Recovery:** Use a valid template name (e.g., "modern", "classic")

#### PDF_RENDERING_ERROR

- **HTTP Status:** 500
- **Description:** An error occurred while rendering the PDF
- **Causes:**
  - LaTeX processing error
  - Missing fonts or dependencies
- **Recovery:** Retry the request, or contact support if persistent

### OAuth-Specific Errors (4xx/5xx)

#### OAUTH_INVALID_CODE

- **HTTP Status:** 400
- **Description:** OAuth authorization code is invalid or expired
- **Recovery:** Restart the OAuth flow to get a new code

#### OAUTH_INVALID_STATE

- **HTTP Status:** 400
- **Description:** OAuth state parameter mismatch (CSRF protection)
- **Recovery:** Restart the OAuth flow

#### OAUTH_SCOPE_DENIED

- **HTTP Status:** 403
- **Description:** User denied required OAuth scopes
- **Recovery:** Grant the required permissions and retry OAuth flow

#### OAUTH_PROVIDER_ERROR

- **HTTP Status:** 502
- **Description:** OAuth provider returned an error
- **Recovery:** Check provider status and retry

#### OAUTH_TOKEN_EXPIRED

- **HTTP Status:** 401
- **Description:** OAuth token has expired
- **Recovery:** Refresh the token or restart the OAuth flow

### Server Errors (5xx)

#### INTERNAL_SERVER_ERROR

- **HTTP Status:** 500
- **Description:** An unexpected server error occurred
- **Recovery:** Retry the request. If persistent, contact support with the request_id

#### SERVICE_UNAVAILABLE

- **HTTP Status:** 503
- **Description:** The service is temporarily unavailable
- **Causes:**
  - Server maintenance
  - Temporary overload
- **Recovery:** Retry after a short delay

#### DATABASE_ERROR

- **HTTP Status:** 500
- **Description:** A database operation failed
- **Recovery:** Retry the request. If persistent, contact support

#### EXTERNAL_SERVICE_ERROR

- **HTTP Status:** 502
- **Description:** An external service (AI API, etc.) returned an error
- **Recovery:** Retry the request. If persistent, check external service status

## Request ID Tracking

Every error response includes a `request_id` field. Use this ID when contacting support as it helps track the exact error in logs.

Example: `req_a1b2c3d4e5f6g7h8`

## Validation Error Details

When a VALIDATION_ERROR occurs, the response may include a `field_errors` array with details about which fields failed validation:

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "request_id": "req_123abc",
  "timestamp": "2024-02-26T13:40:22.892Z",
  "status": 422,
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
    }
  ]
}
```

## Common Error Scenarios

### Missing API Key

```
Request: curl https://api.example.com/v1/render/pdf
Response: 401 UNAUTHORIZED
{
  "error_code": "UNAUTHORIZED",
  "message": "Authentication required",
  "request_id": "req_xyz",
  "status": 401
}
```

**Solution:** Include API key: `curl -H "X-API-KEY: your-key" https://api.example.com/v1/render/pdf`

### Invalid Resume Data

```
Request: POST /v1/render/pdf with incomplete resume data
Response: 422 UNPROCESSABLE_ENTITY
{
  "error_code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "field_errors": [
    {
      "field": "resume_data.name",
      "message": "This field is required",
      "code": "MISSING_FIELD"
    }
  ]
}
```

**Solution:** Include all required fields in resume_data

### Rate Limit Exceeded

```
Request: 11th request within rate limit window
Response: 429 TOO_MANY_REQUESTS
{
  "error_code": "RATE_LIMITED",
  "message": "Rate limit exceeded. Please retry after a short delay.",
  "request_id": "req_abc",
  "status": 429,
  "details": {
    "retry_after_seconds": 60
  }
}
```

**Solution:** Wait 60 seconds before making the next request. Check `Retry-After` response header.

### Resource Not Found

```
Request: GET /v1/resumes/nonexistent-id
Response: 404 NOT_FOUND
{
  "error_code": "RESUME_NOT_FOUND",
  "message": "Resume not found",
  "request_id": "req_def",
  "status": 404
}
```

**Solution:** Verify the resume ID exists

## Best Practices

1. **Always check the request_id** - Include it in support tickets for debugging
2. **Handle field_errors** - When VALIDATION_ERROR occurs, check field_errors for specific issues
3. **Respect rate limits** - Check `Retry-After` header and implement exponential backoff
4. **Implement retry logic** - Retry 5xx errors with exponential backoff (max 3 retries)
5. **Log error responses** - Store error responses with request_id for debugging
6. **Use status code** - Don't rely only on error_code, also check HTTP status code
7. **Update stale tokens** - Handle UNAUTHORIZED errors by refreshing/obtaining new tokens

## OpenAPI/Swagger Documentation

The error response schema is documented in the OpenAPI specification at `/docs` endpoint:

- Visit `https://api.example.com/docs` for interactive API documentation
- Error responses are shown in the "Responses" section of each endpoint
- The ErrorResponse schema shows all possible fields

## Support

If you encounter an error that's not documented here:

1. Note the `request_id`
2. Save the full error response
3. Contact support with the request_id and error details
