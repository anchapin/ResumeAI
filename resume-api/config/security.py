"""
Security utilities for password hashing and verification.

Uses bcrypt for secure password hashing.
"""

from passlib.context import CryptContext

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password to hash

    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def needs_rehash(hashed_password: str) -> bool:
    """
    Check if a password hash needs to be rehashed.

    This is useful when upgrading hashing algorithms or parameters.

    Args:
        hashed_password: The hashed password to check

    Returns:
        True if the hash should be regenerated, False otherwise
    """
    return pwd_context.needs_update(hashed_password)
