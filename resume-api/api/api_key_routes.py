"""
API Key Management Routes.

Provides endpoints for:
- Creating new API keys
- Listing API keys
- Revoking API keys
- Viewing API key usage analytics
- API key rotation (manual and automatic)

All endpoints require JWT authentication and are user-specific.
"""

import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

from fastapi import APIRouter, HTTPException, Query, status, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_session, APIKey
from config.dependencies import CurrentUser
from monitoring import logging_config
from lib.security.key_management import hash_api_key
from lib.security.key_rotation import create_rotation_service

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


class APIKeyCreateRequest(BaseModel):
    """Request model for creating API key."""

    name: str = Field(..., min_length=1, max_length=100, description="Name for the API key")
    description: Optional[str] = Field(None, max_length=500, description="Optional description")
    rate_limit: Optional[str] = Field("100/minute", description="Rate limit (e.g., '100/minute')")
    rate_limit_daily: Optional[int] = Field(
        1000, ge=10, le=100000, description="Daily request limit"
    )
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Days until expiration")
    rotation_enabled: Optional[bool] = Field(False, description="Enable automatic key rotation")
    rotation_period_days: Optional[int] = Field(
        90, ge=1, le=365, description="Days between automatic rotations"
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
    rotation_enabled: bool = False
    rotation_period_days: Optional[int] = None
    next_rotation_at: Optional[str] = None


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
    rotation_enabled: bool = False
    rotation_period_days: Optional[int] = None
    next_rotation_at: Optional[str] = None
    is_rotating: bool = False


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
    rotation_enabled: Optional[bool] = None
    rotation_period_days: Optional[int] = Field(None, ge=1, le=365)


class APIKeyRotationRequest(BaseModel):
    """Request model for rotating an API key."""

    dual_key_period_days: Optional[int] = Field(
        7, ge=0, le=30, description="Days to keep old key active (0 to disable dual key period)"
    )


class APIKeyRotationResponse(BaseModel):
    """Response model for API key rotation."""

    new_key_id: int
    new_api_key: str  # Only returned once at rotation time
    new_key_prefix: str
    created_at: str
    rotation_status: dict


class APIKeyRotationStatus(BaseModel):
    """Model for API key rotation status."""

    rotation_enabled: bool
    rotation_period_days: Optional[int]
    next_rotation_at: Optional[str]
    is_rotating: bool
    has_previous_key: bool
    rotated_at: Optional[str]


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

    **Key Rotation:**
    - `rotation_enabled`: Enable automatic key rotation
    - `rotation_period_days`: Days between automatic rotations (default 90)
    """
    # Generate new API key
    api_key = _generate_api_key()
    key_hash = hash_api_key(api_key)
    key_prefix = _get_key_prefix(api_key)

    # Calculate expiration date if specified
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_in_days)

    # Calculate next rotation date if rotation enabled
    next_rotation_at = None
    if request.rotation_enabled and request.rotation_period_days:
        next_rotation_at = datetime.now(timezone.utc) + timedelta(days=request.rotation_period_days)

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
        rotation_enabled=request.rotation_enabled or False,
        rotation_period_days=request.rotation_period_days,
        next_rotation_at=next_rotation_at,
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
        rotation_enabled=new_key.rotation_enabled,
        rotation_period_days=new_key.rotation_period_days,
        next_rotation_at=next_rotation_at.isoformat() if next_rotation_at else None,
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
        select(APIKey).where(APIKey.user_id == current_user.id).order_by(APIKey.created_at.desc())
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
                last_used=(key.last_request_at.isoformat() if key.last_request_at else None),
                is_active=key.is_active,
                is_revoked=key.is_revoked,
                request_count=key.total_requests,
                rate_limit=key.rate_limit,
                rate_limit_daily=key.rate_limit_daily,
                expires_at=key.expires_at.isoformat() if key.expires_at else None,
                rotation_enabled=key.rotation_enabled,
                rotation_period_days=key.rotation_period_days,
                next_rotation_at=key.next_rotation_at.isoformat() if key.next_rotation_at else None,
                is_rotating=key.is_rotating,
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
        rotation_enabled=key.rotation_enabled,
        rotation_period_days=key.rotation_period_days,
        next_rotation_at=key.next_rotation_at.isoformat() if key.next_rotation_at else None,
        is_rotating=key.is_rotating,
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

    Supports verification during dual key period (both old and new keys work).
    """
    rotation_service = create_rotation_service(db)

    # Use the rotation service to verify (supports dual key period)
    key, is_dual_key = await rotation_service.verify_key_with_rotation(api_key)

    if not key:
        return {"valid": False, "error": "Invalid or inactive API key"}

    return {
        "valid": True,
        "key_prefix": key.key_prefix,
        "name": key.name,
        "rate_limit": key.rate_limit,
        "rate_limit_daily": key.rate_limit_daily,
        "is_dual_key_period": is_dual_key,
    }


# ============== API Key Rotation Endpoints ==============


@router.post(
    "/{key_id}/rotate",
    response_model=APIKeyRotationResponse,
    summary="Rotate API key",
    responses={
        200: {"model": APIKeyRotationResponse, "description": "Key rotated successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def rotate_api_key(
    key_id: int,
    request: APIKeyRotationRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    http_request: Request,
):
    """
    Rotate an API key.

    Creates a new API key and optionally keeps the old key active for a
    configurable period (dual key period) to allow gradual rollover.

    The new API key is returned only once at rotation time. Store it securely
    as it cannot be retrieved later.
    """
    rotation_service = create_rotation_service(db)

    # Get client info for audit logging
    client_ip = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")

    new_key, new_api_key = await rotation_service.rotate_key(
        key_id=key_id,
        user_id=current_user.id,
        dual_key_period_days=request.dual_key_period_days or 7,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    if not new_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found or cannot be rotated",
        )

    # Get rotation status for response
    rotation_status = await rotation_service.get_rotation_status(
        key_id=new_key.id,
        user_id=current_user.id,
    )

    return APIKeyRotationResponse(
        new_key_id=new_key.id,
        new_api_key=new_api_key,
        new_key_prefix=new_key.key_prefix,
        created_at=new_key.created_at.isoformat(),
        rotation_status=rotation_status,
    )


@router.get(
    "/{key_id}/rotation-status",
    response_model=APIKeyRotationStatus,
    summary="Get API key rotation status",
    responses={
        200: {"model": APIKeyRotationStatus, "description": "Rotation status"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def get_rotation_status(
    key_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """Get rotation status for an API key."""
    rotation_service = create_rotation_service(db)

    status = await rotation_service.get_rotation_status(
        key_id=key_id,
        user_id=current_user.id,
    )

    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    return APIKeyRotationStatus(**status)


@router.post(
    "/{key_id}/rotation/enable",
    response_model=APIKeyInfo,
    summary="Enable automatic key rotation",
    responses={
        200: {"model": APIKeyInfo, "description": "Rotation enabled"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def enable_rotation(
    key_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    http_request: Request,
    rotation_period_days: int = Query(90, ge=1, le=365, description="Days between rotations"),
):
    """Enable automatic rotation for an API key."""
    rotation_service = create_rotation_service(db)

    # Get client info for audit logging
    client_ip = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")

    key = await rotation_service.enable_rotation(
        key_id=key_id,
        user_id=current_user.id,
        rotation_period_days=rotation_period_days,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found or cannot be rotated",
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
        rotation_enabled=key.rotation_enabled,
        rotation_period_days=key.rotation_period_days,
        next_rotation_at=key.next_rotation_at.isoformat() if key.next_rotation_at else None,
        is_rotating=key.is_rotating,
    )


@router.post(
    "/{key_id}/rotation/disable",
    response_model=APIKeyInfo,
    summary="Disable automatic key rotation",
    responses={
        200: {"model": APIKeyInfo, "description": "Rotation disabled"},
        401: {"description": "Not authenticated"},
        404: {"description": "API key not found"},
    },
)
async def disable_rotation(
    key_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    http_request: Request,
):
    """Disable automatic rotation for an API key."""
    rotation_service = create_rotation_service(db)

    # Get client info for audit logging
    client_ip = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")

    key = await rotation_service.disable_rotation(
        key_id=key_id,
        user_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )

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
        rotation_enabled=key.rotation_enabled,
        rotation_period_days=key.rotation_period_days,
        next_rotation_at=key.next_rotation_at.isoformat() if key.next_rotation_at else None,
        is_rotating=key.is_rotating,
    )


# Admin endpoints for automated rotation


@router.post(
    "/admin/rotate-all",
    summary="Trigger automatic rotation for all eligible keys",
    responses={
        200: {"description": "Rotation completed"},
        401: {"description": "Not authenticated"},
    },
)
async def trigger_automatic_rotation(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """Admin endpoint to trigger automatic rotation for all keys that need it.

    This should be called periodically (e.g., via cron job).
    """
    # Check if user is admin
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    rotation_service = create_rotation_service(db)
    results = await rotation_service.process_automatic_rotation()

    return {
        "status": "completed",
        "keys_rotated": results["keys_rotated"],
        "dual_keys_completed": results["dual_keys_completed"],
        "notifications_sent": results["notifications_sent"],
        "errors": results["errors"],
    }
