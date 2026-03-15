"""
Team Templates API endpoints.

Provides endpoints for:
- Creating templates from resumes
- Sharing templates within teams
- Template categories and tags
- Template versioning
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from database import get_async_session, Team, TeamMember, Resume, TeamTemplate
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/templates", tags=["Team Templates"])


# ============== Pydantic Models ==============


class TemplateCreate(BaseModel):
    """Model for creating a template."""

    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    resume_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    is_public: bool = False


class TemplateUpdate(BaseModel):
    """Model for updating a template."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


class TemplateResponse(BaseModel):
    """Template response model."""

    id: int
    team_id: int
    team_name: str
    name: str
    description: Optional[str]
    category: Optional[str]
    tags: List[str]
    data: Dict[str, Any]
    is_public: bool
    created_by: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ============== Helper Functions ==============


async def get_template_or_404(template_id: int, db: AsyncSession) -> TeamTemplate:
    """Get template by ID or raise 404."""
    result = await db.execute(select(TeamTemplate).where(TeamTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


async def check_team_access(team_id: int, user_id: int, db: AsyncSession) -> bool:
    """Check if user has access to team."""
    result = await db.execute(
        select(TeamMember).where(
            and_(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
    )
    return result.scalar_one_or_none() is not None


# ============== Template Endpoints ==============


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Create a new team template.

    Can be created from scratch or from an existing resume.
    """
    # Get template data
    data = template_data.data

    # If creating from resume, get resume data
    if template_data.resume_id:
        resume_result = await db.execute(
            select(Resume).where(Resume.id == template_data.resume_id)
        )
        resume = resume_result.scalar_one_or_none()

        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        # Check ownership
        if resume.owner_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="You don't own this resume")

        data = resume.data

    if not data:
        raise HTTPException(status_code=400, detail="Either resume_id or data must be provided")

    # For team templates, we need a team_id
    # In a real implementation, this would come from the request or default to user's primary team
    # For now, we'll create a personal template (team_id = user_id as a workaround)
    team_id = current_user["id"]  # Placeholder

    # Create template
    template = TeamTemplate(
        team_id=team_id,
        name=template_data.name,
        description=template_data.description,
        category=template_data.category,
        tags=template_data.tags,
        data=data,
        is_public=template_data.is_public,
        created_by=current_user["id"],
    )

    db.add(template)
    await db.commit()
    await db.refresh(template)

    return TemplateResponse(
        id=template.id,
        team_id=template.team_id,
        team_name="Personal",  # Would get actual team name
        name=template.name,
        description=template.description,
        category=template.category,
        tags=template.tags,
        data=template.data,
        is_public=template.is_public,
        created_by=template.created_by,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
    )


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    team_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List templates accessible to the user.

    Can filter by team, category, and search term.
    """
    query = select(TeamTemplate).where(
        TeamTemplate.is_public == True or TeamTemplate.created_by == current_user["id"]
    )

    if team_id:
        query = query.where(TeamTemplate.team_id == team_id)

    if category:
        query = query.where(TeamTemplate.category == category)

    if search:
        query = query.where(
            (TeamTemplate.name.ilike(f"%{search}%")) |
            (TeamTemplate.description.ilike(f"%{search}%"))
        )

    query = query.order_by(desc(TeamTemplate.created_at))

    result = await db.execute(query)
    templates = result.scalars().all()

    return [
        TemplateResponse(
            id=t.id,
            team_id=t.team_id,
            team_name="Team",  # Would get actual team name
            name=t.name,
            description=t.description,
            category=t.category,
            tags=t.tags,
            data=t.data,
            is_public=t.is_public,
            created_by=t.created_by,
            created_at=t.created_at.isoformat(),
            updated_at=t.updated_at.isoformat(),
        )
        for t in templates
    ]


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get details of a specific template.
    """
    template = await get_template_or_404(template_id, db)

    # Check access
    if not template.is_public and template.created_by != current_user["id"]:
        # Check team access
        has_access = await check_team_access(template.team_id, current_user["id"], db)
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to this template")

    return TemplateResponse(
        id=template.id,
        team_id=template.team_id,
        team_name="Team",
        name=template.name,
        description=template.description,
        category=template.category,
        tags=template.tags,
        data=template.data,
        is_public=template.is_public,
        created_by=template.created_by,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Update a template.

    Only the template creator can update.
    """
    template = await get_template_or_404(template_id, db)

    # Check ownership
    if template.created_by != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the template creator can update")

    # Update fields
    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.commit()
    await db.refresh(template)

    return TemplateResponse(
        id=template.id,
        team_id=template.team_id,
        team_name="Team",
        name=template.name,
        description=template.description,
        category=template.category,
        tags=template.tags,
        data=template.data,
        is_public=template.is_public,
        created_by=template.created_by,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Delete a template.

    Only the template creator can delete.
    """
    template = await get_template_or_404(template_id, db)

    # Check ownership
    if template.created_by != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the template creator can delete")

    await db.delete(template)
    await db.commit()

    return None


@router.get("/categories", response_model=List[str])
async def list_template_categories(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List all template categories.
    """
    result = await db.execute(
        select(TeamTemplate.category)
        .where(TeamTemplate.category.isnot(None))
        .distinct()
    )
    categories = [row[0] for row in result.all() if row[0]]
    return categories


@router.get("/tags", response_model=List[str])
async def list_template_tags(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List all template tags.
    """
    result = await db.execute(select(TeamTemplate.tags))
    all_tags = set()
    for row in result.all():
        if row[0]:
            all_tags.update(row[0])
    return sorted(list(all_tags))
