"""
Data models for Auto-Complete module.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal


@dataclass
class CompletionSuggestion:
    """A single completion suggestion."""

    id: str
    text: str
    type: Literal["inline", "bullet", "section"]
    confidence: float
    source: str | None = None  # e.g., "llm", "cache", "template"
    metadata: dict = field(default_factory=dict)


@dataclass
class CompletionRequest:
    """Request for completions."""

    text: str
    cursor_position: int
    section_type: str | None = None
    role: str | None = None
    limit: int = 5


@dataclass
class CompletionResponse:
    """Response with completions."""

    completions: list[CompletionSuggestion]
    context: dict
    processing_time_ms: float
    has_more: bool = False


@dataclass
class BulletRequest:
    """Request for bullet point completions."""

    section_type: str
    role: str | None = None
    industry: str | None = None
    seniority: str | None = None
    limit: int = 3


@dataclass
class BulletResponse:
    """Response with bullet suggestions."""

    bullets: list[str]
    processing_time_ms: float


@dataclass
class ContextInfo:
    """Context information for completions."""

    section_type: str
    cursor_position: int
    current_line: str
    previous_lines: list[str]
    writing_style: dict
    detected_role: str | None = None
    seniority_level: str | None = None


@dataclass
class CompletionFeedback:
    """User feedback on a completion."""

    completion_id: str
    accepted: bool
    user_id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    context: dict = field(default_factory=dict)


# Database model for completion tracking
COMPLETION_FEEDBACK_TABLE = """
CREATE TABLE IF NOT EXISTS completion_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    completion_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    accepted BOOLEAN NOT NULL,
    completion_text TEXT NOT NULL,
    context JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""
