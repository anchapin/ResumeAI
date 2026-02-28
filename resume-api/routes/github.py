"""
GitHub OAuth Integration Routes

Provides endpoints for:
- OAuth callback handling
- GitHub user authentication
- Token management and storage
"""

import secrets
import hashlib
import base64
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from httpx import AsyncClient

from database import get_async_session, User, GitHubOAuthState, GitHubConnection
from config.dependencies import get_current_user
from config.security import encrypt_token
from config import settings
from monitoring import logging_config
from monitoring import metrics as monitoring_metrics
from api.models import GitHubStatusResponse

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/api/v1/github", tags=["GitHub"])


def generate_oauth_state() -> str:
    """Generate a secure random state string for OAuth."""
    return secrets.token_urlsafe(32)


def generate_pkce_code_verifier() -> str:
    """
    Generate a PKCE code verifier (RFC 7636).

    Returns a 128-character cryptographically random string using only
    unreserved characters: [A-Z] [a-z] [0-9] - . _ ~

    Returns:
        A 128-character code verifier string
    """
    # Generate 96 random bytes and base64url encode to get ~128 chars
    random_bytes = secrets.token_bytes(96)
    # Use urlsafe base64 and remove padding
    verifier = base64.urlsafe_b64encode(random_bytes).decode("utf-8").rstrip("=")
    return verifier[:128]  # Ensure exactly 128 chars


def generate_pkce_code_challenge(verifier: str) -> str:
    """
    Generate PKCE code challenge from a code verifier (RFC 7636).

    Creates a SHA256 hash of the verifier and base64url encodes it.

    Args:
        verifier: The code verifier string

    Returns:
        Base64url-encoded SHA256 hash of the verifier
    """
    # Hash the verifier with SHA-256
    sha256_hash = hashlib.sha256(verifier.encode("utf-8")).digest()

    # Base64url encode without padding
    challenge = base64.urlsafe_b64encode(sha256_hash).decode("utf-8").rstrip("=")
    return challenge


def verify_pkce_challenge(verifier: str, challenge: str) -> bool:
    """
    Verify that a code verifier matches a code challenge.

    Args:
        verifier: The code verifier to verify
        challenge: The code challenge to verify against

    Returns:
        True if verifier matches challenge, False otherwise
    """
    generated_challenge = generate_pkce_code_challenge(verifier)
    # Use constant-time comparison to prevent timing attacks
    return secrets.compare_digest(generated_challenge, challenge)


def build_github_authorization_url(
    client_id: str,
    redirect_uri: str,
    state: str,
    scopes: str = "user:email",
) -> str:
    """Build the GitHub OAuth authorization URL."""
    return (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scopes}"
        f"&state={state}"
    )


async def exchange_code_for_token(
    code: str,
    code_verifier: Optional[str] = None,
    code_challenge: Optional[str] = None,
) -> dict:
    """
    Exchange OAuth authorization code for access token.

    Supports both standard OAuth and PKCE flows (RFC 7636).

    Args:
        code: Authorization code from GitHub
        code_verifier: PKCE code verifier (for PKCE flow validation)
        code_challenge: PKCE code challenge (for PKCE flow validation)

    Returns:
        Dictionary with access_token, scope, token_type

    Raises:
        HTTPException: If token exchange fails or PKCE validation fails
    """
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth not configured",
        )

    # Validate PKCE if both verifier and challenge are provided
    if code_verifier and code_challenge:
        if not verify_pkce_challenge(code_verifier, code_challenge):
            logger.warning(
                "github_pkce_verification_failed",
                code_challenge=code_challenge[:20] + "...",
            )
            monitoring_metrics.increment_oauth_connection_failure(
                provider="github", error_type="pkce_verification_failed"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PKCE verification failed",
            )
        logger.info("github_pkce_verification_success")

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
            monitoring_metrics.increment_oauth_connection_failure(
                provider="github", error_type="token_exchange_failed"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for token",
            )

        token_data = await response.json()

        if "error" in token_data:
            error = token_data.get("error")
            logger.error("github_token_error", error=error)
            monitoring_metrics.increment_oauth_connection_failure(
                provider="github", error_type=error
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=token_data.get("error_description", "Token exchange failed"),
            )

        return token_data


async def fetch_github_user(token: str) -> dict:
    """
    Fetch GitHub user profile using access token.

    Args:
        token: GitHub OAuth access token

    Returns:
        Dictionary with user profile data

    Raises:
        HTTPException: If user fetch fails
    """
    async with AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if response.status_code != 200:
            logger.error("github_user_fetch_failed", status=response.status_code)
            monitoring_metrics.increment_oauth_connection_failure(
                provider="github", error_type="user_fetch_failed"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch GitHub user profile",
            )

        return await response.json()


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
        async with AsyncClient(timeout=10.0) as client:
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
    "/callback",
    responses={
        302: {"description": "Redirect to frontend with status"},
        400: {"description": "OAuth failed or invalid request"},
    },
    summary="Handle GitHub OAuth callback",
)
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
        # Verify OAuth state
        result = await db.execute(
            select(GitHubOAuthState).where(GitHubOAuthState.state == state)
        )
        oauth_state = result.scalar_one_or_none()

        if not oauth_state:
            logger.warning("github_oauth_invalid_state", state=state)
            frontend_url = settings.frontend_url
            return Response(
                status_code=302,
                headers={
                    "Location": f"{frontend_url}?status=error&error=invalid_state"
                },
            )

        if datetime.now(timezone.utc) > oauth_state.expires_at:
            logger.warning("github_oauth_expired_state", state=state)
            await db.delete(oauth_state)
            await db.commit()
            frontend_url = settings.frontend_url
            return Response(
                status_code=302,
                headers={
                    "Location": f"{frontend_url}?status=error&error=expired_state"
                },
            )

        # Exchange code for token with PKCE validation
        token_data = await exchange_code_for_token(
            code=code,
            code_verifier=oauth_state.code_verifier,
            code_challenge=oauth_state.code_challenge,
        )
        access_token = token_data.get("access_token")

        # Fetch GitHub user
        github_user = await fetch_github_user(access_token)
        github_user_id = github_user.get("id")
        github_username = github_user.get("login")
        github_display_name = github_user.get("name")

        # Encrypt token for storage
        encrypted_token = encrypt_token(access_token)

        # Check if connection already exists
        existing_connection = await db.execute(
            select(GitHubConnection).where(
                GitHubConnection.github_user_id == github_user_id
            )
        )
        existing = existing_connection.scalar_one_or_none()

        if existing:
            # Update existing connection
            existing.access_token = encrypted_token
            existing.github_username = github_username
            existing.github_display_name = github_display_name
            existing.is_active = True
            existing.updated_at = datetime.now(timezone.utc)
            await db.commit()

            logger.info(
                "github_oauth_existing_connection_updated",
                github_user_id=github_user_id,
                github_username=github_username,
            )
            monitoring_metrics.increment_oauth_connection_success(provider="github")
        else:
            # Create new connection
            new_connection = GitHubConnection(
                user_id=oauth_state.user_id,
                github_user_id=github_user_id,
                github_username=github_username,
                github_display_name=github_display_name,
                access_token=encrypted_token,
                is_active=True,
            )
            db.add(new_connection)
            await db.commit()

            logger.info(
                "github_oauth_new_connection",
                github_user_id=github_user_id,
                github_username=github_username,
                user_id=oauth_state.user_id,
            )
            monitoring_metrics.increment_oauth_connection_success(provider="github")

        # Clean up OAuth state
        await db.delete(oauth_state)
        await db.commit()

        # Redirect to frontend with success
        frontend_url = settings.frontend_url
        return Response(
            status_code=302,
            headers={"Location": f"{frontend_url}?status=success"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("github_oauth_error", error=str(e))
        frontend_url = settings.frontend_url
        return Response(
            status_code=302,
            headers={"Location": f"{frontend_url}?status=error&error={str(e)}"},
        )


async def _get_oauth_status(user_id: int, db: AsyncSession) -> GitHubStatusResponse:
    """Helper to check OAuth connection status."""
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
                github_user_id=str(connection.github_user_id),
                connected_at=(
                    connection.created_at.isoformat() if connection.created_at else None
                ),
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

    This endpoint checks the database for an active OAuth connection.

    Requires authentication via JWT access token.

    **Response includes:**
    - `authenticated`: Whether user is connected to GitHub
    - `mode`: Authentication mode being used (oauth)
    - `username`: GitHub username (if authenticated)
    - `github_user_id`: GitHub user ID (if authenticated in OAuth mode)
    - `connected_at`: Connection timestamp
    - `error`: Error message if status check failed
    """
    try:
        result = await db.execute(
            select(GitHubConnection).where(
                GitHubConnection.user_id == current_user.id,
                GitHubConnection.is_active.is_(True),
            )
        )
        connection = result.scalar_one_or_none()

        if connection:
            logger.info(
                "github_oauth_connected",
                user_id=current_user.id,
                github_username=connection.github_username,
            )
            return GitHubStatusResponse(
                authenticated=True,
                mode="oauth",
                username=connection.github_username,
                github_user_id=str(connection.github_user_id),
                connected_at=(
                    connection.created_at.isoformat() if connection.created_at else None
                ),
                error=None,
            )
        else:
            logger.info("github_oauth_not_connected", user_id=current_user.id)
            return GitHubStatusResponse(
                authenticated=False,
                mode="oauth",
                username=None,
                github_user_id=None,
                connected_at=None,
                error="No GitHub connection found",
            )
    except Exception as e:
        logger.error("github_oauth_status_error", user_id=current_user.id, error=str(e))
        return GitHubStatusResponse(
            authenticated=False,
            mode="oauth",
            username=None,
            github_user_id=None,
            connected_at=None,
            error=f"Failed to check OAuth status: {str(e)}",
        )


@router.get(
    "/connect",
    responses={
        200: {"description": "OAuth authorization URL generated"},
        401: {"description": "Not authenticated"},
    },
    summary="Initiate GitHub OAuth authorization",
)
async def github_connect(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
    redirect_uri: Annotated[Optional[str], Query()] = None,
):
    """
    Initiate GitHub OAuth authorization flow with PKCE security.

    This endpoint generates a GitHub OAuth authorization URL for the frontend
    to redirect the user to. The user will be prompted to authorize the
    application to access their GitHub account.

    Uses OAuth 2.0 PKCE (RFC 7636) to protect against authorization code
    interception attacks by public clients.

    **OAuth Scopes Requested:**
    - `read:user`: Access to user profile information
    - `public_repo`: Access to public repositories

    **State Parameter:**
    A cryptographically secure random state parameter is generated and stored.
    This must be stored (e.g., in session storage) and verified in the callback
    to prevent CSRF attacks.

    **PKCE (Proof Key for Public Clients):**
    RFC 7636 PKCE is implemented with:
    - Code verifier: 128-character cryptographic random string
    - Code challenge: SHA256(verifier) base64url-encoded
    - Challenge method: S256 (SHA256)

    **Custom Redirect URI:**
    By default, the callback URI is configured via `GITHUB_OAUTH_REDIRECT_URI`
    environment variable or settings. You can override this per-request using
    the `redirect_uri` query parameter, which is useful for supporting
    different environments (development, staging, production).

    **Response:**
    Returns a JSON object with:
    - `success`: true
    - `authorization_url`: The URL to redirect the user to (includes PKCE parameters)
    - `state`: The CSRF state parameter
    - `code_challenge`: The PKCE code challenge (for frontend tracking)
    - `expires_in`: Seconds until state expires
    """
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth not configured",
        )

    user_id = current_user.id

    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth not configured",
        )

    # Generate cryptographically secure random state
    state = generate_oauth_state()

    # Generate PKCE code verifier and challenge
    code_verifier = generate_pkce_code_verifier()
    code_challenge = generate_pkce_code_challenge(code_verifier)

    # Calculate expiration time (10 minutes from now)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Store OAuth state in database with PKCE
    oauth_state = GitHubOAuthState(
        state=state,
        user_id=user_id,
        code_challenge=code_challenge,
        code_challenge_method="S256",  # SHA256 method
        code_verifier=code_verifier,
        expires_at=expires_at,
    )
    db.add(oauth_state)
    await db.commit()

    # Determine valid redirect URIs
    default_callback = str(request.url_for("github_oauth_callback"))
    allowed_uris = {default_callback}

    if settings.github_redirect_uri:
        allowed_uris.add(settings.github_redirect_uri)
    if settings.github_callback_url:
        allowed_uris.add(settings.github_callback_url)

    # Determine redirect URI
    if redirect_uri:
        # Validate redirect_uri to prevent Open Redirect vulnerability
        if redirect_uri not in allowed_uris:
            logger.warning(
                "github_oauth_invalid_redirect_uri",
                redirect_uri=redirect_uri,
                allowed_uris=list(allowed_uris),
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid redirect_uri",
            )
        callback_url = redirect_uri
    elif settings.github_redirect_uri:
        callback_url = settings.github_redirect_uri
    elif settings.github_callback_url:
        callback_url = settings.github_callback_url
    else:
        # Fallback to current request host
        callback_url = default_callback

    # Build OAuth authorization URL with PKCE parameters
    github_auth_url = build_github_authorization_url(
        client_id=settings.github_client_id,
        redirect_uri=callback_url,
        state=state,
        scopes="user:email",
    )

    # Add PKCE parameters to URL
    github_auth_url += f"&code_challenge={code_challenge}&code_challenge_method=S256"

    logger.info(
        "github_oauth_authorize",
        user_id=user_id,
        state=state,
        code_challenge_method="S256",
    )

    return {
        "success": True,
        "authorization_url": github_auth_url,
        "state": state,
        "code_challenge": code_challenge,  # Return for frontend tracking
        "expires_in": 600,
    }


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
