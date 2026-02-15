"""
API Key Management Routes.

Provides endpoints for:
- Creating new API keys
- Listing API keys
- Revoking API keys
- Viewing API key usage analytics
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from config.dependencies import AuthorizedAPIKey
from config import settings

router = APIRouter()


# In-memory storage for API keys (for MVP - use database in production)
# Format: {api_key: {"name": str, "created_at": datetime, "revoked": bool, "requests": int}}
_api_keys_store = {}


class APIKeyCreateRequest(BaseModel):
    """Request model for creating API key."""
    name: str
    rate_limit: Optional[str] = "100/minute"


class APIKeyCreateResponse(BaseModel):
    """Response model for created API key."""
    api_key: str
    name: str
    created_at: str
    rate_limit: str


class APIKeyInfo(BaseModel):
    """Model for API key information."""
    key_prefix: str
    name: str
    created_at: str
    last_used: Optional[str] = None
    is_revoked: bool
    request_count: int


class APIKeyListResponse(BaseModel):
    """Response model for listing API keys."""
    keys: List[APIKeyInfo]
    total: int


class APIKeyUsageResponse(BaseModel):
    """Response model for API key usage statistics."""
    key_prefix: str
    name: str
    total_requests: int
    requests_today: int
    requests_this_week: int
    avg_response_time_ms: float


def _hash_api_key(api_key: str) -> str:
    """Hash an API key for storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()


def _generate_api_key() -> str:
    """Generate a new API key."""
    return f"rai_{secrets.token_urlsafe(32)}"


def _get_key_prefix(api_key: str) -> str:
    """Get first 8 characters of API key for identification."""
    return api_key[:12]


def _record_request(api_key: str):
    """Record an API key request for analytics."""
    if api_key in _api_keys_store:
        _api_keys_store[api_key]["requests"] += 1
        _api_keys_store[api_key]["last_used"] = datetime.utcnow()


@router.post(
    "/api-keys",
    response_model=APIKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["API Keys"],
)
async def create_api_key(
    request: APIKeyCreateRequest,
    auth: AuthorizedAPIKey
):
    """
    Create a new API key.
    
    Requires master API key authentication.
    """
    # Only master key can create new API keys
    if not settings.master_api_key or auth != settings.master_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master API key can create new API keys"
        )
    
    # Generate new API key
    api_key = _generate_api_key()
    
    # Store key info
    _api_keys_store[api_key] = {
        "name": request.name,
        "created_at": datetime.utcnow(),
        "last_used": None,
        "revoked": False,
        "requests": 0,
        "rate_limit": request.rate_limit
    }
    
    return APIKeyCreateResponse(
        api_key=api_key,
        name=request.name,
        created_at=_api_keys_store[api_key]["created_at"].isoformat(),
        rate_limit=request.rate_limit
    )


@router.get(
    "/api-keys",
    response_model=APIKeyListResponse,
    tags=["API Keys"],
)
async def list_api_keys(
    auth: AuthorizedAPIKey
):
    """
    List all API keys.
    
    Returns list of API keys with their metadata (excluding the full key).
    Requires master API key authentication.
    """
    # Only master key can list API keys
    if not settings.master_api_key or auth != settings.master_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master API key can list API keys"
        )
    
    keys = []
    for api_key, info in _api_keys_store.items():
        keys.append(APIKeyInfo(
            key_prefix=_get_key_prefix(api_key),
            name=info["name"],
            created_at=info["created_at"].isoformat(),
            last_used=info["last_used"].isoformat() if info["last_used"] else None,
            is_revoked=info["revoked"],
            request_count=info["requests"]
        ))
    
    return APIKeyListResponse(
        keys=keys,
        total=len(keys)
    )


@router.delete(
    "/api-keys/{key_prefix}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["API Keys"],
)
async def revoke_api_key(
    key_prefix: str,
    auth: AuthorizedAPIKey
):
    """
    Revoke an API key.
    
    Requires master API key authentication.
    """
    # Only master key can revoke API keys
    if not settings.master_api_key or auth != settings.master_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master API key can revoke API keys"
        )
    
    # Find and revoke the key
    for api_key, info in _api_keys_store.items():
        if _get_key_prefix(api_key) == key_prefix:
            info["revoked"] = True
            return None
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"API key with prefix '{key_prefix}' not found"
    )


@router.get(
    "/api-keys/{key_prefix}/usage",
    response_model=APIKeyUsageResponse,
    tags=["API Keys"],
)
async def get_api_key_usage(
    key_prefix: str,
    auth: AuthorizedAPIKey
):
    """
    Get usage statistics for an API key.
    
    Requires master API key authentication.
    """
    # Only master key can view usage
    if not settings.master_api_key or auth != settings.master_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master API key can view usage statistics"
        )
    
    # Find the key
    for api_key, info in _api_keys_store.items():
        if _get_key_prefix(api_key) == key_prefix:
            return APIKeyUsageResponse(
                key_prefix=key_prefix,
                name=info["name"],
                total_requests=info["requests"],
                requests_today=info["requests"],  # Simplified for MVP
                requests_this_week=info["requests"],
                avg_response_time_ms=0.0  # Would need proper tracking
            )
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"API key with prefix '{key_prefix}' not found"
    )


@router.post(
    "/api-keys/verify",
    tags=["API Keys"],
)
async def verify_api_key(
    api_key: str = Query(..., description="API key to verify")
):
    """
    Verify if an API key is valid.
    
    Returns key information if valid.
    """
    if api_key in _api_keys_store:
        info = _api_keys_store[api_key]
        if not info["revoked"]:
            return {
                "valid": True,
                "name": info["name"],
                "rate_limit": info.get("rate_limit", "100/minute")
            }
    
    return {"valid": False}
