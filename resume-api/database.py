"""
Database configuration and models for ResumeAI.

Uses SQLAlchemy with async support for resume storage,
versioning, collaboration, and sharing.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Table,
    JSON,
    Index,
    Float,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func

Base = declarative_base()


# Many-to-many relationship for resume tags
resume_tags = Table(
    "resume_tags",
    Base.metadata,
    Column("resume_id", Integer, ForeignKey("resumes.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    """Tag model for categorizing resumes."""

    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    resumes = relationship("Resume", secondary=resume_tags, back_populates="tags")


class Resume(Base):
    """Resume model with versioning support."""

    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    data = Column(JSON, nullable=False)  # Stores resume data as JSON

    # Version tracking
    current_version_id = Column(Integer, ForeignKey("resume_versions.id"))
    current_version = relationship("ResumeVersion", foreign_keys=[current_version_id])

    # Sharing settings
    is_public = Column(Boolean, default=False, index=True)
    share_token = Column(String(64), unique=True, nullable=True, index=True)
    share_password_hash = Column(String(255), nullable=True)
    share_expires_at = Column(DateTime(timezone=True), nullable=True)
    share_view_count = Column(Integer, default=0)

    # Metadata
    tags = relationship("Tag", secondary=resume_tags, back_populates="resumes")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    versions = relationship(
        "ResumeVersion", foreign_keys="ResumeVersion.resume_id", back_populates="resume"
    )
    comments = relationship(
        "Comment", back_populates="resume", cascade="all, delete-orphan"
    )
    shares = relationship(
        "ResumeShare", back_populates="resume", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_resume_updated_at", "updated_at"),)


class ResumeVersion(Base):
    """Resume version model for tracking changes."""

    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, index=True)

    # Version data
    data = Column(JSON, nullable=False)
    version_number = Column(Integer, nullable=False, index=True)
    change_description = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    resume = relationship("Resume", foreign_keys=[resume_id], back_populates="versions")

    __table_args__ = (Index("idx_version_number", "resume_id", "version_number"),)


class Comment(Base):
    """Comment model for collaboration features."""

    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, index=True)

    # Comment content
    author_name = Column(String(200), nullable=False)
    author_email = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    # Comment metadata
    section = Column(String(100), nullable=True)  # Section of resume being commented on
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    resume = relationship("Resume", back_populates="comments")

    __table_args__ = (Index("idx_comment_resume_created", "resume_id", "created_at"),)


class ResumeShare(Base):
    """Resume share model for tracking shared links."""

    __tablename__ = "resume_shares"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, index=True)

    # Share settings
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    permissions = Column(String(50), default="view")  # view, comment, edit
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_views = Column(Integer, nullable=True)
    view_count = Column(Integer, default=0)

    # Share metadata
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    resume = relationship("Resume", back_populates="shares")


class UserSettings(Base):
    """User settings model for preferences."""

    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_identifier = Column(String(255), unique=True, nullable=False, index=True)

    # Keyboard shortcuts
    keyboard_shortcuts_enabled = Column(Boolean, default=True)

    # Accessibility settings
    high_contrast_mode = Column(Boolean, default=False)
    reduced_motion = Column(Boolean, default=False)
    screen_reader_optimized = Column(Boolean, default=False)

    # Default formatting preferences
    default_font = Column(String(50), default="Arial")
    default_font_size = Column(Integer, default=11)
    default_spacing = Column(String(20), default="normal")

    # Other preferences
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# Analytics models for monitoring and usage tracking
class UsageAnalytics(Base):
    """Request analytics model for tracking API usage."""

    __tablename__ = "usage_analytics"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(500), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    request_id = Column(String(36), nullable=True)  # UUID
    client_ip = Column(String(45), nullable=True)  # IPv6 compatible
    duration_ms = Column(Float, default=0)
    additional_data = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("idx_analytics_timestamp_status", "timestamp", "status_code"),
        Index("idx_analytics_user_timestamp", "user_id", "timestamp"),
    )


class EndpointUsage(Base):
    """Endpoint usage statistics model."""

    __tablename__ = "endpoint_usage"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(500), nullable=False, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    request_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_endpoint_usage_date", "endpoint", "date"),
        Index("idx_endpoint_usage_user_date", "user_id", "date"),
    )


class UserEngagement(Base):
    """User engagement events model."""

    __tablename__ = "user_engagement"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    action = Column(
        String(100), nullable=False, index=True
    )  # e.g., "generate_pdf", "tailor_resume"
    endpoint = Column(String(500), nullable=True)
    metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("idx_engagement_user_timestamp", "user_id", "timestamp"),
        Index("idx_engagement_action_timestamp", "action", "timestamp"),
    )


class ErrorResponse(Base):
    """Error tracking model for monitoring."""

    __tablename__ = "error_responses"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(500), nullable=False, index=True)
    error_type = Column(String(100), nullable=False, index=True)
    error_message = Column(Text, nullable=False)
    user_id = Column(String(255), nullable=True, index=True)
    request_id = Column(String(36), nullable=True)
    stack_trace = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("idx_error_type_timestamp", "error_type", "timestamp"),
        Index("idx_error_user_timestamp", "user_id", "timestamp"),
    )


# Create engine and session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./resumeai.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def create_db_and_tables():
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Get database session for dependency injection."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_async_session():
    """Get async database session for analytics."""
    async with async_session_maker() as session:
        yield session
