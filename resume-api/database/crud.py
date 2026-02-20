"""
CRUD operations for ResumeAI database models.

Provides database access functions for GitHub OAuth connections.
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from .models import UserGitHubConnection

# Type alias for DateTime compatibility
DateTime = datetime


async def get_user_github_connection(
    user_id: int, db: AsyncSession
) -> Optional[UserGitHubConnection]:
    """
    Get a user's GitHub connection by user ID.

    Args:
        user_id: The user's ID
        db: Async database session

    Returns:
        UserGitHubConnection if found, None otherwise
    """
    result = await db.execute(
        select(UserGitHubConnection).where(UserGitHubConnection.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_github_connection_by_github_user_id(
    github_user_id: str, db: AsyncSession
) -> Optional[UserGitHubConnection]:
    """
    Get a GitHub connection by GitHub user ID.

    Args:
        github_user_id: The GitHub user ID
        db: Async database session

    Returns:
        UserGitHubConnection if found, None otherwise
    """
    result = await db.execute(
        select(UserGitHubConnection).where(
            UserGitHubConnection.github_user_id == github_user_id
        )
    )
    return result.scalar_one_or_none()


async def create_user_github_connection(
    user_id: int,
    github_user_id: str,
    github_username: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    token_expires_at: Optional[DateTime] = None,
    scopes: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> UserGitHubConnection:
    """
    Create a new GitHub connection for a user.

    Args:
        user_id: The user's ID
        github_user_id: The GitHub user ID
        github_username: The GitHub username
        access_token: The encrypted OAuth access token
        refresh_token: The encrypted OAuth refresh token (optional)
        token_expires_at: When the access token expires (optional)
        scopes: Granted OAuth scopes as comma-separated string (optional)
        db: Async database session

    Returns:
        The created UserGitHubConnection
    """
    connection = UserGitHubConnection(
        user_id=user_id,
        github_user_id=github_user_id,
        github_username=github_username,
        access_token=access_token,
        refresh_token=refresh_token,
        token_expires_at=token_expires_at,
        scopes=scopes,
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)
    return connection


async def update_user_github_connection(
    user_id: int,
    db: AsyncSession,
    access_token: Optional[str] = None,
    refresh_token: Optional[str] = None,
    token_expires_at: Optional[DateTime] = None,
    scopes: Optional[str] = None,
) -> Optional[UserGitHubConnection]:
    """
    Update a user's GitHub connection.

    Args:
        user_id: The user's ID
        db: Async database session
        access_token: New encrypted OAuth access token (optional)
        refresh_token: New encrypted OAuth refresh token (optional)
        token_expires_at: New token expiration time (optional)
        scopes: New OAuth scopes (optional)

    Returns:
        Updated UserGitHubConnection if found, None otherwise
    """
    # Build update values dict with only non-None values
    update_values = {}
    if access_token is not None:
        update_values["access_token"] = access_token
    if refresh_token is not None:
        update_values["refresh_token"] = refresh_token
    if token_expires_at is not None:
        update_values["token_expires_at"] = token_expires_at
    if scopes is not None:
        update_values["scopes"] = scopes

    if not update_values:
        # Nothing to update
        return await get_user_github_connection(user_id, db)

    # Perform the update
    await db.execute(
        update(UserGitHubConnection)
        .where(UserGitHubConnection.user_id == user_id)
        .values(**update_values)
    )
    await db.commit()

    # Return the updated connection
    return await get_user_github_connection(user_id, db)


async def delete_user_github_connection(user_id: int, db: AsyncSession) -> bool:
    """
    Delete a user's GitHub connection.

    Args:
        user_id: The user's ID
        db: Async database session

    Returns:
        True if deleted, False if not found
    """
    result = await db.execute(
        delete(UserGitHubConnection).where(UserGitHubConnection.user_id == user_id)
    )
    await db.commit()
    return result.rowcount > 0


async def list_all_github_connections(
    db: AsyncSession, skip: int = 0, limit: int = 100
) -> List[UserGitHubConnection]:
    """
    List all GitHub connections with pagination.

    Args:
        db: Async database session
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of UserGitHubConnection objects
    """
    result = await db.execute(
        select(UserGitHubConnection).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def count_github_connections(db: AsyncSession) -> int:
    """
    Count total number of GitHub connections.

    Args:
        db: Async database session

    Returns:
        Total count of GitHub connections
    """
    from sqlalchemy import func

    result = await db.execute(select(func.count(UserGitHubConnection.id)))
    return result.scalar()


__all__ = [
    "get_user_github_connection",
    "get_github_connection_by_github_user_id",
    "create_user_github_connection",
    "update_user_github_connection",
    "delete_user_github_connection",
    "list_all_github_connections",
    "count_github_connections",
]
