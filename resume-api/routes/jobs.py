"""
Jobs API Routes

Job search, recommendations, and saved jobs.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from lib.jobs.models import JobPosting, JobSource, SavedJob
from lib.jobs.schema import JobPosting as JobPostingSchema, JobSearchFilters
from lib.jobs.aggregator import JobAggregator
from lib.jobs.dedup import JobDeduplicator
from config.dependencies import get_current_user, get_db
from ..database import User

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])

logger = logging.getLogger(__name__)


# Request/Response models


class JobSearchResponse(BaseModel):
    """Job search response."""
    jobs: List[dict]
    total: int
    limit: int
    offset: int
    has_more: bool


class SaveJobRequest(BaseModel):
    """Save job request."""
    job_id: str
    notes: Optional[str] = None


class SavedJobItem(BaseModel):
    """Saved job item."""
    id: int
    job_id: str
    saved_at: str
    notes: Optional[str]
    status: str
    job: dict


class SavedJobsResponse(BaseModel):
    """Saved jobs response."""
    saved_jobs: List[SavedJobItem]
    total: int


class JobSourcesResponse(BaseModel):
    """Job sources response."""
    sources: List[dict]
    total: int


# Helper functions


async def get_aggregator(db: AsyncSession = Depends(get_db)) -> JobAggregator:
    """Get job aggregator instance."""
    return JobAggregator(db)


# Endpoints


@router.get("/search", response_model=JobSearchResponse)
async def search_jobs(
    q: Optional[str] = Query(None, max_length=200),
    remote: Optional[bool] = None,
    location: Optional[str] = Query(None, max_length=200),
    min_salary: Optional[int] = Query(None, ge=0),
    employment_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Search for jobs.
    
    **Parameters:**
    - `q`: Search query (title, company, skills)
    - `remote`: Filter remote jobs only
    - `location`: Filter by location
    - `min_salary`: Minimum salary filter
    - `employment_type`: Filter by type (full-time, part-time, contract)
    - `experience_level`: Filter by level (entry, mid, senior)
    - `limit`: Results per page (max 100)
    - `offset`: Pagination offset
    
    **Returns:**
    - List of matching jobs
    - Total count
    - Pagination info
    """
    # Build query
    query = select(JobPosting).where(JobPosting.is_active == True)
    
    # Apply filters
    if q:
        search_filter = or_(
            JobPosting.title.ilike(f"%{q}%"),
            JobPosting.company.ilike(f"%{q}%"),
            JobPosting.description.ilike(f"%{q}%"),
        )
        query = query.where(search_filter)
    
    if remote is not None:
        query = query.where(JobPosting.remote == remote)
    
    if location:
        query = query.where(JobPosting.location.ilike(f"%{location}%"))
    
    if min_salary:
        query = query.where(
            or_(
                JobPosting.salary_min >= min_salary,
                JobPosting.salary_max >= min_salary,
            )
        )
    
    if employment_type:
        query = query.where(JobPosting.employment_type == employment_type)
    
    if experience_level:
        query = query.where(JobPosting.experience_level == experience_level)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(JobPosting.posted_date.desc())
    query = query.offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    # Convert to schema
    job_dicts = []
    for job in jobs:
        job_dict = {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "remote": job.remote,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_currency": job.salary_currency,
            "salary_period": job.salary_period,
            "description": job.description[:500] + "..." if job.description and len(job.description) > 500 else job.description,
            "url": job.url,
            "apply_url": job.apply_url,
            "posted_date": job.posted_date.isoformat() if job.posted_date else None,
            "employment_type": job.employment_type,
            "experience_level": job.experience_level,
            "skills": job.skills or [],
            "source_id": job.source_id,
        }
        job_dicts.append(job_dict)
    
    return JobSearchResponse(
        jobs=job_dicts,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + limit < total,
    )


@router.get("/recommendations")
async def get_recommendations(
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get personalized job recommendations.
    
    Based on user's profile, skills, and saved jobs.
    
    **Returns:**
    - List of recommended jobs
    """
    # Get user's skills from saved jobs or profile
    # For now, return popular recent jobs
    
    query = select(JobPosting).where(
        JobPosting.is_active == True
    ).order_by(
        JobPosting.posted_date.desc(),
        JobPosting.is_featured.desc()
    ).limit(limit)
    
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    job_dicts = []
    for job in jobs:
        job_dicts.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "remote": job.remote,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "posted_date": job.posted_date.isoformat() if job.posted_date else None,
            "skills": job.skills or [],
        })
    
    return {"jobs": job_dicts, "total": len(job_dicts)}


@router.post("/save")
async def save_job(
    request: SaveJobRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a job for later.
    
    **Request:**
    - `job_id`: Job ID to save
    - `notes`: Optional notes
    """
    # Check if job exists
    job = await db.get(JobPosting, request.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Check if already saved
    existing = await db.execute(
        select(SavedJob).where(
            SavedJob.user_id == user.id,
            SavedJob.job_id == request.job_id,
        )
    )
    
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Job already saved")
    
    # Create saved job
    saved = SavedJob(
        user_id=user.id,
        job_id=request.job_id,
        notes=request.notes,
    )
    
    db.add(saved)
    await db.commit()
    
    return {"success": True, "saved_job_id": saved.id}


@router.get("/saved", response_model=SavedJobsResponse)
async def get_saved_jobs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's saved jobs.
    
    **Returns:**
    - List of saved jobs with notes
    """
    query = select(SavedJob).where(
        SavedJob.user_id == user.id
    ).order_by(
        SavedJob.saved_at.desc()
    )
    
    result = await db.execute(query)
    saved_jobs = result.scalars().all()
    
    saved_items = []
    for saved in saved_jobs:
        job = await db.get(JobPosting, saved.job_id)
        if job:
            saved_items.append(SavedJobItem(
                id=saved.id,
                job_id=saved.job_id,
                saved_at=saved.saved_at.isoformat(),
                notes=saved.notes,
                status=saved.status,
                job={
                    "id": job.id,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "remote": job.remote,
                    "salary_min": job.salary_min,
                    "salary_max": job.salary_max,
                    "posted_date": job.posted_date.isoformat() if job.posted_date else None,
                },
            ))
    
    return SavedJobsResponse(
        saved_jobs=saved_items,
        total=len(saved_items),
    )


@router.delete("/saved/{saved_id}")
async def remove_saved_job(
    saved_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a saved job.
    
    **Parameters:**
    - `saved_id`: Saved job ID
    """
    saved = await db.get(SavedJob, saved_id)
    
    if not saved:
        raise HTTPException(404, "Saved job not found")
    
    if saved.user_id != user.id:
        raise HTTPException(403, "Not authorized")
    
    await db.delete(saved)
    await db.commit()
    
    return {"success": True}


@router.get("/sources", response_model=JobSourcesResponse)
async def get_sources(
    aggregator: JobAggregator = Depends(get_aggregator),
):
    """
    Get list of job sources.
    
    **Returns:**
    - List of configured sources with status
    """
    sources = await aggregator.get_sources(active_only=False)
    
    return JobSourcesResponse(
        sources=sources,
        total=len(sources),
    )
