"""
Application Tracking API Routes

FastAPI endpoints for job application tracking (ANA-09 to ANA-12).
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from lib.tracking import Application, ApplicationStatus, ApplicationStorage

# Create router
tracking_router = APIRouter(prefix="/applications", tags=["Applications"])

# Initialize storage
storage = ApplicationStorage()


# Pydantic models for requests/responses
class ApplicationCreate(BaseModel):
    """Request model for creating an application"""
    job_title: str = Field(..., min_length=1, description="Job title")
    company: str = Field(..., min_length=1, description="Company name")
    job_url: Optional[str] = Field(None, description="URL to job posting")
    status: str = Field(default="pending", description="Application status")
    applied_date: Optional[str] = Field(None, description="Date applied (ISO format)")


class ApplicationUpdate(BaseModel):
    """Request model for updating an application"""
    job_title: Optional[str] = None
    company: Optional[str] = None
    job_url: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[str] = None


class NoteCreate(BaseModel):
    """Request model for adding a note"""
    content: str = Field(..., min_length=1, description="Note content")


class ReminderCreate(BaseModel):
    """Request model for adding a reminder"""
    message: str = Field(..., min_length=1, description="Reminder message")
    remind_at: str = Field(..., description="When to remind (ISO format)")


class TimelineEventResponse(BaseModel):
    """Response model for timeline events"""
    id: str
    event_type: str
    description: str
    timestamp: str
    metadata: dict


class ReminderResponse(BaseModel):
    """Response model for reminders"""
    id: str
    message: str
    remind_at: str
    triggered: bool
    created_at: str


class NoteResponse(BaseModel):
    """Response model for notes"""
    id: str
    content: str
    created_at: str


class ApplicationResponse(BaseModel):
    """Response model for applications"""
    id: str
    job_title: str
    company: str
    job_url: Optional[str]
    status: str
    applied_date: Optional[str]
    notes: List[NoteResponse]
    attachments: List[str]
    reminders: List[ReminderResponse]
    timeline: List[TimelineEventResponse]
    created_at: str
    updated_at: str


def application_to_response(app: Application) -> ApplicationResponse:
    """Convert Application model to response"""
    return ApplicationResponse(
        id=app.id,
        job_title=app.job_title,
        company=app.company,
        job_url=app.job_url,
        status=app.status.value,
        applied_date=app.applied_date.isoformat() if app.applied_date else None,
        notes=[
            NoteResponse(
                id=n.id,
                content=n.content,
                created_at=n.created_at.isoformat()
            )
            for n in app.notes
        ],
        attachments=app.attachments,
        reminders=[
            ReminderResponse(
                id=r.id,
                message=r.message,
                remind_at=r.remind_at.isoformat(),
                triggered=r.triggered,
                created_at=r.created_at.isoformat()
            )
            for r in app.reminders
        ],
        timeline=[
            TimelineEventResponse(
                id=t.id,
                event_type=t.event_type.value,
                description=t.description,
                timestamp=t.timestamp.isoformat(),
                metadata=t.metadata
            )
            for t in app.timeline
        ],
        created_at=app.created_at.isoformat(),
        updated_at=app.updated_at.isoformat()
    )


# API Endpoints
@tracking_router.get("", response_model=List[ApplicationResponse])
async def get_applications(
    status: Optional[str] = Query(None, description="Filter by status")
):
    """
    Get all applications, optionally filtered by status.
    
    Query params:
    - status: Filter by application status (applied, interviewing, rejected, offered, withdrawn, pending)
    """
    try:
        status_filter = ApplicationStatus(status) if status else None
        applications = storage.get_applications(status_filter)
        return [application_to_response(app) for app in applications]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")


@tracking_router.post("", response_model=ApplicationResponse, status_code=201)
async def create_application(application: ApplicationCreate):
    """
    Create a new job application.
    
    Required fields:
    - job_title: Job title
    - company: Company name
    
    Optional fields:
    - job_url: URL to job posting
    - status: Application status (default: pending)
    - applied_date: Date applied (ISO format)
    """
    try:
        # Create application model
        app = Application(
            job_title=application.job_title,
            company=application.company,
            job_url=application.job_url,
            status=ApplicationStatus(application.status),
            applied_date=datetime.fromisoformat(application.applied_date) if application.applied_date else None
        )
        
        # Save to storage
        saved_app = storage.add_application(app)
        
        return application_to_response(saved_app)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@tracking_router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: str):
    """
    Get a single application by ID.
    """
    app = storage.get_application(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return application_to_response(app)


@tracking_router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(app_id: str, updates: ApplicationUpdate):
    """
    Update an existing application.
    
    Can update:
    - job_title
    - company
    - job_url
    - status
    - applied_date
    """
    # Filter out None values
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updated_app = storage.update_application(app_id, update_dict)
    if not updated_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return application_to_response(updated_app)


@tracking_router.delete("/{app_id}", status_code=204)
async def delete_application(app_id: str):
    """
    Delete an application.
    """
    success = storage.delete_application(app_id)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    return None


@tracking_router.post("/{app_id}/notes", response_model=ApplicationResponse)
async def add_note(app_id: str, note: NoteCreate):
    """
    Add a note to an application.
    """
    app = storage.add_note(app_id, note.content)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return application_to_response(app)


@tracking_router.post("/{app_id}/reminders", response_model=ApplicationResponse)
async def add_reminder(app_id: str, reminder: ReminderCreate):
    """
    Add a reminder to an application.
    """
    try:
        remind_at = datetime.fromisoformat(reminder.remind_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid remind_at format. Use ISO format.")
    
    app = storage.add_reminder(app_id, reminder.message, remind_at)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return application_to_response(app)


@tracking_router.get("/timeline/all", response_model=List[TimelineEventResponse])
async def get_all_timeline():
    """
    Get timeline events for all applications.
    """
    events = storage.get_timeline()
    return [
        TimelineEventResponse(
            id=e.id,
            event_type=e.event_type.value,
            description=e.description,
            timestamp=e.timestamp.isoformat(),
            metadata=e.metadata
        )
        for e in events
    ]


@tracking_router.get("/{app_id}/timeline", response_model=List[TimelineEventResponse])
async def get_application_timeline(app_id: str):
    """
    Get timeline events for a specific application.
    """
    app = storage.get_application(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    events = storage.get_timeline(app_id)
    return [
        TimelineEventResponse(
            id=e.id,
            event_type=e.event_type.value,
            description=e.description,
            timestamp=e.timestamp.isoformat(),
            metadata=e.metadata
        )
        for e in events
    ]


# Reminder endpoints
@tracking_router.get("/reminders/due", response_model=List[dict])
async def get_due_reminders():
    """
    Get all due reminders across all applications.
    """
    due_reminders = storage.get_due_reminders()
    return [
        {
            "application_id": app.id,
            "job_title": app.job_title,
            "company": app.company,
            "reminder": {
                "id": r.id,
                "message": r.message,
                "remind_at": r.remind_at.isoformat()
            }
        }
        for app, r in due_reminders
    ]


@tracking_router.post("/reminders/{app_id}/{reminder_id}/trigger", status_code=204)
async def trigger_reminder(app_id: str, reminder_id: str):
    """
    Mark a reminder as triggered.
    """
    success = storage.mark_reminder_triggered(app_id, reminder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return None
