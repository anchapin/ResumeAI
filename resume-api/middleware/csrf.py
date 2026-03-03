"""
CSRF Protection Middleware for ResumeAI API

Implements CSRF token validation to protect against Cross-Site Request Forgery attacks.

CSRF tokens are generated per-session and must be included in state-changing requests.
"""

import secrets
import logging
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings

logger = logging.getLogger(__name__)

# Methods that require CSRF protection
CSRF_PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# Paths that are exempt from CSRF protection
CSRF_EXEMPT_PATHS = {
    f"{settings.api_v1_prefix}/auth/login",
    f"{settings.api_v1_prefix}/auth/register",
    f"{settings.api_v1_prefix}/auth/refresh",
    f"{settings.api_v1_prefix}/auth/logout",
    f"{settings.api_v1_prefix}/github/callback",
    f"{settings.api_v1_prefix}/linkedin/oauth/callback",
    f"{settings.api_v1_prefix}/health",
    f"{settings.api_v1_prefix}/health/detailed",
    f"{settings.api_v1_prefix}/health/oauth",
    f"{settings.api_v1_prefix}/health/ready",
}

# CSRF token header name
CSRF_HEADER_NAME = "X-CSRF-Token"


class CSRFMiddleware(BaseHTTPMiddleware):
    """Middleware for CSRF token validation"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and validate CSRF token for protected methods"""

        # Skip CSRF validation if disabled or for exempt paths
        if not settings.enable_csrf or request.url.path in CSRF_EXEMPT_PATHS:
            return await call_next(request)

        # Skip CSRF validation for safe methods
        if request.method not in CSRF_PROTECTED_METHODS:
            response = await call_next(request)
            # Generate and add CSRF token for GET requests
            if request.method == "GET" or request.method == "HEAD":
                csrf_token = self._generate_token()
                response.headers[CSRF_HEADER_NAME] = csrf_token
            return response

        # Validate CSRF token for protected methods
        csrf_token = request.headers.get(CSRF_HEADER_NAME)
        session_token = request.cookies.get("csrf_token")

        if not csrf_token or not session_token:
            logger.warning(
                f"csrf_validation_failed: missing_token at {request.url.path} ({request.method})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Please refresh and try again.",
            )

        # Validate CSRF token
        if not secrets.compare_digest(csrf_token, session_token):
            logger.warning(
                f"csrf_validation_failed: invalid_token at {request.url.path} ({request.method})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Please refresh and try again.",
            )

        # Process request
        response = await call_next(request)

        # Generate new CSRF token for the next request
        new_csrf_token = self._generate_token()
        response.headers[CSRF_HEADER_NAME] = new_csrf_token

        return response

    def _generate_token(self) -> str:
        """Generate a secure random CSRF token"""
        return secrets.token_hex(32)
