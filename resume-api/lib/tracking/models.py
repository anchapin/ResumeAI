"""
Application Tracking Data Models

Data models for tracking job applications with status, notes, reminders, and timeline.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List
import uuid


class ApplicationStatus(str, Enum):
    """Application status enum"""
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    REJECTED = "rejected"
    OFFERED = "offered"
    WITHDRAWN = "withdrawn"
    PENDING = "pending"


class TimelineEventType(str, Enum):
    """Timeline event types"""
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    NOTE_ADDED = "note_added"
    REMINDER_ADDED = "reminder_added"
    REMINDER_TRIGGERED = "reminder_triggered"
    ATTACHMENT_ADDED = "attachment_added"
    APPLICATION_UPDATED = "application_updated"


@dataclass
class ApplicationNote:
    """Note attached to an application"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    content: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Reminder:
    """Reminder for an application"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    message: str = ""
    remind_at: datetime = field(default_factory=datetime.utcnow)
    triggered: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class TimelineEvent:
    """Timeline event for an application"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: TimelineEventType = TimelineEventType.CREATED
    description: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: dict = field(default_factory=dict)


@dataclass
class Application:
    """Job application model"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    job_title: str = ""
    company: str = ""
    job_url: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.PENDING
    applied_date: Optional[datetime] = None
    notes: List[ApplicationNote] = field(default_factory=list)
    attachments: List[str] = field(default_factory=list)  # File paths or base64
    reminders: List[Reminder] = field(default_factory=list)
    timeline: List[TimelineEvent] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    def add_note(self, content: str) -> ApplicationNote:
        """Add a note to the application"""
        note = ApplicationNote(content=content)
        self.notes.append(note)
        self.timeline.append(TimelineEvent(
            event_type=TimelineEventType.NOTE_ADDED,
            description=f"Note added: {content[:50]}..."
        ))
        self.updated_at = datetime.utcnow()
        return note
    
    def add_reminder(self, message: str, remind_at: datetime) -> Reminder:
        """Add a reminder to the application"""
        reminder = Reminder(message=message, remind_at=remind_at)
        self.reminders.append(reminder)
        self.timeline.append(TimelineEvent(
            event_type=TimelineEventType.REMINDER_ADDED,
            description=f"Reminder set for {remind_at.isoformat()}"
        ))
        self.updated_at = datetime.utcnow()
        return reminder
    
    def update_status(self, new_status: ApplicationStatus) -> None:
        """Update application status"""
        old_status = self.status
        self.status = new_status
        if old_status != new_status:
            self.timeline.append(TimelineEvent(
                event_type=TimelineEventType.STATUS_CHANGED,
                description=f"Status changed from {old_status.value} to {new_status.value}",
                metadata={"old_status": old_status.value, "new_status": new_status.value}
            ))
        self.updated_at = datetime.utcnow()
    
    def get_due_reminders(self) -> List[Reminder]:
        """Get reminders that are due but not triggered"""
        now = datetime.utcnow()
        return [r for r in self.reminders if not r.triggered and r.remind_at <= now]
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "job_title": self.job_title,
            "company": self.company,
            "job_url": self.job_url,
            "status": self.status.value,
            "applied_date": self.applied_date.isoformat() if self.applied_date else None,
            "notes": [
                {"id": n.id, "content": n.content, "created_at": n.created_at.isoformat()}
                for n in self.notes
            ],
            "attachments": self.attachments,
            "reminders": [
                {
                    "id": r.id,
                    "message": r.message,
                    "remind_at": r.remind_at.isoformat(),
                    "triggered": r.triggered,
                    "created_at": r.created_at.isoformat()
                }
                for r in self.reminders
            ],
            "timeline": [
                {
                    "id": t.id,
                    "event_type": t.event_type.value,
                    "description": t.description,
                    "timestamp": t.timestamp.isoformat(),
                    "metadata": t.metadata
                }
                for t in self.timeline
            ],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Application":
        """Create application from dictionary"""
        app = cls(
            id=data.get("id", str(uuid.uuid4())),
            job_title=data.get("job_title", ""),
            company=data.get("company", ""),
            job_url=data.get("job_url"),
            status=ApplicationStatus(data.get("status", "pending")),
            applied_date=datetime.fromisoformat(data["applied_date"]) if data.get("applied_date") else None,
            notes=[
                ApplicationNote(
                    id=n["id"],
                    content=n["content"],
                    created_at=datetime.fromisoformat(n["created_at"])
                )
                for n in data.get("notes", [])
            ],
            attachments=data.get("attachments", []),
            reminders=[
                Reminder(
                    id=r["id"],
                    message=r["message"],
                    remind_at=datetime.fromisoformat(r["remind_at"]),
                    triggered=r.get("triggered", False),
                    created_at=datetime.fromisoformat(r["created_at"])
                )
                for r in data.get("reminders", [])
            ],
            timeline=[
                TimelineEvent(
                    id=t["id"],
                    event_type=TimelineEventType(t["event_type"]),
                    description=t["description"],
                    timestamp=datetime.fromisoformat(t["timestamp"]),
                    metadata=t.get("metadata", {})
                )
                for t in data.get("timeline", [])
            ],
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.utcnow(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.utcnow()
        )
        
        # Add initial timeline event if timeline is empty
        if not app.timeline:
            app.timeline.append(TimelineEvent(
                event_type=TimelineEventType.CREATED,
                description="Application created"
            ))
        
        return app
