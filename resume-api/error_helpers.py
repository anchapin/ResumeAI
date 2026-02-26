"""
Error Handling Helpers for ResumeAI API
Utility functions for creating and handling standardized errors
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from .error_schemas import ErrorResponse, ErrorCode, FieldError, get_error_message


logger = logging.getLogger(__name__)


def generate_request_id() -> str:
    """Generate unique request ID for tracking"""
    return f"req_{uuid.uuid4().hex[:16]}"


def create_error_response(
    error_code: ErrorCode,
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    status_code: Optional[int] = None,
    **kwargs
) -> ErrorResponse:
    """Create standardized error response"""
    if request_id is None:
        request_id = generate_request_id()
    
    if message is None:
        message = get_error_message(error_code)
    
    return ErrorResponse(
        error_code=error_code,
        error_message=message,
        request_id=request_id,
        status_code=status_code,
        timestamp=datetime.utcnow(),
        **kwargs
    )


class APIException(Exception):
    """Base API exception"""
    
    def __init__(
        self,
        error_code: ErrorCode,
        message: Optional[str] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        request_id: Optional[str] = None,
        **kwargs
    ):
        self.error_code = error_code
        self.message = message or get_error_message(error_code)
        self.status_code = status_code
        self.request_id = request_id or generate_request_id()
        self.kwargs = kwargs
        super().__init__(self.message)


class ValidationException(APIException):
    """Validation error exception"""
    
    def __init__(
        self,
        field_errors: List[Dict[str, str]],
        message: str = "Request validation failed",
        request_id: Optional[str] = None
    ):
        self.field_errors = field_errors
        request_id = request_id or generate_request_id()
        super().__init__(
            error_code=ErrorCode.VALIDATION_ERROR,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            request_id=request_id,
            field_errors=field_errors
        )


class NotFoundException(APIException):
    """Resource not found exception"""
    
    def __init__(self, resource_type: str, resource_id: str, request_id: Optional[str] = None):
        message = f"{resource_type} with ID '{resource_id}' not found"
        super().__init__(
            error_code=ErrorCode.NOT_FOUND,
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            request_id=request_id
        )
