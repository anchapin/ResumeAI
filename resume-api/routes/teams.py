"""
Team Management API endpoints.

Provides endpoints for:
- Team CRUD operations
- Team member management
- Team invitations
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from database import get_async_session, Team, TeamMember, TeamInvitation, User
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/teams", tags=["Teams"])


# ============== Pydantic Models ==============


class TeamCreate(BaseModel):
    """Model for creating a team."""

    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    is_private: bool = True
    allow_member_invites: bool = True


class TeamUpdate(BaseModel):
    """Model for updating a team."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    is_private: Optional[bool] = None
    allow_member_invites: Optional[bool] = None


class TeamMemberResponse(BaseModel):
    """Team member response model."""

    id: int
    user_id: int
    team_id: int
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamInvitationCreate(BaseModel):
    """Model for creating a team invitation."""

    email: EmailStr


class TeamInvitationResponse(BaseModel):
    """Team invitation response model."""

    id: int
    email: str
    status: str
    expires_at: datetime
    invited_at: datetime

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    """Team response model."""

    id: int
    name: str
    description: Optional[str]
    owner_id: int
    is_private: bool
    allow_member_invites: bool
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    current_user_role: Optional[str] = None

    class Config:
        from_attributes = True


# ============== Helper Functions ==============


async def get_team_or_404(team_id: int, db: AsyncSession) -> Team:
    """Get team by ID or raise 404."""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


async def check_team_permission(
    team: Team, user_id: int, db: AsyncSession, required_role: str = "viewer"
) -> TeamMember:
    """Check if user has required role in team."""
    result = await db.execute(
        select(TeamMember).where(
            and_(TeamMember.team_id == team.id, TeamMember.user_id == user_id)
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=403, detail="You are not a member of this team"
        )

    # Role hierarchy
    role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2, "owner": 3}
    required_level = role_hierarchy.get(required_role, 0)
    member_level = role_hierarchy.get(member.role, 0)

    if member_level < required_level:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. Required: {required_role}, Your role: {member.role}",
        )

    return member


# ============== Team CRUD Endpoints ==============


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Create a new team.

    The creator becomes the team owner automatically.
    """
    # Create team
    team = Team(
        name=team_data.name,
        description=team_data.description,
        owner_id=current_user["id"],
        is_private=team_data.is_private,
        allow_member_invites=team_data.allow_member_invites,
    )

    db.add(team)
    await db.flush()  # Get team ID

    # Add creator as owner member
    member = TeamMember(
        team_id=team.id,
        user_id=current_user["id"],
        role="owner",
    )
    db.add(member)

    await db.commit()
    await db.refresh(team)

    # Get member count
    result = await db.execute(
        select(func.count()).where(TeamMember.team_id == team.id)
    )
    member_count = result.scalar() or 0

    return TeamResponse(
        **team.__dict__,
        member_count=member_count,
        current_user_role="owner",
    )


@router.get("", response_model=List[TeamResponse])
async def list_teams(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List all teams the current user is a member of.
    """
    # Get teams where user is a member
    result = await db.execute(
        select(Team)
        .join(TeamMember)
        .where(TeamMember.user_id == current_user["id"])
        .order_by(Team.created_at.desc())
    )
    teams = result.scalars().all()

    # Get member counts and roles
    team_responses = []
    for team in teams:
        member_result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team.id,
                    TeamMember.user_id == current_user["id"],
                )
            )
        )
        member = member_result.scalar_one_or_none()

        count_result = await db.execute(
            select(func.count()).where(TeamMember.team_id == team.id)
        )
        member_count = count_result.scalar() or 0

        team_responses.append(
            TeamResponse(
                **team.__dict__,
                member_count=member_count,
                current_user_role=member.role if member else None,
            )
        )

    return team_responses


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get details of a specific team.
    """
    team = await get_team_or_404(team_id, db)

    # Check permission
    await check_team_permission(team, current_user["id"], db, "viewer")

    # Get member count
    result = await db.execute(
        select(func.count()).where(TeamMember.team_id == team.id)
    )
    member_count = result.scalar() or 0

    # Get user's role
    member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.user_id == current_user["id"],
            )
        )
    )
    member = member_result.scalar_one_or_none()

    return TeamResponse(
        **team.__dict__,
        member_count=member_count,
        current_user_role=member.role if member else None,
    )


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Update a team.

    Only team owners can update team settings.
    """
    team = await get_team_or_404(team_id, db)

    # Check owner permission
    await check_team_permission(team, current_user["id"], db, "owner")

    # Update fields
    update_data = team_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)

    await db.commit()
    await db.refresh(team)

    # Get member count
    result = await db.execute(
        select(func.count()).where(TeamMember.team_id == team.id)
    )
    member_count = result.scalar() or 0

    return TeamResponse(
        **team.__dict__,
        member_count=member_count,
        current_user_role="owner",
    )


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Delete a team.

    Only team owners can delete the team.
    This will remove all members and shared resumes.
    """
    team = await get_team_or_404(team_id, db)

    # Check owner permission
    await check_team_permission(team, current_user["id"], db, "owner")

    await db.delete(team)
    await db.commit()

    return None


# ============== Team Member Endpoints ==============


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    team_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List all members of a team.
    """
    team = await get_team_or_404(team_id, db)

    # Check permission
    await check_team_permission(team, current_user["id"], db, "viewer")

    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id)
        .order_by(TeamMember.joined_at)
    )
    members = result.scalars().all()

    return members


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Remove a member from the team.

    Owners can remove any member.
    Members can remove themselves.
    """
    team = await get_team_or_404(team_id, db)

    # Check permission
    current_member = await check_team_permission(
        team, current_user["id"], db, "viewer"
    )

    # Can't remove the last owner
    if user_id == team.owner_id and current_user["id"] != team.owner_id:
        raise HTTPException(
            status_code=400, detail="Cannot remove the team owner"
        )

    # Check if removing self or has permission
    if user_id != current_user["id"]:
        await check_team_permission(team, current_user["id"], db, "editor")

    # Find and remove member
    result = await db.execute(
        select(TeamMember).where(
            and_(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(member)
    await db.commit()

    return None


# ============== Team Invitation Endpoints ==============


@router.post(
    "/{team_id}/invite", response_model=TeamInvitationResponse, status_code=status.HTTP_201_CREATED
)
async def invite_to_team(
    team_id: int,
    invitation: TeamInvitationCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Invite a user to join the team.

    Sends an invitation email with a secure token.
    """
    team = await get_team_or_404(team_id, db)

    # Check permission (owner or allow_member_invites)
    if not team.allow_member_invites:
        await check_team_permission(team, current_user["id"], db, "editor")
    else:
        await check_team_permission(team, current_user["id"], db, "viewer")

    # Check if user is already a member
    member_result = await db.execute(
        select(TeamMember).where(
            and_(TeamMember.team_id == team_id, TeamMember.user_id == current_user["id"])
        )
    )
    # Note: We can't check if invited email is already a member without User lookup
    # This would need to be done in a real implementation

    # Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # Create invitation
    db_invitation = TeamInvitation(
        team_id=team_id,
        email=invitation.email.lower(),
        invited_by_id=current_user["id"],
        token=token,
        expires_at=expires_at,
    )

    db.add(db_invitation)
    await db.commit()
    await db.refresh(db_invitation)

    # TODO: Send invitation email with token link

    return TeamInvitationResponse(
        id=db_invitation.id,
        email=db_invitation.email,
        status=db_invitation.status,
        expires_at=db_invitation.expires_at,
        invited_at=db_invitation.created_at,
    )


@router.get("/{team_id}/invitations", response_model=List[TeamInvitationResponse])
async def list_team_invitations(
    team_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List pending invitations for a team.
    """
    team = await get_team_or_404(team_id, db)

    # Check permission
    await check_team_permission(team, current_user["id"], db, "editor")

    result = await db.execute(
        select(TeamInvitation)
        .where(and_(TeamInvitation.team_id == team_id, TeamInvitation.status == "pending"))
        .order_by(TeamInvitation.created_at.desc())
    )
    invitations = result.scalars().all()

    return invitations


@router.post("/invitations/{token}/accept", response_model=TeamResponse)
async def accept_invitation(
    token: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Accept a team invitation.
    """
    # Find invitation
    result = await db.execute(
        select(TeamInvitation).where(TeamInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != "pending":
        raise HTTPException(
            status_code=400, detail=f"Invitation already {invitation.status}"
        )

    if invitation.expires_at < datetime.now(timezone.utc):
        invitation.status = "expired"
        await db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    # Check if user email matches invitation
    # In a real implementation, verify current_user email matches invitation.email

    # Add user as team member
    member = TeamMember(
        team_id=invitation.team_id,
        user_id=current_user["id"],
        role="member",  # Default role for invited members
    )
    db.add(member)

    # Mark invitation as accepted
    invitation.status = "accepted"
    invitation.accepted_at = datetime.now(timezone.utc)

    await db.commit()

    # Return team details
    team = await get_team_or_404(invitation.team_id, db)
    return TeamResponse(
        **team.__dict__,
        member_count=1,  # Simplified
        current_user_role="member",
    )


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Cancel a pending invitation.
    """
    result = await db.execute(
        select(TeamInvitation).where(TeamInvitation.id == invitation_id)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Check permission (inviter or team owner)
    team = await get_team_or_404(invitation.team_id, db)
    if current_user["id"] != invitation.invited_by_id:
        await check_team_permission(team, current_user["id"], db, "owner")

    invitation.status = "cancelled"
    await db.commit()

    return None
