"""
Job Alerts API Routes

Alert management and preferences.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from lib.alerts.models import JobAlert, NotificationPreference
from config.dependencies import get_current_user, get_db
from ..database import User

router = APIRouter(prefix="/api/v1/alerts", tags=["Job Alerts"])

logger = logging.getLogger(__name__)


# Request/Response models


class AlertResponse(BaseModel):
    """Alert response."""
    id: int
    name: str
    query: Optional[str]
    remote: Optional[bool]
    location: Optional[str]
    min_salary: Optional[int]
    employment_type: Optional[str]
    experience_level: Optional[str]
    frequency: str
    is_active: bool
    last_sent_at: Optional[str]
    created_at: str


class CreateAlertRequest(BaseModel):
    """Create alert request."""
    name: str = Field(..., min_length=1, max_length=100)
    query: Optional[str] = Field(None, max_length=200)
    remote: Optional[bool] = None
    location: Optional[str] = Field(None, max_length=200)
    min_salary: Optional[int] = Field(None, ge=0)
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    frequency: str = Field(default="daily")  # instant, daily, weekly


class UpdateAlertRequest(BaseModel):
    """Update alert request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    query: Optional[str] = Field(None, max_length=200)
    remote: Optional[bool] = None
    location: Optional[str] = Field(None, max_length=200)
    min_salary: Optional[int] = Field(None, ge=0)
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


class PreferencesResponse(BaseModel):
    """Notification preferences response."""
    email_enabled: bool
    email_address: Optional[str]
    sms_enabled: bool
    phone_number: Optional[str]
    phone_country_code: str
    daily_digest: bool
    weekly_digest: bool
    instant_alerts: bool
    timezone: str


class UpdatePreferencesRequest(BaseModel):
    """Update preferences request."""
    email_enabled: Optional[bool] = None
    email_address: Optional[str] = Field(None, max_length=255)
    sms_enabled: Optional[bool] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    phone_country_code: Optional[str] = Field(None, max_length=5)
    daily_digest: Optional[bool] = None
    weekly_digest: Optional[bool] = None
    instant_alerts: Optional[bool] = None
    timezone: Optional[str] = Field(None, max_length=50)


class AlertsListResponse(BaseModel):
    """Alerts list response."""
    alerts: List[AlertResponse]
    total: int


# Endpoints


@router.get("", response_model=AlertsListResponse)
async def list_alerts(
    active_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user's job alerts.
    
    **Parameters:**
    - `active_only`: Only return active alerts
    
    **Returns:**
    - List of user's alerts
    """
    query = select(JobAlert).where(JobAlert.user_id == user.id)
    
    if active_only:
        query = query.where(JobAlert.is_active == True)
    
    query = query.order_by(JobAlert.created_at.desc())
    
    result = await db.execute(query)
    alerts = list(result.scalars().all())
    
    return AlertsListResponse(
        alerts=[
            AlertResponse(
                id=alert.id,
                name=alert.name,
                query=alert.query,
                remote=alert.remote,
                location=alert.location,
                min_salary=alert.min_salary,
                employment_type=alert.employment_type,
                experience_level=alert.experience_level,
                frequency=alert.frequency,
                is_active=alert.is_active,
                last_sent_at=alert.last_sent_at.isoformat() if alert.last_sent_at else None,
                created_at=alert.created_at.isoformat(),
            )
            for alert in alerts
        ],
        total=len(alerts),
    )


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    request: CreateAlertRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new job alert.
    
    **Request:**
    - `name`: Alert name
    - `query`: Search query
    - `remote`: Remote only
    - `location`: Location filter
    - `min_salary`: Minimum salary
    - `employment_type`: Employment type
    - `experience_level`: Experience level
    - `frequency`: Notification frequency (instant, daily, weekly)
    """
    alert = JobAlert(
        user_id=user.id,
        name=request.name,
        query=request.query,
        remote=request.remote,
        location=request.location,
        min_salary=request.min_salary,
        employment_type=request.employment_type,
        experience_level=request.experience_level,
        frequency=request.frequency,
    )
    
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    
    # Ensure user has notification preferences
    prefs_result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    )
    prefs = prefs_result.scalar_one_or_none()
    
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        await db.commit()
    
    logger.info(f"Created alert {alert.id} for user {user.id}")
    
    return AlertResponse(
        id=alert.id,
        name=alert.name,
        query=alert.query,
        remote=alert.remote,
        location=alert.location,
        min_salary=alert.min_salary,
        employment_type=alert.employment_type,
        experience_level=alert.experience_level,
        frequency=alert.frequency,
        is_active=alert.is_active,
        last_sent_at=alert.last_sent_at.isoformat() if alert.last_sent_at else None,
        created_at=alert.created_at.isoformat(),
    )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific alert.
    """
    alert = await db.get(JobAlert, alert_id)
    
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(403, "Not authorized")
    
    return AlertResponse(
        id=alert.id,
        name=alert.name,
        query=alert.query,
        remote=alert.remote,
        location=alert.location,
        min_salary=alert.min_salary,
        employment_type=alert.employment_type,
        experience_level=alert.experience_level,
        frequency=alert.frequency,
        is_active=alert.is_active,
        last_sent_at=alert.last_sent_at.isoformat() if alert.last_sent_at else None,
        created_at=alert.created_at.isoformat(),
    )


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    request: UpdateAlertRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an alert.
    """
    alert = await db.get(JobAlert, alert_id)
    
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(403, "Not authorized")
    
    # Update fields
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)
    
    await db.commit()
    await db.refresh(alert)
    
    logger.info(f"Updated alert {alert.id} for user {user.id}")
    
    return AlertResponse(
        id=alert.id,
        name=alert.name,
        query=alert.query,
        remote=alert.remote,
        location=alert.location,
        min_salary=alert.min_salary,
        employment_type=alert.employment_type,
        experience_level=alert.experience_level,
        frequency=alert.frequency,
        is_active=alert.is_active,
        last_sent_at=alert.last_sent_at.isoformat() if alert.last_sent_at else None,
        created_at=alert.created_at.isoformat(),
    )


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an alert.
    """
    alert = await db.get(JobAlert, alert_id)
    
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(403, "Not authorized")
    
    await db.delete(alert)
    await db.commit()
    
    logger.info(f"Deleted alert {alert_id} for user {user.id}")
    
    return {"success": True}


@router.post("/{alert_id}/pause")
async def pause_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Pause an alert.
    """
    alert = await db.get(JobAlert, alert_id)
    
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(403, "Not authorized")
    
    alert.is_active = False
    await db.commit()
    
    logger.info(f"Paused alert {alert_id} for user {user.id}")
    
    return {"success": True}


@router.post("/{alert_id}/resume")
async def resume_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Resume a paused alert.
    """
    alert = await db.get(JobAlert, alert_id)
    
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(403, "Not authorized")
    
    alert.is_active = True
    await db.commit()
    
    logger.info(f"Resumed alert {alert_id} for user {user.id}")
    
    return {"success": True}


@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's notification preferences.
    """
    prefs = await db.get(NotificationPreference, user.id)
    
    if not prefs:
        # Create default preferences
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    
    return PreferencesResponse(
        email_enabled=prefs.email_enabled,
        email_address=prefs.email_address or user.email,
        sms_enabled=prefs.sms_enabled,
        phone_number=prefs.phone_number,
        phone_country_code=prefs.phone_country_code,
        daily_digest=prefs.daily_digest,
        weekly_digest=prefs.weekly_digest,
        instant_alerts=prefs.instant_alerts,
        timezone=prefs.timezone,
    )


@router.put("/preferences", response_model=PreferencesResponse)
async def update_preferences(
    request: UpdatePreferencesRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user's notification preferences.
    """
    prefs = await db.get(NotificationPreference, user.id)
    
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
    
    # Update fields
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)
    
    await db.commit()
    await db.refresh(prefs)
    
    logger.info(f"Updated preferences for user {user.id}")
    
    return PreferencesResponse(
        email_enabled=prefs.email_enabled,
        email_address=prefs.email_address or user.email,
        sms_enabled=prefs.sms_enabled,
        phone_number=prefs.phone_number,
        phone_country_code=prefs.phone_country_code,
        daily_digest=prefs.daily_digest,
        weekly_digest=prefs.weekly_digest,
        instant_alerts=prefs.instant_alerts,
        timezone=prefs.timezone,
    )
