"""
Database models for Job Alerts.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class JobAlert(Base):
    """User's job alert configuration."""

    __tablename__ = "job_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Alert configuration
    name = Column(String(100), nullable=False)
    query = Column(String(200), nullable=True)  # Search query
    remote = Column(Boolean, nullable=True)
    location = Column(String(200), nullable=True)
    min_salary = Column(Integer, nullable=True)
    employment_type = Column(String(20), nullable=True)
    experience_level = Column(String(20), nullable=True)
    
    # Notification settings
    frequency = Column(String(20), default="daily", nullable=False)  # instant, daily, weekly
    is_active = Column(Boolean, default=True, index=True)
    
    # Tracking
    last_sent_at = Column(DateTime(timezone=True), nullable=True)
    last_job_id = Column(String(100), nullable=True)  # Last job sent
    jobs_sent_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="job_alerts")
    matches = relationship("AlertJobMatch", back_populates="alert", cascade="all, delete-orphan")

    __table_args__ = (
        {"indexes": [
            ("user_id", "is_active"),
            ("frequency", "is_active"),
        ]}
    )


class AlertJobMatch(Base):
    """Jobs matching alerts (tracking to avoid duplicates)."""

    __tablename__ = "alert_job_matches"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("job_alerts.id"), nullable=False, index=True)
    job_id = Column(String(100), ForeignKey("job_postings.id"), nullable=False)
    
    # Status
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    alert = relationship("JobAlert", back_populates="matches")
    job = relationship("JobPosting")

    __table_args__ = (
        {"indexes": [
            ("alert_id", "is_sent"),
            ("job_id",),
        ]}
    )


class NotificationPreference(Base):
    """User notification preferences."""

    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Email settings
    email_enabled = Column(Boolean, default=True)
    email_address = Column(String(255), nullable=True)
    
    # SMS settings
    sms_enabled = Column(Boolean, default=False)
    phone_number = Column(String(20), nullable=True)
    phone_country_code = Column(String(5), default="+1")
    
    # Digest settings
    daily_digest = Column(Boolean, default=True)
    weekly_digest = Column(Boolean, default=False)
    instant_alerts = Column(Boolean, default=True)
    
    # Timezone for digest timing
    timezone = Column(String(50), default="UTC")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="notification_preferences")


# Add relationships to User model
def extend_user_model():
    """Extend User model with alert relationships."""
    from ..database import User
    
    if not hasattr(User, 'job_alerts'):
        User.job_alerts = relationship(
            "JobAlert",
            back_populates="user",
            cascade="all, delete-orphan"
        )
    
    if not hasattr(User, 'notification_preferences'):
        User.notification_preferences = relationship(
            "NotificationPreference",
            back_populates="user",
            uselist=False,
            cascade="all, delete-orphan"
        )
