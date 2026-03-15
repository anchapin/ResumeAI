"""
Database models for Job Aggregator.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class JobSource(Base):
    """Job source configuration."""

    __tablename__ = "job_sources"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # rss, api, scrape
    url = Column(String(500), nullable=False)
    api_key = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    last_fetched = Column(DateTime(timezone=True), nullable=True)
    fetch_frequency = Column(Integer, default=60)  # minutes
    jobs_fetched = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    jobs = relationship("JobPosting", back_populates="source", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sources_active", "is_active"),
    )


class JobPosting(Base):
    """Aggregated job posting."""

    __tablename__ = "job_postings"

    id = Column(String(100), primary_key=True)  # Hash of source + url
    source_id = Column(String(50, ForeignKey("job_sources.id")), nullable=False, index=True)
    
    # Job details
    title = Column(String(200), nullable=False, index=True)
    company = Column(String(200), nullable=False, index=True)
    location = Column(String(200), nullable=True)
    remote = Column(Boolean, default=False, index=True)
    
    # Salary
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String(3), default="USD")
    salary_period = Column(String(20), default="yearly")  # yearly, hourly
    
    # Job details
    description = Column(Text, nullable=True)
    url = Column(String(500), nullable=False, unique=True)
    apply_url = Column(String(500), nullable=True)
    
    # Dates
    posted_date = Column(DateTime(timezone=True), nullable=True, index=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Classification
    employment_type = Column(String(20), default="full-time")  # full-time, part-time, contract
    experience_level = Column(String(20), default="mid")  # entry, mid, senior
    
    # Extracted data
    skills = Column(JSON, default=list)
    categories = Column(JSON, default=list)
    
    # Raw data for reference
    raw_data = Column(JSON, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False)

    # Relationships
    source = relationship("JobSource", back_populates="jobs")
    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_jobs_title_company", "title", "company"),
        Index("idx_jobs_location", "location"),
        Index("idx_jobs_posted", "posted_date"),
        Index("idx_jobs_remote", "remote"),
    )


class SavedJob(Base):
    """User's saved jobs."""

    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(String(100, ForeignKey("job_postings.id")), nullable=False, index=True)
    
    # Metadata
    saved_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="saved")  # saved, applied, rejected
    
    # Relationships
    user = relationship("User", back_populates="saved_jobs")
    job = relationship("JobPosting", back_populates="saved_by")

    __table_args__ = (
        Index("idx_saved_user_job", "user_id", "job_id", unique=True),
    )


# Add relationships to User model
def extend_user_model():
    """Extend User model with saved_jobs relationship."""
    from ..database import User
    
    if not hasattr(User, 'saved_jobs'):
        User.saved_jobs = relationship(
            "SavedJob",
            back_populates="user",
            cascade="all, delete-orphan"
        )
