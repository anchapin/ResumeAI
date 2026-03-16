"""
Application Tracking API Routes

Application management, statistics, and auto-fill.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from lib.tracking.tracker import ApplicationTracker
from lib.tracking.autofill import AutoFillService
from lib.tracking.analytics import ApplicationAnalytics
from lib.tracking.sync import ExternalSyncService
from config.dependencies import get_current_user, get_db
from ..database import User

router = APIRouter(prefix="/api/v1/applications", tags=["Applications"])

logger = logging.getLogger(__name__)


# Request/Response models


class ApplicationResponse(BaseModel):
    """Application response."""
    id: int
    user_id: int
    job_id: str
    status: str
    external_id: Optional[str]
    external_source: Optional[str]
    external_status: Optional[str]
    submitted_at: Optional[str]
    response_at: Optional[str]
    autofilled: bool
    notes: Optional[str]
    days_in_status: int
    response_time_days: Optional[int]


class CreateApplicationRequest(BaseModel):
    """Create application request."""
    job_id: str
    status: str = Field(default="applied")
    external_id: Optional[str] = None
    external_source: Optional[str] = None
    external_status: Optional[str] = None
    submitted_at: Optional[str] = None
    notes: Optional[str] = None
    autofilled: bool = False


class UpdateApplicationRequest(BaseModel):
    """Update application request."""
    status: Optional[str] = None
    external_status: Optional[str] = None
    notes: Optional[str] = None
    submitted_at: Optional[str] = None


class UpdateStatusRequest(BaseModel):
    """Update status request."""
    status: str


class AutoFillRequest(BaseModel):
    """Auto-fill request."""
    job_id: str


class AutoFillResponse(BaseModel):
    """Auto-fill response."""
    application_data: dict
    cover_letter: str


class ApplicationsListResponse(BaseModel):
    """Applications list response."""
    applications: List[ApplicationResponse]
    total: int


class StatsResponse(BaseModel):
    """Statistics response."""
    total: int
    by_status: dict
    by_source: dict
    interview_rate: float
    offer_rate: float
    period_days: int


class FunnelResponse(BaseModel):
    """Funnel response."""
    stages: List[dict]
    period_days: int


class ConversionRatesResponse(BaseModel):
    """Conversion rates response."""
    applied_to_screening: float
    screening_to_interview: float
    interview_to_offer: float
    offer_to_acceptance: float
    overall_conversion: float
    period_days: int


class TimeToResponseResponse(BaseModel):
    """Time to response response."""
    avg_days: float
    median_days: int
    min_days: int
    max_days: int
    sample_size: int
    period_days: int


# Helper functions


def get_tracker(db: AsyncSession = Depends(get_db)) -> ApplicationTracker:
    """Get application tracker instance."""
    return ApplicationTracker(db)


def get_autofill(db: AsyncSession = Depends(get_db)) -> AutoFillService:
    """Get auto-fill service instance."""
    return AutoFillService(db)


def get_analytics(db: AsyncSession = Depends(get_db)) -> ApplicationAnalytics:
    """Get analytics service instance."""
    return ApplicationAnalytics(db)


def get_sync(db: AsyncSession = Depends(get_db)) -> ExternalSyncService:
    """Get sync service instance."""
    return ExternalSyncService(db)


# Endpoints


@router.get("", response_model=ApplicationsListResponse)
async def list_applications(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    tracker: ApplicationTracker = Depends(get_tracker),
):
    """
    List user's job applications.
    
    **Parameters:**
    - `status`: Filter by status
    - `source`: Filter by source
    - `limit`: Results per page (max 100)
    - `offset`: Pagination offset
    """
    applications = await tracker.get_applications(
        user_id=user.id,
        status=status,
        source=source,
        limit=limit,
        offset=offset,
    )
    
    # Get total count
    total = len(applications)
    
    return ApplicationsListResponse(
        applications=[
            ApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                job_id=app.job_id,
                status=app.status,
                external_id=app.external_id,
                external_source=app.external_source,
                external_status=app.external_status,
                submitted_at=app.submitted_at.isoformat() if app.submitted_at else None,
                response_at=app.response_at.isoformat() if app.response_at else None,
                autofilled=app.autofilled,
                notes=app.notes,
                days_in_status=app.days_in_status,
                response_time_days=app.response_time_days,
            )
            for app in applications
        ],
        total=total,
    )


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    request: CreateApplicationRequest,
    user: User = Depends(get_current_user),
    tracker: ApplicationTracker = Depends(get_tracker),
):
    """
    Create a new job application.
    
    **Request:**
    - `job_id`: Job ID
    - `status`: Application status (default: applied)
    - `external_id`: External application ID
    - `external_source`: Source (LinkedIn, Indeed, etc.)
    - `notes`: Application notes
    """
    application = await tracker.create_application(
        data=request.dict(),
        user_id=user.id,
    )
    
    return ApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        job_id=application.job_id,
        status=application.status,
        external_id=application.external_id,
        external_source=application.external_source,
        external_status=application.external_status,
        submitted_at=application.submitted_at.isoformat() if application.submitted_at else None,
        response_at=application.response_at.isoformat() if application.response_at else None,
        autofilled=application.autofilled,
        notes=application.notes,
        days_in_status=application.days_in_status,
        response_time_days=application.response_time_days,
    )


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: int,
    user: User = Depends(get_current_user),
    tracker: ApplicationTracker = Depends(get_tracker),
):
    """
    Get a specific application.
    """
    application = await tracker.get_application(app_id, user.id)
    
    if not application:
        raise HTTPException(404, "Application not found")
    
    return ApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        job_id=application.job_id,
        status=application.status,
        external_id=application.external_id,
        external_source=application.external_source,
        external_status=application.external_status,
        submitted_at=application.submitted_at.isoformat() if application.submitted_at else None,
        response_at=application.response_at.isoformat() if application.response_at else None,
        autofilled=application.autofilled,
        notes=application.notes,
        days_in_status=application.days_in_status,
        response_time_days=application.response_time_days,
    )


@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: int,
    request: UpdateApplicationRequest,
    user: User = Depends(get_current_user),
    tracker: ApplicationTracker = Depends(get_tracker),
):
    """
    Update an application.
    """
    try:
        application = await tracker.update_application(
            app_id=app_id,
            data=request.dict(exclude_unset=True),
            user_id=user.id,
        )
        
        return ApplicationResponse(
            id=application.id,
            user_id=application.user_id,
            job_id=application.job_id,
            status=application.status,
            external_id=application.external_id,
            external_source=application.external_source,
            external_status=application.external_status,
            submitted_at=application.submitted_at.isoformat() if application.submitted_at else None,
            response_at=application.response_at.isoformat() if application.response_at else None,
            autofilled=application.autofilled,
            notes=application.notes,
            days_in_status=application.days_in_status,
            response_time_days=application.response_time_days,
        )
        
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{app_id}")
async def delete_application(
    app_id: int,
    user: User = Depends(get_current_user),
    tracker: ApplicationTracker = Depends(get_tracker),
):
    """
    Delete an application.
    """
    try:
        await tracker.delete_application(app_id, user.id)
        return {"success": True}
        
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{app_id}/status", response_model=ApplicationResponse)
async def update_status(
    app_id: int,
    request: UpdateStatusRequest,
    user: User = Depends(get_current_user),
    tracker: ApplicationTracker = Depends(get_tracker),
):
    """
    Update application status.
    
    Validates status transitions according to workflow.
    """
    try:
        application = await tracker.update_status(
            app_id=app_id,
            new_status=request.status,
            user_id=user.id,
        )
        
        return ApplicationResponse(
            id=application.id,
            user_id=application.user_id,
            job_id=application.job_id,
            status=application.status,
            external_id=application.external_id,
            external_source=application.external_source,
            external_status=application.external_status,
            submitted_at=application.submitted_at.isoformat() if application.submitted_at else None,
            response_at=application.response_at.isoformat() if application.response_at else None,
            autofilled=application.autofilled,
            notes=application.notes,
            days_in_status=application.days_in_status,
            response_time_days=application.response_time_days,
        )
        
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/stats", response_model=StatsResponse)
async def get_statistics(
    days: int = Query(90, ge=1, le=365),
    user: User = Depends(get_current_user),
    analytics: ApplicationAnalytics = Depends(get_analytics),
):
    """
    Get application statistics.
    
    **Parameters:**
    - `days`: Time range in days (default: 90)
    """
    stats = await analytics.get_stats(user.id, days)
    
    return StatsResponse(**stats)


@router.get("/funnel", response_model=FunnelResponse)
async def get_funnel(
    days: int = Query(90, ge=1, le=365),
    user: User = Depends(get_current_user),
    analytics: ApplicationAnalytics = Depends(get_analytics),
):
    """
    Get application funnel data.
    
    Shows conversion between stages.
    """
    funnel = await analytics.get_funnel(user.id, days)
    
    return FunnelResponse(**funnel)


@router.get("/conversion", response_model=ConversionRatesResponse)
async def get_conversion_rates(
    days: int = Query(90, ge=1, le=365),
    user: User = Depends(get_current_user),
    analytics: ApplicationAnalytics = Depends(get_analytics),
):
    """
    Get application conversion rates.
    """
    rates = await analytics.get_conversion_rates(user.id, days)
    
    return ConversionRatesResponse(**rates)


@router.get("/time-to-response", response_model=TimeToResponseResponse)
async def get_time_to_response(
    days: int = Query(90, ge=1, le=365),
    user: User = Depends(get_current_user),
    analytics: ApplicationAnalytics = Depends(get_analytics),
):
    """
    Get time to response metrics.
    """
    metrics = await analytics.get_time_to_response(user.id, days)
    
    return TimeToResponseResponse(**metrics)


@router.post("/autofill", response_model=AutoFillResponse)
async def autofill_application(
    request: AutoFillRequest,
    user: User = Depends(get_current_user),
    autofill: AutoFillService = Depends(get_autofill),
):
    """
    Auto-fill application from resume data.
    
    Extracts data from user's resume and generates cover letter.
    """
    # Would fetch user's resume here
    # For now, use placeholder data
    resume_data = {
        "basics": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1-555-123-4567",
        },
        "work": [],
        "education": [],
        "skills": [],
    }
    
    # Would fetch job data
    job_data = {
        "title": "Software Engineer",
        "company": "Tech Corp",
        "description": "We are looking for a talented engineer...",
    }
    
    # Extract application data
    application_data = autofill.extract_application_data(resume_data, job_data)
    
    # Generate cover letter
    cover_letter = autofill.generate_cover_letter(resume_data, job_data)
    
    return AutoFillResponse(
        application_data=application_data,
        cover_letter=cover_letter,
    )
