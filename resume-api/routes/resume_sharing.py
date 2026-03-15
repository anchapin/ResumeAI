"""
Resume Sharing API endpoints.

Provides endpoints for sharing resumes with teams.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from database import get_async_session, Team, TeamMember, TeamResume, Resume, ResumeShare
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/resumes", tags=["Resume Sharing"])


# ============== Pydantic Models ==============


class ResumeShareCreate(BaseModel):
    """Model for sharing a resume with a team."""

    team_id: int
    permission: str = Field(default="view", pattern="^(view|edit|comment)$")


class ResumeShareUpdate(BaseModel):
    """Model for updating resume sharing permissions."""

    permission: str = Field(..., pattern="^(view|edit|comment)$")


class TeamResumeResponse(BaseModel):
    """Team resume response model."""

    id: int
    team_id: int
    resume_id: int
    permissions: str
    shared_at: str

    class Config:
        from_attributes = True


class ResumeShareResponse(BaseModel):
    """Resume share response model."""

    id: int
    resume_id: int
    team_id: int
    team_name: str
    permission: str
    shared_at: str

    class Config:
        from_attributes = True


# ============== Helper Functions ==============


async def get_resume_or_404(resume_id: int, db: AsyncSession) -> Resume:
    """Get resume by ID or raise 404."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


async def check_resume_access(
    resume: Resume, user_id: int, db: AsyncSession, required_permission: str = "view"
) -> bool:
    """Check if user has access to resume (owner or team member with permission)."""
    # Check if user is owner
    if resume.owner_id == user_id:
        return True

    # Check team access
    result = await db.execute(
        select(ResumeShare)
        .join(TeamMember)
        .where(
            and_(
                ResumeShare.resume_id == resume.id,
                TeamMember.user_id == user_id,
            )
        )
    )
    share = result.scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=403, detail="You don't have access to this resume"
        )

    # Check permission level
    permission_levels = {"view": 0, "comment": 1, "edit": 2}
    required_level = permission_levels.get(required_permission, 0)
    share_level = permission_levels.get(share.permission, 0)

    if share_level < required_level:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. Required: {required_permission}, Your access: {share.permission}",
        )

    return True


# ============== Resume Sharing Endpoints ==============


@router.post(
    "/{resume_id}/share",
    response_model=ResumeShareResponse,
    status_code=status.HTTP_201_CREATED,
)
async def share_resume_with_team(
    resume_id: int,
    share_data: ResumeShareCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Share a resume with a team.

    Only the resume owner can share with teams.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if resume.owner_id != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="Only the resume owner can share with teams"
        )

    # Check if team exists and user is a member
    team_result = await db.execute(
        select(Team).where(Team.id == share_data.team_id)
    )
    team = team_result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check user is member of team
    member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == share_data.team_id,
                TeamMember.user_id == current_user["id"],
            )
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=403, detail="You must be a member of the team to share with it"
        )

    # Check if already shared
    existing_result = await db.execute(
        select(ResumeShare).where(
            and_(
                ResumeShare.resume_id == resume_id,
                ResumeShare.team_id == share_data.team_id,
            )
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        # Update existing share
        existing.permission = share_data.permission
        await db.commit()
        await db.refresh(existing)

        return ResumeShareResponse(
            id=existing.id,
            resume_id=existing.resume_id,
            team_id=existing.team_id,
            team_name=team.name,
            permission=existing.permission,
            shared_at=existing.shared_at.isoformat(),
        )

    # Create new share
    share = ResumeShare(
        resume_id=resume_id,
        team_id=share_data.team_id,
        shared_by_id=current_user["id"],
        permission=share_data.permission,
    )

    db.add(share)
    await db.commit()
    await db.refresh(share)

    return ResumeShareResponse(
        id=share.id,
        resume_id=share.resume_id,
        team_id=share.team_id,
        team_name=team.name,
        permission=share.permission,
        shared_at=share.shared_at.isoformat(),
    )


@router.get("/{resume_id}/shares", response_model=List[ResumeShareResponse])
async def get_resume_shares(
    resume_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get all teams a resume is shared with.

    Only the resume owner can see sharing settings.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if resume.owner_id != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="Only the resume owner can see sharing settings"
        )

    result = await db.execute(
        select(ResumeShare)
        .join(Team)
        .where(ResumeShare.resume_id == resume_id)
        .order_by(ResumeShare.shared_at.desc())
    )
    shares = result.scalars().all()

    return [
        ResumeShareResponse(
            id=share.id,
            resume_id=share.resume_id,
            team_id=share.team_id,
            team_name=share.team.name,
            permission=share.permission,
            shared_at=share.shared_at.isoformat(),
        )
        for share in shares
    ]


@router.put("/{resume_id}/shares/{share_id}", response_model=ResumeShareResponse)
async def update_resume_share(
    resume_id: int,
    share_id: int,
    share_data: ResumeShareUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Update resume sharing permissions.

    Only the resume owner can update sharing permissions.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if resume.owner_id != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="Only the resume owner can update sharing settings"
        )

    # Find share
    result = await db.execute(
        select(ResumeShare).where(
            and_(
                ResumeShare.id == share_id,
                ResumeShare.resume_id == resume_id,
            )
        )
    )
    share = result.scalar_one_or_none()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    # Update permission
    share.permission = share_data.permission
    await db.commit()
    await db.refresh(share)

    return ResumeShareResponse(
        id=share.id,
        resume_id=share.resume_id,
        team_id=share.team_id,
        team_name=share.team.name,
        permission=share.permission,
        shared_at=share.shared_at.isoformat(),
    )


@router.delete(
    "/{resume_id}/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_resume_share(
    resume_id: int,
    share_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Remove resume sharing with a team.

    Only the resume owner can remove sharing.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if resume.owner_id != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="Only the resume owner can remove sharing"
        )

    # Find share
    result = await db.execute(
        select(ResumeShare).where(
            and_(
                ResumeShare.id == share_id,
                ResumeShare.resume_id == resume_id,
            )
        )
    )
    share = result.scalar_one_or_none()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    await db.delete(share)
    await db.commit()

    return None


# ============== Team Resumes Endpoints ==============


@router.get("/teams/{team_id}", response_model=List[dict])
async def list_team_resumes(
    team_id: int,
    permission: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List all resumes shared with a team.

    Only team members can access shared resumes.
    """
    # Check team membership
    member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user["id"],
            )
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=403, detail="You are not a member of this team"
        )

    # Build query
    query = select(ResumeShare).where(ResumeShare.team_id == team_id)

    if permission:
        query = query.where(ResumeShare.permission == permission)

    result = await db.execute(query.join(Resume).join(Team))
    shares = result.scalars().all()

    return [
        {
            "id": share.id,
            "resume_id": share.resume_id,
            "resume_title": share.resume.title,
            "team_id": share.team_id,
            "team_name": share.team.name,
            "permission": share.permission,
            "shared_at": share.shared_at.isoformat(),
            "owner_id": share.resume.owner_id,
        }
        for share in shares
    ]
