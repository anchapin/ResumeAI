"""
API Key Management Routes.

Provides endpoints for:
- Creating new API keys
- Listing API keys
- Revoking API keys
- Viewing API key usage analytics

All endpoints require JWT authentication and are user-specific.
"""

import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

from fastapi import APIRouter, HTTPException, Query, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_session, APIKey
from config.dependencies import CurrentUser
from monitoring import logging_config
from lib.security.key_management import hash_api_key

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/api/v1/api-keys", tags=["API Keys"])


class APIKeyCreateRequest(BaseModel):
    """Request model for creating API key."""

    name: str = Field(
        ..., min_length=1, max_length=100, description="Name for the API key"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Optional description"
    )
    rate_limit: Optional[str] = Field(
        "100/minute", description="Rate limit (e.g., '100/minute')"
    )
    rate_limit_daily: Optional[int] = Field(
        1000, ge=10, le=100000, description="Daily request limit"
    )
    expires_in_days: Optional[int] = Field(
        None, ge=1, le=365, description="Days until expiration"
    )


class APIKeyCreateResponse(BaseModel):
    """Response model for created API key."""

    id: int
    api_key: str  # Only returned once at creation
    name: str
    key_prefix: str
    created_at: str
    rate_limit: str
    rate_limit_daily: int
    expires_at: Optional[str] = None


class APIKeyInfo(BaseModel):
    """Model for API key information (without the actual key)."""

    id: int
    key_prefix: str
    name: str
    description: Optional[str] = None
    created_at: str
    last_used: Optional[str] = None
    is_active: bool
    is_revoked: bool
    request_count: int
    rate_limit: str
    rate_limit_daily: int
    expires_at: Optional[str] = None


class APIKeyListResponse(BaseModel):
    """Response model for listing API keys."""

    keys: List[APIKeyInfo]
    total: int


class APIKeyUsageResponse(BaseModel):
    """Response model for API key usage statistics."""

    id: int
    key_prefix: str
    name: str
    total_requests: int
    requests_today: int
    avg_response_time_ms: float = 0.0
    last_used: Optional[str] = None


class APIKeyUpdateRequest(BaseModel):
    """Request model for updating API key settings."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    rate_limit: Optional[str] = None
    rate_limit_daily: Optional[int] = Field(None, ge=10, le=100000)
    is_active: Optional[bool] = None


def _generate_api_key() -> str:
    """Generate a new API key with prefix."""
    return f"rai_{secrets.token_urlsafe(32)}"


def _get_key_prefix(api_key: str) -> str:
    """Get first 12 characters of API key for identification."""
    return api_key[:12]


@router.post(
    "",
    response_model=APIKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new API key",
    responses={
        201: {
            "model": APIKeyCreateResponse,
            "description": "API key created successfully",
        },
        400: {"description": "Invalid input data"},
        401: {"description": "Not authenticated"},
    },
)
async def create_api_key(
    request: APIKeyCreateRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Create a new API key for the authenticated user.

    The API key is returned only once at creation time. Store it securely
    as it cannot be retrieved later.

    **Rate limits:**
    - `rate_limit`: Requests per minute (e.g., "100/minute")
    - `rate_limit_daily`: Maximum requests per day

    **Expiration:**
    - Optional expiration in days (1-365)
    - If not set, the key does not expire
    """
    # Generate new API key
    api_key = _generate_api_key()
    key_hash = hash_api_key(api_key)
    key_prefix = _get_key_prefix(api_key)

    # Calculate expiration date if specified
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=request.expires_in_days
        )

    # Create API key record
    new_key = APIKey(
        user_id=current_user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=request.name,
        description=request.description,
        rate_limit=request.rate_limit or "100/minute",
        rate_limit_daily=request.rate_limit_daily or 1000,
        expires_at=expires_at,
        is_active=True,
        is_revoked=False,
    )

    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    logger.info(
        "api_key_created",
        user_id=current_user.id,
        key_id=new_key.id,
        key_prefix=key_prefix,
    )

    return APIKeyCreateResponse(
        id=new_key.id,
        api_key=api_key,  # Only returned once
        name=new_key.name,
        key_prefix=new_key.key_prefix,
        created_at=new_key.created_at.isoformat(),
        rate_limit=new_key.rate_limit,
        rate_limit_daily=new_key.rate_limit_daily,
        expires_at=expires_at.isoformat() if expires_at else None,
    )


@router.get(
    "",
    response_model=APIKeyListResponse,
    summary="List API keys",
    responses={
        200: {"model": APIKeyListResponse, "description": "List of API keys"},
        401: {"description": "Not authenticated"},
    },
)
async def list_api_keys(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    List all API keys for the authenticated user.

    Returns metadata about each key (name, prefix, usage stats) but NOT
    the actual key value. Keys are only shown once at creation time.
    """
    # Query user's API keys
    result = await db.execute(
        select(APIKey)
        .where(APIKey.user_id == current_user.id)
        .order_by(APIKey.created_at.desc())
    )
    keys = result.scalars().all()

    # Convert to response format
    keys_list = []
    for key in keys:
        keys_list.append(
            APIKeyInfo(
                id=key.id,
                key_prefix=key.key_prefix,
                name=key.name,
                description=key.description,
                created_at=key.created_at.isoformat(),
                last_used=(
                    key.last_request_at.isoformat() if key.last_request_at else None
                ),
                is_active=key.is_active,
                is_revoked=key.is_revoked,
                request_count=key.total_requests,
                rate_limit=key.rate_limit,
                rate_limit_daily=key.rate_limit_daily,
                expires_at=key.expires_at.isoformat() if key.expires_at else None,
            )
        )

    return APIKeyListResponse(keys=keys_list, total=len(keys_list))


@router.get(
    "/{key_id}",
    response_model=APIKeyInfo,
    summary="Get API key details",
    responses={
        200: {"model": APIKeyInfo, "description": "API key details"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def get_api_key(
    key_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Get details for a specific API key.

    Returns metadata about the key but NOT the actual key value.
    """
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == current_user.id,
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    return APIKeyInfo(
        id=key.id,
        key_prefix=key.key_prefix,
        name=key.name,
        description=key.description,
        created_at=key.created_at.isoformat(),
        last_used=key.last_request_at.isoformat() if key.last_request_at else None,
        is_active=key.is_active,
        is_revoked=key.is_revoked,
        request_count=key.total_requests,
        rate_limit=key.rate_limit,
        rate_limit_daily=key.rate_limit_daily,
        expires_at=key.expires_at.isoformat() if key.expires_at else None,
    )


@router.put(
    "/{key_id}",
    response_model=APIKeyInfo,
    summary="Update API key settings",
    responses={
        200: {"model": APIKeyInfo, "description": "API key updated"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def update_api_key(
    key_id: int,
    update_data: APIKeyUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Update settings for an API key.

    You can update the name, description, rate limits, and active status.
    Cannot update the actual key value or prefix.
    """
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == current_user.id,
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if value is not None:
            setattr(key, field, value)

    await db.commit()
    await db.refresh(key)

    logger.info(
        "api_key_updated",
        user_id=current_user.id,
        key_id=key.id,
        fields_updated=list(update_dict.keys()),
    )

    return APIKeyInfo(
        id=key.id,
        key_prefix=key.key_prefix,
        name=key.name,
        description=key.description,
        created_at=key.created_at.isoformat(),
        last_used=key.last_request_at.isoformat() if key.last_request_at else None,
        is_active=key.is_active,
        is_revoked=key.is_revoked,
        request_count=key.total_requests,
        rate_limit=key.rate_limit,
        rate_limit_daily=key.rate_limit_daily,
        expires_at=key.expires_at.isoformat() if key.expires_at else None,
    )


@router.delete(
    "/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke API key",
    responses={
        204: {"description": "API key revoked successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def revoke_api_key(
    key_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Revoke (delete) an API key.

    This action is irreversible. The key will no longer work for API access.
    """
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == current_user.id,
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    # Mark as revoked
    key.is_revoked = True
    key.is_active = False
    key.revoked_at = datetime.now(timezone.utc)

    await db.commit()

    logger.info(
        "api_key_revoked",
        user_id=current_user.id,
        key_id=key.id,
        key_prefix=key.key_prefix,
    )

    return None


@router.get(
    "/{key_id}/usage",
    response_model=APIKeyUsageResponse,
    summary="Get API key usage statistics",
    responses={
        200: {"model": APIKeyUsageResponse, "description": "Usage statistics"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def get_api_key_usage(
    key_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Get usage statistics for an API key.

    Returns request counts and basic analytics.
    """
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == current_user.id,
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    return APIKeyUsageResponse(
        id=key.id,
        key_prefix=key.key_prefix,
        name=key.name,
        total_requests=key.total_requests,
        requests_today=key.requests_today,
        avg_response_time_ms=0.0,  # Would need proper tracking
        last_used=key.last_request_at.isoformat() if key.last_request_at else None,
    )


@router.post(
    "/verify",
    summary="Verify API key",
    responses={
        200: {"description": "Verification result"},
    },
)
async def verify_api_key(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    api_key: str = Query(..., description="API key to verify"),
):
    """
    Verify if an API key is valid and active.

    Returns key information if valid.
    """
    key_hash = hash_api_key(api_key)

    result = await db.execute(
        select(APIKey).where(
            APIKey.key_hash == key_hash,
            APIKey.is_active.is_(True),
            APIKey.is_revoked.is_(False),
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        return {"valid": False, "error": "Invalid or inactive API key"}

    # Check expiration
    if key.expires_at and key.expires_at < datetime.now(timezone.utc):
        return {"valid": False, "error": "API key has expired"}

    return {
        "valid": True,
        "key_prefix": key.key_prefix,
        "name": key.name,
        "rate_limit": key.rate_limit,
        "rate_limit_daily": key.rate_limit_daily,
    }
