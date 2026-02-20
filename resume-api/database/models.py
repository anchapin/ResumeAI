"""
Database models for ResumeAI.

Contains SQLAlchemy models including the UserGitHubConnection model
for storing GitHub OAuth connections.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

# Create a new Base for the database models
# This is used for migrations and CRUD operations
Base = declarative_base()


class UserGitHubConnection(Base):
    """
    Model for storing user GitHub OAuth connections.

    Stores encrypted OAuth tokens for GitHub API access.
    Each user can have one GitHub connection.
    """

    __tablename__ = "user_github_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    github_user_id = Column(String(255), nullable=False, unique=True)
    github_username = Column(String(255), nullable=False)

    # OAuth tokens (access_token should be encrypted)
    access_token = Column(String(500), nullable=False)
    refresh_token = Column(String(500), nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Granted OAuth scopes as a comma-separated string
    scopes = Column(String(500), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Indexes for performance
    __table_args__ = (
        Index("idx_github_connections_user", "user_id"),
        Index("idx_github_connections_github_user", "github_user_id"),
    )

    def __repr__(self):
        return (
            f"<UserGitHubConnection(id={self.id}, user_id={self.user_id}, "
            f"github_username={self.github_username})>"
        )


# Export Base for use in migrations
__all__ = ["Base", "UserGitHubConnection"]
