"""
FastAPI dependencies for API authentication and rate limiting.
"""

import logging
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from . import settings

# Configure logging
logger = logging.getLogger(__name__)


def get_api_key_identifier(request: Request) -> str:
    """
    Get a unique identifier for rate limiting based on API key.

    Rate limiting is done per API key, not per IP address.

    Args:
        request: FastAPI request object

    Returns:
        API key as identifier, or remote address if no API key
    """
    # Try to get API key from header
    api_key = request.headers.get("X-API-KEY")

    # If API key exists and auth is required, use it for rate limiting
    if api_key and settings.require_api_key:
        return f"apikey:{api_key}"

    # Otherwise, fall back to IP address
    return f"ip:{get_remote_address(request)}"


# Initialize rate limiter
# Uses API key as identifier when available, otherwise falls back to IP
limiter = Limiter(key_func=get_api_key_identifier, default_limits=["200/minute"])


class APIKeyAuthInfo(BaseModel):
    """API key authentication information."""

    is_authorized: bool
    is_master: bool = False
    api_key: str | None = None


async def verify_api_key(
    x_api_key: Annotated[str | None, Header()] = None,
) -> APIKeyAuthInfo:
    """
    Verify the API key from X-API-KEY header.

    Args:
        x_api_key: API key from X-API-KEY header

    Returns:
        APIKeyAuthInfo with authorization status

    Raises:
        HTTPException: If API key is invalid or missing
    """
    # Skip auth if disabled
    if not settings.require_api_key:
        return APIKeyAuthInfo(is_authorized=True, is_master=False, api_key=None)

    # Check for missing API key
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key missing. Please provide X-API-KEY header.",
        )

    # Check master key first
    if settings.master_api_key and x_api_key == settings.master_api_key:
        return APIKeyAuthInfo(is_authorized=True, is_master=True, api_key=x_api_key)

    # Check against allowed API keys
    if settings.api_keys and x_api_key in settings.api_keys:
        return APIKeyAuthInfo(is_authorized=True, is_master=False, api_key=x_api_key)

    # Invalid key
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid API key. Access denied.",
    )


# Type alias for dependency injection
AuthorizedAPIKey = Annotated[APIKeyAuthInfo, Depends(verify_api_key)]


async def require_master_key(auth: AuthorizedAPIKey) -> APIKeyAuthInfo:
    """
    Require master API key for privileged operations.

    Args:
        auth: API key authentication info from verify_api_key

    Returns:
        APIKeyAuthInfo if master key

    Raises:
        HTTPException: If not using master key
    """
    if not auth.is_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Master API key required for this operation.",
        )
    return auth


# Type alias for master key dependency
MasterAPIKey = Annotated[APIKeyAuthInfo, Depends(require_master_key)]


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Handle rate limit exceeded errors.

    Logs violation and returns a proper HTTP response.

    Args:
        request: FastAPI request object
        exc: RateLimitExceeded exception

    Returns:
        JSON response with 429 status code
    """
    from fastapi.responses import JSONResponse

    # Log the rate limit violation
    identifier = get_api_key_identifier(request)
    logger.warning(
        f"Rate limit exceeded for {identifier} on {request.url.path}: " f"{exc.detail}"
    )

    # Extract limit info from the exception
    # The detail attribute contains information about the limit that was exceeded
    detail_str = str(exc.detail)

    # Return JSON response with 429 status
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": detail_str},
        headers={"Retry-After": "60"},
    )
