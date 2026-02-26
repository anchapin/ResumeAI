from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class APIError(BaseModel):
    """Standardized API error response format"""
    error_code: str
    error_message: str
    request_id: str
    http_status: int
    timestamp: str
    path: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "error_code": "ERR_AUTH_MISSING_KEY",
                "error_message": "API key is required",
                "request_id": "req_abc123def456",
                "http_status": 401,
                "timestamp": "2024-02-26T13:40:22.892Z",
                "path": "/v1/render/pdf"
            }
        }

# Standard error codes
ERROR_CODES = {
    "ERR_AUTH_MISSING_KEY": ("API key is required", 401),
    "ERR_AUTH_INVALID_KEY": ("Invalid API key", 401),
    "ERR_RATE_LIMIT_EXCEEDED": ("Rate limit exceeded", 429),
    "ERR_VALIDATION_FAILED": ("Validation failed", 400),
    "ERR_NOT_FOUND": ("Resource not found", 404),
    "ERR_SERVER_ERROR": ("Internal server error", 500),
    "ERR_TIMEOUT": ("Request timeout", 504),
}

def create_error_response(
    error_code: str,
    request_id: Optional[str] = None,
    path: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> APIError:
    """Factory function for creating standardized error responses"""
    if error_code not in ERROR_CODES:
        error_message = "Unknown error"
        http_status = 500
    else:
        error_message, http_status = ERROR_CODES[error_code]

    if request_id is None:
        request_id = f"req_{uuid.uuid4().hex[:16]}"

    return APIError(
        error_code=error_code,
        error_message=error_message,
        request_id=request_id,
        http_status=http_status,
        timestamp=datetime.utcnow().isoformat() + "Z",
        path=path,
        details=details
    )
