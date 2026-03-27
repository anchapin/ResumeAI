"""
Advanced features API routes for ResumeAI.

Includes endpoints for:
- Resume versioning and history tracking
- Collaboration features (comments, sharing)
- Advanced formatting options
- Multi-format export
- Bulk operations
- Template search and filtering
- Keyboard shortcuts
- Resume import
- User settings
"""

import os
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import (
    # Request models
    CreateResumeRequest,
    UpdateResumeRequest,
    CommentRequest,
    ShareResumeRequest,
    ShareResumeResponse,
    BulkOperationRequest,
    BulkOperationResponse,
    UserSettingsRequest,
    # Batch operation models
    BatchCreateRequest,
    BatchCreateResponse,
    BatchUpdateRequest,
    BatchUpdateResponse,
    BatchDeleteRequest,
    BatchDeleteResponse,
    BatchExportRequest,
    BatchExportResponse,
    BatchProgressResponse,
    # Response models
    ResumeMetadata,
    ResumeResponse,
    ResumeVersionResponse,
    CommentResponse,
    ResumeData,
    UserSettingsResponse,
)
from database import (
    get_db,
    Resume,
    ResumeVersion,
    Comment,
    ResumeShare,
    Tag,
    UserSettings,
)
from config.dependencies import AuthorizedAPIKey, rate_limit
from lib.utils.validators import validate_resume_data
from lib.utils.cache import cached
from lib.utils.cache_integration import CacheInvalidationHook

router = APIRouter(prefix="/advanced", tags=["Advanced"])


# ============ Resume CRUD with Versioning ============


@router.post(
    "/resumes",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Resumes"],
)
async def create_resume(
    request: CreateResumeRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Create a new resume with initial version.

    Creates a resume and automatically creates the first version (version 1).
    """
    try:
        # Validate and escape resume data
        resume_dict = request.data.model_dump(exclude_none=True)
        resume_dict = validate_resume_data(resume_dict)

        # Create resume
        resume = Resume(
            title=request.title,
            data=resume_dict,
        )

        # Add tags
        if request.tags:
            # ⚡ Bolt: Bulk query to eliminate N+1 tag lookups
            result = await db.execute(select(Tag).where(Tag.name.in_(request.tags)))
            existing_tags = {t.name: t for t in result.scalars().all()}

            new_tags_added = False
            for tag_name in request.tags:
                if tag_name in existing_tags:
                    resume.tags.append(existing_tags[tag_name])
                else:
                    new_tag = Tag(name=tag_name)
                    db.add(new_tag)
                    existing_tags[tag_name] = new_tag
                    resume.tags.append(new_tag)
                    new_tags_added = True

            if new_tags_added:
                await db.flush()

        db.add(resume)
        await db.flush()

        # Create initial version
        version = ResumeVersion(
            resume_id=resume.id,
            data=resume_dict,
            version_number=1,
            change_description="Initial version",
        )
        db.add(version)
        await db.flush()

        await db.commit()
        await db.refresh(resume)

        current_version_result = await db.execute(
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume.id)
            .order_by(ResumeVersion.version_number.desc())
            .limit(1)
        )
        current_version = current_version_result.scalar_one_or_none()

        return ResumeResponse(
            id=resume.id,
            title=resume.title,
            data=ResumeData(**resume.data),
            tags=[tag.name for tag in resume.tags],
            is_public=resume.is_public,
            current_version_id=current_version.id if current_version else None,
            created_at=resume.created_at.isoformat(),
            updated_at=resume.updated_at.isoformat(),
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create resume: {str(e)}",
        )


@router.get(
    "/resumes",
    response_model=List[ResumeMetadata],
    tags=["Resumes"],
)
async def list_resumes(
    skip: int = Query(0, ge=0, description="Number of results to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of results to return"),
    search: Optional[str] = Query(None, description="Search by title"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    List all resumes with optional filtering.

    Returns paginated list of resumes with metadata.
    """
    try:
        query = select(Resume).options(selectinload(Resume.tags))

        # Apply filters
        if search:
            query = query.where(Resume.title.ilike(f"%{search}%"))
        if tag:
            query = query.join(Resume.tags).where(Tag.name == tag)

        query = query.order_by(Resume.updated_at.desc()).offset(skip).limit(limit)

        result = await db.execute(query)
        resumes = result.scalars().all()

        return [
            ResumeMetadata(
                id=resume.id,
                title=resume.title,
                tags=[tag.name for tag in resume.tags],
                is_public=resume.is_public,
                created_at=resume.created_at.isoformat(),
                updated_at=resume.updated_at.isoformat(),
                version_count=len(resume.versions),
            )
            for resume in resumes
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list resumes: {str(e)}",
        )


@router.get(
    "/resumes/{resume_id}",
    response_model=ResumeResponse,
    tags=["Resumes"],
)
@cached("resume:profile")
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Get a specific resume by ID.

    Returns the resume with all data and metadata.
    """
    try:
        result = await db.execute(
            select(Resume).options(selectinload(Resume.tags)).where(Resume.id == resume_id)
        )
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        # Get current version (latest by version_number)
        current_version_result = await db.execute(
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume.id)
            .order_by(ResumeVersion.version_number.desc())
            .limit(1)
        )
        current_version = current_version_result.scalar_one_or_none()

        return ResumeResponse(
            id=resume.id,
            title=resume.title,
            data=ResumeData(**resume.data),
            tags=[tag.name for tag in resume.tags],
            is_public=resume.is_public,
            current_version_id=current_version.id if current_version else None,
            created_at=resume.created_at.isoformat(),
            updated_at=resume.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resume: {str(e)}",
        )


@router.put(
    "/resumes/{resume_id}",
    response_model=ResumeResponse,
    tags=["Resumes"],
)
async def update_resume(
    resume_id: int,
    request: UpdateResumeRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Update a resume and create a new version.

    Creates a new version automatically when data changes.
    """
    try:
        result = await db.execute(
            select(Resume)
            .options(selectinload(Resume.tags))
            .options(selectinload(Resume.versions))
            .where(Resume.id == resume_id)
        )
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        # Update fields
        if request.title:
            resume.title = request.title
        if request.data:
            # Validate and escape resume data
            resume_dict = request.data.model_dump(exclude_none=True)
            resume_dict = validate_resume_data(resume_dict)
            resume.data = resume_dict

        # Update tags if provided
        if request.tags is not None:
            resume.tags.clear()
            if request.tags:
                # ⚡ Bolt: Bulk query to eliminate N+1 tag lookups
                result = await db.execute(select(Tag).where(Tag.name.in_(request.tags)))
                existing_tags = {t.name: t for t in result.scalars().all()}

                new_tags_added = False
                for tag_name in request.tags:
                    if tag_name in existing_tags:
                        resume.tags.append(existing_tags[tag_name])
                    else:
                        new_tag = Tag(name=tag_name)
                        db.add(new_tag)
                        existing_tags[tag_name] = new_tag
                        resume.tags.append(new_tag)
                        new_tags_added = True

                if new_tags_added:
                    await db.flush()

        # Create new version if data changed
        if request.data:
            # Validate and escape resume data
            resume_dict = request.data.model_dump(exclude_none=True)
            resume_dict = validate_resume_data(resume_dict)

            # Calculate next version number
            version_count = len(resume.versions)
            new_version = ResumeVersion(
                resume_id=resume.id,
                data=resume_dict,
                version_number=version_count + 1,
                change_description=request.change_description or "Updated resume",
            )
            db.add(new_version)
            await db.flush()

        await db.commit()
        await db.refresh(resume)

        # Invalidate cache
        await CacheInvalidationHook({"resume", f"resume:{resume_id}"}).invalidate()

        # Get current version (latest by version_number)
        current_version_result = await db.execute(
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume.id)
            .order_by(ResumeVersion.version_number.desc())
            .limit(1)
        )
        current_version = current_version_result.scalar_one_or_none()

        return ResumeResponse(
            id=resume.id,
            title=resume.title,
            data=ResumeData(**resume.data),
            tags=[tag.name for tag in resume.tags],
            is_public=resume.is_public,
            current_version_id=current_version.id if current_version else None,
            created_at=resume.created_at.isoformat(),
            updated_at=resume.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update resume: {str(e)}",
        )


@router.delete(
    "/resumes/{resume_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Resumes"],
)
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """Delete a resume and all its versions."""
    try:
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        await db.delete(resume)
        await db.commit()

        # Invalidate cache
        await CacheInvalidationHook({"resume", f"resume:{resume_id}"}).invalidate()

        return None
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete resume: {str(e)}",
        )


# ============ Resume Versioning ============


@router.get(
    "/resumes/{resume_id}/versions",
    response_model=List[ResumeVersionResponse],
    tags=["Versions"],
)
async def list_resume_versions(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    List all versions of a resume.

    Returns version history with timestamps and change descriptions.
    """
    try:
        # Verify resume exists
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        # Get versions
        result = await db.execute(
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume_id)
            .order_by(ResumeVersion.version_number.desc())
        )
        versions = result.scalars().all()

        return [
            ResumeVersionResponse(
                id=version.id,
                resume_id=version.resume_id,
                version_number=version.version_number,
                data=ResumeData(**version.data),
                change_description=version.change_description,
                created_at=version.created_at.isoformat(),
            )
            for version in versions
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list versions: {str(e)}",
        )


@router.get(
    "/resumes/{resume_id}/versions/{version_id}",
    response_model=ResumeVersionResponse,
    tags=["Versions"],
)
async def get_resume_version(
    resume_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Get a specific version of a resume.

    Returns the full resume data for that version.
    """
    try:
        result = await db.execute(
            select(ResumeVersion).where(
                and_(
                    ResumeVersion.resume_id == resume_id,
                    ResumeVersion.id == version_id,
                )
            )
        )
        version = result.scalar_one_or_none()

        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Version not found",
            )

        return ResumeVersionResponse(
            id=version.id,
            resume_id=version.resume_id,
            version_number=version.version_number,
            data=ResumeData(**version.data),
            change_description=version.change_description,
            created_at=version.created_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get version: {str(e)}",
        )


@router.post(
    "/resumes/{resume_id}/versions/{version_id}/restore",
    response_model=ResumeResponse,
    tags=["Versions"],
)
async def restore_resume_version(
    resume_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Restore a resume to a previous version.

    Creates a new version with the restored data.
    """
    try:
        # Get the version to restore
        result = await db.execute(
            select(ResumeVersion).where(
                and_(
                    ResumeVersion.resume_id == resume_id,
                    ResumeVersion.id == version_id,
                )
            )
        )
        version = result.scalar_one_or_none()

        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Version not found",
            )

        # Get the resume
        result = await db.execute(
            select(Resume)
            .options(selectinload(Resume.tags))
            .options(selectinload(Resume.versions))
            .where(Resume.id == resume_id)
        )
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        # Update resume data
        resume.data = version.data

        # Create new version for the restore
        version_count = len(resume.versions)
        new_version = ResumeVersion(
            resume_id=resume.id,
            data=version.data,
            version_number=version_count + 1,
            change_description=f"Restored from version {version.version_number}",
        )
        db.add(new_version)
        await db.flush()

        await db.commit()
        await db.refresh(resume)

        # Invalidate cache
        await CacheInvalidationHook({"resume", f"resume:{resume_id}"}).invalidate()

        # Get current version (latest by version_number)
        current_version_result = await db.execute(
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume.id)
            .order_by(ResumeVersion.version_number.desc())
            .limit(1)
        )
        current_version = current_version_result.scalar_one_or_none()

        return ResumeResponse(
            id=resume.id,
            title=resume.title,
            data=ResumeData(**resume.data),
            tags=[tag.name for tag in resume.tags],
            is_public=resume.is_public,
            current_version_id=current_version.id if current_version else None,
            created_at=resume.created_at.isoformat(),
            updated_at=resume.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore version: {str(e)}",
        )


# ============ Comments (Collaboration) ============


@router.get(
    "/resumes/{resume_id}/comments",
    response_model=List[CommentResponse],
    tags=["Comments"],
)
async def list_comments(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """List all comments for a resume."""
    try:
        # Verify resume exists
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        # Get comments
        result = await db.execute(
            select(Comment)
            .where(Comment.resume_id == resume_id)
            .order_by(Comment.created_at.desc())
        )
        comments = result.scalars().all()

        return [
            CommentResponse(
                id=comment.id,
                resume_id=comment.resume_id,
                author_name=comment.author_name,
                author_email=comment.author_email,
                content=comment.content,
                section=comment.section,
                is_resolved=comment.is_resolved,
                created_at=comment.created_at.isoformat(),
                updated_at=comment.updated_at.isoformat(),
            )
            for comment in comments
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list comments: {str(e)}",
        )


@router.post(
    "/resumes/{resume_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Comments"],
)
async def create_comment(
    resume_id: int,
    request: CommentRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """Add a comment to a resume."""
    try:
        # Verify resume exists
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        # Create comment
        comment = Comment(
            resume_id=resume_id,
            author_name=request.author_name,
            author_email=request.author_email,
            content=request.content,
            section=request.section,
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)

        return CommentResponse(
            id=comment.id,
            resume_id=comment.resume_id,
            author_name=comment.author_name,
            author_email=comment.author_email,
            content=comment.content,
            section=comment.section,
            is_resolved=comment.is_resolved,
            created_at=comment.created_at.isoformat(),
            updated_at=comment.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create comment: {str(e)}",
        )


@router.patch(
    "/comments/{comment_id}/resolve",
    response_model=CommentResponse,
    tags=["Comments"],
)
async def resolve_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """Mark a comment as resolved."""
    try:
        result = await db.execute(select(Comment).where(Comment.id == comment_id))
        comment = result.scalar_one_or_none()

        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Comment with ID {comment_id} not found",
            )

        comment.is_resolved = True
        await db.commit()
        await db.refresh(comment)

        return CommentResponse(
            id=comment.id,
            resume_id=comment.resume_id,
            author_name=comment.author_name,
            author_email=comment.author_email,
            content=comment.content,
            section=comment.section,
            is_resolved=comment.is_resolved,
            created_at=comment.created_at.isoformat(),
            updated_at=comment.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve comment: {str(e)}",
        )


# ============ Sharing ============


@router.post(
    "/resumes/{resume_id}/share",
    response_model=ShareResumeResponse,
    tags=["Sharing"],
)
async def share_resume(
    resume_id: int,
    request: ShareResumeRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Create a shareable link for a resume.

    Generates a unique token and optional expiration/password.
    """
    try:
        # Verify resume exists
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {resume_id} not found",
            )

        # Generate share token
        share_token = secrets.token_urlsafe(32)

        # Parse expiration date
        expires_at = None
        if request.expires_at:
            try:
                expires_at = datetime.fromisoformat(request.expires_at)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid expiration date format. Use ISO 8601 format.",
                )

        # Create share
        share = ResumeShare(
            resume_id=resume_id,
            share_token=share_token,
            permissions=request.permissions,
            expires_at=expires_at,
            max_views=request.max_views,
            created_by=auth.key_name if hasattr(auth, "key_name") else None,
        )

        # Hash password if provided
        if request.password:
            import hashlib

            share.share_password_hash = hashlib.sha256(request.password.encode()).hexdigest()

        db.add(share)

        # Update resume
        resume.is_public = True
        resume.share_token = share_token
        if expires_at:
            resume.share_expires_at = expires_at
        if request.password:
            resume.share_password_hash = share.share_password_hash

        await db.commit()

        # Construct share URL
        share_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/share/{share_token}"

        return ShareResumeResponse(
            share_token=share_token,
            share_url=share_url,
            permissions=request.permissions,
            expires_at=request.expires_at,
            max_views=request.max_views,
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create share link: {str(e)}",
        )


@router.get(
    "/share/{share_token}",
    response_model=ResumeResponse,
    tags=["Sharing"],
)
async def access_shared_resume(
    share_token: str,
    password: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Access a shared resume.

    Validates the share token and optional password.
    """
    try:
        # Get share
        result = await db.execute(select(ResumeShare).where(ResumeShare.share_token == share_token))
        share = result.scalar_one_or_none()

        if not share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared resume not found",
            )

        # Check expiration
        if share.expires_at and share.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Shared link has expired",
            )

        # Check view limit
        if share.max_views and share.view_count >= share.max_views:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Maximum view limit reached",
            )

        # Check password
        if share.share_password_hash:
            if not password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Password required",
                )
            import hashlib

            password_hash = hashlib.sha256(password.encode()).hexdigest()
            if password_hash != share.share_password_hash:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid password",
                )

        # Increment view count
        share.view_count += 1
        await db.commit()

        # Get resume
        result = await db.execute(
            select(Resume).options(selectinload(Resume.tags)).where(Resume.id == share.resume_id)
        )
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found",
            )

        # Get current version (latest by version_number)
        current_version_result = await db.execute(
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume.id)
            .order_by(ResumeVersion.version_number.desc())
            .limit(1)
        )
        current_version = current_version_result.scalar_one_or_none()

        return ResumeResponse(
            id=resume.id,
            title=resume.title,
            data=ResumeData(**resume.data),
            tags=[tag.name for tag in resume.tags],
            is_public=resume.is_public,
            current_version_id=current_version.id if current_version else None,
            created_at=resume.created_at.isoformat(),
            updated_at=resume.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to access shared resume: {str(e)}",
        )


# ============ Bulk Operations ============


@router.post(
    "/resumes/bulk",
    response_model=BulkOperationResponse,
    tags=["Resumes"],
)
async def _process_bulk_operation(
    resume: Resume,
    operation: str,
    tags: list[str],
    db: AsyncSession,
) -> tuple[bool, str]:
    """Process a single bulk operation on a resume."""
    if operation == "delete":
        await db.delete(resume)
        await db.flush()
        return True, ""

    if operation == "duplicate":
        new_resume = Resume(
            title=f"{resume.title} (Copy)",
            data=resume.data,
        )
        db.add(new_resume)
        await db.flush()
        for tag in resume.tags:
            new_resume.tags.append(tag)
        return True, ""

    if operation == "tag" and tags:
        # ⚡ Bolt: Bulk query to eliminate N+1 tag lookups
        result = await db.execute(select(Tag).where(Tag.name.in_(tags)))
        existing_tags = {t.name: t for t in result.scalars().all()}

        new_tags_added = False
        for tag_name in tags:
            tag_to_add = None
            if tag_name in existing_tags:
                tag_to_add = existing_tags[tag_name]
            else:
                tag_to_add = Tag(name=tag_name)
                db.add(tag_to_add)
                existing_tags[tag_name] = tag_to_add
                new_tags_added = True

            if tag_to_add not in resume.tags:
                resume.tags.append(tag_to_add)

        if new_tags_added:
            await db.flush()
        return True, ""

    return False, "Unknown operation"


async def bulk_operations(
    request: BulkOperationRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Perform bulk operations on multiple resumes.

    Supports: delete, export, duplicate, tag.
    """
    try:
        successful = []
        failed = []

        for resume_id in request.resume_ids:
            try:
                result = await db.execute(select(Resume).where(Resume.id == resume_id))
                resume = result.scalar_one_or_none()

                if not resume:
                    failed.append({"id": resume_id, "error": "Resume not found"})
                    continue

                success, error = await _process_bulk_operation(
                    resume, request.operation, request.tags, db
                )
                if success:
                    successful.append(resume_id)
                else:
                    failed.append({"id": resume_id, "error": error})

                if request.operation == "export":
                    # This would trigger async export job
                    # For now, just mark as successful
                    successful.append(resume_id)

                else:
                    failed.append(
                        {
                            "id": resume_id,
                            "error": f"Unknown operation: {request.operation}",
                        }
                    )

            except Exception as e:
                failed.append({"id": resume_id, "error": str(e)})
                await db.rollback()

        await db.commit()

        return BulkOperationResponse(
            successful=successful,
            failed=failed,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk operation failed: {str(e)}",
        )


# ============ Batch Operations ============


@router.post(
    "/resumes/batch-create",
    response_model=BatchCreateResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Resumes"],
)
@rate_limit("10/minute")  # Stricter rate limit for batch operations
async def batch_create_resumes(
    request: BatchCreateRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Create multiple resumes in a batch.

    This endpoint allows creating up to 50 resumes in a single request.
    Returns partial success if some resumes fail to create.
    """
    successful = []
    failed = []

    for idx, resume_request in enumerate(request.resumes):
        try:
            # Validate and escape resume data
            resume_dict = resume_request.data.model_dump(exclude_none=True)
            resume_dict = validate_resume_data(resume_dict)

            # Create resume
            resume = Resume(
                title=resume_request.title,
                data=resume_dict,
            )

            # Add tags
            if resume_request.tags:
                # ⚡ Bolt: Bulk query to eliminate N+1 tag lookups
                result = await db.execute(select(Tag).where(Tag.name.in_(resume_request.tags)))
                existing_tags = {t.name: t for t in result.scalars().all()}

                new_tags_added = False
                for tag_name in resume_request.tags:
                    if tag_name in existing_tags:
                        resume.tags.append(existing_tags[tag_name])
                    else:
                        new_tag = Tag(name=tag_name)
                        db.add(new_tag)
                        existing_tags[tag_name] = new_tag
                        resume.tags.append(new_tag)
                        new_tags_added = True

                if new_tags_added:
                    await db.flush()

            db.add(resume)
            await db.flush()

            # Create initial version
            version = ResumeVersion(
                resume_id=resume.id,
                data=resume_dict,
                version_number=1,
                change_description="Initial version",
            )
            db.add(version)
            await db.flush()

            await db.commit()
            await db.refresh(resume)

            # Load tags for response
            result = await db.execute(
                select(Resume).options(selectinload(Resume.tags)).where(Resume.id == resume.id)
            )
            resume = result.scalar_one()

            successful.append(
                ResumeResponse(
                    id=resume.id,
                    title=resume.title,
                    data=ResumeData(**resume.data),
                    tags=[tag.name for tag in resume.tags],
                    is_public=resume.is_public,
                    current_version_id=resume.current_version_id,
                    created_at=resume.created_at.isoformat(),
                    updated_at=resume.updated_at.isoformat(),
                )
            )

        except Exception as e:
            await db.rollback()
            failed.append(
                {
                    "index": idx,
                    "title": (
                        resume_request.title
                        if hasattr(resume_request, "title")
                        else f"Resume {idx}"
                    ),
                    "error": str(e),
                }
            )

    return BatchCreateResponse(
        successful=successful,
        failed=failed,
        total_created=len(successful),
        total_failed=len(failed),
    )


@router.put(
    "/resumes/batch-update",
    response_model=BatchUpdateResponse,
    tags=["Resumes"],
)
@rate_limit("10/minute")  # Stricter rate limit for batch operations
async def batch_update_resumes(
    request: BatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Update multiple resumes in a batch.

    This endpoint allows updating up to 50 resumes in a single request.
    Each update request must include the resume ID.
    Returns partial success if some resumes fail to update.
    """
    successful = []
    failed = []

    for idx, update_request in enumerate(request.resumes):
        try:
            # Get resume by ID
            result = await db.execute(
                select(Resume)
                .options(selectinload(Resume.tags))
                .options(selectinload(Resume.versions))
                .where(Resume.id == update_request.id)
            )
            resume = result.scalar_one_or_none()

            if not resume:
                failed.append(
                    {
                        "index": idx,
                        "id": update_request.id,
                        "error": f"Resume with ID {update_request.id} not found",
                    }
                )
                continue

            # Update fields
            if update_request.title:
                resume.title = update_request.title
            if update_request.data:
                # Validate and escape resume data
                resume_dict = update_request.data.model_dump(exclude_none=True)
                resume_dict = validate_resume_data(resume_dict)
                resume.data = resume_dict

            # Update tags if provided
            if update_request.tags is not None:
                resume.tags.clear()
                if update_request.tags:
                    # ⚡ Bolt: Bulk query to eliminate N+1 tag lookups
                    result = await db.execute(select(Tag).where(Tag.name.in_(update_request.tags)))
                    existing_tags = {t.name: t for t in result.scalars().all()}

                    new_tags_added = False
                    for tag_name in update_request.tags:
                        if tag_name in existing_tags:
                            resume.tags.append(existing_tags[tag_name])
                        else:
                            new_tag = Tag(name=tag_name)
                            db.add(new_tag)
                            existing_tags[tag_name] = new_tag
                            resume.tags.append(new_tag)
                            new_tags_added = True

                    if new_tags_added:
                        await db.flush()

            await db.commit()
            await db.refresh(resume)

            # Get latest version
            version_result = await db.execute(
                select(ResumeVersion)
                .where(ResumeVersion.resume_id == resume.id)
                .order_by(ResumeVersion.version_number.desc())
                .limit(1)
            )
            current_version = version_result.scalar_one_or_none()

            successful.append(
                ResumeResponse(
                    id=resume.id,
                    title=resume.title,
                    data=ResumeData(**resume.data),
                    tags=[tag.name for tag in resume.tags],
                    is_public=resume.is_public,
                    current_version_id=current_version.id if current_version else None,
                    created_at=resume.created_at.isoformat(),
                    updated_at=resume.updated_at.isoformat(),
                )
            )

        except Exception as e:
            await db.rollback()
            failed.append(
                {
                    "index": idx,
                    "id": update_request.id if hasattr(update_request, "id") else None,
                    "error": str(e),
                }
            )

    return BatchUpdateResponse(
        successful=successful,
        failed=failed,
        total_updated=len(successful),
        total_failed=len(failed),
    )


@router.delete(
    "/resumes/batch-delete",
    response_model=BatchDeleteResponse,
    tags=["Resumes"],
)
@rate_limit("10/minute")  # Stricter rate limit for batch operations
async def batch_delete_resumes(
    request: BatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Delete multiple resumes in a batch.

    This endpoint allows deleting up to 100 resumes in a single request.
    Returns partial success if some resumes fail to delete.
    """
    successful = []
    failed = []

    for resume_id in request.resume_ids:
        try:
            result = await db.execute(
                select(Resume).options(selectinload(Resume.tags)).where(Resume.id == resume_id)
            )
            resume = result.scalar_one_or_none()

            if not resume:
                failed.append({"id": resume_id, "error": "Resume not found"})
                continue

            await db.delete(resume)
            await db.flush()
            successful.append(resume_id)

        except Exception as e:
            await db.rollback()
            failed.append({"id": resume_id, "error": str(e)})

    await db.commit()

    return BatchDeleteResponse(
        successful=successful,
        failed=failed,
        total_deleted=len(successful),
        total_failed=len(failed),
    )


@router.post(
    "/resumes/batch-export",
    response_model=BatchExportResponse,
    tags=["Resumes"],
)
@rate_limit("5/minute")  # Stricter rate limit for batch export
async def batch_export_resumes(
    request: BatchExportRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Export multiple resumes in a batch.

    This endpoint allows exporting up to 50 resumes in a single request.
    Returns download URLs for successfully exported resumes.
    """
    import uuid

    successful = []
    failed = []
    export_job_id = str(uuid.uuid4())

    for resume_id in request.resume_ids:
        try:
            result = await db.execute(
                select(Resume).options(selectinload(Resume.tags)).where(Resume.id == resume_id)
            )
            resume = result.scalar_one_or_none()

            if not resume:
                failed.append({"id": resume_id, "error": "Resume not found"})
                continue

            # In a real implementation, this would trigger an async export job
            # and return a job ID for progress tracking
            # For now, we simulate successful export with a placeholder URL
            successful.append(
                {
                    "id": resume_id,
                    "title": resume.title,
                    "format": request.format,
                    "download_url": f"/api/v1/exports/{export_job_id}/resume_{resume_id}.{request.format}",
                }
            )

        except Exception as e:
            failed.append({"id": resume_id, "error": str(e)})

    return BatchExportResponse(
        successful=successful,
        failed=failed,
        total_exported=len(successful),
        total_failed=len(failed),
        export_job_id=export_job_id,
    )


@router.get(
    "/resumes/batch-export/{job_id}",
    response_model=BatchProgressResponse,
    tags=["Resumes"],
)
async def get_batch_export_progress(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """
    Get progress of a batch export job.

    This endpoint allows tracking the progress of a batch export operation.
    """
    from datetime import datetime, timezone

    # In a real implementation, this would query a job tracking system
    # For now, return a mock response
    return BatchProgressResponse(
        job_id=job_id,
        status="completed",
        total=0,
        processed=0,
        successful=0,
        failed=0,
        results=None,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


# ============ User Settings ============


@router.get(
    "/settings/{user_identifier}",
    response_model=UserSettingsResponse,
    tags=["Settings"],
)
@cached(config_name="user:settings")
async def get_user_settings(
    user_identifier: str,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """Get user settings."""
    try:
        result = await db.execute(
            select(UserSettings).where(UserSettings.user_identifier == user_identifier)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            # Create default settings
            settings = UserSettings(user_identifier=user_identifier)
            db.add(settings)
            await db.commit()
            await db.refresh(settings)

        return UserSettingsResponse(
            keyboard_shortcuts_enabled=settings.keyboard_shortcuts_enabled,
            high_contrast_mode=settings.high_contrast_mode,
            reduced_motion=settings.reduced_motion,
            screen_reader_optimized=settings.screen_reader_optimized,
            default_font=settings.default_font,
            default_font_size=settings.default_font_size,
            default_spacing=settings.default_spacing,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get settings: {str(e)}",
        )


@router.put(
    "/settings/{user_identifier}",
    response_model=UserSettingsResponse,
    tags=["Settings"],
)
async def update_user_settings(
    user_identifier: str,
    request: UserSettingsRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthorizedAPIKey = Depends(),
):
    """Update user settings."""
    try:
        result = await db.execute(
            select(UserSettings).where(UserSettings.user_identifier == user_identifier)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            settings = UserSettings(user_identifier=user_identifier)
            db.add(settings)
            await db.flush()

        # Update settings
        if request.keyboard_shortcuts_enabled is not None:
            settings.keyboard_shortcuts_enabled = request.keyboard_shortcuts_enabled
        if request.high_contrast_mode is not None:
            settings.high_contrast_mode = request.high_contrast_mode
        if request.reduced_motion is not None:
            settings.reduced_motion = request.reduced_motion
        if request.screen_reader_optimized is not None:
            settings.screen_reader_optimized = request.screen_reader_optimized
        if request.default_font is not None:
            settings.default_font = request.default_font
        if request.default_font_size is not None:
            settings.default_font_size = request.default_font_size
        if request.default_spacing is not None:
            settings.default_spacing = request.default_spacing

        await db.commit()
        await db.refresh(settings)

        # Invalidate cache
        await CacheInvalidationHook({"user", "settings", f"user:{user_identifier}"}).invalidate()

        return UserSettingsResponse(
            keyboard_shortcuts_enabled=settings.keyboard_shortcuts_enabled,
            high_contrast_mode=settings.high_contrast_mode,
            reduced_motion=settings.reduced_motion,
            screen_reader_optimized=settings.screen_reader_optimized,
            default_font=settings.default_font,
            default_font_size=settings.default_font_size,
            default_spacing=settings.default_spacing,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}",
        )
