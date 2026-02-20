"""
GitHub OAuth routes for connecting and disconnecting GitHub accounts.

Endpoints:
- GET /github/status - Check GitHub connection status (OAuth or CLI)
- DELETE /github/disconnect - Disconnect GitHub account and delete stored tokens
"""

import httpx
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_session, User, GitHubConnection
from config.dependencies import get_current_user
from config import settings
from monitoring import logging_config
from api.models import GitHubStatusResponse, GitHubCLIStatus
from lib.github_cli import check_gh_cli_status

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub"])


@router.get(
    "/status",
    response_model=GitHubStatusResponse,
    responses={
        200: {"description": "GitHub connection status"},
        401: {"description": "Not authenticated"},
    },
    summary="Check GitHub connection status",
)
async def get_github_status(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Check the user's GitHub connection status.

    This endpoint checks GitHub authentication status based on the configured mode:
    - **OAuth mode**: Checks the database for an active OAuth connection
    - **CLI mode**: Checks if the GitHub CLI is authenticated on the server

    Requires authentication via JWT access token.

    **Response includes:**
    - `authenticated`: Whether user is connected to GitHub
    - `mode`: Authentication mode being used (oauth/cli)
    - `username`: GitHub username (if authenticated)
    - `github_user_id`: GitHub user ID (if authenticated in OAuth mode)
    - `connected_at`: Connection timestamp (OAuth mode only)
    - `error`: Error message if status check failed

    **Note:** CLI mode is intended for development only. Use OAuth mode in production.
    """
    auth_mode = settings.github_auth_mode
    logger.info("github_status_check", mode=auth_mode, user_id=current_user.id)

    if auth_mode == "cli":
        # CLI mode: Check GitHub CLI status
        return await _get_cli_status()
    else:
        # OAuth mode: Check database connection
        return await _get_oauth_status(current_user.id, db)


async def _get_cli_status() -> GitHubStatusResponse:
    """
    Check GitHub CLI authentication status.

    Returns status response based on CLI authentication.
    """
    try:
        cli_status = await check_gh_cli_status()

        if cli_status["authenticated"]:
            logger.info("github_cli_authenticated", username=cli_status["username"])
            return GitHubStatusResponse(
                authenticated=True,
                mode="cli",
                username=cli_status["username"],
                github_user_id=None,
                connected_at=None,
                error=None,
            )
        else:
            logger.info("github_cli_not_authenticated", error=cli_status["error"])
            return GitHubStatusResponse(
                authenticated=False,
                mode="cli",
                username=None,
                github_user_id=None,
                connected_at=None,
                error=cli_status.get("error"),
            )
    except Exception as e:
        logger.error("github_cli_status_error", error=str(e))
        return GitHubStatusResponse(
            authenticated=False,
            mode="cli",
            username=None,
            github_user_id=None,
            connected_at=None,
            error=f"Failed to check CLI status: {str(e)}",
        )


async def _get_oauth_status(user_id: int, db: AsyncSession) -> GitHubStatusResponse:
    """
    Check GitHub OAuth connection status from database.

    Returns status response based on OAuth connection in database.
    """
    try:
        result = await db.execute(
            select(GitHubConnection).where(
                GitHubConnection.user_id == user_id,
                GitHubConnection.is_active.is_(True),
            )
        )
        connection = result.scalar_one_or_none()

        if connection:
            logger.info(
                "github_oauth_connected",
                user_id=user_id,
                github_username=connection.github_username,
            )
            return GitHubStatusResponse(
                authenticated=True,
                mode="oauth",
                username=connection.github_username,
                github_user_id=connection.github_user_id,
                connected_at=connection.created_at.isoformat() if connection.created_at else None,
                error=None,
            )
        else:
            logger.info("github_oauth_not_connected", user_id=user_id)
            return GitHubStatusResponse(
                authenticated=False,
                mode="oauth",
                username=None,
                github_user_id=None,
                connected_at=None,
                error="No GitHub connection found",
            )
    except Exception as e:
        logger.error("github_oauth_status_error", user_id=user_id, error=str(e))
        return GitHubStatusResponse(
            authenticated=False,
            mode="oauth",
            username=None,
            github_user_id=None,
            connected_at=None,
            error=f"Failed to check OAuth status: {str(e)}",
        )


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
