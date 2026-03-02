"""
Secure API key storage and verification.

Provides utilities for hashing API keys using bcrypt and verifying
plaintext keys against stored hashes.
"""

import logging
from typing import Optional

import bcrypt

logger = logging.getLogger(__name__)


def hash_api_key(key: str) -> str:
    """
    Hash an API key using bcrypt.

    Args:
        key: The plaintext API key to hash

    Returns:
        The bcrypt hash of the key (always starts with $2b$)

    Raises:
        ValueError: If the key is empty or invalid
    """
    if not key or not isinstance(key, str):
        raise ValueError("API key must be a non-empty string")

    # Use bcrypt with cost factor 12 for good security/performance balance
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(key.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_api_key(plaintext_key: str, key_hash: str) -> bool:
    """
    Verify a plaintext API key against a bcrypt hash.

    Uses constant-time comparison to prevent timing attacks.

    Args:
        plaintext_key: The plaintext API key to verify
        key_hash: The bcrypt hash to compare against

    Returns:
        True if the key matches the hash, False otherwise
    """
    if not plaintext_key or not key_hash:
        return False

    try:
        return bcrypt.checkpw(plaintext_key.encode("utf-8"), key_hash.encode("utf-8"))
    except (ValueError, TypeError):
        # Invalid hash format or type
        return False


def generate_api_key_prefix(key: str, prefix_length: int = 12) -> str:
    """
    Extract a prefix from an API key for display purposes.

    Allows users to identify which key was used without exposing the full key.

    Args:
        key: The API key to extract prefix from
        prefix_length: Length of prefix to return (default 12)

    Returns:
        The first N characters of the key (or 'unknown' if key is too short)
    """
    if not key or len(key) < prefix_length:
        return "unknown"
    return key[:prefix_length]


def is_hashed_key(value: str) -> bool:
    """
    Check if a string appears to be a bcrypt hash.

    Bcrypt hashes always start with $2a$, $2b$, or $2y$.

    Args:
        value: String to check

    Returns:
        True if the string appears to be a bcrypt hash
    """
    if not value or not isinstance(value, str):
        return False
    return value.startswith(("$2a$", "$2b$", "$2y$"))


def migrate_plaintext_keys(plaintext_keys: Optional[list[str]]) -> dict:
    """
    Migrate plaintext API keys to hashed versions.

    Useful for upgrading systems that stored keys in plaintext.

    Args:
        plaintext_keys: List of plaintext API keys to migrate

    Returns:
        Dictionary with original keys mapped to their hashes
        Format: {plaintext_key: hashed_key}

    Raises:
        ValueError: If plaintext_keys is None or empty
    """
    if not plaintext_keys:
        raise ValueError("No plaintext keys provided for migration")

    migration_map = {}
    for key in plaintext_keys:
        if key and isinstance(key, str):
            try:
                hashed = hash_api_key(key)
                migration_map[key] = hashed
                logger.info(f"Migrated API key: {generate_api_key_prefix(key)}")
            except ValueError as e:
                logger.error(f"Failed to migrate API key: {e}")
                continue

    return migration_map
