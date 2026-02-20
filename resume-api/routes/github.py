"""
GitHub OAuth API Routes

Provides endpoints for:
- OAuth flow initiation (/connect)
- OAuth callback handling (/callback)
- GitHub connection management
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db, GitHubConnection, GitHubOAuthState, User
from lib.token_encryption import get_token_encryption, TokenEncryptionError

router = APIRouter(prefix="/github", tags=["github"])
logger = logging.getLogger(__name__)

# OAuth Scopes
GITHUB_SCOPES = "read:user public_repo"


# Request/Response Models
class ConnectResponse(BaseModel):
    """Response model for OAuth connect endpoint."""

    success: bool
    authorization_url: str
    state: str
    expires_in: int  # Seconds until state expires


class CallbackResponse(BaseModel):
    """Response model for OAuth callback."""

    success: bool
    message: str
    user_id: Optional[int] = None
    github_username: Optional[str] = None


class ConnectionInfo(BaseModel):
    """Information about a GitHub connection."""

    id: int
    github_user_id: int
    github_username: str
    github_display_name: Optional[str]
    is_active: bool
    created_at: datetime


class ConnectionListResponse(BaseModel):
    """Response model for listing GitHub connections."""

    success: bool
    connections: list[ConnectionInfo]


# Helper Functions
def generate_oauth_state() -> str:
    """Generate a secure random state parameter for OAuth flow."""
    import secrets
    return secrets.token_urlsafe(32)


def build_github_authorization_url(
    client_id: str,
    redirect_uri: str,
    state: str,
    scopes: str = GITHUB_SCOPES,
) -> str:
    """Build GitHub OAuth authorization URL."""
    base_url = "https://github.com/login/oauth/authorize"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scopes,
        "state": state,
    }

    from urllib.parse import urlencode
    query_string = urlencode(params)
    return f"{base_url}?{query_string}"


# OAuth Connect Endpoint
@router.get("/connect", response_model=ConnectResponse)
async def github_oauth_connect(
    request: Request,
    redirect_uri: Optional[str] = Query(
        None,
        description="Custom redirect URI (defaults to GITHUB_OAUTH_CALLBACK_URL setting)",
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate GitHub OAuth flow.

    This endpoint generates a GitHub OAuth authorization URL for the frontend to redirect to.
    It creates a secure state parameter to prevent CSRF attacks and stores it temporarily.

    Query Parameters:
        redirect_uri: Optional custom redirect URI. If not provided, uses GITHUB_OAUTH_CALLBACK_URL from settings.

    Returns:
        ConnectResponse containing the authorization URL and state parameter.

    Usage:
        1. Frontend calls GET /github/connect
        2. Frontend receives authorization_url and state
        3. Frontend redirects user to authorization_url
        4. User authorizes the application on GitHub
        5. GitHub redirects to /github/callback with code and state
        6. Frontend handles the callback response

    Example Response:
        {
            "success": true,
            "authorization_url": "https://github.com/login/oauth/authorize?client_id=xxx&redirect_uri=xxx&scope=xxx&state=xxx",
            "state": "abc123...",
            "expires_in": 600
        }
    """
    try:
        # Validate GitHub OAuth configuration
        if not settings.github_client_id:
            raise HTTPException(
                status_code=500,
                detail="GitHub OAuth not configured. Missing GITHUB_CLIENT_ID.",
            )

        # Determine redirect URI
        final_redirect_uri = redirect_uri or settings.github_oauth_callback_url
        if not final_redirect_uri:
            raise HTTPException(
                status_code=500,
                detail="GitHub OAuth callback URL not configured.",
            )

        # Generate secure state parameter
        state = generate_oauth_state()

        # Set expiration (10 minutes from now)
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        # Store state in database for validation during callback
        oauth_state = GitHubOAuthState(
            state=state,
            redirect_uri=final_redirect_uri,
            expires_at=expires_at,
        )
        db.add(oauth_state)
        await db.commit()

        # Build authorization URL
        authorization_url = build_github_authorization_url(
            client_id=settings.github_client_id,
            redirect_uri=final_redirect_uri,
            state=state,
        )

        logger.info(
            "GitHub OAuth connect initiated",
            state=state[:8] + "...",  # Log only prefix for security
            expires_in_seconds=600,
        )

        return ConnectResponse(
            success=True,
            authorization_url=authorization_url,
            state=state,
            expires_in=600,  # 10 minutes
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth connect error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to initiate GitHub OAuth flow"
        )


# OAuth Callback Endpoint
@router.get("/callback", response_model=CallbackResponse)
async def github_oauth_callback(
    request: Request,
    code: str = Query(..., description="OAuth authorization code from GitHub"),
    state: str = Query(..., description="State parameter from connect request"),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle GitHub OAuth callback.

    This endpoint receives the callback from GitHub after user authorization.
    It validates the state, exchanges the code for an access token,
    fetches the user's GitHub profile, and stores the connection.

    Query Parameters:
        code: OAuth authorization code returned by GitHub
        state: State parameter from the initial connect request

    Returns:
        CallbackResponse with success status and connection details.

    Error Responses:
        - 400: Invalid or expired state parameter
        - 400: Invalid authorization code
        - 401: GitHub OAuth configuration missing
        - 500: Failed to exchange token or store connection

    Example Response:
        {
            "success": true,
            "message": "GitHub connection established",
            "user_id": 123,
            "github_username": "johndoe"
        }
    """
    try:
        # Validate GitHub OAuth configuration
        if not settings.github_client_id or not settings.github_client_secret:
            raise HTTPException(
                status_code=500,
                detail="GitHub OAuth not configured. Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET.",
            )

        # Retrieve and validate state from database
        result = await db.execute(
            select(GitHubOAuthState).where(GitHubOAuthState.state == state)
        )
        oauth_state = result.scalar_one_or_none()

        if not oauth_state:
            logger.warning(f"Invalid OAuth state: {state[:8]}...")
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired state parameter",
            )

        # Check if state has expired
        if datetime.utcnow() > oauth_state.expires_at:
            logger.warning(f"Expired OAuth state: {state[:8]}...")
            await db.delete(oauth_state)
            await db.commit()
            raise HTTPException(
                status_code=400,
                detail="State parameter has expired",
            )

        # Check if state has already been used
        if oauth_state.is_used:
            logger.warning(f"OAuth state already used: {state[:8]}...")
            raise HTTPException(
                status_code=400,
                detail="State parameter has already been used",
            )

        # Mark state as used
        oauth_state.is_used = True
        await db.commit()

        # Exchange authorization code for access token
        import urllib.parse
        import httpx

        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": oauth_state.redirect_uri,
        }

        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                token_url,
                data=token_data,
                headers={"Accept": "application/json"},
            )

            if token_response.status_code != 200:
                logger.error(f"GitHub token exchange failed: {token_response.text}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to exchange authorization code for access token",
                )

            token_info = token_response.json()

            if "error" in token_info:
                logger.error(f"GitHub OAuth error: {token_info.get('error_description')}")
                raise HTTPException(
                    status_code=400,
                    detail=f"GitHub OAuth error: {token_info.get('error_description', 'Unknown error')}",
                )

            access_token = token_info.get("access_token")
            token_type = token_info.get("token_type", "bearer")
            scope = token_info.get("scope")

            if not access_token:
                raise HTTPException(
                    status_code=400,
                    detail="No access token received from GitHub",
                )

        # Fetch GitHub user profile
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_response.status_code != 200:
            logger.error(f"GitHub user profile fetch failed: {user_response.text}")
            raise HTTPException(
                status_code=400,
                detail="Failed to fetch GitHub user profile",
            )

        github_user = user_response.json()
        github_user_id = github_user.get("id")
        github_username = github_user.get("login")
        github_display_name = github_user.get("name")

        if not github_user_id or not github_username:
            raise HTTPException(
                status_code=400,
                detail="Invalid GitHub user data received",
            )

        # Encrypt access token before storage
        try:
            encryption = get_token_encryption()
            encrypted_access_token = encryption.encrypt(access_token)
        except TokenEncryptionError as e:
            logger.error(f"Token encryption failed: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to encrypt access token",
            )

        # Check if user already has a GitHub connection
        result = await db.execute(
            select(GitHubConnection).where(GitHubConnection.github_user_id == github_user_id)
        )
        existing_connection = result.scalar_one_or_none()

        if existing_connection:
            # Update existing connection
            existing_connection.access_token = encrypted_access_token
            existing_connection.token_type = token_type
            existing_connection.scope = scope
            existing_connection.is_active = True
            existing_connection.updated_at = datetime.utcnow()
            if github_display_name:
                existing_connection.github_display_name = github_display_name

            logger.info(
                f"Updated existing GitHub connection for user {github_username}",
                connection_id=existing_connection.id,
            )
        else:
            # Create new connection (user_id will be set later during actual auth flow)
            new_connection = GitHubConnection(
                user_id=oauth_state.user_id,  # May be None if no user auth yet
                github_user_id=github_user_id,
                github_username=github_username,
                github_display_name=github_display_name,
                access_token=encrypted_access_token,
                token_type=token_type,
                scope=scope,
                is_active=True,
            )
            db.add(new_connection)
            logger.info(
                f"Created new GitHub connection for user {github_username}",
            )

        # Clean up used state
        await db.delete(oauth_state)

        # Commit all changes
        await db.commit()

        logger.info(
            "GitHub OAuth callback successful",
            github_username=github_username,
            github_user_id=github_user_id,
        )

        return CallbackResponse(
            success=True,
            message="GitHub connection established successfully",
            user_id=oauth_state.user_id,
            github_username=github_username,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth callback error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to complete GitHub OAuth flow"
        )


# Connection Management Endpoints
@router.get("/connections", response_model=ConnectionListResponse)
async def list_github_connections(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    List GitHub connections for the authenticated user.

    Returns a list of all GitHub OAuth connections associated with the user.
    """
    # For now, return all connections (will add user authentication later)
    result = await db.execute(select(GitHubConnection))
    connections = result.scalars().all()

    connection_list = [
        ConnectionInfo(
            id=conn.id,
            github_user_id=conn.github_user_id,
            github_username=conn.github_username,
            github_display_name=conn.github_display_name,
            is_active=conn.is_active,
            created_at=conn.created_at,
        )
        for conn in connections
    ]

    return ConnectionListResponse(
        success=True,
        connections=connection_list,
    )


@router.delete("/connections/{connection_id}")
async def delete_github_connection(
    connection_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a GitHub connection.

    This endpoint revokes the GitHub OAuth connection and marks it as inactive.
    The connection is not deleted from the database for audit purposes.
    """
    result = await db.execute(
        select(GitHubConnection).where(GitHubConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=404, detail="GitHub connection not found")

    # Mark as revoked
    connection.is_active = False
    connection.revoked_at = datetime.utcnow()
    await db.commit()

    logger.info(
        "GitHub connection deleted",
        connection_id=connection_id,
        github_username=connection.github_username,
    )

    return {"success": True, "message": "GitHub connection revoked"}
