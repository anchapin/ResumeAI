"""
Resume Version History API endpoints.

Provides endpoints for:
- Version history listing
- Version retrieval and restore
- Version comparison/diff
- Version naming and labeling
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from database import get_async_session, Resume, ResumeVersion
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/resumes", tags=["Version History"])


# ============== Pydantic Models ==============


class VersionInfo(BaseModel):
    """Basic version information."""

    id: int
    version_number: int
    version_name: Optional[str] = None
    change_description: Optional[str] = None
    created_at: str
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class VersionDetail(BaseModel):
    """Full version details with data."""

    id: int
    resume_id: int
    version_number: int
    version_name: Optional[str] = None
    change_description: Optional[str] = None
    data: Dict[str, Any]
    created_at: str
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class VersionDiff(BaseModel):
    """Version comparison result."""

    from_version: int
    to_version: int
    added: List[str] = []
    removed: List[str] = []
    modified: List[str] = []
    unchanged: List[str] = []


class VersionCreate(BaseModel):
    """Model for creating a new version."""

    version_name: Optional[str] = None
    change_description: Optional[str] = None


class VersionUpdate(BaseModel):
    """Model for updating version metadata."""

    version_name: Optional[str] = None
    change_description: Optional[str] = None


# ============== Helper Functions ==============


async def get_resume_or_404(resume_id: int, db: AsyncSession) -> Resume:
    """Get resume by ID or raise 404."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


async def check_resume_access(resume: Resume, user_id: int) -> bool:
    """Check if user has access to resume."""
    return resume.owner_id == user_id


def calculate_diff(data1: Dict[str, Any], data2: Dict[str, Any]) -> VersionDiff:
    """Calculate simple diff between two version data objects."""
    added = []
    removed = []
    modified = []
    unchanged = []

    all_keys = set(data1.keys()) | set(data2.keys())

    for key in all_keys:
        if key not in data1:
            added.append(key)
        elif key not in data2:
            removed.append(key)
        elif data1[key] != data2[key]:
            modified.append(key)
        else:
            unchanged.append(key)

    return VersionDiff(
        from_version=0,
        to_version=0,
        added=added,
        removed=removed,
        modified=modified,
        unchanged=unchanged,
    )


# ============== Version History Endpoints ==============


@router.get("/{resume_id}/versions", response_model=List[VersionInfo])
async def list_versions(
    resume_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List all versions of a resume.

    Returns versions in reverse chronological order (newest first).
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check access
    if not await check_resume_access(resume, current_user["id"]):
        raise HTTPException(status_code=403, detail="You don't have access to this resume")

    result = await db.execute(
        select(ResumeVersion)
        .where(ResumeVersion.resume_id == resume_id)
        .order_by(desc(ResumeVersion.version_number))
    )
    versions = result.scalars().all()

    return [
        VersionInfo(
            id=v.id,
            version_number=v.version_number,
            version_name=None,  # Could add version_name column in future
            change_description=v.change_description,
            created_at=v.created_at.isoformat(),
            created_by=None,
        )
        for v in versions
    ]


@router.get("/{resume_id}/versions/{version_id}", response_model=VersionDetail)
async def get_version(
    resume_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get details of a specific version.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check access
    if not await check_resume_access(resume, current_user["id"]):
        raise HTTPException(status_code=403, detail="You don't have access to this resume")

    result = await db.execute(
        select(ResumeVersion).where(
            and_(
                ResumeVersion.id == version_id,
                ResumeVersion.resume_id == resume_id,
            )
        )
    )
    version = result.scalar_one_or_none()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    return VersionDetail(
        id=version.id,
        resume_id=version.resume_id,
        version_number=version.version_number,
        version_name=None,
        change_description=version.change_description,
        data=version.data,
        created_at=version.created_at.isoformat(),
        created_by=None,
    )


@router.post("/{resume_id}/versions", response_model=VersionInfo, status_code=status.HTTP_201_CREATED)
async def create_version(
    resume_id: int,
    version_data: VersionCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Create a new version snapshot of the current resume.

    This creates a snapshot of the current resume state as a new version.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if not await check_resume_access(resume, current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the resume owner can create versions")

    # Get the next version number
    result = await db.execute(
        select(func.max(ResumeVersion.version_number)).where(
            ResumeVersion.resume_id == resume_id
        )
    )
    max_version = result.scalar() or 0
    next_version = max_version + 1

    # Create version with current resume data
    version = ResumeVersion(
        resume_id=resume_id,
        version_number=next_version,
        data=resume.data,
        change_description=version_data.change_description,
    )

    db.add(version)
    await db.commit()
    await db.refresh(version)

    return VersionInfo(
        id=version.id,
        version_number=version.version_number,
        version_name=version_data.version_name,
        change_description=version.change_description,
        created_at=version.created_at.isoformat(),
        created_by=None,
    )


@router.post("/{resume_id}/versions/{version_id}/restore", response_model=dict)
async def restore_version(
    resume_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Restore a resume to a previous version.

    This creates a new version with the restored data.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if not await check_resume_access(resume, current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the resume owner can restore versions")

    # Get the version to restore
    result = await db.execute(
        select(ResumeVersion).where(
            and_(
                ResumeVersion.id == version_id,
                ResumeVersion.resume_id == resume_id,
            )
        )
    )
    version = result.scalar_one_or_none()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Update resume data
    resume.data = version.data
    resume.updated_at = func.now()

    # Create a new version for the restore action
    restore_result = await db.execute(
        select(func.max(ResumeVersion.version_number)).where(
            ResumeVersion.resume_id == resume_id
        )
    )
    max_version = restore_result.scalar() or 0
    next_version = max_version + 1

    restore_version = ResumeVersion(
        resume_id=resume_id,
        version_number=next_version,
        data=version.data,
        change_description=f"Restored from version {version.version_number}",
    )

    db.add(restore_version)
    await db.commit()

    return {
        "status": "restored",
        "restored_from_version": version.version_number,
        "new_version": next_version,
    }


@router.delete("/{resume_id}/versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_version(
    resume_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Delete a specific version.

    Cannot delete the last remaining version.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if not await check_resume_access(resume, current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the resume owner can delete versions")

    # Check how many versions exist
    count_result = await db.execute(
        select(func.count()).where(ResumeVersion.resume_id == resume_id)
    )
    version_count = count_result.scalar() or 0

    if version_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the last remaining version",
        )

    # Find and delete version
    result = await db.execute(
        select(ResumeVersion).where(
            and_(
                ResumeVersion.id == version_id,
                ResumeVersion.resume_id == resume_id,
            )
        )
    )
    version = result.scalar_one_or_none()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    await db.delete(version)
    await db.commit()

    return None


@router.get("/{resume_id}/versions/{from_id}/compare/{to_id}", response_model=VersionDiff)
async def compare_versions(
    resume_id: int,
    from_id: int,
    to_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Compare two versions and show differences.

    Returns added, removed, modified, and unchanged sections.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check access
    if not await check_resume_access(resume, current_user["id"]):
        raise HTTPException(status_code=403, detail="You don't have access to this resume")

    # Get both versions
    result = await db.execute(
        select(ResumeVersion).where(
            and_(
                ResumeVersion.id.in_([from_id, to_id]),
                ResumeVersion.resume_id == resume_id,
            )
        )
    )
    versions = result.scalars().all()

    if len(versions) != 2:
        raise HTTPException(status_code=404, detail="One or both versions not found")

    version1 = versions[0] if versions[0].id == from_id else versions[1]
    version2 = versions[1] if versions[0].id == from_id else versions[0]

    # Calculate diff
    diff = calculate_diff(version1.data, version2.data)
    diff.from_version = version1.version_number
    diff.to_version = version2.version_number

    return diff


@router.put("/{resume_id}/versions/{version_id}", response_model=VersionInfo)
async def update_version(
    resume_id: int,
    version_id: int,
    version_data: VersionUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Update version metadata (name, description).

    Cannot change the version data itself.
    """
    resume = await get_resume_or_404(resume_id, db)

    # Check ownership
    if not await check_resume_access(resume, current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the resume owner can update versions")

    result = await db.execute(
        select(ResumeVersion).where(
            and_(
                ResumeVersion.id == version_id,
                ResumeVersion.resume_id == resume_id,
            )
        )
    )
    version = result.scalar_one_or_none()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Update metadata
    update_data = version_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(version, field, value)

    await db.commit()
    await db.refresh(version)

    return VersionInfo(
        id=version.id,
        version_number=version.version_number,
        version_name=version_data.version_name,
        change_description=version.change_description,
        created_at=version.created_at.isoformat(),
        created_by=None,
    )
