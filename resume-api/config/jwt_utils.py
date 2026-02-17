"""
JWT utilities for user authentication.

Provides functions for creating, verifying, and managing JWT tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt

from config import settings


def create_access_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing token payload data (e.g., sub, email)
        expires_delta: Optional custom expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_access_token_expire_minutes
        )

    to_encode.update({"exp": expire, "type": "access"})

    return jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT refresh token.

    Refresh tokens have longer expiration times than access tokens.

    Args:
        data: Dictionary containing token payload data (e.g., sub, email)
        expires_delta: Optional custom expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default refresh token expiration: 7 days
        expire = datetime.now(timezone.utc) + timedelta(days=7)

    to_encode.update({"exp": expire, "type": "refresh"})

    return jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def verify_token(token: str, token_type: str = "access") -> Optional[dict[str, Any]]:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string to verify
        token_type: Expected token type ("access" or "refresh")

    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )

        # Verify token type
        if payload.get("type") != token_type:
            return None

        # Verify expiration (jose does this automatically, but double-check)
        exp = payload.get("exp")
        if exp is None:
            return None

        return payload

    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[dict[str, Any]]:
    """
    Verify an access token.

    Args:
        token: JWT access token string

    Returns:
        Decoded token payload if valid, None otherwise
    """
    return verify_token(token, token_type="access")


def verify_refresh_token(token: str) -> Optional[dict[str, Any]]:
    """
    Verify a refresh token.

    Args:
        token: JWT refresh token string

    Returns:
        Decoded token payload if valid, None otherwise
    """
    return verify_token(token, token_type="refresh")


def get_token_expire_time(token_type: str = "access") -> datetime:
    """
    Get the expiration time for a token type.

    Args:
        token_type: Type of token ("access" or "refresh")

    Returns:
        Datetime when tokens of this type expire
    """
    if token_type == "refresh":
        return datetime.now(timezone.utc) + timedelta(days=7)
    else:
        return datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_access_token_expire_minutes
        )
