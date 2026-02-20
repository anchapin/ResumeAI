"""
GitHub OAuth Integration Routes

Provides endpoints for:
- OAuth callback handling
- GitHub user authentication
- Token management and storage
"""

import secrets
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from httpx import AsyncClient

from database import get_async_session, User, OAuthState, GitHubConnection
from config.dependencies import get_current_user
from config.security import encrypt_token
from config import settings
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub OAuth"])


async def exchange_code_for_token(code: str) -> dict:
    """
    Exchange OAuth authorization code for access token.

    Args:
        code: Authorization code from GitHub

    Returns:
        Dictionary with access_token, scope, token_type

    Raises:
        HTTPException: If token exchange fails
    """
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth not configured",
        )

    async with AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )

        if response.status_code != 200:
            logger.error("github_token_exchange_failed", status=response.status_code)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for token",
            )

        token_data = await response.json()

        if "error" in token_data:
            logger.error("github_token_error", error=token_data.get("error"))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=token_data.get("error_description", "Token exchange failed"),
            )

        return token_data


async def fetch_github_user(token: str) -> dict:
    """
    Fetch GitHub user profile using access token.

    Args:
        token: GitHub access token

    Returns:
        Dictionary with user profile data (id, login, email, name, etc.)

    Raises:
        HTTPException: If user fetch fails
    """
    async with AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

        if response.status_code != 200:
            logger.error("github_user_fetch_failed", status=response.status_code)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch GitHub user profile",
            )

        return await response.json()


async def validate_oauth_state(state: str, db: AsyncSession) -> OAuthState:
    """
    Validate OAuth state parameter and return state record.

    Args:
        state: OAuth state parameter
        db: Database session

    Returns:
        OAuthState record

    Raises:
        HTTPException: If state is invalid or expired
    """
    result = await db.execute(select(OAuthState).where(OAuthState.state == state))
    oauth_state = result.scalar_one_or_none()

    if not oauth_state:
        logger.warning("oauth_state_not_found", state=state)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state",
        )

    # Check if state is expired
    # Handle both timezone-aware and timezone-naive datetimes
    expires_at = oauth_state.expires_at
    if expires_at.tzinfo is None:
        # If expires_at is naive, assume UTC
        from datetime import timezone as tz

        expires_at = expires_at.replace(tzinfo=tz.utc)

    now = datetime.now(timezone.utc)

    if expires_at < now:
        logger.warning("oauth_state_expired", state=state)
        await db.delete(oauth_state)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state has expired",
        )

    return oauth_state


@router.get("/callback")
async def github_oauth_callback(
    request: Request,
    code: Annotated[str, Query(description="Authorization code from GitHub")],
    state: Annotated[str, Query(description="OAuth state parameter")],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Handle OAuth callback from GitHub.

    This endpoint is called by GitHub after user authorization.
    It exchanges the authorization code for an access token,
    fetches the user's GitHub profile, and stores the connection.

    **Flow:**
    1. Validate OAuth state parameter
    2. Exchange authorization code for access token
    3. Fetch GitHub user profile
    4. Encrypt and store access token
    5. Redirect user to frontend with success/error status

    **Query Parameters:**
    - code: Authorization code from GitHub (required)
    - state: OAuth state parameter for CSRF protection (required)

    **Response:**
    Redirects to frontend with status query parameter:
    - ?status=success: OAuth completed successfully
    - ?status=error&error=<error_message>: OAuth failed
    """
    try:
        # Step 1: Validate OAuth state
        oauth_state = await validate_oauth_state(state, db)
        user_id = oauth_state.user_id
        provider = oauth_state.provider

        if provider != "github":
            logger.warning(
                "oauth_state_wrong_provider",
                state=state,
                expected="github",
                actual=provider,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OAuth provider",
            )

        # Step 2: Exchange code for token
        logger.info(
            "github_oauth_exchange_start",
            user_id=user_id,
        )
        token_data = await exchange_code_for_token(code)
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received",
            )

        # Step 3: Fetch GitHub user profile
        logger.info(
            "github_oauth_fetch_user",
            user_id=user_id,
        )
        github_user = await fetch_github_user(access_token)

        github_user_id = str(github_user.get("id"))
        github_username = github_user.get("login")
        github_email = github_user.get("email")

        if not github_user_id or not github_username:
            logger.error("github_user_missing_data", data=github_user)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub user data",
            )

        # Step 4: Verify user exists in our database
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            logger.warning("oauth_user_not_found", user_id=user_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Step 5: Encrypt and store the access token
        logger.info(
            "github_oauth_store_connection",
            user_id=user_id,
            github_username=github_username,
        )
        encrypted_token = encrypt_token(access_token)

        # Check if user already has a GitHub connection
        result = await db.execute(
            select(GitHubConnection).where(GitHubConnection.user_id == user_id)
        )
        existing_connection = result.scalar_one_or_none()

        if existing_connection:
            # Update existing connection
            existing_connection.encrypted_access_token = encrypted_token
            existing_connection.github_user_id = github_user_id
            existing_connection.github_username = github_username
            existing_connection.github_email = github_email
            existing_connection.token_scope = token_data.get("scope")
            existing_connection.token_type = token_data.get("token_type", "bearer")
            existing_connection.is_active = True
            existing_connection.updated_at = datetime.now(timezone.utc)
            logger.info(
                "github_oauth_connection_updated",
                user_id=user_id,
                github_username=github_username,
            )
        else:
            # Create new connection
            new_connection = GitHubConnection(
                user_id=user_id,
                github_user_id=github_user_id,
                github_username=github_username,
                github_email=github_email,
                encrypted_access_token=encrypted_token,
                token_scope=token_data.get("scope"),
                token_type=token_data.get("token_type", "bearer"),
                is_active=True,
            )
            db.add(new_connection)
            logger.info(
                "github_oauth_connection_created",
                user_id=user_id,
                github_username=github_username,
            )

        # Delete the used OAuth state
        await db.delete(oauth_state)

        await db.commit()

        # Step 6: Redirect to frontend with success status
        frontend_url = settings.frontend_url.rstrip("/")
        redirect_url = f"{frontend_url}/settings?status=success&provider=github"
        logger.info(
            "github_oauth_success",
            user_id=user_id,
            github_username=github_username,
        )
        return Response(status_code=302, headers={"Location": redirect_url})

    except HTTPException as e:
        # Known HTTP exceptions - redirect with error
        logger.error(
            "github_oauth_http_error",
            user_id=user_id if "user_id" in locals() else None,
            error=str(e.detail),
        )
        frontend_url = settings.frontend_url.rstrip("/")
        error_message = e.detail.replace(" ", "+")
        redirect_url = f"{frontend_url}/settings?status=error&error={error_message}"
        return Response(status_code=302, headers={"Location": redirect_url})

    except Exception as e:
        # Unexpected errors - log and redirect with generic error
        logger.error(
            "github_oauth_unexpected_error",
            user_id=user_id if "user_id" in locals() else None,
            error=str(e),
        )
        frontend_url = settings.frontend_url.rstrip("/")
        error_message = "OAuth+failed+unexpectedly"
        redirect_url = f"{frontend_url}/settings?status=error&error={error_message}"
        return Response(status_code=302, headers={"Location": redirect_url})


@router.get("/authorize")
async def github_oauth_authorize(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Initiate GitHub OAuth authorization flow.

    Creates an OAuth state parameter and redirects user to GitHub's authorization page.

    **Response:**
    Redirects to GitHub OAuth authorization page
    """
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth not configured",
        )

    # Generate secure state parameter
    state = secrets.token_urlsafe(32)

    # Store state in database with 10 minute expiration
    oauth_state = OAuthState(
        state=state,
        user_id=current_user.id,
        provider="github",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(oauth_state)
    await db.commit()

    # Build GitHub OAuth authorization URL
    callback_url = f"{request.url.scheme}://{request.url.netloc}/github/callback"
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&redirect_uri={callback_url}"
        f"&scope=user:email"
        f"&state={state}"
    )

    logger.info(
        "github_oauth_authorize",
        user_id=current_user.id,
        state=state,
    )

    return Response(status_code=302, headers={"Location": github_auth_url})


@router.get("/connection")
async def get_github_connection(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Get current user's GitHub connection status.

    Returns information about the user's GitHub connection,
    excluding sensitive token data.

    **Response:**
    - connected: boolean indicating if GitHub is connected
    - github_username: GitHub username (if connected)
    - github_email: GitHub email (if connected)
    - connected_at: ISO timestamp of connection (if connected)
    """
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == current_user.id,
            GitHubConnection.is_active.is_(True),
        )
    )
    connection = result.scalar_one_or_none()

    if not connection:
        return {
            "connected": False,
            "github_username": None,
            "github_email": None,
            "connected_at": None,
        }

    return {
        "connected": True,
        "github_username": connection.github_username,
        "github_email": connection.github_email,
        "connected_at": (
            connection.created_at.isoformat() if connection.created_at else None
        ),
    }


@router.delete("/connection")
async def disconnect_github(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Disconnect GitHub OAuth connection.

    Removes the stored GitHub access token and connection data.

    **Response:**
    - success: boolean indicating operation result
    """
    result = await db.execute(
        select(GitHubConnection).where(GitHubConnection.user_id == current_user.id)
    )
    connection = result.scalar_one_or_none()

    if connection:
        await db.delete(connection)
        await db.commit()
        logger.info(
            "github_oauth_disconnected",
            user_id=current_user.id,
            github_username=connection.github_username,
        )

    return {"success": True}
