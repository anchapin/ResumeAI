"""
Error Response Schemas for ResumeAI API
Defines standardized error response formats for all API endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime


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
    code: str = Field(..., description="Error code for field")


class ErrorResponse(BaseModel):
    """Standardized error response format"""

    error_code: ErrorCode = Field(..., description="Machine-readable error code")
    error_message: str = Field(..., description="Human-readable error message")
    request_id: str = Field(..., description="Unique request identifier for tracking")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

    # Optional fields for additional context
    status_code: Optional[int] = Field(None, description="HTTP status code")
    path: Optional[str] = Field(None, description="Request path")
    method: Optional[str] = Field(None, description="HTTP method")

    # Optional field for detailed validation errors
    field_errors: Optional[List[FieldError]] = Field(None, description="Field-specific errors")

    # Optional context for debugging
    debug_info: Optional[Dict[str, Any]] = Field(None, description="Debug information")


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


def get_error_message(error_code: ErrorCode, **kwargs) -> str:
    """Get error message for error code with optional formatting"""
    template = ERROR_MESSAGES.get(error_code, "An error occurred")
    if kwargs:
        try:
            return template.format(**kwargs)
        except KeyError:
            return template
    return template
