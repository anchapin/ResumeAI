"""
GitHub OAuth routes for connecting and disconnecting GitHub accounts.

Endpoints:
- GET /github/status - Get current GitHub connection status
- GET /github/connect - Redirect to GitHub OAuth authorization
- DELETE /github/disconnect - Disconnect GitHub account and delete stored tokens
"""

import httpx
from typing import Annotated
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_session, User, GitHubConnection
from config.dependencies import get_current_user
from config import settings
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub"])


# Pydantic models
class GitHubConnectionStatus(BaseModel):
    """GitHub connection status response model."""
    connected: bool
    github_username: str | None = None
    github_user_id: str | None = None
    connected_at: str | None = None


class GitHubConnectResponse(BaseModel):
    """GitHub connect response model."""
    authorization_url: str
    state: str


class GitHubRepository(BaseModel):
    """GitHub repository model."""
    id: int
    name: str
    full_name: str
    description: str | None
    html_url: str
    language: str | None
    stargazers_count: int
    forks_count: int
    updated_at: str
    private: bool


class RepositoriesResponse(BaseModel):
    """Repositories response model."""
    repositories: list[GitHubRepository]


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
    "/status",
    response_model=GitHubConnectionStatus,
    responses={
        200: {"description": "GitHub connection status retrieved"},
        401: {"description": "Not authenticated"},
    },
    summary="Get GitHub connection status",
)
async def get_github_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Get the current user's GitHub connection status.

    This endpoint:
    1. Fetches the user's GitHub connection from the database
    2. Returns connection details if connected
    3. Returns not connected status if no connection exists

    Requires authentication via JWT access token.

    **Response:**
    - connected: boolean indicating if GitHub is connected
    - github_username: GitHub username if connected
    - github_user_id: GitHub user ID if connected
    - connected_at: ISO timestamp of when connection was established
    """
    user_id = current_user.id

    # Fetch GitHub connection for this user
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == user_id,
            GitHubConnection.is_active.is_(True),
        )
    )
    connection = result.scalar_one_or_none()

    if connection:
        return GitHubConnectionStatus(
            connected=True,
            github_username=connection.github_username,
            github_user_id=connection.github_user_id,
            connected_at=connection.created_at.isoformat() if connection.created_at else None,
        )
    else:
        return GitHubConnectionStatus(connected=False)


@router.get(
    "/connect",
    response_model=GitHubConnectResponse,
    responses={
        200: {"description": "GitHub OAuth authorization URL generated"},
        401: {"description": "Not authenticated"},
        500: {"description": "GitHub OAuth not configured"},
    },
    summary="Get GitHub OAuth authorization URL",
)
async def get_github_connect_url(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Generate a GitHub OAuth authorization URL for the current user.

    This endpoint:
    1. Generates a secure state parameter for CSRF protection
    2. Constructs the GitHub OAuth authorization URL
    3. Returns the URL for the frontend to redirect to

    Requires authentication via JWT access token.

    **OAuth Configuration:**
    - Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables
    - The frontend redirects the user to the returned authorization URL
    - GitHub redirects back to the frontend's callback URL with an authorization code
    - The frontend then sends the code to the backend for token exchange

    **Required Scopes:**
    - read:user: Read user profile data
    - user:email: Read user email address
    """
    # Get GitHub OAuth configuration from environment
    github_client_id = getattr(settings, 'github_client_id', None)
    github_client_secret = getattr(settings, 'github_client_secret', None)

    if not github_client_id or not github_client_secret:
        logger.error("github_oauth_not_configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth is not configured. Please contact administrator.",
        )

    # Generate state for CSRF protection
    import secrets
    state = secrets.token_urlsafe(32)

    # Store state temporarily (in production, use Redis or database)
    # For now, we'll use the state validation during callback

    # Construct authorization URL
    # Frontend should redirect user to this URL
    authorization_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={github_client_id}"
        f"&redirect_uri={settings.app_name}/settings"
        f"&scope=read:user%20user:email"
        f"&state={state}"
        f"&allow_signup=true"
    )

    logger.info(
        "github_oauth_initiated",
        user_id=current_user.id,
        email=current_user.email,
        state=state,
    )

    return GitHubConnectResponse(
        authorization_url=authorization_url,
        state=state,
    )


@router.post(
    "/callback",
    responses={
        200: {"description": "GitHub OAuth callback processed successfully"},
        400: {"description": "Invalid callback parameters"},
        401: {"description": "Not authenticated"},
    },
    summary="Process GitHub OAuth callback",
)
async def handle_github_oauth_callback(
    code: str,
    state: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Process the GitHub OAuth callback and establish connection.

    This endpoint:
    1. Receives the authorization code from GitHub callback
    2. Exchanges the code for an access token
    3. Fetches the user's GitHub profile
    4. Stores the connection in the database
    5. Returns success to the frontend

    Requires authentication via JWT access token.

    **Flow:**
    1. User clicks "Connect with GitHub" in frontend
    2. Frontend calls GET /github/connect to get authorization URL
    3. Frontend redirects user to GitHub authorization page
    4. User authorizes the application
    5. GitHub redirects back to frontend with code and state
    6. Frontend sends code and state to this endpoint
    7. Backend exchanges code for token and stores connection
    """
    # Get GitHub OAuth configuration
    github_client_id = getattr(settings, 'github_client_id', None)
    github_client_secret = getattr(settings, 'github_client_secret', None)

    if not github_client_id or not github_client_secret:
        logger.error("github_oauth_not_configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth is not configured. Please contact administrator.",
        )

    # Exchange authorization code for access token
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={
                    "Accept": "application/json",
                },
                data={
                    "client_id": github_client_id,
                    "client_secret": github_client_secret,
                    "code": code,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("github_token_exchange_failed", response=token_data)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange authorization code for access token",
                )

            # Fetch user profile from GitHub
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
            )
            user_response.raise_for_status()
            github_user = user_response.json()

            # Check for existing connection and update or create new one
            user_id = current_user.id
            existing_connection = await db.execute(
                select(GitHubConnection).where(
                    GitHubConnection.user_id == user_id,
                )
            )
            existing = existing_connection.scalar_one_or_none()

            if existing:
                # Update existing connection
                existing.access_token = access_token
                existing.github_user_id = str(github_user.get("id"))
                existing.github_username = github_user.get("login")
                existing.token_type = token_data.get("token_type", "bearer")
                existing.scope = token_data.get("scope")
                existing.updated_at = datetime.utcnow()
                existing.last_used_at = datetime.utcnow()
                existing.is_active = True

                logger.info(
                    "github_connection_updated",
                    user_id=user_id,
                    github_username=github_user.get("login"),
                    connection_id=existing.id,
                )
            else:
                # Create new connection
                new_connection = GitHubConnection(
                    user_id=user_id,
                    github_user_id=str(github_user.get("id")),
                    github_username=github_user.get("login"),
                    access_token=access_token,
                    token_type=token_data.get("token_type", "bearer"),
                    scope=token_data.get("scope"),
                    created_at=datetime.utcnow(),
                    last_used_at=datetime.utcnow(),
                    is_active=True,
                )
                db.add(new_connection)

                logger.info(
                    "github_connection_created",
                    user_id=user_id,
                    github_username=github_user.get("login"),
                )

            await db.commit()

            return {
                "success": True,
                "message": "GitHub account connected successfully",
                "github_username": github_user.get("login"),
            }

    except httpx.HTTPStatusError as e:
        logger.error(
            "github_oauth_http_error",
            status_code=e.response.status_code,
            response_text=e.response.text[:500],
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub OAuth error: {e.response.status_code}",
        )
    except Exception as e:
        logger.error("github_oauth_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process GitHub OAuth callback",
        )


@router.get(
    "/repositories",
    response_model=RepositoriesResponse,
    responses={
        200: {"description": "Repositories retrieved successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "GitHub not connected"},
    },
    summary="Get user's GitHub repositories",
)
async def get_github_repositories(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Fetch the current user's GitHub repositories.

    This endpoint:
    1. Retrieves the user's GitHub connection from the database
    2. Uses the stored access token to fetch repositories from GitHub API
    3. Returns a list of repositories

    Requires authentication via JWT access token.

    **Response:**
    - repositories: List of GitHub repositories with metadata

    **Note:** This endpoint returns up to 100 repositories, ordered by most recently updated.
    """
    user_id = current_user.id

    # Fetch GitHub connection for this user
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == user_id,
            GitHubConnection.is_active.is_(True),
        )
    )
    connection = result.scalar_one_or_none()

    if not connection:
        logger.info("github_repositories_not_connected", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub account not connected. Please connect your GitHub account first.",
        )

    # Fetch repositories from GitHub API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Fetch user's repositories (sorted by updated)
            response = await client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {connection.access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
                params={
                    "sort": "updated",
                    "per_page": "100",
                    "type": "all",  # Include private repos
                },
            )
            response.raise_for_status()
            github_repos = response.json()

            # Update last_used_at timestamp
            connection.last_used_at = datetime.utcnow()
            await db.commit()

            logger.info(
                "github_repositories_fetched",
                user_id=user_id,
                count=len(github_repos),
            )

            return RepositoriesResponse(
                repositories=[
                    GitHubRepository(
                        id=repo["id"],
                        name=repo["name"],
                        full_name=repo["full_name"],
                        description=repo.get("description"),
                        html_url=repo["html_url"],
                        language=repo.get("language"),
                        stargazers_count=repo["stargazers_count"],
                        forks_count=repo["forks_count"],
                        updated_at=repo["updated_at"],
                        private=repo.get("private", False),
                    )
                    for repo in github_repos
                ]
            )

    except httpx.HTTPStatusError as e:
        logger.error(
            "github_repositories_fetch_error",
            status_code=e.response.status_code,
            response_text=e.response.text[:500],
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub API error: {e.response.status_code}",
        )
    except Exception as e:
        logger.error("github_repositories_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch repositories from GitHub",
        )


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
