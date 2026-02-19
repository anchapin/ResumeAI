"""
Configuration dependencies and settings.

Provides authentication dependencies for both API key and JWT token-based authentication.
"""

import os
import secrets
from typing import Annotated, Optional

from fastapi import Header, HTTPException, status, Depends
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
from config.jwt_utils import verify_access_token

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
# API Key Authentication
# =============================================================================


async def get_api_key(x_api_key: str = Header(None)) -> str:
    """
    Validate API key from X-API-KEY header.

    Returns the API key if valid, or "anonymous" if authentication is disabled.
    """
    if not settings.require_api_key:
        return "anonymous"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="API key is required"
        )
    # Use secrets.compare_digest for constant-time string comparison
    # to prevent timing attacks
    if settings.master_api_key and secrets.compare_digest(
        x_api_key, settings.master_api_key
    ):
        return x_api_key

    if settings.api_keys:
        for key in settings.api_keys:
            if secrets.compare_digest(x_api_key, key):
                return x_api_key

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")


AuthorizedAPIKey = Annotated[str, Depends(get_api_key)]


# =============================================================================
# JWT Token Authentication
# =============================================================================


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    """
    Get the current authenticated user from JWT token.

    This dependency extracts the JWT token from the Authorization header,
    validates it, and returns the corresponding User object.

    Usage:
        @router.get("/protected")
        async def protected_route(current_user: User = Depends(get_current_user)):
            return {"user": current_user}

    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
        HTTPException: 404 if user not found
    """
    # Handle missing credentials
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Verify the access token
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
    """Handle rate limit exceeded errors."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Rate limit exceeded",
            "detail": str(exc.detail),
            "retry_after": 60,
        },
    )
