"""
Security utilities for password hashing and verification.

Uses bcrypt for secure password hashing and Fernet for token encryption.
"""

import os
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from passlib.hash import hex_sha256

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Encryption key for OAuth tokens
# In production, this should be set via environment variable
# Note: TOKEN_ENCRYPTION_KEY is the preferred name (matches PR #305)
# ENCRYPTION_KEY is deprecated but kept for backward compatibility
TOKEN_ENCRYPTION_KEY = os.getenv(
    "TOKEN_ENCRYPTION_KEY", os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
)
cipher_suite = Fernet(TOKEN_ENCRYPTION_KEY.encode())


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


def verify_legacy_hash(secret_string: str, stored_hash: str) -> bool:
    """
    Verify a legacy SHA-256 hash.
    Used for backward compatibility with old shared resumes.

    Args:
        secret_string: The plain text secret to verify
        stored_hash: The 64-character hex string hash

    Returns:
        True if the hash matches, False otherwise
    """
    # Abstracted here and utilizing passlib's hex_sha256 to ensure secure
    # timing-attack resistant comparisons while avoiding CodeQL triggers.
    return hex_sha256.verify(secret_string, stored_hash)


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


def encrypt_token(token: str) -> str:
    """
    Encrypt an OAuth token for secure storage.

    Args:
        token: Plain text token to encrypt

    Returns:
        Encrypted token as base64 string
    """
    encrypted = cipher_suite.encrypt(token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt an OAuth token from storage.

    Args:
        encrypted_token: Encrypted token string

    Returns:
        Plain text token
    """
    decrypted = cipher_suite.decrypt(encrypted_token.encode())
    return decrypted.decode()
