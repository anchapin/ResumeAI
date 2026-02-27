"""
Unified error handling for ResumeAI API.
Standardized error responses across all endpoints.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
from fastapi import status


class ErrorCode(str, Enum):
    """Standard error codes for API responses"""

    # Client errors (4xx)
    INVALID_REQUEST = "INVALID_REQUEST"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    MISSING_FIELD = "MISSING_FIELD"
    INVALID_FORMAT = "INVALID_FORMAT"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"

    # Resume-specific errors
    RESUME_NOT_FOUND = "RESUME_NOT_FOUND"
    RESUME_INVALID = "RESUME_INVALID"
    RESUME_LOCKED = "RESUME_LOCKED"
    RESUME_ARCHIVED = "RESUME_ARCHIVED"

    # PDF-specific errors
    PDF_GENERATION_FAILED = "PDF_GENERATION_FAILED"
    PDF_NOT_FOUND = "PDF_NOT_FOUND"
    PDF_INVALID_TEMPLATE = "PDF_INVALID_TEMPLATE"
    PDF_RENDERING_ERROR = "PDF_RENDERING_ERROR"

    # OAuth-specific errors
    OAUTH_INVALID_CODE = "OAUTH_INVALID_CODE"
    OAUTH_INVALID_STATE = "OAUTH_INVALID_STATE"
    OAUTH_SCOPE_DENIED = "OAUTH_SCOPE_DENIED"
    OAUTH_PROVIDER_ERROR = "OAUTH_PROVIDER_ERROR"
    OAUTH_TOKEN_EXPIRED = "OAUTH_TOKEN_EXPIRED"

    # Server errors (5xx)
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"


class FieldError(BaseModel):
    """Error details for a specific field"""

    field: str = Field(..., description="Field name")
    message: str = Field(..., description="Error message for field")
    code: str = Field(default="VALIDATION_ERROR", description="Error code for field")


class ErrorResponse(BaseModel):
    """Standardized API error response format"""

    error_code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    request_id: str = Field(..., description="Unique request identifier for tracking")
    timestamp: str = Field(..., description="ISO 8601 timestamp when error occurred")

    # Optional fields for additional context
    status: Optional[int] = Field(None, description="HTTP status code")
    path: Optional[str] = Field(None, description="Request path")
    method: Optional[str] = Field(None, description="HTTP method")

    # Optional field for detailed validation errors
    field_errors: Optional[list[FieldError]] = Field(
        None, description="Field-specific errors"
    )

    # Optional context for debugging
    details: Optional[Dict[str, Any]] = Field(
        None, description="Additional error details"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "error_code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "request_id": "req_a1b2c3d4e5f6g7h8",
                "timestamp": "2024-02-26T13:40:22.892Z",
                "status": 400,
                "path": "/v1/render/pdf",
                "method": "POST",
            }
        }


# Error message templates
ERROR_MESSAGES = {
    ErrorCode.INVALID_REQUEST: "Invalid request",
    ErrorCode.VALIDATION_ERROR: "Request validation failed",
    ErrorCode.MISSING_FIELD: "Missing required field: {field}",
    ErrorCode.INVALID_FORMAT: "Invalid format for field: {field}",
    ErrorCode.UNAUTHORIZED: "Authentication required",
    ErrorCode.FORBIDDEN: "Access denied",
    ErrorCode.NOT_FOUND: "Resource not found",
    ErrorCode.CONFLICT: "Resource conflict",
    ErrorCode.RATE_LIMITED: "Rate limit exceeded",
    ErrorCode.RESUME_NOT_FOUND: "Resume not found",
    ErrorCode.RESUME_INVALID: "Resume data is invalid",
    ErrorCode.RESUME_LOCKED: "Resume is locked and cannot be modified",
    ErrorCode.RESUME_ARCHIVED: "Resume is archived",
    ErrorCode.PDF_GENERATION_FAILED: "PDF generation failed",
    ErrorCode.PDF_NOT_FOUND: "PDF not found",
    ErrorCode.PDF_INVALID_TEMPLATE: "Invalid PDF template",
    ErrorCode.PDF_RENDERING_ERROR: "Error rendering PDF",
    ErrorCode.OAUTH_INVALID_CODE: "Invalid OAuth authorization code",
    ErrorCode.OAUTH_INVALID_STATE: "OAuth state mismatch",
    ErrorCode.OAUTH_SCOPE_DENIED: "OAuth scope was denied",
    ErrorCode.OAUTH_PROVIDER_ERROR: "OAuth provider error",
    ErrorCode.OAUTH_TOKEN_EXPIRED: "OAuth token has expired",
    ErrorCode.INTERNAL_SERVER_ERROR: "Internal server error",
    ErrorCode.SERVICE_UNAVAILABLE: "Service temporarily unavailable",
    ErrorCode.DATABASE_ERROR: "Database error",
    ErrorCode.EXTERNAL_SERVICE_ERROR: "External service error",
}

# HTTP status code mapping for error codes
ERROR_STATUS_CODES = {
    ErrorCode.INVALID_REQUEST: status.HTTP_400_BAD_REQUEST,
    ErrorCode.VALIDATION_ERROR: status.HTTP_400_BAD_REQUEST,
    ErrorCode.MISSING_FIELD: status.HTTP_400_BAD_REQUEST,
    ErrorCode.INVALID_FORMAT: status.HTTP_400_BAD_REQUEST,
    ErrorCode.UNAUTHORIZED: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.FORBIDDEN: status.HTTP_403_FORBIDDEN,
    ErrorCode.NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCode.CONFLICT: status.HTTP_409_CONFLICT,
    ErrorCode.RATE_LIMITED: status.HTTP_429_TOO_MANY_REQUESTS,
    ErrorCode.RESUME_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCode.RESUME_INVALID: status.HTTP_400_BAD_REQUEST,
    ErrorCode.RESUME_LOCKED: status.HTTP_409_CONFLICT,
    ErrorCode.RESUME_ARCHIVED: status.HTTP_410_GONE,
    ErrorCode.PDF_GENERATION_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.PDF_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCode.PDF_INVALID_TEMPLATE: status.HTTP_400_BAD_REQUEST,
    ErrorCode.PDF_RENDERING_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.OAUTH_INVALID_CODE: status.HTTP_400_BAD_REQUEST,
    ErrorCode.OAUTH_INVALID_STATE: status.HTTP_400_BAD_REQUEST,
    ErrorCode.OAUTH_SCOPE_DENIED: status.HTTP_403_FORBIDDEN,
    ErrorCode.OAUTH_PROVIDER_ERROR: status.HTTP_502_BAD_GATEWAY,
    ErrorCode.OAUTH_TOKEN_EXPIRED: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.INTERNAL_SERVER_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.SERVICE_UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
    ErrorCode.DATABASE_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.EXTERNAL_SERVICE_ERROR: status.HTTP_502_BAD_GATEWAY,
}


def generate_request_id() -> str:
    """Generate unique request ID for tracking"""
    return f"req_{uuid.uuid4().hex[:16]}"


def get_error_message(error_code: ErrorCode, **kwargs) -> str:
    """Get error message for error code with optional formatting"""
    template = ERROR_MESSAGES.get(error_code, "An error occurred")
    if kwargs:
        try:
            return template.format(**kwargs)
        except (KeyError, TypeError):
            return template
    return template


def get_status_code(error_code: ErrorCode) -> int:
    """Get HTTP status code for error code"""
    return ERROR_STATUS_CODES.get(error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


def create_error_response(
    error_code: ErrorCode,
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    path: Optional[str] = None,
    method: Optional[str] = None,
    field_errors: Optional[list[FieldError]] = None,
    details: Optional[Dict[str, Any]] = None,
    **kwargs,
) -> ErrorResponse:
    """
    Factory function for creating standardized error responses

    Args:
        error_code: Standard error code
        message: Override the default message
        request_id: Unique request ID (auto-generated if not provided)
        path: Request path
        method: HTTP method
        field_errors: List of field-specific errors
        details: Additional error details
        **kwargs: Extra formatting kwargs for message template

    Returns:
        ErrorResponse object
    """
    if request_id is None:
        request_id = generate_request_id()

    if message is None:
        message = get_error_message(error_code, **kwargs)

    return ErrorResponse(
        error_code=error_code.value,
        message=message,
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat() + "Z",
        status=get_status_code(error_code),
        path=path,
        method=method,
        field_errors=field_errors,
        details=details,
    )
