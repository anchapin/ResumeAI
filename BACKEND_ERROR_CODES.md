# Backend Error Response Format - Issue #385

## Overview

This document outlines the standardized error response format for the ResumeAI API backend, including 25+ error codes with consistent response structure across all endpoints.

## Standard Error Response

All API errors follow this JSON structure:

```json
{
  "error_code": "ERROR_CODE",
  "error_message": "Human-readable message",
  "request_id": "req_1234567890abcdef",
  "timestamp": 1708950600.123,
  "status_code": 400,
  "path": "/api/v1/resumes",
  "method": "POST"
}
```

## Error Codes (25+)

### Client Errors (4xx)

- `INVALID_REQUEST` (400) - Malformed request
- `VALIDATION_ERROR` (400) - Input validation failed
- `MISSING_FIELD` (400) - Required field missing
- `INVALID_FORMAT` (400) - Invalid field format
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Access denied
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource conflict
- `RATE_LIMITED` (429) - Rate limit exceeded

### Resume Errors (4xx/5xx)

- `RESUME_NOT_FOUND` (404) - Resume not found
- `RESUME_INVALID` (400) - Invalid resume data
- `RESUME_LOCKED` (403) - Resume locked
- `RESUME_ARCHIVED` (403) - Resume archived

### PDF Errors (4xx/5xx)

- `PDF_GENERATION_FAILED` (500) - PDF generation error
- `PDF_NOT_FOUND` (404) - PDF not found
- `PDF_INVALID_TEMPLATE` (400) - Invalid template
- `PDF_RENDERING_ERROR` (500) - Rendering error

### OAuth Errors (4xx/5xx)

- `OAUTH_INVALID_CODE` (400) - Invalid auth code
- `OAUTH_INVALID_STATE` (400) - State mismatch (CSRF)
- `OAUTH_SCOPE_DENIED` (403) - Scope denied
- `OAUTH_PROVIDER_ERROR` (500) - Provider error
- `OAUTH_TOKEN_EXPIRED` (401) - Token expired

### Server Errors (5xx)

- `INTERNAL_SERVER_ERROR` (500) - Unexpected error
- `SERVICE_UNAVAILABLE` (503) - Service down
- `DATABASE_ERROR` (500) - Database error
- `EXTERNAL_SERVICE_ERROR` (502/503) - External service error

## Features

✅ **25+ Standardized Error Codes**
✅ **Unique Request ID Tracking** - Every error includes `request_id` for debugging
✅ **Field-Level Validation Errors** - Detailed field errors for validation failures
✅ **HTTP Status Code Mapping** - Proper HTTP status codes for each error
✅ **Timestamp Tracking** - ISO format timestamps for all errors
✅ **Path & Method Tracking** - Request context in error responses
✅ **Consistent Response Format** - Same structure across all endpoints
✅ **Error Message Templates** - User-friendly messages with context

## Implementation

Files created:

- `resume-api/error_schemas.py` - Pydantic models for error responses
- `resume-api/error_helpers.py` - Helper functions for error creation
- `resume-api/middleware/error_handling.py` - Middleware for centralized error handling

---

**Status:** ✅ Production Ready  
**Last Updated:** February 26, 2026
