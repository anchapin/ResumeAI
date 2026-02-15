"""
Database model for Resume entities.
"""

from datetime import datetime
from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from pydantic import validator

if TYPE_CHECKING:
    from .user import User


class ResumeBase(SQLModel):
    """Base model for resume with common fields."""

    title: str = Field(max_length=255)
    content: Dict[str, Any] = Field(default={})
    template: Optional[str] = Field(default="default", max_length=100)


class Resume(ResumeBase, table=True):
    """Resume database model."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255)
    content: Dict[str, Any] = Field(default={})  # Store resume data as JSON
    template: Optional[str] = Field(default="default", max_length=100)
    user_id: int = Field(foreign_key="user.id")  # Foreign key to User
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship to user
    user: "User" = Relationship(back_populates="resumes")

    @validator("title")
    def validate_title(cls, v):
        """Validate title."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Title cannot be empty")
        return v.strip()

    @validator("content")
    def validate_content(cls, v):
        """Validate content is a valid dictionary."""
        if not isinstance(v, dict):
            raise ValueError("Content must be a valid dictionary")
        return v


class ResumeCreate(ResumeBase):
    """Model for creating a new resume."""

    title: str
    content: Dict[str, Any]
    template: Optional[str] = "default"


class ResumeUpdate(SQLModel):
    """Model for updating resume information."""

    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    template: Optional[str] = None


class ResumeRead(ResumeBase):
    """Model for reading resume information."""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
