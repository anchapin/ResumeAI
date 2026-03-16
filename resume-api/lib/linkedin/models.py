"""
Database models for LinkedIn integration.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class LinkedInConnection(Base):
    """User's LinkedIn connection."""

    __tablename__ = "linkedin_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    linkedin_id = Column(String(100), unique=True, nullable=True)
    
    # Tokens (encrypted at rest)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # OAuth metadata
    scopes = Column(String(500), nullable=True)
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    sync_status = Column(String(20), default="pending")  # pending, synced, failed
    
    # Relationships
    user = relationship("User", back_populates="linkedin_connection")

    __table_args__ = (
        # Index for fast lookups
        {"indexes": [
            ("user_id",),
            ("linkedin_id",),
        ]}
    )


class LinkedInOAuthState(Base):
    """OAuth state tracking for CSRF protection."""

    __tablename__ = "linkedin_oauth_states"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), unique=True, nullable=False, index=True)
    
    # PKCE
    code_verifier = Column(String(100), nullable=False)
    
    # User association (optional, for logged-in users)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Status
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        {"indexes": [
            ("state",),
            ("expires_at",),
        ]}
    )


class LinkedInProfileCache(Base):
    """Cached LinkedIn profile data."""

    __tablename__ = "linkedin_profile_cache"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    linkedin_id = Column(String(100), nullable=False)
    
    # Profile data (JSON)
    profile_data = Column(Text, nullable=True)  # JSON string
    
    # Cache metadata
    cached_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="linkedin_profile_cache")

    __table_args__ = (
        {"indexes": [
            ("linkedin_id",),
            ("expires_at",),
        ]}
    )


# Add relationships to User model
def extend_user_model():
    """Extend User model with LinkedIn relationships."""
    from ..database import User
    
    # Add linkedin_connection relationship
    if not hasattr(User, 'linkedin_connection'):
        User.linkedin_connection = relationship(
            "LinkedInConnection",
            back_populates="user",
            uselist=False,
            cascade="all, delete-orphan"
        )
    
    # Add linkedin_profile_cache relationship
    if not hasattr(User, 'linkedin_profile_cache'):
        User.linkedin_profile_cache = relationship(
            "LinkedInProfileCache",
            back_populates="user",
            uselist=False,
            cascade="all, delete-orphan"
        )
