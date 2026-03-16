"""
Tracking Module

Application tracking and analytics.
"""

# Import existing tracking components (may have import issues in jobs)
try:
    from .tracker import ApplicationTracker
except ImportError:
    ApplicationTracker = None

try:
    from .autofill import AutoFillService
except ImportError:
    AutoFillService = None

try:
    from .analytics import ApplicationAnalytics
except ImportError:
    ApplicationAnalytics = None

try:
    from .sync import ExternalSyncService
except ImportError:
    ExternalSyncService = None

# Application tracking models (ANA-09 to ANA-12)
from .models import (
    Application,
    ApplicationStatus,
    ApplicationNote,
    Reminder,
    TimelineEvent,
    TimelineEventType,
)
from .storage import ApplicationStorage

__all__ = [
    "ApplicationTracker",
    "AutoFillService", 
    "ApplicationAnalytics",
    "ExternalSyncService",
    # New application tracking models
    "Application",
    "ApplicationStatus",
    "ApplicationNote",
    "Reminder",
    "TimelineEvent",
    "TimelineEventType",
    "ApplicationStorage",
]
