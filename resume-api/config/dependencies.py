"""
Configuration dependencies and settings.

Provides authentication dependencies for both API key and JWT token-based
authentication.
"""

import secrets
from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    Header,
    HTTPException,
    status,
    Depends,
    Request,
    Query,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from . import settings
from database import get_async_session, User, APIKey
from config.jwt_utils import verify_access_token
from lib.security import verify_api_key, is_hashed_key
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

# Secret key for JWT tokens - should be set in environment variables
SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes

security = HTTPBearer()


def get_request_identifier(request: Request) -> str:
    """Get identifier for rate limiting (API key or IP address)."""
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        return api_key
    return get_remote_address(request)


# Initialize rate limiter
limiter = Limiter(key_func=get_request_identifier)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors."""
    from config.errors import create_error_response, ErrorCode
    from fastapi.responses import JSONResponse

    error_response = create_error_response(
        error_code=ErrorCode.RATE_LIMITED,
        message=f"Rate limit exceeded: {exc.detail}",
        path=str(request.url.path),
        method=request.method,
    )

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=error_response.model_dump(exclude_none=True),
    )


def _check_master_api_key(x_api_key: str) -> bool:
    """Check if API key matches master API key."""
    if not settings.master_api_key:
        return False
    if is_hashed_key(settings.master_api_key):
        return verify_api_key(x_api_key, settings.master_api_key)
    return secrets.compare_digest(x_api_key, settings.master_api_key)


def _check_static_api_keys(x_api_key: str) -> bool:
    """Check if API key matches any static API key from environment."""
    if not settings.api_keys:
        return False
    for key_hash in settings.api_keys:
        if is_hashed_key(key_hash):
            if verify_api_key(x_api_key, key_hash):
                return True
        elif secrets.compare_digest(x_api_key, key_hash):
            return True
    return False


def _check_key_expiration(db_key) -> None:
    """Check if API key has expired and raise exception if so."""
    if db_key.expires_at:
        expires_at = db_key.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="API key has expired",
            )


async def _update_key_usage(db: AsyncSession, db_key) -> None:
    """Update API key usage statistics."""
    try:
        db_key.last_request_at = datetime.now(timezone.utc)
        db_key.total_requests += 1
        db_key.requests_today += 1
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.warning(f"Failed to update API key usage stats: {e}")


async def _check_database_api_keys(db: AsyncSession, x_api_key: str) -> bool:
    """Check if API key exists in database and is valid."""
    try:
        from lib.security.key_management import verify_api_key, generate_api_key_prefix
    except ImportError:
        return False

    try:
        key_prefix = generate_api_key_prefix(x_api_key)
        result = await db.execute(
            select(APIKey).where(
                APIKey.key_prefix == key_prefix,
                APIKey.is_active.is_(True),
                APIKey.is_revoked.is_(False),
            )
        )
        db_keys = result.scalars().all()

        for db_key in db_keys:
            if verify_api_key(x_api_key, db_key.key_hash):
                _check_key_expiration(db_key)
                await _update_key_usage(db, db_key)
                return True
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying API key in database: {e}")
    return False


async def get_api_key(
    request: Request,
    x_api_key: str = Header(None),
    db: AsyncSession = Depends(get_async_session),
) -> str:
    """
    Validate API key from X-API-KEY header.

    Supports:
    1. Master API key (from environment)
    2. Static API keys (from environment)
    3. User-specific API keys (from database)

    Returns the API key if valid, or "anonymous" if authentication is disabled.
    """
    if not settings.require_api_key:
        return "anonymous"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is required",
        )

    # 1. Check master API key
    if _check_master_api_key(x_api_key):
        return x_api_key

    # 2. Check static user API keys from environment
    if _check_static_api_keys(x_api_key):
        return x_api_key

    # 3. Check database for user API keys
    if await _check_database_api_keys(db, x_api_key):
        return x_api_key

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")


AuthorizedAPIKey = Annotated[str, Depends(get_api_key)]


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Get current user from JWT access token.

    Validates token and retrieves user from database.
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

        # Retrieve user from database
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()

        if user is None:
            return None

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )

        return user
    except Exception as e:
        logger.error(f"Error retrieving current user: {e}")
        return None


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_user_ws(
    token: Annotated[str, Query(..., description="JWT access token")] = None,
    db: AsyncSession = Depends(get_async_session),
) -> tuple[User, float]:
    """
    Authenticate WebSocket connection using JWT token in query parameter.

    Returns a tuple of (User, expires_at_timestamp).
    """
    if not token:
        raise HTTPException(status_code=1008, detail="Token missing")

    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=1008, detail="Invalid token")

    user_id = payload.get("sub")
    exp = payload.get("exp")

    if not user_id:
        raise HTTPException(status_code=1008, detail="Invalid payload")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=1008, detail="User not found")

    return user, float(exp)


def rate_limit(limit_value: str):
    """
    Apply rate limiting to a route.

    Args:
        limit_value: Rate limit string (e.g., "5/minute")

    Returns:
        Decorator function or identity if disabled
    """
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    else:
        # Return identity decorator (no-op)
        return lambda f: f
