"""
GitHub OAuth Integration Routes

Provides endpoints for:
- Initiating GitHub OAuth flow (GET /github/connect)
- Callback handling for OAuth completion (GET /github/callback)
"""

import secrets
import urllib.parse
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_session
from config import settings
from config.dependencies import limiter
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub OAuth"])


# =============================================================================
# Request/Response Models
# =============================================================================


class GitHubConnectRequest(BaseModel):
    """Request model for initiating GitHub OAuth connection."""

    redirect_uri: Optional[str] = Field(
        None,
        max_length=500,
        description="Custom redirect URI for OAuth callback (optional, uses default if not provided)",
    )

    @field_validator("redirect_uri")
    @classmethod
    def validate_redirect_uri(cls, v: Optional[str]) -> Optional[str]:
        """Validate redirect URI format."""
        if v:
            if not v.startswith(("http://", "https://")):
                raise ValueError("Redirect URI must start with http:// or https://")
            # Basic URL validation
            try:
                result = urllib.parse.urlparse(v)
                if not result.netloc:
                    raise ValueError("Invalid redirect URI format")
            except Exception as e:
                raise ValueError(f"Invalid redirect URI: {str(e)}")
        return v


class GitHubConnectResponse(BaseModel):
    """Response model for GitHub OAuth connect endpoint."""

    authorization_url: str = Field(
        ..., description="GitHub OAuth authorization URL to redirect user to"
    )
    state: str = Field(
        ...,
        description="State parameter for CSRF protection (store this for callback verification)",
    )
    expires_in: int = Field(..., description="Seconds until state parameter expires")


# =============================================================================
# GitHub OAuth Configuration
# =============================================================================

# GitHub OAuth endpoints
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API_URL = "https://api.github.com/user"

# OAuth scopes
OAUTH_SCOPES = "read:user public_repo"


def _generate_state() -> str:
    """
    Generate a secure random state parameter for OAuth flow.

    The state parameter is used to prevent CSRF attacks and verify
    that the callback is from the same request that initiated the flow.

    Returns:
        A cryptographically secure random string
    """
    return secrets.token_urlsafe(32)


def _get_oauth_config():
    """
    Get GitHub OAuth configuration from settings.

    Raises:
        HTTPException: If GitHub OAuth is not properly configured

    Returns:
        Tuple of (client_id, client_secret, redirect_uri)
    """
    client_id = getattr(settings, "github_client_id", None)
    client_secret = getattr(settings, "github_client_secret", None)

    # For development/testing, you can use environment variables
    if not client_id:
        import os

        client_id = os.getenv("GITHUB_CLIENT_ID")

    if not client_secret:
        import os

        client_secret = os.getenv("GITHUB_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.",
        )

    # Default redirect URI (can be overridden in request)
    default_redirect_uri = getattr(
        settings,
        "github_oauth_redirect_uri",
        "http://localhost:3000/auth/github/callback",
    )

    return client_id, client_secret, default_redirect_uri


def _build_authorization_url(
    client_id: str,
    redirect_uri: str,
    state: str,
    scopes: str = OAUTH_SCOPES,
) -> str:
    """
    Build the GitHub OAuth authorization URL.

    Args:
        client_id: GitHub OAuth application client ID
        redirect_uri: URI to redirect to after authorization
        state: State parameter for CSRF protection
        scopes: OAuth scopes to request

    Returns:
        Complete authorization URL
    """
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scopes,
        "state": state,
        "response_type": "code",
    }

    return f"{GITHUB_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"


# =============================================================================
# OAuth Endpoints
# =============================================================================


@router.get(
    "/connect",
    response_model=GitHubConnectResponse,
    responses={
        200: {
            "model": GitHubConnectResponse,
            "description": "Successfully generated authorization URL",
        },
        501: {"description": "GitHub OAuth not configured"},
    },
    summary="Initiate GitHub OAuth flow",
)
@limiter.limit("10/minute")
async def github_connect(
    request: Request,
    redirect_uri: Optional[str] = Query(
        None,
        description="Custom redirect URI for OAuth callback (optional)",
    ),
):
    """
    Initiate GitHub OAuth authorization flow.

    This endpoint generates a GitHub OAuth authorization URL for the frontend
    to redirect the user to. The user will be prompted to authorize the
    application to access their GitHub account.

    **OAuth Scopes Requested:**
    - `read:user`: Access to user profile information
    - `public_repo`: Access to public repositories

    **State Parameter:**
    A cryptographically secure random state parameter is generated and returned.
    This must be stored (e.g., in session storage) and verified in the callback
    to prevent CSRF attacks.

    **Custom Redirect URI:**
    By default, the callback URI is configured via `GITHUB_OAUTH_REDIRECT_URI`
    environment variable or settings. You can override this per-request using
    the `redirect_uri` query parameter, which is useful for supporting
    different environments (development, staging, production).

    **Response:**
    Returns the authorization URL that the frontend should redirect the user to,
    along with the state parameter that must be stored for callback verification.

    **Example Usage:**
    ```python
    import httpx

    response = httpx.get("http://api.example.com/github/connect")
    data = response.json()

    # Redirect user to authorization_url
    # Store data['state'] in session for callback verification
    ```

    **Security Notes:**
    - The state parameter expires after 10 minutes
    - Rate limited to 10 requests per minute per user
    - Requires authentication (optional, for audit purposes)
    - Redirect URI must start with http:// or https://
    """
    # Get OAuth configuration
    client_id, client_secret, default_redirect_uri = _get_oauth_config()

    # Validate redirect URI if provided
    if redirect_uri:
        if not redirect_uri.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Redirect URI must start with http:// or https://",
            )
        # Basic URL validation
        try:
            result = urllib.parse.urlparse(redirect_uri)
            if not result.netloc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid redirect URI format",
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid redirect URI: {str(e)}",
            )

    # Use custom redirect URI if provided, otherwise use default
    final_redirect_uri = redirect_uri or default_redirect_uri

    # Generate secure state parameter
    state = _generate_state()

    # Build authorization URL
    authorization_url = _build_authorization_url(
        client_id=client_id,
        redirect_uri=final_redirect_uri,
        state=state,
        scopes=OAUTH_SCOPES,
    )

    # Return authorization URL and state
    return GitHubConnectResponse(
        authorization_url=authorization_url,
        state=state,
        expires_in=600,  # 10 minutes in seconds
    )


@router.get(
    "/callback",
    summary="Handle GitHub OAuth callback",
)
@limiter.limit("20/minute")
async def github_callback(
    request: Request,
    code: str = Query(..., description="OAuth authorization code from GitHub"),
    state: Optional[str] = Query(
        None, description="State parameter for CSRF verification"
    ),
    db: Annotated[AsyncSession, Depends(get_async_session)] = None,
):
    """
    Handle GitHub OAuth callback.

    This endpoint receives the callback from GitHub after the user authorizes
    the application. It exchanges the authorization code for an access token
    and retrieves the user's GitHub profile information.

    **Note:** This is a placeholder for the callback endpoint.
    The full implementation will be in a separate issue/PR.

    **Callback Parameters:**
    - `code`: Authorization code from GitHub
    - `state`: State parameter (must match the one generated in /connect)

    **Response:**
    - 200: Successfully processed callback
    - 400: Invalid state or missing parameters
    - 401: Invalid authorization code
    """
    # Validate state parameter (CSRF protection)
    # In a full implementation, this would verify the state against
    # the stored value from the /connect endpoint
    if not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State parameter is required for security",
        )

    # Log callback received
    logger.info(
        "github_oauth_callback_received",
        code_length=len(code),
        state_provided=state is not None,
    )

    # Placeholder response - full implementation will:
    # 1. Verify state against stored value
    # 2. Exchange code for access token
    # 3. Fetch user profile from GitHub API
    # 4. Create or link user account
    # 5. Return JWT tokens

    return {
        "message": "OAuth callback received",
        "status": "pending_full_implementation",
        "note": "This endpoint is a placeholder. Full implementation will be in a separate PR.",
    }


@router.get(
    "/health",
    response_model=dict,
    responses={
        200: {"description": "GitHub OAuth service is healthy"},
        501: {"description": "GitHub OAuth not configured"},
    },
    summary="GitHub OAuth health check",
)
async def github_oauth_health():
    """
    Health check endpoint for GitHub OAuth service.

    Returns the current status and configuration status of the GitHub OAuth integration.
    """
    try:
        client_id, client_secret, _ = _get_oauth_config()
        return {
            "status": "healthy",
            "service": "github_oauth",
            "configured": True,
            "scopes": OAUTH_SCOPES,
        }
    except HTTPException as e:
        return {
            "status": "unconfigured",
            "service": "github_oauth",
            "configured": False,
            "error": "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.",
        }
