"""
GitHub Integration API Routes

Provides endpoints for:
- OAuth authentication flow
- GitHub API integration
- Repository and project data retrieval
"""

import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lib.token_encryption import get_encryption
from database import GitHubConnection, get_db

router = APIRouter(prefix="/api/github", tags=["github"])

# GitHub OAuth Configuration
GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_CLIENT_ID = None  # Will be loaded from environment
GITHUB_CLIENT_SECRET = None  # Will be loaded from environment

# In-memory state storage (for development, use Redis in production)
_oauth_states: Dict[str, Dict[str, Any]] = {}

# Request/Response Models


class GitHubConnectRequest(BaseModel):
    """Request model for GitHub OAuth connect."""

    redirect_uri: Optional[str] = Field(
        None,
        description="Custom redirect URI for OAuth callback. Defaults to configured default.",
    )
    scopes: Optional[str] = Field(
        "repo user:email",
        description="OAuth scopes to request (space-separated). Default: 'repo user:email'",
    )


class GitHubConnectResponse(BaseModel):
    """Response model for GitHub OAuth connect."""

    auth_url: str = Field(..., description="GitHub OAuth authorization URL")
    state: str = Field(..., description="State parameter for CSRF protection")


class GitHubStatusResponse(BaseModel):
    """Response model for GitHub connection status."""

    connected: bool = Field(..., description="Whether user is connected to GitHub")
    username: Optional[str] = Field(None, description="GitHub username if connected")
    auth_mode: str = Field(..., description="Authentication mode (oauth or cli)")
    scopes: Optional[str] = Field(None, description="Authorized OAuth scopes")


class GitHubRepositoriesResponse(BaseModel):
    """Response model for GitHub repositories."""

    repositories: list[Dict[str, Any]] = Field(
        ..., description="List of GitHub repositories"
    )
    total: int = Field(..., description="Total number of repositories")


class GitHubUserResponse(BaseModel):
    """Response model for GitHub user information."""

    id: int = Field(..., description="GitHub user ID")
    login: str = Field(..., description="GitHub username")
    name: Optional[str] = Field(None, description="User display name")
    email: Optional[str] = Field(None, description="User email")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    bio: Optional[str] = Field(None, description="User bio")
    public_repos: int = Field(..., description="Number of public repositories")


# Helper Functions


def get_github_config() -> Dict[str, str]:
    """
    Load GitHub OAuth configuration from environment variables.

    Returns:
        Dictionary with client_id and client_secret

    Raises:
        HTTPException: If GitHub credentials are not configured
    """
    import os

    global GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

    if GITHUB_CLIENT_ID is None:
        GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
    if GITHUB_CLIENT_SECRET is None:
        GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured: GITHUB_CLIENT_ID environment variable not set",
        )

    return {"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET}


def generate_state() -> str:
    """
    Generate a secure state parameter for OAuth flow.

    Returns:
        UUID-based state string

    Note:
        State parameter is used for CSRF protection.
    """
    return str(uuid.uuid4())


def store_state(state: str, redirect_uri: Optional[str] = None) -> None:
    """
    Store OAuth state parameter with associated data.

    Args:
        state: The state parameter generated
        redirect_uri: Optional custom redirect URI

    Note:
        In production, use Redis or a database for persistent storage.
    """
    _oauth_states[state] = {
        "redirect_uri": redirect_uri,
        "created_at": import_time(),
    }


def validate_state(state: str) -> bool:
    """
    Validate OAuth state parameter.

    Args:
        state: The state parameter to validate

    Returns:
        True if state is valid, False otherwise

    Note:
        Also removes the state from storage to prevent replay attacks.
    """
    if state not in _oauth_states:
        return False

    # Check if state is too old (10 minutes)
    state_data = _oauth_states[state]
    age = import_time() - state_data["created_at"]
    if age > 600:  # 10 minutes
        del _oauth_states[state]
        return False

    # Clean up state
    del _oauth_states[state]
    return True


def import_time():
    """Helper to import time module lazily."""
    import time

    return time.time()


def build_github_oauth_url(
    client_id: str,
    state: str,
    redirect_uri: Optional[str] = None,
    scopes: str = "repo user:email",
) -> str:
    """
    Build GitHub OAuth authorization URL.

    Args:
        client_id: GitHub OAuth client ID
        state: State parameter for CSRF protection
        redirect_uri: Optional custom redirect URI
        scopes: OAuth scopes to request

    Returns:
        Full GitHub OAuth authorization URL
    """
    from urllib.parse import urlencode

    params = {
        "client_id": client_id,
        "state": state,
        "scope": scopes,
    }

    if redirect_uri:
        params["redirect_uri"] = redirect_uri

    return f"{GITHUB_OAUTH_URL}?{urlencode(params)}"


# API Endpoints


@router.get("/connect", response_model=GitHubConnectResponse)
async def github_connect(
    redirect_uri: Optional[str] = Query(
        None,
        description="Custom redirect URI for OAuth callback",
    ),
    scopes: Optional[str] = Query(
        "repo user:email",
        description="OAuth scopes to request (space-separated). Default: 'repo user:email'",
    ),
):
    """
    Initiate GitHub OAuth flow.

    Returns a GitHub OAuth authorization URL that the user should visit to authorize
    the application. The URL includes a state parameter for CSRF protection.

    Scopes:
    - repo: Full control of private repositories
    - user:email: Access user email address
    - read:org: Read org and team membership (optional)
    - read:public_key: List public keys (optional)

    Flow:
    1. User visits the returned auth_url
    2. User authorizes the application on GitHub
    3. GitHub redirects to redirect_uri with authorization code
    4. Application exchanges code for access token
    5. Access token is stored encrypted for future use
    """
    try:
        # Get GitHub configuration
        config = get_github_config()

        # Validate scopes
        if not scopes or not scopes.strip():
            scopes = "repo user:email"

        # Validate scope format
        allowed_scopes = [
            "repo",
            "repo:status",
            "repo_deployment",
            "public_repo",
            "repo:invite",
            "security_events",
            "admin:org",
            "admin:org_hook",
            "user",
            "user:email",
            "user:follow",
            "read:org",
            "read:public_key",
            "read:gpg_key",
        ]

        scope_list = scopes.split()
        invalid_scopes = [s for s in scope_list if s not in allowed_scopes]
        if invalid_scopes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid OAuth scopes: {', '.join(invalid_scopes)}. "
                f"Allowed scopes: {', '.join(allowed_scopes)}",
            )

        # Generate secure state parameter
        state = generate_state()

        # Store state with redirect URI
        store_state(state, redirect_uri)

        # Build OAuth URL
        auth_url = build_github_oauth_url(
            client_id=config["client_id"],
            state=state,
            redirect_uri=redirect_uri,
            scopes=scopes,
        )

        return GitHubConnectResponse(auth_url=auth_url, state=state)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate GitHub OAuth flow: {str(e)}",
        )


@router.get("/status", response_model=GitHubStatusResponse)
async def github_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Check GitHub connection status.

    Returns information about the current GitHub connection, including
    whether the user is connected, their username, and authentication mode.

    Authentication Modes:
    - oauth: OAuth-based authentication with stored encrypted tokens
    - cli: GitHub CLI-based authentication (gh CLI must be installed)
    """
    try:
        import os

        # Get user identifier from request (can be from API key, session, etc.)
        # For now, use a default identifier
        user_identifier = request.headers.get("X-User-Identifier", "default_user")

        # Check for feature flag
        auth_mode = os.getenv("GITHUB_AUTH_MODE", "oauth").lower()

        if auth_mode == "oauth":
            # Check database for OAuth connection
            result = await db.execute(
                select(GitHubConnection).where(
                    GitHubConnection.user_identifier == user_identifier
                ).where(GitHubConnection.is_active == True)
            )
            connection = result.scalar_one_or_none()

            if connection:
                return GitHubStatusResponse(
                    connected=True,
                    username=connection.github_username,
                    auth_mode="oauth",
                    scopes=connection.scopes,
                )
            else:
                return GitHubStatusResponse(
                    connected=False,
                    username=None,
                    auth_mode="oauth",
                    scopes=None,
                )
        elif auth_mode == "cli":
            # Check for gh CLI authentication
            import subprocess

            try:
                result = subprocess.run(
                    ["gh", "auth", "status"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )

                if result.returncode == 0:
                    # Parse username from output
                    username = None
                    for line in result.stdout.split("\n"):
                        if "Logged in to" in line:
                            # Extract username (format: "Logged in to github.com as username")
                            parts = line.split()
                            if len(parts) >= 6:
                                username = parts[5]

                    return GitHubStatusResponse(
                        connected=True,
                        username=username,
                        auth_mode="cli",
                        scopes=None,
                    )
                else:
                    return GitHubStatusResponse(
                        connected=False,
                        username=None,
                        auth_mode="cli",
                        scopes=None,
                    )

            except (subprocess.TimeoutExpired, FileNotFoundError):
                # gh CLI not installed or not authenticated
                return GitHubStatusResponse(
                    connected=False,
                    username=None,
                    auth_mode="cli",
                    scopes=None,
                )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid GITHUB_AUTH_MODE: {auth_mode}. Must be 'oauth' or 'cli'",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check GitHub status: {str(e)}",
        )


@router.get("/user", response_model=GitHubUserResponse)
async def get_github_user():
    """
    Get authenticated GitHub user information.

    Requires the user to be authenticated via OAuth or CLI.
    Returns user profile information from GitHub.
    """
    try:
        import os
        import subprocess
        import json

        auth_mode = os.getenv("GITHUB_AUTH_MODE", "oauth").lower()

        if auth_mode == "oauth":
            # OAuth mode - will be implemented with database
            raise HTTPException(
                status_code=501,
                detail="OAuth user retrieval not yet implemented. Use CLI mode.",
            )
        elif auth_mode == "cli":
            # Use gh CLI to get user info
            result = subprocess.run(
                ["gh", "api", "user"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                raise HTTPException(
                    status_code=401,
                    detail="GitHub CLI not authenticated. Run: gh auth login",
                )

            user_data = json.loads(result.stdout)

            return GitHubUserResponse(
                id=user_data.get("id"),
                login=user_data.get("login"),
                name=user_data.get("name"),
                email=user_data.get("email"),
                avatar_url=user_data.get("avatar_url"),
                bio=user_data.get("bio"),
                public_repos=user_data.get("public_repos", 0),
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid GITHUB_AUTH_MODE: {auth_mode}",
            )

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse GitHub response: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get GitHub user: {str(e)}",
        )


@router.get("/repositories", response_model=GitHubRepositoriesResponse)
async def get_github_repositories(
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of repositories to return"
    ),
    sort: Optional[str] = Query(
        "updated", description="Sort field (updated, created, name, pushed)"
    ),
):
    """
    Get GitHub repositories for authenticated user.

    Returns a list of repositories accessible to the authenticated user.
    Supports pagination and sorting options.
    """
    try:
        import os
        import subprocess
        import json

        auth_mode = os.getenv("GITHUB_AUTH_MODE", "oauth").lower()

        if auth_mode == "oauth":
            # OAuth mode - will be implemented with database
            raise HTTPException(
                status_code=501,
                detail="OAuth repository retrieval not yet implemented. Use CLI mode.",
            )
        elif auth_mode == "cli":
            # Use gh CLI to get repositories
            result = subprocess.run(
                [
                    "gh",
                    "repo",
                    "list",
                    "--limit",
                    str(limit),
                    "--json",
                    "name,description,url,owner,createdAt,updatedAt,stargazerCount,forkCount,visibility",
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise HTTPException(
                    status_code=401,
                    detail="GitHub CLI not authenticated. Run: gh auth login",
                )

            repos = json.loads(result.stdout)

            return GitHubRepositoriesResponse(repositories=repos, total=len(repos))
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid GITHUB_AUTH_MODE: {auth_mode}",
            )

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse GitHub response: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get GitHub repositories: {str(e)}",
        )


@router.get("/callback")
async def github_callback(
    code: str = Query(..., description="Authorization code from GitHub"),
    state: str = Query(..., description="State parameter from OAuth flow"),
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle GitHub OAuth callback.

    This endpoint is called by GitHub after the user authorizes the application.
    Exchanges the authorization code for an access token and stores it securely.

    Note: This is a placeholder for the callback implementation.
    The actual callback URL should be configured in your GitHub OAuth app settings.
    """
    try:
        # Validate state parameter
        if not validate_state(state):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired state parameter",
            )

        # Get GitHub configuration
        config = get_github_config()

        # Exchange code for access token
        import httpx

        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to exchange authorization code for access token",
                )

            token_data = response.json()

            if "error" in token_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"OAuth error: {token_data.get('error_description', token_data.get('error'))}",
                )

            access_token = token_data.get("access_token")
            token_type = token_data.get("token_type", "bearer")
            scopes = token_data.get("scope", "")

            # Get GitHub user information
            user_response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {access_token}"},
            )

            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to get GitHub user information",
                )

            user_data = user_response.json()

            # Encrypt and store the token in database
            encryption = get_encryption()
            encrypted_token = encryption.encrypt(access_token)

            # Get user identifier from request
            user_identifier = request.headers.get("X-User-Identifier", "default_user")

            # Deactivate existing connections for this user
            existing_connections = await db.execute(
                select(GitHubConnection).where(
                    GitHubConnection.user_identifier == user_identifier
                )
            )
            for connection in existing_connections.scalars():
                connection.is_active = False

            # Create new GitHub connection
            github_connection = GitHubConnection(
                user_identifier=user_identifier,
                github_user_id=user_data.get("id"),
                github_username=user_data.get("login"),
                github_email=user_data.get("email"),
                access_token_encrypted=encrypted_token,
                scopes=scopes,
                token_type=token_type,
                is_active=True,
            )

            db.add(github_connection)
            await db.commit()

            return {
                "success": True,
                "message": "GitHub account connected successfully",
                "username": user_data.get("login"),
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to handle GitHub callback: {str(e)}",
        )
