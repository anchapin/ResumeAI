"""
Authentication routes for user registration, login, and token management.

Endpoints:
- POST /auth/register - Register a new user
- POST /auth/login - Login and get tokens
- POST /auth/refresh - Refresh access token
- POST /auth/logout - Logout (revoke refresh token)
- GET /auth/me - Get current user info
- PUT /auth/me - Update current user profile
- POST /auth/change-password - Change password
- GET /auth/health - Authentication service health check
"""

import hashlib
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_async_session, User, RefreshToken
from api.models import (
    UserCreate,
    UserLogin,
    TokenResponse,
    RefreshTokenRequest,
    TokenRefreshResponse,
    UserResponse,
    UserUpdate,
    PasswordChangeRequest,
    MessageResponse,
)
from config.security import hash_password, verify_password
from config.jwt_utils import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from config.dependencies import get_current_user
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

# Create a dummy hash for timing attack mitigation
DUMMY_HASH = hash_password("dummy_password_for_timing_mitigation")

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _hash_token(token: str) -> str:
    """Hash a token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"model": UserResponse, "description": "User registered successfully"},
        400: {"description": "Invalid input data"},
        409: {"description": "Email or username already exists"},
    },
    summary="Register new user",
)
async def register(
    user_data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Register a new user account.

    Creates a new user with the provided email, username, and password.
    The password is hashed before storage.

    **Password requirements:**
    - Minimum 8 characters
    - Maximum 100 characters

    **Username requirements:**
    - Minimum 3 characters
    - Maximum 100 characters
    - Only letters, numbers, underscores, and hyphens allowed
    """
    # Check if email already exists
    email_result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    existing_user = email_result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Check if username already exists
    username_result = await db.execute(
        select(User).where(User.username == user_data.username.lower())
    )
    existing_username = username_result.scalar_one_or_none()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    # Create new user
    hashed_pw = hash_password(user_data.password)
    new_user = User(
        email=user_data.email.lower(),
        username=user_data.username.lower(),
        hashed_password=hashed_pw,
        full_name=user_data.full_name,
        is_active=True,
        is_verified=False,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(
        "user_registered",
        user_id=new_user.id,
        username=new_user.username,
        email=new_user.email,
    )

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        200: {"model": TokenResponse, "description": "Login successful"},
        401: {"description": "Invalid email or password"},
        403: {"description": "Account is disabled"},
    },
    summary="User login",
)
async def login(
    credentials: UserLogin,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    request: Request,
):
    """
    Authenticate user and return access and refresh tokens.

    Use the returned tokens for authenticated requests:
    - Access token: Include in Authorization header as "Bearer {token}"
    - Refresh token: Use with /auth/refresh endpoint to get new access token

    **Token expiration:**
    - Access token: 30 minutes (configurable)
    - Refresh token: 7 days
    """
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == credentials.email.lower())
    )
    user = result.scalar_one_or_none()

    # Always perform password verification to prevent timing attacks
    if user:
        password_valid = verify_password(
            credentials.password, user.hashed_password
        )
    else:
        # Simulate verification time with dummy hash
        verify_password(credentials.password, DUMMY_HASH)
        password_valid = False

    if not user or not password_valid:
        logger.warning(
            "login_failed",
            email=credentials.email,
            reason="invalid_credentials",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        logger.warning(
            "login_failed",
            user_id=user.id,
            reason="account_disabled",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # Create tokens
    token_data = {"sub": str(user.id), "email": user.email, "username": user.username}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token hash in database
    from datetime import timedelta

    refresh_token_hash = _hash_token(refresh_token)
    stored_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        ip_address=request.client.host if request.client else None,
        device_info=request.headers.get("user-agent", ""),
    )
    db.add(stored_token)
    await db.commit()

    logger.info(
        "user_logged_in",
        user_id=user.id,
        username=user.username,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes in seconds
    )


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    responses={
        200: {
            "model": TokenRefreshResponse,
            "description": "Token refreshed successfully",
        },
        401: {"description": "Invalid or expired refresh token"},
    },
    summary="Refresh access token",
)
async def refresh_token(
    token_request: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Refresh an access token using a valid refresh token.

    This endpoint validates the refresh token and returns a new access token.
    The refresh token must not be expired or revoked.
    """
    # Verify refresh token
    payload = verify_refresh_token(token_request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload.get("sub"))
    token_hash = _hash_token(token_request.refresh_token)

    # Check if token exists in database and is not revoked
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked.is_(False),
        )
    )
    stored_token = result.scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if token is expired
    now = datetime.now(timezone.utc)
    expires_at = stored_token.expires_at
    # Handle both timezone-aware and naive datetimes
    if expires_at.tzinfo is None:
        # If expires_at is naive, assume UTC
        from datetime import timezone as tz

        expires_at = expires_at.replace(tzinfo=tz.utc)

    if expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create new access token
    token_data = {"sub": str(user_id), "email": payload.get("email")}
    new_access_token = create_access_token(token_data)

    return TokenRefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes in seconds
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    responses={
        200: {"model": MessageResponse, "description": "Logout successful"},
        401: {"description": "Invalid refresh token"},
    },
    summary="User logout",
)
async def logout(
    token_request: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Logout by revoking the refresh token.

    This invalidates the refresh token, preventing it from being used
    to obtain new access tokens. Any active sessions using this refresh
    token will need to re-authenticate.
    """
    token_hash = _hash_token(token_request.refresh_token)

    # Find and revoke the token
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one_or_none()

    if stored_token:
        stored_token.is_revoked = True
        await db.commit()
        logger.info("user_logged_out", token_id=stored_token.id)

    return MessageResponse(message="Successfully logged out")


@router.get(
    "/me",
    response_model=UserResponse,
    responses={
        200: {"model": UserResponse, "description": "Current user info"},
        401: {"description": "Not authenticated"},
    },
    summary="Get current user",
)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get information about the currently authenticated user.

    Requires a valid access token in the Authorization header.
    """
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    responses={
        200: {"model": UserResponse, "description": "Profile updated successfully"},
        401: {"description": "Not authenticated"},
        409: {"description": "Username already taken"},
    },
    summary="Update current user profile",
)
async def update_current_user(
    user_update: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Update the current user's profile information.

    Only the fields provided in the request will be updated.
    Email cannot be changed through this endpoint.
    """
    update_data = user_update.model_dump(exclude_unset=True)

    # Check if new username is already taken
    if "username" in update_data:
        new_username = user_update.username.lower()
        if new_username != current_user.username.lower():
            result = await db.execute(select(User).where(User.username == new_username))
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already taken",
                )
            update_data["username"] = new_username

    # Update user fields
    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    logger.info(
        "user_profile_updated",
        user_id=current_user.id,
        fields_updated=list(update_data.keys()),
    )

    return current_user


@router.post(
    "/change-password",
    response_model=MessageResponse,
    responses={
        200: {"model": MessageResponse, "description": "Password changed successfully"},
        401: {"description": "Not authenticated"},
        400: {"description": "Invalid current password"},
    },
    summary="Change password",
)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    Change the current user's password.

    Requires the current password for verification.
    The new password must meet the minimum requirements (8+ characters).
    """
    # Verify current password
    if not verify_password(
        password_data.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.hashed_password = hash_password(password_data.new_password)
    await db.commit()

    logger.info(
        "password_changed",
        user_id=current_user.id,
    )

    return MessageResponse(message="Password changed successfully")


@router.get(
    "/health",
    response_model=dict,
    responses={
        200: {"description": "Authentication service is healthy"},
    },
    summary="Authentication health check",
)
async def auth_health():
    """
    Health check endpoint for the authentication service.

    Returns the current status of the authentication system.
    """
    return {
        "status": "healthy",
        "service": "authentication",
    }
