"""
Configuration dependencies and settings.

Provides authentication dependencies for both API key and JWT token-based
authentication.
"""

import os
import secrets
from typing import Annotated, Optional

from fastapi import (
    Header,
    HTTPException,
    status,
    Depends,
    Query,
    WebSocketException,
)
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from . import settings
from database import get_async_session, User
from lib.utils.cache import get_cache_manager
from config.jwt_utils import verify_access_token
from lib.security import verify_api_key, is_hashed_key

# Secret key for JWT tokens - should be set in environment variables
SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resumeai.db")

# Other configurations
DEBUG = settings.debug

# Application settings
APP_NAME = settings.app_name
APP_VERSION = settings.app_version

# Security scheme for JWT authentication
security = HTTPBearer(auto_error=False)


def get_request_identifier(request):
    """Get identifier for rate limiting."""
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        return api_key
    return get_remote_address(request)


limiter = Limiter(key_func=get_request_identifier)


# =============================================================================
# WebSocket Authentication
# =============================================================================


async def get_current_user_ws(
    token: Annotated[str, Query(..., description="JWT access token")] = None,
    db: AsyncSession = Depends(get_async_session),
) -> tuple[User, float]:
    """
    Authenticate WebSocket connection using JWT token in query parameter.

    Returns:
        Tuple of (User object, expiration timestamp)

    Raises WebSocketException with code 1008 (Policy Violation) if
    authentication fails.
    """
    if not token:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Authentication required: missing token",
        )

    try:
        payload = verify_access_token(token)
        if payload is None:
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication failed: invalid token",
            )

        user_id = payload.get("sub")
        expires_at = payload.get("exp")
        if user_id is None:
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication failed: invalid token payload",
            )

        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()

        if user is None:
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication failed: user not found",
            )

        if not user.is_active:
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication failed: account disabled",
            )

        return user, float(expires_at)

    except WebSocketException:
        raise
    except Exception:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Authentication failed: server error",
        )


# =============================================================================
# API Key Authentication
# =============================================================================


async def get_api_key(x_api_key: str = Header(None)) -> str:
    """
    Validate API key from X-API-KEY header.

    Supports both plaintext and hashed API key verification. If keys are hashed
    (start with $2b$, $2a$, or $2y$), uses bcrypt verification. Otherwise,
    uses constant-time string comparison for backward compatibility.

    Returns the API key if valid, or "anonymous" if authentication is disabled.
    """
    if not settings.require_api_key:
        return "anonymous"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is required",
        )

    # Check master API key (plaintext comparison)
    if settings.master_api_key:
        if is_hashed_key(settings.master_api_key):
            # Master key is hashed
            if verify_api_key(x_api_key, settings.master_api_key):
                return x_api_key
        else:
            # Master key is plaintext (backward compatibility)
            if secrets.compare_digest(x_api_key, settings.master_api_key):
                return x_api_key

    # Check user API keys
    if settings.api_keys:
        for key_hash in settings.api_keys:
            if is_hashed_key(key_hash):
                # Key is hashed - use bcrypt verification
                if verify_api_key(x_api_key, key_hash):
                    return x_api_key
            else:
                # Key is plaintext (backward compatibility)
                if secrets.compare_digest(x_api_key, key_hash):
                    return x_api_key

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")


AuthorizedAPIKey = Annotated[str, Depends(get_api_key)]


# =============================================================================
# JWT Token Authentication
# =============================================================================


async def get_current_user(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    """
    Get current authenticated user from JWT token.

    This dependency extracts JWT token from Authorization header or httpOnly cookie,
    validates it, and returns corresponding User object.

    **Priority:**
    1. Authorization header (Bearer token)
    2. access_token cookie (httpOnly cookie for XSS protection)

    Usage:
        @router.get("/protected")
        async def protected_route(
            current_user: User = Depends(get_current_user)
        ):
            return {"user": current_user}

    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
        HTTPException: 404 if user not found
    """
    token = None

    # Try to get token from Authorization header first
    if credentials is not None:
        token = credentials.credentials
    else:
        # Fallback to httpOnly cookie
        token = request.cookies.get("access_token")

    # Handle missing token
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify access token
    payload = verify_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check cache first
    cache_mgr = get_cache_manager()
    cache_key = cache_mgr.generate_key("user:profile", user_id=user_id)
    cached_user = await cache_mgr.get(cache_key)
    if cached_user:
        # Convert cached dict back to User object (if needed)
        # For SQLAlchemy objects, it's better to return a dict or a Pydantic model
        # But this dependency returns User. We'll handle it by caching the user info
        # and letting the caller use it. 
        # Actually, returning a detached User object can be tricky.
        # I'll just cache the database query result.
        pass

    # Get user from database
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


# Type alias for authenticated user dependency
CurrentUser = Annotated[User, Depends(get_current_user)]


# =============================================================================
# Optional JWT Authentication
# =============================================================================


async def get_current_user_optional(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> Optional[User]:
    """
    Get the current user if authenticated, otherwise return None.

    This is useful for endpoints that work for both authenticated and
    anonymous users, but provide additional features for authenticated users.
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        payload = verify_access_token(token)

        if payload is None:
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()

        if user and user.is_active:
            return user

    except Exception:
        pass

    return None


CurrentUserOptional = Annotated[Optional[User], Depends(get_current_user_optional)]


# =============================================================================
# Rate Limit Handler
# =============================================================================


async def rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """Handle rate limit exceeded errors with unified error response."""
    from config.errors import create_error_response, ErrorCode

    error_response = create_error_response(
        error_code=ErrorCode.RATE_LIMITED,
        message="Rate limit exceeded. Please retry after a short delay.",
        path=str(request.url.path),
        method=request.method,
        details={"retry_after_seconds": 60},
    )

    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=error_response.model_dump(exclude_none=True),
    )
    response.headers["Retry-After"] = "60"
    return response


# =============================================================================
# Rate Limit Decorator
# =============================================================================


def rate_limit(limit_value: str):
    """
    Decorator that applies rate limiting only when enabled.

    Args:
        limit_value: Rate limit string (e.g., "10/minute")

    Returns:
        Decorator function or identity if disabled
    """
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    else:
        # Return identity decorator (no-op)
        return lambda f: f
