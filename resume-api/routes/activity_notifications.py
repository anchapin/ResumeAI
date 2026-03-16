"""
Activity Feed and Notifications API endpoints.

Provides endpoints for:
- Team activity feed
- User notifications
- Notification preferences
- Mark notifications as read
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, update

from database import get_async_session, Team, TeamMember, TeamActivity, Notification, User
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1", tags=["Activity & Notifications"])


# ============== Pydantic Models ==============


class ActivityResponse(BaseModel):
    """Activity feed item response."""

    id: int
    team_id: int
    team_name: str
    user_id: int
    user_name: str
    action: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    description: str
    metadata: Optional[Dict[str, Any]]
    created_at: str

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    """Notification response."""

    id: int
    user_id: int
    type: str
    title: str
    message: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    """Model for creating a notification."""

    type: str
    title: str
    message: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None


class NotificationPreferences(BaseModel):
    """User notification preferences."""

    email_comments: bool = True
    email_mentions: bool = True
    email_shares: bool = True
    email_invites: bool = True
    in_app_comments: bool = True
    in_app_mentions: bool = True
    in_app_shares: bool = True
    in_app_invites: bool = True


# ============== Activity Feed Endpoints ==============


@router.get("/teams/{team_id}/activity", response_model=List[ActivityResponse])
async def get_team_activity(
    team_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get activity feed for a team.

    Shows recent actions by team members.
    """
    # Check team membership
    member_result = await db.execute(
        select(TeamMember).where(
            and_(TeamMember.team_id == team_id, TeamMember.user_id == current_user["id"])
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    # Get team activities
    result = await db.execute(
        select(TeamActivity)
        .where(TeamActivity.team_id == team_id)
        .order_by(desc(TeamActivity.created_at))
        .limit(limit)
    )
    activities = result.scalars().all()

    # Get team and user names
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    team = team_result.scalar_one_or_none()

    return [
        ActivityResponse(
            id=a.id,
            team_id=a.team_id,
            team_name=team.name if team else "Team",
            user_id=a.user_id,
            user_name="User",  # Would get actual user name
            action=a.action,
            resource_type=a.resource_type,
            resource_id=a.resource_id,
            description=a.description,
            metadata=a.activity_metadata,
            created_at=a.created_at.isoformat(),
        )
        for a in activities
    ]


@router.post("/teams/{team_id}/activity", status_code=status.HTTP_201_CREATED)
async def log_team_activity(
    team_id: int,
    action: str = Query(...),
    description: str = Query(...),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[int] = Query(None),
    metadata: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Log a team activity.

    This is typically called internally when team actions occur.
    """
    # Check team membership
    member_result = await db.execute(
        select(TeamMember).where(
            and_(TeamMember.team_id == team_id, TeamMember.user_id == current_user["id"])
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    # Create activity
    activity = TeamActivity(
        team_id=team_id,
        user_id=current_user["id"],
        action=action,
        description=description,
        resource_type=resource_type,
        resource_id=resource_id,
        activity_metadata=metadata,
    )

    db.add(activity)
    await db.commit()

    return {"status": "logged", "activity_id": activity.id}


# ============== Notifications Endpoints ==============


@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List user notifications.

    Can filter to show only unread notifications.
    """
    query = select(Notification).where(Notification.user_id == current_user["id"])

    if unread_only:
        query = query.where(Notification.is_read == False)

    query = query.order_by(desc(Notification.created_at)).limit(limit)

    result = await db.execute(query)
    notifications = result.scalars().all()

    return [
        NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            type=n.type,
            title=n.title,
            message=n.message,
            resource_type=n.resource_type,
            resource_id=n.resource_id,
            is_read=n.is_read,
            created_at=n.created_at.isoformat(),
        )
        for n in notifications
    ]


@router.get("/notifications/unread/count")
async def get_unread_count(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get count of unread notifications.
    """
    result = await db.execute(
        select(func.count()).where(
            and_(Notification.user_id == current_user["id"], Notification.is_read == False)
        )
    )
    count = result.scalar() or 0

    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Mark a notification as read.
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user["id"],
            )
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(notification)

    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        resource_type=notification.resource_type,
        resource_id=notification.resource_id,
        is_read=notification.is_read,
        created_at=notification.created_at.isoformat(),
    )


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Mark all notifications as read.
    """
    await db.execute(
        update(Notification)
        .where(
            and_(
                Notification.user_id == current_user["id"],
                Notification.is_read == False,
            )
        )
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.commit()

    return None


@router.delete("/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Delete a notification.
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user["id"],
            )
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    await db.delete(notification)
    await db.commit()

    return None


@router.get("/notifications/preferences", response_model=NotificationPreferences)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get user notification preferences.

    In a real implementation, this would be stored in the database.
    For now, returns default preferences.
    """
    return NotificationPreferences()


@router.put("/notifications/preferences", response_model=NotificationPreferences)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Update user notification preferences.

    In a real implementation, this would be stored in the database.
    """
    # In production: save to database
    return preferences


# ============== Helper Functions ==============


async def create_notification(
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    db: AsyncSession = None,
):
    """
    Create a notification for a user.

    This is a helper function for internal use.
    """
    if not db:
        return

    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        resource_type=resource_type,
        resource_id=resource_id,
    )

    db.add(notification)
    await db.commit()

    return notification
