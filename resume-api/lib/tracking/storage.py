"""
Application Storage

JSON file-based storage for job applications.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from .models import Application, ApplicationStatus, TimelineEvent, TimelineEventType


class ApplicationStorage:
    """Storage for job applications using JSON file"""
    
    def __init__(self, storage_path: Optional[str] = None):
        """Initialize storage with path to JSON file"""
        if storage_path is None:
            # Default storage path in /tmp to avoid permission issues in CI/Docker
            user_data_dir = Path("/tmp") / ".resumeai" / "data"
            user_data_dir.mkdir(parents=True, exist_ok=True)
            storage_path = str(user_data_dir / "applications.json")
        
        self.storage_path = storage_path
        self._ensure_storage_file()
    
    def _ensure_storage_file(self) -> None:
        """Ensure storage file exists"""
        if not os.path.exists(self.storage_path):
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            self._save([])
    
    def _load(self) -> List[dict]:
        """Load applications from file"""
        try:
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save(self, applications: List[dict]) -> None:
        """Save applications to file"""
        with open(self.storage_path, 'w', encoding='utf-8') as f:
            json.dump(applications, f, indent=2, ensure_ascii=False)
    
    def get_applications(self, status: Optional[ApplicationStatus] = None) -> List[Application]:
        """Get all applications, optionally filtered by status"""
        data = self._load()
        applications = [Application.from_dict(app_data) for app_data in data]
        
        if status:
            applications = [app for app in applications if app.status == status]
        
        # Sort by updated_at descending (newest first)
        applications.sort(key=lambda a: a.updated_at, reverse=True)
        return applications
    
    def get_application(self, app_id: str) -> Optional[Application]:
        """Get a single application by ID"""
        data = self._load()
        for app_data in data:
            if app_data.get("id") == app_id:
                return Application.from_dict(app_data)
        return None
    
    def add_application(self, application: Application) -> Application:
        """Add a new application"""
        # Add initial timeline event
        if not application.timeline:
            application.timeline.append(TimelineEvent(
                event_type=TimelineEventType.CREATED,
                description="Application created"
            ))
        
        data = self._load()
        data.append(application.to_dict())
        self._save(data)
        return application
    
    def update_application(self, app_id: str, updates: dict) -> Optional[Application]:
        """Update an existing application"""
        data = self._load()
        
        for i, app_data in enumerate(data):
            if app_data.get("id") == app_id:
                # Load existing application
                application = Application.from_dict(app_data)
                
                # Apply updates
                if "job_title" in updates:
                    application.job_title = updates["job_title"]
                if "company" in updates:
                    application.company = updates["company"]
                if "job_url" in updates:
                    application.job_url = updates["job_url"]
                if "status" in updates:
                    new_status = ApplicationStatus(updates["status"])
                    application.update_status(new_status)
                if "applied_date" in updates and updates["applied_date"]:
                    application.applied_date = datetime.fromisoformat(updates["applied_date"])
                
                application.updated_at = datetime.utcnow()
                
                # Add timeline event for update
                application.timeline.append(TimelineEvent(
                    event_type=TimelineEventType.APPLICATION_UPDATED,
                    description="Application updated"
                ))
                
                # Save updated data
                data[i] = application.to_dict()
                self._save(data)
                return application
        
        return None
    
    def delete_application(self, app_id: str) -> bool:
        """Delete an application"""
        data = self._load()
        
        for i, app_data in enumerate(data):
            if app_data.get("id") == app_id:
                data.pop(i)
                self._save(data)
                return True
        
        return False
    
    def add_note(self, app_id: str, content: str) -> Optional[Application]:
        """Add a note to an application"""
        application = self.get_application(app_id)
        if application:
            application.add_note(content)
            data = self._load()
            for i, app_data in enumerate(data):
                if app_data.get("id") == app_id:
                    data[i] = application.to_dict()
                    self._save(data)
                    return application
        return None
    
    def add_reminder(self, app_id: str, message: str, remind_at: datetime) -> Optional[Application]:
        """Add a reminder to an application"""
        application = self.get_application(app_id)
        if application:
            application.add_reminder(message, remind_at)
            data = self._load()
            for i, app_data in enumerate(data):
                if app_data.get("id") == app_id:
                    data[i] = application.to_dict()
                    self._save(data)
                    return application
        return None
    
    def get_due_reminders(self) -> List[tuple]:
        """Get all due reminders across all applications"""
        due_reminders = []
        applications = self.get_applications()
        
        for app in applications:
            for reminder in app.get_due_reminders():
                due_reminders.append((app, reminder))
        
        return due_reminders
    
    def mark_reminder_triggered(self, app_id: str, reminder_id: str) -> bool:
        """Mark a reminder as triggered"""
        application = self.get_application(app_id)
        if application:
            for reminder in application.reminders:
                if reminder.id == reminder_id:
                    reminder.triggered = True
                    application.timeline.append(TimelineEvent(
                        event_type=TimelineEventType.REMINDER_TRIGGERED,
                        description=f"Reminder triggered: {reminder.message}"
                    ))
                    application.updated_at = datetime.utcnow()
                    
                    data = self._load()
                    for i, app_data in enumerate(data):
                        if app_data.get("id") == app_id:
                            data[i] = application.to_dict()
                            self._save(data)
                            return True
        return False
    
    def get_timeline(self, app_id: Optional[str] = None) -> List[TimelineEvent]:
        """Get timeline events, optionally filtered by application"""
        applications = self.get_applications()
        
        if app_id:
            for app in applications:
                if app.id == app_id:
                    return sorted(app.timeline, key=lambda e: e.timestamp, reverse=True)
            return []
        
        # Collect all timeline events from all applications
        all_events = []
        for app in applications:
            for event in app.timeline:
                event.metadata["application_id"] = app.id
                event.metadata["job_title"] = app.job_title
                event.metadata["company"] = app.company
                all_events.append(event)
        
        return sorted(all_events, key=lambda e: e.timestamp, reverse=True)
