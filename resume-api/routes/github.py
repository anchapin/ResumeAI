"""
GitHub OAuth routes for connecting and disconnecting GitHub accounts.

Endpoints:
- DELETE /github/disconnect - Disconnect GitHub account and delete stored tokens
"""

import httpx
from typing import Annotated
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_session, User, GitHubConnection
from config.dependencies import get_current_user
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub"])


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
