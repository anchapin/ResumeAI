"""
Error Handling Middleware for ResumeAI API
Centralized error handling and request tracking with unified error responses
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from ..config.errors import (
    ErrorCode,
    create_error_response,
    generate_request_id,
    get_status_code,
)

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for centralized error handling with unified error responses"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", generate_request_id())
        request.state.request_id = request_id
        request.state.start_time = time.time()

        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response

        except HTTPException as exc:
            # Convert FastAPI HTTPException to unified error response
            error_code = self._map_status_to_error_code(exc.status_code)
            error_response = create_error_response(
                error_code=error_code,
                message=(
                    exc.detail if isinstance(exc.detail, str) else "An error occurred"
                ),
                request_id=request_id,
                path=str(request.url.path),
                method=request.method,
            )

            return JSONResponse(
                status_code=exc.status_code,
                content=error_response.model_dump(exclude_none=True),
                headers={"X-Request-ID": request_id},
            )

        except Exception as exc:
            # Handle unexpected exceptions
            error_response = create_error_response(
                error_code=ErrorCode.INTERNAL_SERVER_ERROR,
                request_id=request_id,
                path=str(request.url.path),
                method=request.method,
                details={"error_type": type(exc).__name__},
            )

            logger.exception(
                "Unhandled exception",
                extra={
                    "request_id": request_id,
                    "path": str(request.url.path),
                    "method": request.method,
                    "error": str(exc),
                },
            )

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=error_response.model_dump(exclude_none=True),
                headers={"X-Request-ID": request_id},
            )

    def _map_status_to_error_code(self, status_code: int) -> ErrorCode:
        """Map HTTP status code to error code"""
        mapping = {
            400: ErrorCode.VALIDATION_ERROR,
            401: ErrorCode.UNAUTHORIZED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.NOT_FOUND,
            409: ErrorCode.CONFLICT,
            429: ErrorCode.RATE_LIMITED,
            500: ErrorCode.INTERNAL_SERVER_ERROR,
            503: ErrorCode.SERVICE_UNAVAILABLE,
        }
        return mapping.get(status_code, ErrorCode.INTERNAL_SERVER_ERROR)
