"""
Comments API endpoints.

Provides endpoints for:
- Comment CRUD operations
- Comment threads and replies
- @mentions support
- Comment resolution
"""

import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from database import get_async_session, Comment, Resume, User, TeamMember
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/comments", tags=["Comments"])


# ============== Pydantic Models ==============


class CommentCreate(BaseModel):
    """Model for creating a comment."""

    resume_id: int
    content: str = Field(..., min_length=1, max_length=10000)
    section: Optional[str] = None
    position: Optional[dict] = None
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    """Model for updating a comment."""

    content: str = Field(..., min_length=1, max_length=10000)


class CommentResponse(BaseModel):
    """Comment response model."""

    id: int
    resume_id: int
    user_id: Optional[int]
    parent_id: Optional[int]
    author_name: str
    author_email: str
    content: str
    section: Optional[str]
    position: Optional[dict]
    is_resolved: bool
    created_at: str
    updated_at: str
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True


# Update forward reference
CommentResponse.update_forward_refs()


class MentionInfo(BaseModel):
    """Information about a mentioned user."""

    user_id: int
    name: str
    email: str


# ============== Helper Functions ==============


def extract_mentions(content: str) -> List[str]:
    """Extract @mentions from comment content."""
    # Match @email or @name patterns
    pattern = r'@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_]+)'
    matches = re.findall(pattern, content)
    return matches


async def check_resume_access(resume_id: int, user_id: int, db: AsyncSession) -> bool:
    """Check if user has access to resume (owner or team member)."""
    # Check ownership
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    
    if not resume:
        return False
    
    if resume.owner_id == user_id:
        return True
    
    # Check team access
    team_result = await db.execute(
        select(Resume)
        .join(TeamMember)
        .where(
            and_(
                Resume.id == resume_id,
                TeamMember.user_id == user_id,
            )
        )
    )
    return team_result.scalar_one_or_none() is not None


# ============== Comment Endpoints ==============


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Create a new comment or reply.

    For replies, set parent_id to the parent comment ID.
    Supports @mentions in content (e.g., @user@example.com).
    """
    # Check resume access
    has_access = await check_resume_access(comment_data.resume_id, current_user["id"], db)
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this resume")

    # If replying, check parent comment exists
    if comment_data.parent_id:
        parent_result = await db.execute(
            select(Comment).where(Comment.id == comment_data.parent_id)
        )
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    # Get author info from user record (or use defaults for guest users)
    user_result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = user_result.scalar_one_or_none()
    
    author_name = user.full_name or user.username if user else "Anonymous"
    author_email = user.email if user else "guest@example.com"

    # Create comment
    comment = Comment(
        resume_id=comment_data.resume_id,
        user_id=current_user["id"],
        parent_id=comment_data.parent_id,
        author_name=author_name,
        author_email=author_email,
        content=comment_data.content,
        section=comment_data.section,
        position=comment_data.position,
    )

    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    # Extract mentions for notifications (TODO: send notifications)
    mentions = extract_mentions(comment_data.content)
    # TODO: Send notification emails to mentioned users

    return CommentResponse(
        id=comment.id,
        resume_id=comment.resume_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        author_name=comment.author_name,
        author_email=comment.author_email,
        content=comment.content,
        section=comment.section,
        position=comment.position,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        replies=[],
    )


@router.get("/resume/{resume_id}", response_model=List[CommentResponse])
async def get_resume_comments(
    resume_id: int,
    include_resolved: bool = Query(False),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get all comments for a resume.

    Returns top-level comments with nested replies.
    """
    # Check resume access
    has_access = await check_resume_access(resume_id, current_user["id"], db)
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this resume")

    # Build query
    query = select(Comment).where(
        and_(
            Comment.resume_id == resume_id,
            Comment.parent_id.is_(None),  # Only top-level comments
        )
    )

    if not include_resolved:
        query = query.where(
            or_(Comment.is_resolved == False, Comment.is_resolved.is_(None))
        )

    query = query.order_by(Comment.created_at.asc())

    result = await db.execute(query)
    comments = result.scalars().all()

    # Get replies for each comment
    comment_responses = []
    for comment in comments:
        replies_result = await db.execute(
            select(Comment)
            .where(Comment.parent_id == comment.id)
            .order_by(Comment.created_at.asc())
        )
        replies = replies_result.scalars().all()

        comment_response = CommentResponse(
            id=comment.id,
            resume_id=comment.resume_id,
            user_id=comment.user_id,
            parent_id=comment.parent_id,
            author_name=comment.author_name,
            author_email=comment.author_email,
            content=comment.content,
            section=comment.section,
            position=comment.position,
            is_resolved=comment.is_resolved,
            created_at=comment.created_at.isoformat(),
            updated_at=comment.updated_at.isoformat(),
            replies=[
                CommentResponse(
                    id=reply.id,
                    resume_id=reply.resume_id,
                    user_id=reply.user_id,
                    parent_id=reply.parent_id,
                    author_name=reply.author_name,
                    author_email=reply.author_email,
                    content=reply.content,
                    section=reply.section,
                    position=reply.position,
                    is_resolved=reply.is_resolved,
                    created_at=reply.created_at.isoformat(),
                    updated_at=reply.updated_at.isoformat(),
                    replies=[],
                )
                for reply in replies
            ],
        )
        comment_responses.append(comment_response)

    return comment_responses


@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get a specific comment by ID.
    """
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check resume access
    has_access = await check_resume_access(comment.resume_id, current_user["id"], db)
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this comment")

    return CommentResponse(
        id=comment.id,
        resume_id=comment.resume_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        author_name=comment.author_name,
        author_email=comment.author_email,
        content=comment.content,
        section=comment.section,
        position=comment.position,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        replies=[],
    )


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Update a comment.

    Only the comment author can update their comment.
    """
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check ownership
    if comment.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")

    # Update content
    comment.content = comment_data.content
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        resume_id=comment.resume_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        author_name=comment.author_name,
        author_email=comment.author_email,
        content=comment.content,
        section=comment.section,
        position=comment.position,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        replies=[],
    )


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Delete a comment.

    Only the comment author or resume owner can delete.
    """
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check ownership or resume ownership
    resume_result = await db.execute(select(Resume).where(Resume.id == comment.resume_id))
    resume = resume_result.scalar_one_or_none()

    is_author = comment.user_id == current_user["id"]
    is_resume_owner = resume and resume.owner_id == current_user["id"]

    if not is_author and not is_resume_owner:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comments or comments on your resumes",
        )

    await db.delete(comment)
    await db.commit()

    return None


@router.post("/{comment_id}/resolve", response_model=CommentResponse)
async def resolve_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Mark a comment as resolved.

    Only the resume owner or comment author can resolve.
    """
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check ownership or resume ownership
    resume_result = await db.execute(select(Resume).where(Resume.id == comment.resume_id))
    resume = resume_result.scalar_one_or_none()

    is_author = comment.user_id == current_user["id"]
    is_resume_owner = resume and resume.owner_id == current_user["id"]

    if not is_author and not is_resume_owner:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    comment.is_resolved = True
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        resume_id=comment.resume_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        author_name=comment.author_name,
        author_email=comment.author_email,
        content=comment.content,
        section=comment.section,
        position=comment.position,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        replies=[],
    )


@router.post("/{comment_id}/unresolve", response_model=CommentResponse)
async def unresolve_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Mark a resolved comment as unresolved.

    Only the resume owner can unresolve comments.
    """
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check resume ownership
    resume_result = await db.execute(select(Resume).where(Resume.id == comment.resume_id))
    resume = resume_result.scalar_one_or_none()

    if not resume or resume.owner_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the resume owner can unresolve comments")

    comment.is_resolved = False
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        resume_id=comment.resume_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        author_name=comment.author_name,
        author_email=comment.author_email,
        content=comment.content,
        section=comment.section,
        position=comment.position,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        replies=[],
    )
