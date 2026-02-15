"""
Routes for resume CRUD operations.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models.resume import Resume, ResumeCreate, ResumeUpdate, ResumeRead
from ..models.user import User
from ..utils.auth import get_current_user

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/", response_model=ResumeRead)
def create_resume(
    resume: ResumeCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new resume for the current user."""
    db_resume = Resume(
        title=resume.title,
        content=resume.content,
        template=resume.template,
        user_id=current_user.id,
    )

    session.add(db_resume)
    session.commit()
    session.refresh(db_resume)

    return db_resume


@router.get("/", response_model=List[ResumeRead])
def read_resumes(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
):
    """Retrieve all resumes for the current user."""
    statement = (
        select(Resume)
        .where(Resume.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    resumes = session.exec(statement).all()
    return resumes


@router.get("/{resume_id}", response_model=ResumeRead)
def read_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Retrieve a specific resume by ID."""
    resume = session.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resume"
        )
    return resume


@router.put("/{resume_id}", response_model=ResumeRead)
def update_resume(
    resume_id: int,
    resume_update: ResumeUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update a specific resume by ID."""
    resume = session.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this resume"
        )

    # Update fields if provided
    if resume_update.title is not None:
        resume.title = resume_update.title
    if resume_update.content is not None:
        resume.content = resume_update.content
    if resume_update.template is not None:
        resume.template = resume_update.template

    resume.updated_at = datetime.utcnow()

    session.add(resume)
    session.commit()
    session.refresh(resume)

    return resume


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete a specific resume by ID."""
    resume = session.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this resume"
        )

    session.delete(resume)
    session.commit()

    return {"message": "Resume deleted successfully"}
