"""
Webhook API Routes.

Endpoints for managing webhooks and delivering notifications.
"""

from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from config.dependencies import AuthorizedAPIKey, limiter
from config import settings
from monitoring import logging_config

logger = logging_config.get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def rate_limit(limit_value: str):
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    return lambda f: f


class WebhookEvent(str, Enum):
    RESUME_CREATED = "resume.created"
    RESUME_UPDATED = "resume.updated"
    RESUME_DELETED = "resume.deleted"
    APPLICATION_CREATED = "application.created"
    APPLICATION_STATUS_CHANGED = "application.status_changed"
    COMMENT_ADDED = "comment.added"
    TEAM_MEMBER_ADDED = "team.member_added"


class WebhookCreate(BaseModel):
    url: str = Field(..., max_length=500)
    secret: Optional[str] = Field(None, max_length=100)
    events: List[WebhookEvent] = Field(...)
    active: bool = Field(default=True)


class WebhookUpdate(BaseModel):
    url: Optional[str] = Field(None, max_length=500)
    secret: Optional[str] = Field(None, max_length=100)
    events: Optional[List[WebhookEvent]] = Field(None)
    active: Optional[bool] = Field(None)


class WebhookResponse(BaseModel):
    id: int
    url: str
    events: List[str]
    active: bool
    created_at: str
    updated_at: str


class WebhookDeliveryResponse(BaseModel):
    id: int
    webhook_id: int
    event: str
    status: int
    duration_ms: int
    created_at: str


@router.post("", response_model=WebhookResponse, tags=["Webhooks"])
@rate_limit("10/minute")
async def create_webhook(request: Request, body: WebhookCreate, auth: AuthorizedAPIKey):
    """Create a new webhook endpoint."""
    return WebhookResponse(
        id=1,
        url=body.url,
        events=[e.value for e in body.events],
        active=body.active,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )


@router.get("", response_model=List[WebhookResponse], tags=["Webhooks"])
@rate_limit("30/minute")
async def list_webhooks(request: Request, auth: AuthorizedAPIKey):
    """List all webhooks."""
    return []


@router.get("/{webhook_id}", response_model=WebhookResponse, tags=["Webhooks"])
@rate_limit("30/minute")
async def get_webhook(request: Request, webhook_id: int, auth: AuthorizedAPIKey):
    """Get webhook details."""
    raise HTTPException(status_code=404, detail=f"Webhook {webhook_id} not found")


@router.put("/{webhook_id}", response_model=WebhookResponse, tags=["Webhooks"])
@rate_limit("10/minute")
async def update_webhook(
    request: Request, webhook_id: int, body: WebhookUpdate, auth: AuthorizedAPIKey
):
    """Update a webhook."""
    raise HTTPException(status_code=404, detail=f"Webhook {webhook_id} not found")


@router.delete("/{webhook_id}", tags=["Webhooks"])
@rate_limit("10/minute")
async def delete_webhook(request: Request, webhook_id: int, auth: AuthorizedAPIKey):
    """Delete a webhook."""
    raise HTTPException(status_code=404, detail=f"Webhook {webhook_id} not found")


@router.post("/{webhook_id}/test", tags=["Webhooks"])
@rate_limit("5/minute")
async def test_webhook(request: Request, webhook_id: int, auth: AuthorizedAPIKey):
    """Test a webhook by sending a ping event."""
    raise HTTPException(status_code=404, detail=f"Webhook {webhook_id} not found")


@router.get(
    "/{webhook_id}/deliveries",
    response_model=List[WebhookDeliveryResponse],
    tags=["Webhooks"],
)
@rate_limit("30/minute")
async def list_webhook_deliveries(
    request: Request, webhook_id: int, auth: AuthorizedAPIKey, limit: int = 50
):
    """List webhook delivery attempts."""
    raise HTTPException(status_code=404, detail=f"Webhook {webhook_id} not found")


@router.post("/{webhook_id}/deliveries/{delivery_id}/retry", tags=["Webhooks"])
@rate_limit("10/minute")
async def retry_webhook_delivery(
    request: Request, webhook_id: int, delivery_id: int, auth: AuthorizedAPIKey
):
    """Retry a failed webhook delivery."""
    raise HTTPException(status_code=404, detail=f"Delivery {delivery_id} not found")
