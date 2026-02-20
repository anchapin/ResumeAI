"""
GitHub OAuth routes for connecting and disconnecting GitHub accounts.

Endpoints:
- DELETE /github/disconnect - Disconnect GitHub account and delete stored tokens
- GET /github/projects - Fetch user's GitHub repositories
"""

import httpx
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_session, User, GitHubConnection
from config.dependencies import get_current_user
from monitoring import logging_config
from lib.github_client import GitHubAPIClient

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub"])


# Request/Response Models
class GitHubProjectResponse(BaseModel):
    """Response model for GitHub project data."""

    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    url: str
    language: Optional[str] = None
    stars: int = 0
    forks: int = 0
    private: bool = False
    updated_at: str
    topics: list = Field(default_factory=list)


class GitHubProjectsListResponse(BaseModel):
    """Response model for listing GitHub projects."""

    projects: list[GitHubProjectResponse]
    count: int
    username: Optional[str] = None


async def _revoke_github_token(token: str) -> bool:
    """
    Optionally revoke a GitHub OAuth token via GitHub API.

    Note: This requires the token to have the appropriate scope and
    the application to be registered as an OAuth app. This is a best-effort
    operation - if revocation fails, we still delete the token from our database.

    Args:
        token: The GitHub OAuth access token to revoke

    Returns:
        True if revocation succeeded or failed gracefully, False on critical error
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # GitHub API endpoint for revoking OAuth tokens
            # Note: This endpoint may not work for all OAuth flows
            response = await client.post(
                "https://api.github.com/applications/{client_id}/token",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.v3+json",
                },
            )
            # Log revocation attempt
            if response.status_code in [200, 204, 404]:
                logger.info("github_token_revoked", status_code=response.status_code)
                return True
            else:
                logger.warning(
                    "github_token_revocation_failed",
                    status_code=response.status_code,
                    response=response.text[:200],
                )
                # Return True anyway - we'll delete the token from our DB
                return True
    except Exception as e:
        logger.error("github_token_revocation_error", error=str(e))
        # Return True anyway - we'll delete the token from our DB
        return True


@router.get(
    "/projects",
    response_model=GitHubProjectsListResponse,
    responses={
        200: {"description": "Projects retrieved successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "GitHub connection not found or token invalid"},
        422: {"description": "Validation error"},
        503: {"description": "GitHub API unavailable"},
    },
    summary="Get user's GitHub projects",
)
async def get_github_projects(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
    sort: str = "updated",
    per_page: int = 30,
    page: int = 1,
    repo_type: str = "all",
):
    """
    Fetch user's GitHub repositories using OAuth token.

    This endpoint:
    1. Retrieves the user's GitHub OAuth token from the database
    2. Fetches repositories using the GitHub REST API
    3. Returns a formatted list of projects

    Query parameters:
    - sort: Sort order (created, updated, pushed, full_name). Default: updated
    - per_page: Number of results per page (1-100). Default: 30
    - page: Page number. Default: 1
    - repo_type: Repository type (all, owner, member). Default: all

    Requires authentication via JWT access token.

    **Error handling:**
    - 401: User not authenticated
    - 403: No GitHub connection found or token expired/revoked
    - 422: Invalid query parameters
    - 503: GitHub API service unavailable

    **Backward compatibility:**
    In development mode without a GitHub connection, this will return
    an empty list rather than falling back to CLI (as CLI mode is deprecated).
    """
    user_id = current_user.id

    # Validate query parameters
    if sort not in ["created", "updated", "pushed", "full_name"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid sort value. Must be one of: created, updated, pushed, full_name",
        )

    if not 1 <= per_page <= 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="per_page must be between 1 and 100",
        )

    if repo_type not in ["all", "owner", "member"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid repo_type. Must be one of: all, owner, member",
        )

    logger.info(
        "github_projects_fetch_attempt",
        user_id=user_id,
        email=current_user.email,
        sort=sort,
        per_page=per_page,
        page=page,
        repo_type=repo_type,
    )

    # Fetch the GitHub connection for this user
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == user_id,
            GitHubConnection.is_active.is_(True),
        )
    )
    connection = result.scalar_one_or_none()

    # Check if user has a GitHub connection
    if not connection:
        logger.warning(
            "github_projects_no_connection",
            user_id=user_id,
            email=current_user.email,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No GitHub connection found. Please connect your GitHub account first.",
        )

    # Check if token is expired
    if connection.expires_at and connection.expires_at.tzinfo is not None:
        from datetime import datetime, timezone

        if datetime.now(timezone.utc) >= connection.expires_at:
            logger.warning(
                "github_projects_token_expired",
                user_id=user_id,
                expires_at=connection.expires_at.isoformat(),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="GitHub OAuth token has expired. Please reconnect your GitHub account.",
            )

    try:
        # Create GitHub API client with user's OAuth token
        client = GitHubAPIClient(access_token=connection.access_token)

        # Fetch repositories from GitHub API
        repositories = await client.get_user_repositories(
            sort=sort,
            per_page=per_page,
            page=page,
            type=repo_type,
        )

        # Update last_used_at timestamp
        from datetime import datetime, timezone

        connection.last_used_at = datetime.now(timezone.utc)
        await db.commit()

        # Convert to response format
        projects = [
            GitHubProjectResponse(
                id=repo.id,
                name=repo.name,
                full_name=repo.full_name,
                description=repo.description,
                url=repo.url,
                language=repo.language,
                stars=repo.stars,
                forks=repo.forks,
                private=repo.is_private,
                updated_at=repo.updated_at,
                topics=repo.topics,
            )
            for repo in repositories
        ]

        logger.info(
            "github_projects_fetch_success",
            user_id=user_id,
            connection_id=connection.id,
            github_username=connection.github_username,
            project_count=len(projects),
        )

        return GitHubProjectsListResponse(
            projects=projects,
            count=len(projects),
            username=connection.github_username,
        )

    except ValueError as e:
        # Handle token validation errors (expired, revoked, invalid)
        logger.error(
            "github_projects_token_error",
            user_id=user_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"GitHub OAuth token error: {str(e)}. Please reconnect your GitHub account.",
        ) from e

    except httpx.HTTPStatusError as e:
        logger.error(
            "github_projects_api_error",
            user_id=user_id,
            status_code=e.response.status_code,
            error=e.response.text[:200],
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub API service unavailable. Please try again later.",
        ) from e

    except httpx.RequestError as e:
        logger.error(
            "github_projects_network_error",
            user_id=user_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to connect to GitHub API. Please check your network connection.",
        ) from e

    except Exception as e:
        logger.error(
            "github_projects_unexpected_error",
            user_id=user_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching GitHub projects.",
        ) from e


@router.delete(
    "/disconnect",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "GitHub account disconnected successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "No GitHub connection found"},
    },
    summary="Disconnect GitHub account",
)
async def disconnect_github(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Disconnect user's GitHub account and delete stored OAuth tokens.

    This endpoint:
    1. Optionally revokes the GitHub OAuth token with GitHub API (best-effort)
    2. Deletes the encrypted token from the database
    3. Removes all GitHub connection data for the user

    Requires authentication via JWT access token.

    **Error handling:**
    - 401: User not authenticated
    - Returns 204 No Content regardless of whether connection exists (idempotent)
    """
    user_id = current_user.id

    # Check if user has a GitHub connection
    logger.info(
        "github_disconnect_attempt",
        user_id=user_id,
        email=current_user.email,
    )

    # Fetch the GitHub connection for this user
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == user_id,
            GitHubConnection.is_active.is_(True),
        )
    )
    connection = result.scalar_one_or_none()

    # If connection exists, revoke the token with GitHub API and delete from database
    if connection:
        # Attempt to revoke the token with GitHub API (best-effort)
        await _revoke_github_token(connection.access_token)

        # Delete the connection from database
        await db.delete(connection)
        await db.commit()

        logger.info(
            "github_disconnect_success",
            user_id=user_id,
            connection_id=connection.id,
            github_username=connection.github_username,
        )
    else:
        # No connection found - log and return success (idempotent)
        logger.info(
            "github_disconnect_no_connection",
            user_id=user_id,
        )

    return None
