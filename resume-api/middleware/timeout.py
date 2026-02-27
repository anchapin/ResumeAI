"""
Request timeout middleware to prevent hanging requests.

Enforces a maximum timeout for all HTTP requests and returns
504 Gateway Timeout if exceeded.
"""

import asyncio
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_504_GATEWAY_TIMEOUT

from monitoring import logging_config

logger = logging_config.get_logger(__name__)

# Default timeout in seconds (30s)
DEFAULT_REQUEST_TIMEOUT = 30

# Endpoints that should have longer timeouts (PDF generation, etc.)
EXTENDED_TIMEOUT_ENDPOINTS = {
    "/v1/render/pdf": 60,  # PDF generation needs more time
    "/v1/tailor": 45,       # AI tailoring needs more time
}


class TimeoutMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce request timeouts."""

    def __init__(self, app, timeout_seconds: int = DEFAULT_REQUEST_TIMEOUT):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next):
        """Process request with timeout enforcement."""
        # Determine timeout for this endpoint
        timeout = self._get_timeout_for_path(request.url.path)

        # Store timeout in request state for logging
        request.state.timeout_seconds = timeout

        try:
            # Execute the request with timeout
            response = await asyncio.wait_for(
                call_next(request),
                timeout=timeout,
            )
            return response

        except asyncio.TimeoutError:
            # Log timeout error
            logger.warning(
                "request_timeout",
                path=request.url.path,
                method=request.method,
                timeout_seconds=timeout,
            )

            # Return 504 Gateway Timeout
            return JSONResponse(
                status_code=HTTP_504_GATEWAY_TIMEOUT,
                content={
                    "detail": f"Request timeout: took longer than {timeout} seconds",
                    "error_code": "REQUEST_TIMEOUT",
                    "timeout_seconds": timeout,
                },
            )

        except Exception as exc:
            # Log unexpected errors
            logger.error(
                "timeout_middleware_error",
                path=request.url.path,
                method=request.method,
                error=str(exc),
            )
            raise

    def _get_timeout_for_path(self, path: str) -> int:
        """Get the appropriate timeout for a given path."""
        # Check if path matches any extended timeout endpoints
        for endpoint_pattern, timeout in EXTENDED_TIMEOUT_ENDPOINTS.items():
            if path.startswith(endpoint_pattern):
                return timeout

        # Return default timeout
        return self.timeout_seconds
