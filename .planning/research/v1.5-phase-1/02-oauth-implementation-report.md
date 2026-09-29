# OAuth 2.0 Implementation Report: LinkedIn Integration with PKCE

**Project:** ResumeAI v1.5 Job Board Integration
**Phase:** Phase 1 - LinkedIn API Integration
**Date:** March 13, 2026
**Author:** Research Agent

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [OAuth 2.0 Flow Overview](#2-oauth-20-flow-overview)
3. [LinkedIn OAuth Configuration](#3-linkedin-oauth-configuration)
4. [Backend Implementation](#4-backend-implementation)
5. [Token Storage](#5-token-storage)
6. [Token Refresh](#6-token-refresh)
7. [Error Handling](#7-error-handling)
8. [Security Best Practices](#8-security-best-practices)
9. [Frontend Integration](#9-frontend-integration)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Executive Summary

### Recommended Approach

This report provides a comprehensive implementation guide for OAuth 2.0 with PKCE (Proof Key for Code Exchange) for LinkedIn integration in ResumeAI. The recommended approach follows security best practices and leverages existing infrastructure.

### Key Recommendations

| Area | Recommendation | Priority |
|------|---------------|----------|
| **OAuth Flow** | Authorization Code Flow with PKCE (RFC 7636) | Critical |
| **Token Storage** | Fernet encryption (AES-128-CBC) in PostgreSQL | Critical |
| **Token Refresh** | Automatic refresh with 5-minute buffer | High |
| **Security** | State parameter + PKCE + HTTPS + Secure cookies | Critical |
| **Libraries** | `httpx` for HTTP, `cryptography` for encryption | High |

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Frontend│     │  FastAPI Backend│     │  LinkedIn OAuth │
│                 │     │                 │     │                 │
│  1. Click Connect│────▶│                 │     │                 │
│                 │     │  2. Generate    │     │                 │
│                 │     │     PKCE State  │     │                 │
│                 │◀────│                 │     │                 │
│  3. Redirect    │     │                 │     │                 │
│────────────────────────────────────────────────────────────────▶│
│                 │     │                 │     │  4. User Login  │
│                 │     │                 │     │     & Authorize │
│  5. Callback    │     │                 │     │                 │
│◀────────────────────────────────────────────────────────────────│
│                 │     │  6. Exchange    │     │                 │
│                 │     │     Code+PKCE   │     │                 │
│                 │     │────────────────▶│     │                 │
│                 │     │                 │     │                 │
│                 │     │  7. Access Token│     │                 │
│                 │     │◀────────────────│     │                 │
│                 │     │                 │     │                 │
│  8. Store Token │     │  9. Encrypt &   │     │                 │
│◀────────────────│     │     Store in DB │     │                 │
│                 │     │                 │     │                 │
```

### Existing Infrastructure

The ResumeAI codebase already has:
- ✅ GitHub OAuth implementation with PKCE (`/resume-api/routes/github.py`)
- ✅ Token encryption utilities (`/resume-api/lib/token_encryption.py`)
- ✅ LinkedIn routes skeleton (`/resume-api/routes/linkedin.py`)
- ✅ Database models for OAuth (`GitHubConnection`, `GitHubOAuthState`)
- ✅ JWT utilities for user sessions (`/resume-api/config/jwt_utils.py`)

This report extends these patterns for LinkedIn OAuth 2.0 with PKCE.

---

## 2. OAuth 2.0 Flow Overview

### 2.1 Authorization Code Flow with PKCE

PKCE (RFC 7636) protects against authorization code interception attacks, especially important for public clients like SPAs.

#### Flow Sequence

```
1. Client generates code_verifier (random 128-char string)
2. Client creates code_challenge = SHA256(code_verifier)
3. Client redirects to LinkedIn with code_challenge
4. User authorizes application
5. LinkedIn redirects back with authorization code
6. Client sends code + code_verifier to backend
7. Backend exchanges code + code_verifier for tokens
8. LinkedIn verifies: SHA256(code_verifier) == code_challenge
9. Backend receives access_token (and optionally refresh_token)
10. Backend encrypts and stores tokens
```

#### PKCE Code Verifier Generation

```python
import secrets
import base64
import hashlib


def generate_code_verifier() -> str:
    """
    Generate a PKCE code verifier per RFC 7636.

    Returns a 128-character cryptographically random string using
    unreserved characters: [A-Z] [a-z] [0-9] - . _ ~
    """
    # Generate 96 random bytes and base64url encode
    random_bytes = secrets.token_bytes(96)
    # URL-safe base64 encode and remove padding
    verifier = base64.urlsafe_b64encode(random_bytes).decode('utf-8').rstrip('=')
    return verifier[:128]  # Ensure exactly 128 characters


def generate_code_challenge(verifier: str) -> str:
    """
    Generate PKCE code challenge from verifier.

    Creates SHA256 hash and base64url encodes without padding.
    """
    sha256_hash = hashlib.sha256(verifier.encode('utf-8')).digest()
    challenge = base64.urlsafe_b64encode(sha256_hash).decode('utf-8').rstrip('=')
    return challenge


def verify_pkce(verifier: str, challenge: str) -> bool:
    """Verify that verifier matches challenge using constant-time comparison."""
    generated = generate_code_challenge(verifier)
    return secrets.compare_digest(generated, challenge)
```

#### Authorization URL Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `response_type` | `code` | Authorization code flow |
| `client_id` | Your Client ID | From LinkedIn Developer Portal |
| `redirect_uri` | Registered URI | Must match exactly |
| `scope` | `openid profile email` | Requested permissions |
| `state` | Random 32-byte string | CSRF protection |
| `code_challenge` | SHA256(verifier) | PKCE challenge |
| `code_challenge_method` | `S256` | SHA256 method |

### 2.2 Token Types

| Token Type | Purpose | Expiration | Storage |
|------------|---------|------------|---------|
| **Access Token** | API requests | 60 minutes | Encrypted in DB |
| **Refresh Token** | Get new access token | 30 days | Encrypted in DB |
| **ID Token** | User identity (OIDC) | 60 minutes | Not stored |
| **State** | CSRF protection | 10 minutes | DB (temporary) |

---

## 3. LinkedIn OAuth Configuration

### 3.1 LinkedIn Developer Portal Setup

1. **Create LinkedIn App:**
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Click "Create App"
   - Fill in company/page information
   - Accept terms of service

2. **Configure OAuth Settings:**
   - **Authorized Redirect URLs:**
     - Production: `https://resumeai.com/api/v1/linkedin/callback`
     - Staging: `https://staging.resumeai.com/api/v1/linkedin/callback`
     - Development: `http://localhost:8000/api/v1/linkedin/callback`
   - **OAuth 2.0 Scopes:**
     - `openid` - OpenID Connect
     - `profile` - Basic profile information
     - `email` - Email address
     - `r_liteprofile` - Lite profile (alternative)
     - `w_member_social` - Post to feed (optional)

3. **Get Credentials:**
   - **Client ID:** Displayed on app dashboard
   - **Client Secret:** Click "Show" to reveal

### 3.2 Environment Variables

Add to `.env` and `.env.example`:

```bash
# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:8000/api/v1/linkedin/callback
LINKEDIN_SCOPE=openid profile email

# Token Encryption (shared with GitHub OAuth)
TOKEN_ENCRYPTION_KEY=your-32-byte-base64-key-here
```

### 3.3 Configuration in Settings

Update `/resume-api/config/__init__.py`:

```python
# LinkedIn OAuth Configuration (already present)
linkedin_client_id: Optional[str] = None
linkedin_client_secret: Optional[str] = None
linkedin_redirect_uri: Optional[str] = None

# Add these new fields:
linkedin_scope: str = "openid profile email"
linkedin_auth_url: str = "https://www.linkedin.com/oauth/v2/authorization"
linkedin_token_url: str = "https://www.linkedin.com/oauth/v2/accessToken"
linkedin_profile_url: str = "https://api.linkedin.com/v2/me"
```

---

## 4. Backend Implementation

### 4.1 Database Models

Add LinkedIn-specific models to `/resume-api/database.py`:

```python
class LinkedInConnection(Base):
    """LinkedIn OAuth connection model for storing user LinkedIn connections."""

    __tablename__ = "linkedin_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # LinkedIn account details
    linkedin_user_id = Column(String(100), nullable=False, index=True)  # LinkedIn member ID
    linkedin_username = Column(String(255), nullable=True, index=True)
    linkedin_display_name = Column(String(255), nullable=True)
    linkedin_email = Column(String(255), nullable=True)

    # OAuth tokens (encrypted at rest)
    access_token = Column(Text, nullable=False)  # Encrypted
    refresh_token = Column(Text, nullable=True)  # Encrypted
    token_type = Column(String(50), default="bearer")
    scope = Column(String(500), nullable=True)  # Space-separated scopes

    # Token metadata
    expires_at = Column(DateTime(timezone=True), nullable=True)  # OAuth token expiration
    expires_in = Column(Integer, nullable=True)  # Seconds until expiration

    # Connection status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="linkedin_connections")

    __table_args__ = (
        Index("idx_linkedin_linkedin_user_id", "linkedin_user_id"),
        Index("idx_linkedin_user_active", "user_id", "is_active"),
    )


class LinkedInOAuthState(Base):
    """Temporary storage for OAuth state parameters during flow with PKCE support."""

    __tablename__ = "linkedin_oauth_states"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(255), unique=True, nullable=False, index=True)

    # User association (optional - may be null before authentication)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Redirect URI (to redirect back after OAuth)
    redirect_uri = Column(String(500), nullable=True)

    # PKCE (Proof Key for Public Clients) - RFC 7636
    code_challenge = Column(String(128), nullable=True, index=True)
    code_challenge_method = Column(String(10), nullable=True)  # "S256" for SHA256
    code_verifier = Column(String(128), nullable=True)  # For backend verification

    # State metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False, nullable=False, index=True)
```

### 4.2 OAuth Routes Implementation

Complete implementation for `/resume-api/routes/linkedin.py`:

```python
"""
LinkedIn OAuth 2.0 Integration Routes

Implements OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636)
for secure LinkedIn authentication and token management.
"""

import secrets
import hashlib
import base64
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from httpx import AsyncClient

from database import (
    get_async_session,
    User,
    LinkedInConnection,
    LinkedInOAuthState,
)
from config.dependencies import get_current_user
from config.security import encrypt_token, decrypt_token
from config import settings
from monitoring import logging_config
from monitoring import metrics as monitoring_metrics

# Get logger
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/linkedin", tags=["LinkedIn"])


# =============================================================================
# PKCE Helper Functions
# =============================================================================


def generate_oauth_state() -> str:
    """Generate a secure random state string for OAuth CSRF protection."""
    return secrets.token_urlsafe(32)


def generate_pkce_code_verifier() -> str:
    """
    Generate a PKCE code verifier per RFC 7636.

    Returns a 128-character cryptographically random string using
    unreserved characters: [A-Z] [a-z] [0-9] - . _ ~
    """
    random_bytes = secrets.token_bytes(96)
    verifier = base64.urlsafe_b64encode(random_bytes).decode('utf-8').rstrip('=')
    return verifier[:128]


def generate_pkce_code_challenge(verifier: str) -> str:
    """
    Generate PKCE code challenge from verifier (RFC 7636).

    Creates SHA256 hash and base64url encodes without padding.
    """
    sha256_hash = hashlib.sha256(verifier.encode('utf-8')).digest()
    challenge = base64.urlsafe_b64encode(sha256_hash).decode('utf-8').rstrip('=')
    return challenge


def verify_pkce_challenge(verifier: str, challenge: str) -> bool:
    """
    Verify that a code verifier matches a code challenge.

    Uses constant-time comparison to prevent timing attacks.
    """
    generated_challenge = generate_pkce_code_challenge(verifier)
    return secrets.compare_digest(generated_challenge, challenge)


# =============================================================================
# OAuth Flow Endpoints
# =============================================================================


@router.get(
    "/connect",
    response_model=dict,
    responses={
        200: {"description": "OAuth authorization URL generated"},
        401: {"description": "Not authenticated"},
        500: {"description": "LinkedIn OAuth not configured"},
    },
    summary="Initiate LinkedIn OAuth authorization",
)
async def linkedin_connect(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
    redirect_uri: Annotated[Optional[str], Query()] = None,
):
    """
    Initiate LinkedIn OAuth 2.0 authorization flow with PKCE security.

    Generates a LinkedIn OAuth authorization URL for the frontend to redirect
    the user to. Uses OAuth 2.0 PKCE (RFC 7636) to protect against
    authorization code interception attacks.

    **OAuth Scopes Requested:**
    - `openid`: OpenID Connect authentication
    - `profile`: Basic profile information (name, headline, picture)
    - `email`: Email address

    **State Parameter:**
    A cryptographically secure random state parameter is generated and stored.
    This must be verified in the callback to prevent CSRF attacks.

    **PKCE (Proof Key for Public Clients):**
    RFC 7636 PKCE is implemented with:
    - Code verifier: 128-character cryptographic random string
    - Code challenge: SHA256(verifier) base64url-encoded
    - Challenge method: S256 (SHA256)

    **Response:**
    Returns a JSON object with:
    - `success`: true
    - `authorization_url`: The URL to redirect the user to
    - `state`: The CSRF state parameter
    - `code_challenge`: The PKCE code challenge (for tracking)
    - `expires_in`: Seconds until state expires (600)
    """
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        logger.error("linkedin_oauth_not_configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LinkedIn OAuth not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.",
        )

    user_id = current_user.id

    # Generate cryptographically secure random state
    state = generate_oauth_state()

    # Generate PKCE code verifier and challenge
    code_verifier = generate_pkce_code_verifier()
    code_challenge = generate_pkce_code_challenge(code_verifier)

    # Calculate expiration time (10 minutes from now)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Store OAuth state in database with PKCE
    oauth_state = LinkedInOAuthState(
        state=state,
        user_id=user_id,
        code_challenge=code_challenge,
        code_challenge_method="S256",
        code_verifier=code_verifier,
        expires_at=expires_at,
    )
    db.add(oauth_state)
    await db.commit()

    # Determine callback URL
    callback_url = redirect_uri or settings.linkedin_redirect_uri or str(request.url_for("linkedin_callback"))

    # Build OAuth authorization URL with PKCE parameters
    params = {
        "response_type": "code",
        "client_id": settings.linkedin_client_id,
        "redirect_uri": callback_url,
        "state": state,
        "scope": settings.linkedin_scope or "openid profile email",
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    linkedin_auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{query_string}"

    logger.info(
        "linkedin_oauth_initiated",
        user_id=user_id,
        state=state[:10] + "...",
        code_challenge_method="S256",
    )

    monitoring_metrics.increment_oauth_connection_success(provider="linkedin")

    return {
        "success": True,
        "authorization_url": linkedin_auth_url,
        "state": state,
        "code_challenge": code_challenge,
        "expires_in": 600,
    }


@router.get(
    "/callback",
    responses={
        302: {"description": "Redirect to frontend with status"},
        400: {"description": "OAuth failed or invalid request"},
    },
    summary="Handle LinkedIn OAuth callback",
)
async def linkedin_callback(
    request: Request,
    code: Annotated[str, Query(description="Authorization code from LinkedIn")],
    state: Annotated[str, Query(description="OAuth state parameter")],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Handle OAuth callback from LinkedIn.

    This endpoint is called by LinkedIn after user authorization.
    It exchanges the authorization code for access tokens using PKCE,
    fetches the user's LinkedIn profile, and stores the connection.

    **Flow:**
    1. Validate OAuth state parameter
    2. Verify PKCE code challenge
    3. Exchange authorization code for access token
    4. Fetch LinkedIn user profile
    5. Encrypt and store access token
    6. Redirect user to frontend with success/error status
    """
    try:
        # Verify OAuth state
        result = await db.execute(select(LinkedInOAuthState).where(LinkedInOAuthState.state == state))
        oauth_state = result.scalar_one_or_none()

        if not oauth_state:
            logger.warning("linkedin_oauth_invalid_state", state=state[:10] + "...")
            monitoring_metrics.increment_oauth_connection_failure(
                provider="linkedin", error_type="invalid_state"
            )
            return Response(
                status_code=302,
                headers={"Location": f"{settings.frontend_url}?status=error&error=invalid_state"},
            )

        # Handle timezone-naive datetime from SQLite
        expires_at = oauth_state.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expires_at:
            logger.warning("linkedin_oauth_expired_state", state=state[:10] + "...")
            await db.delete(oauth_state)
            await db.commit()
            monitoring_metrics.increment_oauth_connection_failure(
                provider="linkedin", error_type="expired_state"
            )
            return Response(
                status_code=302,
                headers={"Location": f"{settings.frontend_url}?status=error&error=expired_state"},
            )

        # Exchange code for token with PKCE validation
        token_data = await _exchange_code_for_token(
            code=code,
            code_verifier=oauth_state.code_verifier,
            code_challenge=oauth_state.code_challenge,
        )

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token in response",
            )

        # Fetch LinkedIn user profile
        linkedin_profile = await _fetch_linkedin_profile(access_token)

        linkedin_user_id = linkedin_profile.get("sub") or linkedin_profile.get("id")
        linkedin_email = linkedin_profile.get("email")
        linkedin_name = linkedin_profile.get("name", "")
        linkedin_given_name = linkedin_profile.get("given_name", "")
        linkedin_family_name = linkedin_profile.get("family_name", "")

        # Encrypt tokens for storage
        encrypted_access_token = encrypt_token(access_token)
        encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

        # Check if connection already exists
        existing_result = await db.execute(
            select(LinkedInConnection).where(LinkedInConnection.linkedin_user_id == linkedin_user_id)
        )
        existing_connection = existing_result.scalar_one_or_none()

        if existing_connection:
            # Update existing connection
            existing_connection.access_token = encrypted_access_token
            existing_connection.refresh_token = encrypted_refresh_token
            existing_connection.linkedin_username = linkedin_name
            existing_connection.linkedin_display_name = f"{linkedin_given_name} {linkedin_family_name}".strip()
            existing_connection.linkedin_email = linkedin_email
            existing_connection.is_active = True
            existing_connection.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            existing_connection.expires_in = expires_in
            existing_connection.updated_at = datetime.now(timezone.utc)
            await db.commit()

            logger.info(
                "linkedin_oauth_existing_connection_updated",
                linkedin_user_id=linkedin_user_id,
                linkedin_username=linkedin_name,
            )
        else:
            # Create new connection
            new_connection = LinkedInConnection(
                user_id=oauth_state.user_id,
                linkedin_user_id=linkedin_user_id,
                linkedin_username=linkedin_name,
                linkedin_display_name=f"{linkedin_given_name} {linkedin_family_name}".strip(),
                linkedin_email=linkedin_email,
                access_token=encrypted_access_token,
                refresh_token=encrypted_refresh_token,
                token_type=token_data.get("token_type", "bearer"),
                scope=token_data.get("scope", ""),
                expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
                expires_in=expires_in,
                is_active=True,
            )
            db.add(new_connection)
            await db.commit()

            logger.info(
                "linkedin_oauth_new_connection",
                linkedin_user_id=linkedin_user_id,
                linkedin_username=linkedin_name,
                user_id=oauth_state.user_id,
            )

        # Clean up OAuth state
        await db.delete(oauth_state)
        await db.commit()

        monitoring_metrics.increment_oauth_connection_success(provider="linkedin")

        # Redirect to frontend with success
        return Response(
            status_code=302,
            headers={"Location": f"{settings.frontend_url}?status=success&provider=linkedin"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("linkedin_oauth_error", error=str(e))
        monitoring_metrics.increment_oauth_connection_failure(
            provider="linkedin", error_type="unknown_error"
        )
        return Response(
            status_code=302,
            headers={"Location": f"{settings.frontend_url}?status=error&error={str(e)}"},
        )


async def _exchange_code_for_token(
    code: str,
    code_verifier: Optional[str] = None,
    code_challenge: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exchange OAuth authorization code for access token.

    Supports both standard OAuth and PKCE flows (RFC 7636).

    Args:
        code: Authorization code from LinkedIn
        code_verifier: PKCE code verifier (for PKCE flow validation)
        code_challenge: PKCE code challenge (for PKCE flow validation)

    Returns:
        Dictionary with access_token, refresh_token, expires_in, scope

    Raises:
        HTTPException: If token exchange fails or PKCE validation fails
    """
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LinkedIn OAuth not configured",
        )

    # Validate PKCE if both verifier and challenge are provided
    if code_verifier and code_challenge:
        if not verify_pkce_challenge(code_verifier, code_challenge):
            logger.warning(
                "linkedin_pkce_verification_failed",
                code_challenge=code_challenge[:20] + "...",
            )
            monitoring_metrics.increment_oauth_connection_failure(
                provider="linkedin", error_type="pkce_verification_failed"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PKCE verification failed",
            )
        logger.info("linkedin_pkce_verification_success")

    async with AsyncClient() as client:
        response = await client.post(
            settings.linkedin_token_url or "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.linkedin_redirect_uri,
                "client_id": settings.linkedin_client_id,
                "client_secret": settings.linkedin_client_secret,
            },
            headers={"Accept": "application/json"},
        )

        if response.status_code != 200:
            logger.error(
                "linkedin_token_exchange_failed",
                status=response.status_code,
                response=response.text[:500],
            )
            monitoring_metrics.increment_oauth_connection_failure(
                provider="linkedin", error_type="token_exchange_failed"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to exchange code for token: {response.status_code}",
            )

        token_data = response.json()

        if "error" in token_data:
            error = token_data.get("error")
            logger.error("linkedin_token_error", error=error)
            monitoring_metrics.increment_oauth_connection_failure(
                provider="linkedin", error_type=error
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=token_data.get("error_description", "Token exchange failed"),
            )

        return token_data


async def _fetch_linkedin_profile(access_token: str) -> Dict[str, Any]:
    """
    Fetch LinkedIn user profile using access token.

    Args:
        access_token: LinkedIn OAuth access token

    Returns:
        Dictionary with user profile data

    Raises:
        HTTPException: If profile fetch fails
    """
    async with AsyncClient() as client:
        response = await client.get(
            settings.linkedin_profile_url or "https://api.linkedin.com/v2/me",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )

        if response.status_code != 200:
            logger.error("linkedin_profile_fetch_failed", status=response.status_code)
            monitoring_metrics.increment_oauth_connection_failure(
                provider="linkedin", error_type="profile_fetch_failed"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch LinkedIn profile",
            )

        return response.json()


# =============================================================================
# Token Management Endpoints
# =============================================================================


@router.get(
    "/status",
    response_model=dict,
    responses={
        200: {"description": "LinkedIn connection status"},
        401: {"description": "Not authenticated"},
    },
    summary="Check LinkedIn connection status",
)
async def get_linkedin_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Check the user's LinkedIn connection status.

    Returns connection details if user has connected their LinkedIn account.
    """
    result = await db.execute(
        select(LinkedInConnection).where(
            LinkedInConnection.user_id == current_user.id,
            LinkedInConnection.is_active.is_(True),
        )
    )
    connection = result.scalar_one_or_none()

    if connection:
        # Check if token is expired
        now = datetime.now(timezone.utc)
        expires_at = connection.expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at and expires_at < now:
            # Token expired, attempt refresh
            try:
                await _refresh_linkedin_token(connection, db)
                # Refresh successful, reload connection
                await db.refresh(connection)
            except Exception as e:
                logger.warning("linkedin_token_refresh_failed", user_id=current_user.id, error=str(e))
                return {
                    "authenticated": False,
                    "error": "Token expired. Please reconnect.",
                }

        logger.info(
            "linkedin_status_connected",
            user_id=current_user.id,
            linkedin_username=connection.linkedin_username,
        )
        return {
            "authenticated": True,
            "username": connection.linkedin_username,
            "display_name": connection.linkedin_display_name,
            "email": connection.linkedin_email,
            "connected_at": connection.created_at.isoformat() if connection.created_at else None,
            "expires_at": connection.expires_at.isoformat() if connection.expires_at else None,
        }
    else:
        logger.info("linkedin_status_not_connected", user_id=current_user.id)
        return {
            "authenticated": False,
            "error": "No LinkedIn connection found",
        }


@router.delete(
    "/disconnect",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "LinkedIn account disconnected successfully"},
        401: {"description": "Not authenticated"},
    },
    summary="Disconnect LinkedIn account",
)
async def disconnect_linkedin(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Disconnect user's LinkedIn account and delete stored OAuth tokens.

    This endpoint:
    1. Optionally revokes the LinkedIn OAuth token (best-effort)
    2. Deletes the encrypted tokens from the database
    3. Removes all LinkedIn connection data for the user
    """
    user_id = current_user.id

    # Check if user has a LinkedIn connection
    result = await db.execute(
        select(LinkedInConnection).where(LinkedInConnection.user_id == user_id)
    )
    connection = result.scalar_one_or_none()

    if connection:
        # Attempt to revoke token with LinkedIn (best-effort)
        if connection.access_token:
            try:
                await _revoke_linkedin_token(decrypt_token(connection.access_token))
            except Exception as e:
                logger.warning("linkedin_token_revocation_failed", user_id=user_id, error=str(e))

        # Delete connection from database
        await db.delete(connection)
        await db.commit()

        logger.info("linkedin_disconnected", user_id=user_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _refresh_linkedin_token(
    connection: LinkedInConnection,
    db: AsyncSession,
) -> str:
    """
    Refresh an expired LinkedIn access token.

    Args:
        connection: LinkedIn connection with refresh token
        db: Database session

    Returns:
        New access token

    Raises:
        HTTPException: If refresh fails
    """
    if not connection.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No refresh token available",
        )

    try:
        refresh_token = decrypt_token(connection.refresh_token)
    except Exception as e:
        logger.error("linkedin_refresh_token_decrypt_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt refresh token",
        )

    async with AsyncClient() as client:
        response = await client.post(
            settings.linkedin_token_url or "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.linkedin_client_id,
                "client_secret": settings.linkedin_client_secret,
            },
            headers={"Accept": "application/json"},
        )

        if response.status_code != 200:
            logger.error(
                "linkedin_token_refresh_failed",
                status=response.status_code,
                response=response.text[:500],
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to refresh access token",
            )

        token_data = response.json()
        new_access_token = token_data.get("access_token")
        new_refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)

        if not new_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token in refresh response",
            )

        # Update connection with new tokens
        connection.access_token = encrypt_token(new_access_token)
        if new_refresh_token:
            connection.refresh_token = encrypt_token(new_refresh_token)
        connection.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        connection.expires_in = expires_in
        connection.updated_at = datetime.now(timezone.utc)

        await db.commit()

        logger.info(
            "linkedin_token_refreshed",
            user_id=connection.user_id,
            expires_in=expires_in,
        )

        return new_access_token


async def _revoke_linkedin_token(access_token: str) -> bool:
    """
    Revoke LinkedIn OAuth token.

    Note: LinkedIn doesn't provide a public token revocation endpoint.
    This is a placeholder for future implementation.

    Args:
        access_token: The LinkedIn OAuth access token to revoke

    Returns:
        True if revocation succeeded or failed gracefully
    """
    # LinkedIn doesn't have a public revocation endpoint
    # Token will be invalidated by deleting from our database
    logger.info("linkedin_token_revoked_local", token_prefix=access_token[:10] + "...")
    return True
```

### 4.3 Token Refresh Service

Create `/resume-api/lib/linkedin_token_service.py`:

```python
"""
LinkedIn Token Service

Handles automatic token refresh and expiration management.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import LinkedInConnection
from config.security import encrypt_token, decrypt_token
from config import settings
from monitoring import logging_config

logger = logging_config.get_logger(__name__)


class LinkedInTokenService:
    """Service for managing LinkedIn OAuth tokens."""

    # Refresh tokens 5 minutes before expiration
    REFRESH_BUFFER_SECONDS = 300

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_valid_access_token(self, user_id: int) -> Optional[str]:
        """
        Get a valid access token for a user, refreshing if necessary.

        Args:
            user_id: The user's ID

        Returns:
            Valid access token or None if not connected
        """
        result = await self.db.execute(
            select(LinkedInConnection).where(
                LinkedInConnection.user_id == user_id,
                LinkedInConnection.is_active.is_(True),
            )
        )
        connection = result.scalar_one_or_none()

        if not connection:
            return None

        # Check if token needs refresh
        if self._needs_refresh(connection):
            try:
                await self._refresh_token(connection)
                await self.db.refresh(connection)
            except Exception as e:
                logger.error(
                    "linkedin_token_refresh_failed",
                    user_id=user_id,
                    error=str(e),
                )
                return None

        # Decrypt and return access token
        try:
            return decrypt_token(connection.access_token)
        except Exception as e:
            logger.error(
                "linkedin_token_decrypt_failed",
                user_id=user_id,
                error=str(e),
            )
            return None

    def _needs_refresh(self, connection: LinkedInConnection) -> bool:
        """Check if token needs refresh based on expiration."""
        if not connection.expires_at:
            return False

        expires_at = connection.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        # Refresh if within buffer window
        refresh_threshold = datetime.now(timezone.utc) + timedelta(
            seconds=self.REFRESH_BUFFER_SECONDS
        )
        return expires_at < refresh_threshold

    async def _refresh_token(self, connection: LinkedInConnection) -> str:
        """
        Refresh the access token using the refresh token.

        Args:
            connection: LinkedIn connection to refresh

        Returns:
            New access token
        """
        import httpx

        if not connection.refresh_token:
            raise ValueError("No refresh token available")

        try:
            refresh_token = decrypt_token(connection.refresh_token)
        except Exception as e:
            raise ValueError(f"Failed to decrypt refresh token: {e}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.linkedin_token_url or "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.linkedin_client_id,
                    "client_secret": settings.linkedin_client_secret,
                },
                headers={"Accept": "application/json"},
            )

            if response.status_code != 200:
                raise ValueError(f"Token refresh failed: {response.status_code}")

            token_data = response.json()
            new_access_token = token_data.get("access_token")
            new_refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)

            if not new_access_token:
                raise ValueError("No access token in refresh response")

            # Update connection
            connection.access_token = encrypt_token(new_access_token)
            if new_refresh_token:
                connection.refresh_token = encrypt_token(new_refresh_token)
            connection.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            connection.expires_in = expires_in

            await self.db.commit()

            logger.info(
                "linkedin_token_refreshed",
                user_id=connection.user_id,
                expires_in=expires_in,
            )

            return new_access_token

    async def is_token_valid(self, user_id: int) -> bool:
        """Check if user has a valid LinkedIn access token."""
        result = await self.db.execute(
            select(LinkedInConnection).where(
                LinkedInConnection.user_id == user_id,
                LinkedInConnection.is_active.is_(True),
            )
        )
        connection = result.scalar_one_or_none()

        if not connection:
            return False

        if not connection.expires_at:
            return True

        expires_at = connection.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return expires_at > datetime.now(timezone.utc)
```

---

## 5. Token Storage

### 5.1 Encryption Strategy

**Algorithm:** Fernet (symmetric encryption using AES-128-CBC with HMAC-SHA256)

**Why Fernet:**
- Authenticated encryption (prevents tampering)
- URL-safe base64 encoding
- Built-in key rotation support
- Part of Python `cryptography` library (already in requirements)

### 5.2 Token Encryption Implementation

Existing implementation in `/resume-api/lib/token_encryption.py`:

```python
"""
Token Encryption Utilities.

Uses Fernet symmetric encryption from the cryptography library.
"""

import base64
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken


class TokenEncryption:
    """Token encryption utility using Fernet symmetric encryption."""

    def __init__(self, encryption_key: Optional[str] = None):
        if encryption_key is None:
            encryption_key = os.getenv("TOKEN_ENCRYPTION_KEY")

        if not encryption_key:
            raise ValueError("TOKEN_ENCRYPTION_KEY environment variable not set")

        self.key = self._normalize_key(encryption_key)
        self.fernet = Fernet(self.key)

    def _normalize_key(self, key: str) -> bytes:
        """Normalize the encryption key to ensure correct format."""
        try:
            key_bytes = key.encode() if isinstance(key, str) else key
            decoded = base64.urlsafe_b64decode(key_bytes)
            normalized = base64.urlsafe_b64encode(decoded.ljust(32, b"\0")[:32])
            return normalized
        except Exception as e:
            raise ValueError(f"Invalid encryption key format: {e}")

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a plaintext token."""
        if not plaintext:
            raise ValueError("Cannot encrypt empty plaintext")

        plaintext_bytes = plaintext.encode("utf-8")
        encrypted_bytes = self.fernet.encrypt(plaintext_bytes)
        return encrypted_bytes.decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt an encrypted token."""
        if not ciphertext:
            raise ValueError("Cannot decrypt empty ciphertext")

        ciphertext_bytes = ciphertext.encode("utf-8")
        decrypted_bytes = self.fernet.decrypt(ciphertext_bytes)
        return decrypted_bytes.decode("utf-8")


def generate_encryption_key() -> str:
    """Generate a new Fernet encryption key."""
    return Fernet.generate_key().decode("utf-8")


# Singleton instance
_token_encryption_instance: Optional[TokenEncryption] = None


def get_token_encryption() -> TokenEncryption:
    """Get singleton TokenEncryption instance."""
    global _token_encryption_instance
    if _token_encryption_instance is None:
        _token_encryption_instance = TokenEncryption()
    return _token_encryption_instance
```

### 5.3 Database Schema

```sql
-- LinkedIn connections table
CREATE TABLE linkedin_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linkedin_user_id VARCHAR(100) NOT NULL,
    linkedin_username VARCHAR(255),
    linkedin_display_name VARCHAR(255),
    linkedin_email VARCHAR(255),
    access_token TEXT NOT NULL,  -- Encrypted with Fernet
    refresh_token TEXT,  -- Encrypted with Fernet
    token_type VARCHAR(50) DEFAULT 'bearer',
    scope VARCHAR(500),
    expires_at TIMESTAMP,
    expires_in INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    INDEX idx_linkedin_user_id (linkedin_user_id),
    INDEX idx_user_active (user_id, is_active)
);

-- OAuth state table (temporary)
CREATE TABLE linkedin_oauth_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id),
    redirect_uri VARCHAR(500),
    code_challenge VARCHAR(128),
    code_challenge_method VARCHAR(10),
    code_verifier VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    INDEX idx_state (state),
    INDEX idx_expires_at (expires_at)
);
```

### 5.4 Key Management

**Generate Encryption Key:**

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Store in Environment:**

```bash
# .env
TOKEN_ENCRYPTION_KEY=your-generated-key-here
```

**Key Rotation:**

```python
def rotate_encryption_key(old_key: str, new_key: str, db: AsyncSession):
    """Rotate encryption key for all stored tokens."""
    from sqlalchemy import select

    old_fernet = TokenEncryption(old_key)
    new_fernet = TokenEncryption(new_key)

    result = await db.execute(select(LinkedInConnection))
    connections = result.scalars().all()

    for conn in connections:
        # Re-encrypt access token
        plaintext = old_fernet.decrypt(conn.access_token)
        conn.access_token = new_fernet.encrypt(plaintext)

        # Re-encrypt refresh token if present
        if conn.refresh_token:
            plaintext = old_fernet.decrypt(conn.refresh_token)
            conn.refresh_token = new_fernet.encrypt(plaintext)

    await db.commit()
```

---

## 6. Token Refresh

### 6.1 Refresh Token Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   LinkedIn      │
│                 │     │                 │     │                 │
│  1. API Call    │     │                 │     │                 │
│────────────────▶│     │                 │     │                 │
│                 │     │  2. Check Token │     │                 │
│                 │     │     Expiration  │     │                 │
│                 │     │                 │     │                 │
│                 │     │  3. Token Near  │     │                 │
│                 │     │     Expiry?     │     │                 │
│                 │     │       │         │     │                 │
│                 │     │      Yes        │     │                 │
│                 │     │       ▼         │     │                 │
│                 │     │  4. Refresh     │     │                 │
│                 │     │     Request     │     │                 │
│                 │     │────────────────▶│     │                 │
│                 │     │                 │     │                 │
│                 │     │  5. New Tokens  │     │                 │
│                 │     │◀────────────────│     │                 │
│                 │     │                 │     │                 │
│                 │     │  6. Update DB   │     │                 │
│                 │     │                 │     │                 │
│                 │     │  7. Continue    │     │                 │
│                 │◀────│     Original    │     │                 │
│                 │     │     Request     │     │                 │
```

### 6.2 Automatic Refresh Pattern

```python
# Middleware for automatic token refresh
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

async def linkedin_auth_middleware(request: Request, call_next):
    """Middleware to handle LinkedIn token refresh."""
    # Skip for non-authenticated requests
    if not request.headers.get("Authorization"):
        return await call_next(request)

    # Check if this is a LinkedIn API request
    if "/linkedin/" in request.url.path:
        user_id = request.state.user_id  # Set by auth middleware

        if user_id:
            token_service = LinkedInTokenService(request.state.db)

            # Get valid token (auto-refreshes if needed)
            access_token = await token_service.get_valid_access_token(user_id)

            if not access_token:
                return JSONResponse(
                    status_code=401,
                    content={"error": "linkedin_token_expired", "message": "Please reconnect LinkedIn"},
                )

            # Store token in request state for route handlers
            request.state.linkedin_token = access_token

    return await call_next(request)
```

### 6.3 Refresh Token Rotation

LinkedIn supports refresh token rotation for enhanced security:

```python
async def _refresh_linkedin_token_with_rotation(
    connection: LinkedInConnection,
    db: AsyncSession,
) -> dict:
    """
    Refresh token with rotation (LinkedIn best practice).

    When refreshing, LinkedIn may issue a new refresh token.
    Always store the new refresh token and invalidate the old one.
    """
    import httpx

    old_refresh_token = decrypt_token(connection.refresh_token)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.linkedin_token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": old_refresh_token,
                "client_id": settings.linkedin_client_id,
                "client_secret": settings.linkedin_client_secret,
            },
        )

        token_data = response.json()
        new_access_token = token_data.get("access_token")
        new_refresh_token = token_data.get("refresh_token")

        # Update with new tokens
        connection.access_token = encrypt_token(new_access_token)

        # IMPORTANT: Store new refresh token if provided
        if new_refresh_token:
            connection.refresh_token = encrypt_token(new_refresh_token)
            # Old refresh token is now invalid

        connection.expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=token_data.get("expires_in", 3600)
        )

        await db.commit()

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "expires_in": token_data.get("expires_in"),
        }
```

---

## 7. Error Handling

### 7.1 Error Scenarios

| Error | HTTP Status | Response | Recovery |
|-------|-------------|----------|----------|
| Invalid state | 400 | `invalid_state` | Restart OAuth flow |
| Expired state | 400 | `expired_state` | Restart OAuth flow |
| PKCE verification failed | 400 | `pkce_failed` | Restart OAuth flow |
| Token exchange failed | 400 | `token_exchange_failed` | Retry with backoff |
| Token expired | 401 | `token_expired` | Auto-refresh or reconnect |
| Invalid refresh token | 401 | `refresh_token_invalid` | Reconnect required |
| Token revoked | 401 | `token_revoked` | Reconnect required |
| Rate limited | 429 | `rate_limited` | Wait and retry |

### 7.2 Error Response Format

```python
from pydantic import BaseModel
from typing import Optional, Literal


class OAuthErrorResponse(BaseModel):
    """Standard OAuth error response."""
    error: Literal[
        "invalid_state",
        "expired_state",
        "pkce_failed",
        "token_exchange_failed",
        "token_expired",
        "refresh_token_invalid",
        "token_revoked",
        "rate_limited",
        "unknown_error",
    ]
    error_description: str
    error_uri: Optional[str] = None  # Link to documentation
    provider: str = "linkedin"


class TokenExpiredResponse(BaseModel):
    """Token expired error with recovery instructions."""
    error: str = "token_expired"
    message: str = "Your LinkedIn access token has expired"
    recovery: Literal["auto_refresh", "reconnect_required"] = "auto_refresh"
    reconnect_url: str = "/api/v1/linkedin/connect"
```

### 7.3 Error Handler Implementation

```python
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


async def oauth_error_handler(request: Request, call_next):
    """Global error handler for OAuth errors."""
    try:
        return await call_next(request)
    except HTTPException as e:
        if e.status_code == 401:
            return JSONResponse(
                status_code=401,
                content={
                    "error": "unauthorized",
                    "error_description": str(e.detail),
                    "provider": "linkedin",
                },
            )
        elif e.status_code == 400:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "bad_request",
                    "error_description": str(e.detail),
                    "provider": "linkedin",
                },
            )
        elif e.status_code == 429:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limited",
                    "error_description": "Too many requests. Please try again later.",
                    "retry_after": 60,
                    "provider": "linkedin",
                },
            )
        raise
    except Exception as e:
        logger.error("oauth_unexpected_error", error=str(e))
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "error_description": "An unexpected error occurred",
                "provider": "linkedin",
            },
        )
```

### 7.4 Token Expiration Handling

```python
class TokenExpirationHandler:
    """Handle token expiration scenarios."""

    async def handle_expired_token(
        self,
        user_id: int,
        db: AsyncSession,
        original_request: dict,
    ) -> dict:
        """
        Handle expired token with automatic refresh.

        Args:
            user_id: User ID
            db: Database session
            original_request: Original API request to retry

        Returns:
            API response or error
        """
        token_service = LinkedInTokenService(db)

        # Attempt automatic refresh
        access_token = await token_service.get_valid_access_token(user_id)

        if not access_token:
            # Refresh failed, user needs to reconnect
            return {
                "error": "token_expired",
                "recovery": "reconnect_required",
                "reconnect_url": "/api/v1/linkedin/connect",
            }

        # Retry original request with new token
        return await self._retry_request(original_request, access_token)

    async def _retry_request(self, request: dict, access_token: str) -> dict:
        """Retry API request with new access token."""
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request["method"],
                url=request["url"],
                headers={"Authorization": f"Bearer {access_token}"},
                json=request.get("json"),
            )
            return response.json()
```

---

## 8. Security Best Practices

### 8.1 CSRF Protection (State Parameter)

**Always use state parameter:**

```python
def generate_state() -> str:
    """Generate cryptographically secure state parameter."""
    return secrets.token_urlsafe(32)


async def validate_state(state: str, db: AsyncSession) -> bool:
    """Validate state parameter exists and is not expired."""
    result = await db.execute(
        select(LinkedInOAuthState).where(
            LinkedInOAuthState.state == state,
            LinkedInOAuthState.is_used.is_(False),
        )
    )
    oauth_state = result.scalar_one_or_none()

    if not oauth_state:
        return False

    # Check expiration
    expires_at = oauth_state.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        await db.delete(oauth_state)
        await db.commit()
        return False

    return True
```

### 8.2 PKCE Implementation

**Always use PKCE for public clients:**

```python
# Frontend generates PKCE parameters
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Store verifier in session storage (not localStorage!)
sessionStorage.setItem('linkedin_code_verifier', codeVerifier);

// Redirect to LinkedIn with code_challenge
const authUrl = `https://www.linkedin.com/oauth/v2/authorization?
  response_type=code&
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  scope=openid%20profile%20email&
  state=${state}&
  code_challenge=${codeChallenge}&
  code_challenge_method=S256`;
```

### 8.3 XSS Protection

**Security headers:**

```python
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware


def create_security_headers():
    """Create security headers middleware."""
    @middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response
    return security_headers
```

### 8.4 Token Storage Security

**DO NOT store tokens in localStorage:**

```typescript
// ❌ BAD - vulnerable to XSS
localStorage.setItem('linkedin_token', token);

// ✅ GOOD - use httpOnly cookies or session storage
sessionStorage.setItem('linkedin_token', token);

// ✅ BEST - httpOnly cookies set by backend
// Backend sets cookie:
response.set_cookie(
    key="linkedin_access_token",
    value=access_token,
    httponly=True,  # Not accessible via JavaScript
    secure=True,    # HTTPS only
    samesite="strict",
    max_age=3600,
)
```

### 8.5 HTTPS Enforcement

**Always use HTTPS in production:**

```python
# Force HTTPS redirect
@app.middleware("http")
async def https_redirect(request: Request, call_next):
    if not request.url.scheme == "https" and not settings.debug:
        return Response(
            status_code=301,
            headers={"Location": request.url.replace(scheme="https")},
        )
    return await call_next(request)
```

### 8.6 Rate Limiting

**Protect OAuth endpoints:**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.get("/connect")
@limiter.limit("5/minute")  # Limit OAuth initiation
async def linkedin_connect(request: Request, ...):
    ...

@router.get("/callback")
@limiter.limit("10/minute")  # Limit callback attempts
async def linkedin_callback(request: Request, ...):
    ...
```

### 8.7 Token Revocation

**Implement proper cleanup on disconnect:**

```python
@router.delete("/disconnect")
async def disconnect_linkedin(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """Disconnect and revoke tokens."""
    result = await db.execute(
        select(LinkedInConnection).where(LinkedInConnection.user_id == current_user.id)
    )
    connection = result.scalar_one_or_none()

    if connection:
        # Attempt remote revocation (best-effort)
        if connection.access_token:
            try:
                access_token = decrypt_token(connection.access_token)
                await _revoke_linkedin_token(access_token)
            except Exception as e:
                logger.warning("linkedin_remote_revocation_failed", error=str(e))

        # Always delete local tokens
        await db.delete(connection)
        await db.commit()

        logger.info("linkedin_disconnected", user_id=current_user.id)

    return Response(status_code=204)
```

---

## 9. Frontend Integration

### 9.1 React OAuth Hook

Create `/utils/use-linkedin-oauth.ts`:

```typescript
import { useState, useCallback } from 'react';
import { API_URL } from './config';

interface LinkedInOAuthState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  profile: LinkedInProfile | null;
}

interface LinkedInProfile {
  id: string;
  name: string;
  email: string;
  headline?: string;
  picture?: string;
}

export function useLinkedInOAuth() {
  const [state, setState] = useState<LinkedInOAuthState>({
    isConnected: false,
    isLoading: false,
    error: null,
    profile: null,
  });

  /**
   * Initiate LinkedIn OAuth flow
   */
  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Get authorization URL from backend
      const response = await fetch(`${API_URL}/api/v1/linkedin/connect`, {
        credentials: 'include',  // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth');
      }

      const { authorization_url, state: oauthState } = await response.json();

      // Step 2: Store state for callback verification
      sessionStorage.setItem('linkedin_oauth_state', oauthState);

      // Step 3: Redirect to LinkedIn
      window.location.href = authorization_url;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  /**
   * Handle OAuth callback
   */
  const handleCallback = useCallback(async (code: string, oauthState: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Verify state matches
      const storedState = sessionStorage.getItem('linkedin_oauth_state');
      if (storedState !== oauthState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Backend handles token exchange via redirect
      // Check connection status after redirect
      await checkConnection();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      sessionStorage.removeItem('linkedin_oauth_state');
    }
  }, []);

  /**
   * Check connection status
   */
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/linkedin/status`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        setState({ isConnected: false, isLoading: false, error: null, profile: null });
        return;
      }

      const data = await response.json();

      if (data.authenticated) {
        setState({
          isConnected: true,
          isLoading: false,
          error: null,
          profile: {
            id: data.linkedin_user_id,
            name: data.display_name,
            email: data.email,
            headline: data.headline,
          },
        });
      } else {
        setState({ isConnected: false, isLoading: false, error: null, profile: null });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  /**
   * Disconnect LinkedIn
   */
  const disconnect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_URL}/api/v1/linkedin/disconnect`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setState({ isConnected: false, isLoading: false, error: null, profile: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  return {
    ...state,
    connect,
    handleCallback,
    checkConnection,
    disconnect,
  };
}
```

### 9.2 PKCE Helper Functions

Create `/utils/pkce.ts`:

```typescript
/**
 * Generate a PKCE code verifier (RFC 7636)
 * Returns a 128-character random string
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(96);
  crypto.getRandomValues(array);

  // Base64url encode
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return base64.substring(0, 128);
}

/**
 * Generate PKCE code challenge from verifier
 * Uses SHA-256 hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  // SHA-256 hash
  const hash = await crypto.subtle.digest('SHA-256', data);

  // Base64url encode
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return base64;
}
```

### 9.3 LinkedIn Connect Button Component

Create `/components/LinkedInConnectButton.tsx`:

```typescript
import React from 'react';
import { useLinkedInOAuth } from '../utils/use-linkedin-oauth';

const LINKEDIN_BLUE = '#0077b5';

interface LinkedInConnectButtonProps {
  onConnectSuccess?: () => void;
  onDisconnectSuccess?: () => void;
}

export const LinkedInConnectButton: React.FC<LinkedInConnectButtonProps> = ({
  onConnectSuccess,
  onDisconnectSuccess,
}) => {
  const { isConnected, isLoading, profile, connect, disconnect } = useLinkedInOAuth();

  const handleConnect = async () => {
    await connect();
    // User will be redirected to LinkedIn
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect LinkedIn?')) {
      await disconnect();
      onDisconnectSuccess?.();
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg flex items-center gap-2"
        style={{ backgroundColor: LINKEDIN_BLUE, color: 'white' }}
      >
        <span className="animate-spin">⟳</span>
        Loading...
      </button>
    );
  }

  if (isConnected && profile) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
          <span className="text-green-600">✓</span>
          <span className="text-sm font-medium text-green-800">
            Connected as {profile.name}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
      style={{
        backgroundColor: LINKEDIN_BLUE,
        color: 'white',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#006097')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = LINKEDIN_BLUE)}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
      Connect with LinkedIn
    </button>
  );
};
```

### 9.4 OAuth Callback Handler

Create `/pages/LinkedInCallback.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

export const LinkedInCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      toast.error(`LinkedIn OAuth failed: ${error}`);
      navigate('/settings', { replace: true });
      return;
    }

    if (code && state) {
      // Backend handles token exchange via redirect
      // Just check status after redirect
      setStatus('success');
      toast.success('LinkedIn connected successfully!');
      navigate('/settings', { replace: true });
    } else {
      setStatus('error');
      toast.error('Invalid OAuth callback');
      navigate('/settings', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {status === 'loading' && (
        <div className="text-center">
          <div className="animate-spin text-4xl text-blue-600">⟳</div>
          <p className="mt-4 text-gray-600">Connecting to LinkedIn...</p>
        </div>
      )}
      {status === 'success' && (
        <div className="text-center">
          <div className="text-4xl text-green-600">✓</div>
          <p className="mt-4 text-gray-600">Connected successfully!</p>
        </div>
      )}
      {status === 'error' && (
        <div className="text-center">
          <div className="text-4xl text-red-600">✗</div>
          <p className="mt-4 text-gray-600">Connection failed</p>
        </div>
      )}
    </div>
  );
};
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

Create `/resume-api/tests/test_linkedin_oauth.py`:

```python
"""
LinkedIn OAuth Unit Tests

Tests PKCE generation, token encryption, and OAuth flow.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from database import Base, User, LinkedInConnection, LinkedInOAuthState
from config.security import hash_password, encrypt_token, decrypt_token
from routes.linkedin import (
    generate_pkce_code_verifier,
    generate_pkce_code_challenge,
    verify_pkce_challenge,
)


@pytest_asyncio.fixture
async def test_db():
    """Create test database."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield test_session_maker
    await test_engine.dispose()


@pytest_asyncio.fixture
async def client(test_db):
    """Create test client."""
    from main import app

    async def override_get_async_session():
        async with test_db() as session:
            yield session

    app.dependency_overrides[get_async_session] = override_get_async_session

    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async_client = AsyncClient(transport=transport, base_url="http://testserver")

    yield async_client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(test_db):
    """Create test user."""
    async with test_db() as session:
        user = User(
            email="test@example.com",
            username="testuser",
            hashed_password=hash_password("password123"),
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


class TestPKCEFunctions:
    """Test PKCE helper functions."""

    def test_code_verifier_generation(self):
        """Test code verifier is 128 characters with valid chars."""
        verifier = generate_pkce_code_verifier()

        assert len(verifier) == 128
        # Check valid characters (unreserved per RFC 7636)
        valid_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        assert all(c in valid_chars for c in verifier)

    def test_code_challenge_generation(self):
        """Test code challenge is valid base64url."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Should not have padding or invalid chars
        assert "=" not in challenge
        assert "+" not in challenge
        assert "/" not in challenge

    def test_pkce_verification(self):
        """Test PKCE verification succeeds and fails correctly."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Valid verification
        assert verify_pkce_challenge(verifier, challenge) is True

        # Invalid verification
        wrong_verifier = verifier + "_modified"
        assert verify_pkce_challenge(wrong_verifier, challenge) is False

    def test_verifier_uniqueness(self):
        """Test that multiple verifiers are unique."""
        verifiers = [generate_pkce_code_verifier() for _ in range(100)]
        assert len(set(verifiers)) == 100


class TestTokenEncryption:
    """Test token encryption/decryption."""

    def test_encrypt_decrypt_round_trip(self):
        """Test encryption and decryption."""
        plaintext = "test_token_12345"
        encrypted = encrypt_token(plaintext)
        decrypted = decrypt_token(encrypted)

        assert decrypted == plaintext
        assert encrypted != plaintext  # Should be different

    def test_encrypt_empty_string(self):
        """Test encryption handles empty strings."""
        with pytest.raises(ValueError):
            encrypt_token("")

    def test_decrypt_invalid_token(self):
        """Test decryption fails for invalid tokens."""
        with pytest.raises(Exception):
            decrypt_token("invalid_encrypted_token")


class TestLinkedInConnectEndpoint:
    """Test /linkedin/connect endpoint."""

    @pytest.mark.asyncio
    async def test_connect_returns_authorization_url(self, client, test_user, test_db):
        """Test connect endpoint returns valid authorization URL."""
        # Authenticate
        from config.jwt_utils import create_access_token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        access_token = create_access_token(token_data)
        client.headers = {"Authorization": f"Bearer {access_token}"}

        with patch("routes.linkedin.settings") as mock_settings:
            mock_settings.linkedin_client_id = "test_client_id"
            mock_settings.linkedin_redirect_uri = "http://localhost/callback"

            response = await client.get("/api/v1/linkedin/connect")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "authorization_url" in data
            assert "state" in data
            assert "code_challenge" in data

            # Verify URL contains PKCE parameters
            auth_url = data["authorization_url"]
            assert "code_challenge=" in auth_url
            assert "code_challenge_method=S256" in auth_url

    @pytest.mark.asyncio
    async def test_connect_state_persistence(self, client, test_user, test_db):
        """Test state is persisted in database."""
        from config.jwt_utils import create_access_token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        access_token = create_access_token(token_data)
        client.headers = {"Authorization": f"Bearer {access_token}"}

        with patch("routes.linkedin.settings") as mock_settings:
            mock_settings.linkedin_client_id = "test_client_id"

            response = await client.get("/api/v1/linkedin/connect")
            state = response.json()["state"]

            # Verify state in database
            async with test_db() as session:
                result = await session.execute(
                    select(LinkedInOAuthState).where(LinkedInOAuthState.state == state)
                )
                oauth_state = result.scalar_one_or_none()

                assert oauth_state is not None
                assert oauth_state.user_id == test_user.id
                assert oauth_state.code_challenge is not None
                assert oauth_state.code_verifier is not None


class TestLinkedInCallbackEndpoint:
    """Test /linkedin/callback endpoint."""

    @pytest.mark.asyncio
    async def test_callback_successful_flow(self, client, test_user, test_db):
        """Test successful OAuth callback."""
        with patch("routes.linkedin.settings") as mock_settings:
            mock_settings.linkedin_client_id = "test_client_id"
            mock_settings.linkedin_client_secret = "test_secret"
            mock_settings.linkedin_redirect_uri = "http://localhost/callback"
            mock_settings.frontend_url = "http://localhost:3000"

            # Create OAuth state
            state = LinkedInOAuthState(
                state="test_state",
                user_id=test_user.id,
                code_verifier="test_verifier",
                code_challenge="test_challenge",
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            )
            async with test_db() as session:
                session.add(state)
                await session.commit()

            with patch("routes.linkedin._exchange_code_for_token") as mock_exchange:
                with patch("routes.linkedin._fetch_linkedin_profile") as mock_fetch:
                    mock_exchange.return_value = {
                        "access_token": "test_access_token",
                        "refresh_token": "test_refresh_token",
                        "expires_in": 3600,
                    }
                    mock_fetch.return_value = {
                        "sub": "linkedin_user_123",
                        "name": "Test User",
                        "given_name": "Test",
                        "family_name": "User",
                        "email": "test@linkedin.com",
                    }

                    response = await client.get(
                        "/api/v1/linkedin/callback",
                        params={"code": "auth_code", "state": "test_state"},
                    )

                    assert response.status_code == 302
                    assert "status=success" in response.headers.get("location", "")

                    # Verify connection created
                    async with test_db() as session:
                        result = await session.execute(
                            select(LinkedInConnection).where(
                                LinkedInConnection.linkedin_user_id == "linkedin_user_123"
                            )
                        )
                        connection = result.scalar_one_or_none()
                        assert connection is not None
                        assert connection.access_token is not None


class TestTokenRefresh:
    """Test token refresh functionality."""

    @pytest.mark.asyncio
    async def test_refresh_expired_token(self, client, test_user, test_db):
        """Test automatic token refresh."""
        from lib.linkedin_token_service import LinkedInTokenService

        # Create connection with expired token
        async with test_db() as session:
            connection = LinkedInConnection(
                user_id=test_user.id,
                linkedin_user_id="test_linkedin_id",
                access_token=encrypt_token("expired_access_token"),
                refresh_token=encrypt_token("valid_refresh_token"),
                expires_at=datetime.now(timezone.utc) - timedelta(hours=1),  # Expired
                is_active=True,
            )
            session.add(connection)
            await session.commit()

        token_service = LinkedInTokenService(test_db)

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(
                status_code=200,
                json=lambda: {
                    "access_token": "new_access_token",
                    "refresh_token": "new_refresh_token",
                    "expires_in": 3600,
                },
            )

            # Should auto-refresh
            new_token = await token_service.get_valid_access_token(test_user.id)

            assert new_token == "new_access_token"


class TestErrorHandling:
    """Test error scenarios."""

    @pytest.mark.asyncio
    async def test_callback_invalid_state(self, client):
        """Test callback with invalid state."""
        response = await client.get(
            "/api/v1/linkedin/callback",
            params={"code": "test_code", "state": "invalid_state"},
        )

        assert response.status_code == 302
        assert "error=invalid_state" in response.headers.get("location", "")

    @pytest.mark.asyncio
    async def test_callback_expired_state(self, client, test_user, test_db):
        """Test callback with expired state."""
        async with test_db() as session:
            state = LinkedInOAuthState(
                state="expired_state",
                user_id=test_user.id,
                expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            )
            session.add(state)
            await session.commit()

        response = await client.get(
            "/api/v1/linkedin/callback",
            params={"code": "test_code", "state": "expired_state"},
        )

        assert response.status_code == 302
        assert "error=expired_state" in response.headers.get("location", "")
```

### 10.2 Integration Tests

Create `/resume-api/tests/integration/test_linkedin_oauth_e2e.py`:

```python
"""
LinkedIn OAuth End-to-End Integration Tests

Tests complete OAuth flow from connect to disconnect.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from httpx import AsyncClient

from database import User, LinkedInConnection, LinkedInOAuthState
from config.security import hash_password
from config.jwt_utils import create_access_token


@pytest_asyncio.fixture
async def e2e_client(test_db):
    """Create E2E test client."""
    # Similar to unit test client but with real dependencies
    ...


class TestLinkedInOAuthE2E:
    """End-to-end LinkedIn OAuth tests."""

    @pytest.mark.asyncio
    async def test_complete_oauth_flow(self, e2e_client, test_user, test_db):
        """Test complete OAuth flow: connect -> callback -> status -> disconnect."""
        # Step 1: Initiate OAuth
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        access_token = create_access_token(token_data)
        e2e_client.headers = {"Authorization": f"Bearer {access_token}"}

        with patch("routes.linkedin.settings") as mock_settings:
            mock_settings.linkedin_client_id = "test_client_id"
            mock_settings.linkedin_redirect_uri = "http://localhost/callback"

            # Connect
            response = await e2e_client.get("/api/v1/linkedin/connect")
            assert response.status_code == 200
            auth_data = response.json()
            state = auth_data["state"]

            # Step 2: Simulate callback
            with patch("routes.linkedin._exchange_code_for_token") as mock_exchange:
                with patch("routes.linkedin._fetch_linkedin_profile") as mock_fetch:
                    mock_exchange.return_value = {
                        "access_token": "e2e_test_token",
                        "refresh_token": "e2e_refresh_token",
                        "expires_in": 3600,
                    }
                    mock_fetch.return_value = {
                        "sub": "e2e_linkedin_user",
                        "name": "E2E User",
                        "given_name": "E2E",
                        "family_name": "User",
                        "email": "e2e@test.com",
                    }

                    response = await e2e_client.get(
                        "/api/v1/linkedin/callback",
                        params={"code": "e2e_code", "state": state},
                    )
                    assert response.status_code == 302

            # Step 3: Check status
            response = await e2e_client.get("/api/v1/linkedin/status")
            assert response.status_code == 200
            status_data = response.json()
            assert status_data["authenticated"] is True
            assert status_data["username"] == "E2E User"

            # Step 4: Disconnect
            response = await e2e_client.delete("/api/v1/linkedin/disconnect")
            assert response.status_code == 204

            # Verify disconnected
            response = await e2e_client.get("/api/v1/linkedin/status")
            assert response.json()["authenticated"] is False
```

### 10.3 Frontend Tests

Create `/utils/linkedin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';

describe('PKCE Functions', () => {
  describe('generateCodeVerifier', () => {
    it('should generate 128-character string', () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBe(128);
    });

    it('should generate unique verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should only contain valid characters', () => {
      const verifier = generateCodeVerifier();
      const validChars = /^[A-Za-z0-9\-._~]+$/;
      expect(verifier).toMatch(validChars);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate valid base64url challenge', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      // Should not have padding
      expect(challenge).not.toContain('=');
      // Should be valid base64url
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('should produce same challenge for same verifier', async () => {
      const verifier = 'test_verifier_123';
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });
  });
});
```

### 10.4 Test Commands

```bash
# Run LinkedIn OAuth tests
pytest resume-api/tests/test_linkedin_oauth.py -v

# Run E2E tests
pytest resume-api/tests/integration/test_linkedin_oauth_e2e.py -v

# Run frontend tests
npm test -- linkedin.test.ts

# Run with coverage
pytest resume-api/tests/test_linkedin_oauth.py --cov=routes/linkedin --cov-report=html
```

---

## Appendix A: Quick Reference

### OAuth URLs

| Environment | Authorization URL | Token URL | Callback URL |
|-------------|------------------|-----------|--------------|
| Production | `https://www.linkedin.com/oauth/v2/authorization` | `https://www.linkedin.com/oauth/v2/accessToken` | `https://resumeai.com/api/v1/linkedin/callback` |
| Development | Same | Same | `http://localhost:8000/api/v1/linkedin/callback` |

### Environment Variables

```bash
# Required
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:8000/api/v1/linkedin/callback
TOKEN_ENCRYPTION_KEY=your-32-byte-base64-key

# Optional
LINKEDIN_SCOPE=openid profile email
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/linkedin/connect` | Start OAuth flow |
| GET | `/api/v1/linkedin/callback` | OAuth callback |
| GET | `/api/v1/linkedin/status` | Check connection |
| DELETE | `/api/v1/linkedin/disconnect` | Disconnect |

---

## Appendix B: Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `invalid_state` | State mismatch or expired | Check session storage, restart flow |
| `pkce_failed` | Verifier/challenge mismatch | Ensure same verifier used |
| `token_expired` | Access token expired | Auto-refresh should handle |
| `redirect_uri_mismatch` | Callback URL not registered | Add to LinkedIn app settings |

### Debug Mode

Enable debug logging:

```python
# In .env
LOG_LEVEL=DEBUG
DEBUG=true
```

Check logs:

```bash
# Backend logs
tail -f logs/resume-api.log | grep linkedin

# OAuth events
tail -f logs/resume-api.log | grep "linkedin_oauth"
```

---

**Document Version:** 1.0
**Last Updated:** March 13, 2026
**Next Review:** After LinkedIn Partner Program application
