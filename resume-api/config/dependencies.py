"""
FastAPI dependencies for API authentication.
"""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel

from . import settings


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
        return APIKeyAuthInfo(
            is_authorized=True, is_master=True, api_key=x_api_key
        )

    # Check against allowed API keys
    if settings.api_keys and x_api_key in settings.api_keys:
        return APIKeyAuthInfo(
            is_authorized=True, is_master=False, api_key=x_api_key
        )

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
