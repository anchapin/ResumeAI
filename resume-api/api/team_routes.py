"""
Team Collaboration API Routes.

Endpoints for team management, sharing resumes, and collaboration features.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from fastapi import APIRouter, HTTPException, Request, status, Depends
from typing import List, Optional
from datetime import datetime

from .models import (
    TeamCreate,
    TeamUpdate,
    TeamInvite,
    TeamResponse,
    TeamDetailResponse,
    TeamMemberResponse,
    TeamMemberUpdate,
    TeamResumeShare,
    TeamActivityResponse,
    ResumeCommentCreate,
    ResumeCommentResponse,
    ResumeCommentUpdate,
    ErrorResponse,
    MessageResponse,
)

from config.dependencies import AuthorizedAPIKey, limiter
from config import settings
from monitoring import logging_config
from database import (
    get_db,
    Team,
    TeamMember,
    TeamResume,
    TeamActivity,
    User,
)

logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/teams", tags=["Teams"])


def rate_limit(limit_value: str):
    """Apply rate limiting only when enabled."""
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    else:
        return lambda f: f


# =============================================================================
# Team Management Endpoints
# =============================================================================


@router.post(
    "/v1/teams",
    response_model=TeamResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("10/minute")
async def create_team(
    request: Request,
    body: TeamCreate,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new team.

    The authenticated user becomes the team owner.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 10 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team = Team(
            name=body.name,
            description=body.description,
            owner_id=user_id,
        )

        db.add(team)
        await db.flush()

        team_member = TeamMember(
            team_id=team.id,
            user_id=user_id,
            role="owner",
        )
        db.add(team_member)

        activity = TeamActivity(
            team_id=team.id,
            user_id=user_id,
            action="team_created",
            description=f"Team '{body.name}' was created",
        )
        db.add(activity)

        await db.commit()

        await db.refresh(team)

        member_count_stmt = select(func.count(TeamMember.id)).where(
            TeamMember.team_id == team.id
        )
        result = await db.execute(member_count_stmt)
        member_count = result.scalar() or 0

        return TeamResponse(
            id=team.id,
            name=team.name,
            description=team.description,
            owner_id=team.owner_id,
            member_count=member_count,
            resume_count=0,
            created_at=(
                team.created_at.isoformat()
                if team.created_at
                else datetime.utcnow().isoformat()
            ),
            updated_at=(
                team.updated_at.isoformat()
                if team.updated_at
                else datetime.utcnow().isoformat()
            ),
        )
    except Exception as e:
        logger.error(f"Failed to create team: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team: {str(e)}",
        )


@router.get(
    "/v1/teams",
    response_model=List[TeamResponse],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def list_teams(
    request: Request,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    List all teams the authenticated user belongs to.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        stmt = (
            select(Team)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .where(TeamMember.user_id == user_id)
            .options(selectinload(Team.members))
        )

        result = await db.execute(stmt)
        teams = result.scalars().all()

        team_responses = []
        for team in teams:
            member_count_stmt = select(func.count(TeamMember.id)).where(
                TeamMember.team_id == team.id
            )
            result = await db.execute(member_count_stmt)
            member_count = result.scalar() or 0

            resume_count_stmt = select(func.count(TeamResume.id)).where(
                TeamResume.team_id == team.id
            )
            result = await db.execute(resume_count_stmt)
            resume_count = result.scalar() or 0

            team_responses.append(
                TeamResponse(
                    id=team.id,
                    name=team.name,
                    description=team.description,
                    owner_id=team.owner_id,
                    member_count=member_count,
                    resume_count=resume_count,
                    created_at=(
                        team.created_at.isoformat()
                        if team.created_at
                        else datetime.utcnow().isoformat()
                    ),
                    updated_at=(
                        team.updated_at.isoformat()
                        if team.updated_at
                        else datetime.utcnow().isoformat()
                    ),
                )
            )

        return team_responses
    except Exception as e:
        logger.error(f"Failed to list teams: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list teams: {str(e)}",
        )


@router.get(
    "/v1/teams/{team_id}",
    response_model=TeamDetailResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def get_team(
    request: Request,
    team_id: int,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Get team details including members.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        stmt = (
            select(Team)
            .where(Team.id == team_id)
            .options(selectinload(Team.members).selectinload(TeamMember.user))
        )

        result = await db.execute(stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        # Check if user is a member of the team
        member_stmt = select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        result = await db.execute(member_stmt)
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a team member to view team details",
            )

        member_responses = []
        for member in team.members:
            member_responses.append(
                TeamMemberResponse(
                    user_id=member.user.id,
                    email=member.user.email,
                    username=member.user.username,
                    role=member.role,
                    joined_at=(
                        member.joined_at.isoformat()
                        if member.joined_at
                        else datetime.utcnow().isoformat()
                    ),
                )
            )

        resume_count_stmt = select(func.count(TeamResume.id)).where(
            TeamResume.team_id == team.id
        )
        result = await db.execute(resume_count_stmt)
        resume_count = result.scalar() or 0

        return TeamDetailResponse(
            id=team.id,
            name=team.name,
            description=team.description,
            owner_id=team.owner_id,
            members=member_responses,
            resume_count=resume_count,
            created_at=(
                team.created_at.isoformat()
                if team.created_at
                else datetime.utcnow().isoformat()
            ),
            updated_at=(
                team.updated_at.isoformat()
                if team.updated_at
                else datetime.utcnow().isoformat()
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get team: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team: {str(e)}",
        )


@router.put(
    "/v1/teams/{team_id}",
    response_model=TeamResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("10/minute")
async def update_team(
    request: Request,
    team_id: int,
    body: TeamUpdate,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Update team details.

    Only team owners and admins can update team details.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 10 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        if team.owner_id != user_id:
            member_stmt = select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == user_id,
                )
            )
            member_result = await db.execute(member_stmt)
            member = member_result.scalar_one_or_none()

            if not member or member.role not in ["admin", "owner"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only team owners and admins can update team details",
                )

        if body.name is not None:
            team.name = body.name
        if body.description is not None:
            team.description = body.description

        activity = TeamActivity(
            team_id=team.id,
            user_id=user_id,
            action="team_updated",
            description=f"Team '{team.name}' was updated",
        )
        db.add(activity)

        await db.commit()
        await db.refresh(team)

        member_count_stmt = select(func.count(TeamMember.id)).where(
            TeamMember.team_id == team.id
        )
        result = await db.execute(member_count_stmt)
        member_count = result.scalar() or 0

        resume_count_stmt = select(func.count(TeamResume.id)).where(
            TeamResume.team_id == team.id
        )
        result = await db.execute(resume_count_stmt)
        resume_count = result.scalar() or 0

        return TeamResponse(
            id=team.id,
            name=team.name,
            description=team.description,
            owner_id=team.owner_id,
            member_count=member_count,
            resume_count=resume_count,
            created_at=(
                team.created_at.isoformat()
                if team.created_at
                else datetime.utcnow().isoformat()
            ),
            updated_at=(
                team.updated_at.isoformat()
                if team.updated_at
                else datetime.utcnow().isoformat()
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update team: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update team: {str(e)}",
        )


@router.delete(
    "/v1/teams/{team_id}",
    response_model=MessageResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("5/minute")
async def delete_team(
    request: Request,
    team_id: int,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a team.

    Only team owners can delete a team.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 5 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        if team.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only team owners can delete teams",
            )

        await db.delete(team)
        await db.commit()

        return MessageResponse(
            message=f"Team '{team.name}' has been deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete team: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete team: {str(e)}",
        )


# =============================================================================
# Team Member Management
# =============================================================================


@router.post(
    "/v1/teams/{team_id}/members",
    response_model=TeamMemberResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("10/minute")
async def invite_team_member(
    request: Request,
    team_id: int,
    body: TeamInvite,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Invite a user to join a team.

    Only team owners and admins can invite new members.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 10 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        if team.owner_id != user_id:
            member_stmt = select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == user_id,
                )
            )
            member_result = await db.execute(member_stmt)
            member = member_result.scalar_one_or_none()

            if not member or member.role not in ["admin", "owner"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only team owners and admins can invite members",
                )

        user_stmt = select(User).where(User.email == body.email)
        result = await db.execute(user_stmt)
        invited_user = result.scalar_one_or_none()

        if not invited_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email {body.email} not found",
            )

        existing_stmt = select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == invited_user.id,
            )
        )
        result = await db.execute(existing_stmt)
        existing_member = result.scalar_one_or_none()

        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {body.email} is already a member of this team",
            )

        new_member = TeamMember(
            team_id=team_id,
            user_id=invited_user.id,
            role=body.role,
        )
        db.add(new_member)

        activity = TeamActivity(
            team_id=team_id,
            user_id=user_id,
            action="member_joined",
            description=f"{invited_user.username} was invited to the team",
            resource_type="user",
            resource_id=invited_user.id,
        )
        db.add(activity)

        await db.commit()
        await db.refresh(new_member)

        await db.refresh(invited_user)

        return TeamMemberResponse(
            user_id=invited_user.id,
            email=invited_user.email,
            username=invited_user.username,
            role=new_member.role,
            joined_at=(
                new_member.joined_at.isoformat()
                if new_member.joined_at
                else datetime.utcnow().isoformat()
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to invite team member: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invite team member: {str(e)}",
        )


@router.get(
    "/v1/teams/{team_id}/members",
    response_model=List[TeamMemberResponse],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def list_team_members(
    request: Request,
    team_id: int,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    List all members of a team.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        # Check if current user is a member of the team
        member_check_stmt = select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        result = await db.execute(member_check_stmt)
        current_member = result.scalar_one_or_none()

        if not current_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a team member to view team members",
            )

        member_stmt = (
            select(TeamMember)
            .where(TeamMember.team_id == team_id)
            .options(selectinload(TeamMember.user))
        )
        result = await db.execute(member_stmt)
        members = result.scalars().all()

        member_responses = []
        for member in members:
            member_responses.append(
                TeamMemberResponse(
                    user_id=member.user.id,
                    email=member.user.email,
                    username=member.user.username,
                    role=member.role,
                    joined_at=(
                        member.joined_at.isoformat()
                        if member.joined_at
                        else datetime.utcnow().isoformat()
                    ),
                )
            )

        return member_responses
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list team members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list team members: {str(e)}",
        )


@router.get(
    "/v1/teams/{team_id}/members/{member_id}",
    response_model=TeamMemberResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def get_team_member(
    request: Request,
    team_id: int,
    member_id: int,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific team member by ID.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        member_stmt = (
            select(TeamMember)
            .where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == member_id,
                )
            )
            .options(selectinload(TeamMember.user))
        )
        result = await db.execute(member_stmt)
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member {member_id} not found in team {team_id}",
            )

        return TeamMemberResponse(
            user_id=member.user.id,
            email=member.user.email,
            username=member.user.username,
            role=member.role,
            joined_at=(
                member.joined_at.isoformat()
                if member.joined_at
                else datetime.utcnow().isoformat()
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get team member: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team member: {str(e)}",
        )


@router.put(
    "/v1/teams/{team_id}/members/{member_id}",
    response_model=TeamMemberResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("10/minute")
async def update_member_role(
    request: Request,
    team_id: int,
    member_id: int,
    member_update: TeamMemberUpdate,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a team member's role.

    Only team owners can change member roles.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 10 requests per minute per API key.
    """
    try:
        current_user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        if team.owner_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only team owners can change member roles",
            )

        if member_id == team.owner_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change the role of the team owner",
            )

        member_stmt = (
            select(TeamMember)
            .where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == member_id,
                )
            )
            .options(selectinload(TeamMember.user))
        )
        result = await db.execute(member_stmt)
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member {member_id} not found in team {team_id}",
            )

        old_role = member.role
        member.role = member_update.role

        activity = TeamActivity(
            team_id=team_id,
            user_id=current_user_id,
            action="role_changed",
            description=f"{member.user.username}'s role was changed from {old_role} to {member_update.role}",
            resource_type="user",
            resource_id=member_id,
            metadata={"old_role": old_role, "new_role": member_update.role},
        )
        db.add(activity)

        await db.commit()
        await db.refresh(member)

        return TeamMemberResponse(
            user_id=member.user.id,
            email=member.user.email,
            username=member.user.username,
            role=member.role,
            joined_at=(
                member.joined_at.isoformat()
                if member.joined_at
                else datetime.utcnow().isoformat()
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update member role: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update member role: {str(e)}",
        )


@router.delete(
    "/v1/teams/{team_id}/members/{member_id}",
    response_model=MessageResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("10/minute")
async def remove_team_member(
    request: Request,
    team_id: int,
    member_id: int,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a member from a team.

    Team owners cannot be removed. Only owners can remove admins.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 10 requests per minute per API key.
    """
    try:
        current_user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        if member_id == team.owner_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the team owner",
            )

        member_stmt = (
            select(TeamMember)
            .where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == member_id,
                )
            )
            .options(selectinload(TeamMember.user))
        )
        result = await db.execute(member_stmt)
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member {member_id} not found in team {team_id}",
            )

        if team.owner_id != current_user_id:
            if member.role in ["admin", "owner"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only team owners can remove admins",
                )

        username = member.user.username
        await db.delete(member)

        activity = TeamActivity(
            team_id=team_id,
            user_id=current_user_id,
            action="member_left",
            description=f"{username} was removed from the team",
            resource_type="user",
            resource_id=member_id,
        )
        db.add(activity)

        await db.commit()

        return MessageResponse(message=f"{username} has been removed from the team")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove team member: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove team member: {str(e)}",
        )


# =============================================================================
# Resume Sharing
# =============================================================================


@router.post(
    "/v1/teams/{team_id}/resumes",
    response_model=MessageResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("20/minute")
async def share_resume_with_team(
    request: Request,
    team_id: int,
    body: TeamResumeShare,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Share a resume with a team.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 20 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        member_stmt = select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        result = await db.execute(member_stmt)
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a team member to share resumes",
            )

        existing_stmt = select(TeamResume).where(
            and_(
                TeamResume.team_id == team_id,
                TeamResume.resume_id == body.resume_id,
            )
        )
        result = await db.execute(existing_stmt)
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume is already shared with this team",
            )

        team_resume = TeamResume(
            team_id=team_id,
            resume_id=body.resume_id,
            permissions=body.permission,
            shared_by=user_id,
        )
        db.add(team_resume)

        activity = TeamActivity(
            team_id=team_id,
            user_id=user_id,
            action="resume_shared",
            description="Resume was shared with the team",
            resource_type="resume",
            resource_id=body.resume_id,
        )
        db.add(activity)

        await db.commit()

        return MessageResponse(
            message=f"Resume has been shared with team '{team.name}'"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to share resume: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to share resume: {str(e)}",
        )


@router.delete(
    "/v1/teams/{team_id}/resumes/{resume_id}",
    response_model=MessageResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("20/minute")
async def unshare_resume_from_team(
    request: Request,
    team_id: int,
    resume_id: int,
    auth: AuthorizedAPIKey,
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a resume from a team's shared resumes.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 20 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        member_stmt = select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        result = await db.execute(member_stmt)
        member = result.scalar_one_or_none()

        if not member or member.role not in ["admin", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only team admins and owners can unshare resumes",
            )

        team_resume_stmt = select(TeamResume).where(
            and_(
                TeamResume.team_id == team_id,
                TeamResume.resume_id == resume_id,
            )
        )
        result = await db.execute(team_resume_stmt)
        team_resume = result.scalar_one_or_none()

        if not team_resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume {resume_id} is not shared with this team",
            )

        await db.delete(team_resume)

        activity = TeamActivity(
            team_id=team_id,
            user_id=user_id,
            action="resume_unshared",
            description="Resume was unshared from the team",
            resource_type="resume",
            resource_id=resume_id,
        )
        db.add(activity)

        await db.commit()

        return MessageResponse(
            message=f"Resume has been unshared from team '{team.name}'"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unshare resume: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unshare resume: {str(e)}",
        )


# =============================================================================
# Comments
# =============================================================================


@router.post(
    "/v1/resumes/{resume_id}/comments",
    response_model=ResumeCommentResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def add_resume_comment(
    request: Request,
    resume_id: int,
    body: ResumeCommentCreate,
    auth: AuthorizedAPIKey,
):
    """
    Add a comment to a resume.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        # TODO: Implement database insert
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume {resume_id} not found",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add comment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add comment: {str(e)}",
        )


@router.get(
    "/v1/resumes/{resume_id}/comments",
    response_model=List[ResumeCommentResponse],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def list_resume_comments(
    request: Request,
    resume_id: int,
    auth: AuthorizedAPIKey,
    section: Optional[str] = None,
    include_resolved: bool = False,
):
    """
    List comments on a resume.

    Optionally filter by section and whether to include resolved comments.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        # TODO: Implement database query
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume {resume_id} not found",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list comments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list comments: {str(e)}",
        )


@router.put(
    "/v1/resumes/{resume_id}/comments/{comment_id}",
    response_model=ResumeCommentResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def update_resume_comment(
    request: Request,
    resume_id: int,
    comment_id: int,
    body: ResumeCommentUpdate,
    auth: AuthorizedAPIKey,
):
    """
    Update a comment on a resume.

    Only the comment author can update the comment content.
    Team members with edit permission can resolve comments.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        # TODO: Implement database update
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume {resume_id} or comment {comment_id} not found",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update comment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update comment: {str(e)}",
        )


@router.delete(
    "/v1/resumes/{resume_id}/comments/{comment_id}",
    response_model=MessageResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def delete_resume_comment(
    request: Request,
    resume_id: int,
    comment_id: int,
    auth: AuthorizedAPIKey,
):
    """
    Delete a comment from a resume.

    Only the comment author or team admins can delete comments.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        # TODO: Implement database delete
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume {resume_id} or comment {comment_id} not found",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete comment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete comment: {str(e)}",
        )


# =============================================================================
# Team Activity
# =============================================================================


@router.get(
    "/v1/teams/{team_id}/activity",
    response_model=List[TeamActivityResponse],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Team Collaboration"],
)
@rate_limit("30/minute")
async def get_team_activity(
    request: Request,
    team_id: int,
    auth: AuthorizedAPIKey,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Get recent team activity.

    Returns a paginated list of recent team activities including:
    - Resume shared/unshared
    - Comments added/resolved
    - Members joined/left
    - Role changes

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.
    """
    try:
        user_id = auth.user_id if hasattr(auth, "user_id") else 1

        team_stmt = select(Team).where(Team.id == team_id)
        result = await db.execute(team_stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team {team_id} not found",
            )

        member_stmt = select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        result = await db.execute(member_stmt)
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a team member to view team activity",
            )

        activity_stmt = (
            select(TeamActivity)
            .where(TeamActivity.team_id == team_id)
            .options(selectinload(TeamActivity.user))
            .order_by(desc(TeamActivity.created_at))
            .limit(limit)
            .offset(offset)
        )

        result = await db.execute(activity_stmt)
        activities = result.scalars().all()

        activity_responses = []
        for activity in activities:
            activity_responses.append(
                TeamActivityResponse(
                    id=activity.id,
                    team_id=activity.team_id,
                    user_id=activity.user_id,
                    username=activity.user.username,
                    action=activity.action,
                    resource_type=activity.resource_type,
                    resource_id=activity.resource_id,
                    description=activity.description,
                    created_at=(
                        activity.created_at.isoformat()
                        if activity.created_at
                        else datetime.utcnow().isoformat()
                    ),
                )
            )

        return activity_responses
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get team activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team activity: {str(e)}",
        )
