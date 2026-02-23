"""
Token Encryption Utilities.

This module provides secure token encryption and decryption functionality
for storing OAuth tokens at rest in the database.

Uses Fernet symmetric encryption from the cryptography library.
"""

import base64
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


class TokenEncryptionError(Exception):
    """Exception raised for token encryption/decryption errors."""

    pass


class TokenEncryption:
    """
    Token encryption utility using Fernet symmetric encryption.

    This class provides methods to encrypt and decrypt sensitive data
    such as OAuth tokens before storage in the database.

    The encryption key must be 32 URL-safe base64-encoded bytes.
    Generate a key using: generate_encryption_key()
    """

    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize the token encryption utility.

        Args:
            encryption_key: 32 URL-safe base64-encoded bytes as a string.
                          If not provided, will attempt to load from
                          TOKEN_ENCRYPTION_KEY environment variable.

        Raises:
            TokenEncryptionError: If no encryption key is provided or found.
        """
        if encryption_key is None:
            encryption_key = os.getenv("TOKEN_ENCRYPTION_KEY")

        if not encryption_key:
            raise TokenEncryptionError(
                "TOKEN_ENCRYPTION_KEY environment variable not set. "
                "Please set it before using TokenEncryption."
            )

        # Validate and potentially convert the key format
        self.key = self._normalize_key(encryption_key)
        self.fernet = Fernet(self.key)
        logger.info("TokenEncryption initialized successfully")

    def _normalize_key(self, key: str) -> bytes:
        """
        Normalize the encryption key to ensure it's in the correct format.

        Args:
            key: The encryption key as a string.

        Returns:
            The key as bytes in Fernet-compatible format.

        Raises:
            TokenEncryptionError: If the key format is invalid.
        """
        try:
            # If key is already URL-safe base64, use it directly
            key_bytes = key.encode() if isinstance(key, str) else key
            # Try to decode as base64 to validate
            decoded = base64.urlsafe_b64decode(key_bytes)
            # Re-encode to ensure correct padding
            normalized = base64.urlsafe_b64encode(decoded.ljust(32, b"\0")[:32])
            return normalized
        except Exception as e:
            raise TokenEncryptionError(f"Invalid encryption key format: {e}")

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext token.

        Args:
            plaintext: The plaintext token string to encrypt.

        Returns:
            The encrypted token as a URL-safe base64-encoded string.

        Raises:
            TokenEncryptionError: If encryption fails.
        """
        try:
            if not plaintext:
                raise TokenEncryptionError("Cannot encrypt empty plaintext")

            # Convert to bytes and encrypt
            plaintext_bytes = plaintext.encode("utf-8")
            encrypted_bytes = self.fernet.encrypt(plaintext_bytes)

            # Return as string for storage
            encrypted_str = encrypted_bytes.decode("utf-8")

            logger.debug("Token encrypted successfully")
            return encrypted_str

        except InvalidToken as e:
            raise TokenEncryptionError(f"Encryption failed: {e}")
        except Exception as e:
            raise TokenEncryptionError(f"Unexpected error during encryption: {e}")

    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt an encrypted token.

        Args:
            ciphertext: The encrypted token string to decrypt.

        Returns:
            The decrypted plaintext token.

        Raises:
            TokenEncryptionError: If decryption fails.
        """
        try:
            if not ciphertext:
                raise TokenEncryptionError("Cannot decrypt empty ciphertext")

            # Convert to bytes and decrypt
            ciphertext_bytes = ciphertext.encode("utf-8")
            decrypted_bytes = self.fernet.decrypt(ciphertext_bytes)

            # Return as string
            decrypted_str = decrypted_bytes.decode("utf-8")

            logger.debug("Token decrypted successfully")
            return decrypted_str

        except InvalidToken as e:
            raise TokenEncryptionError(
                f"Decryption failed (invalid token or wrong key): {e}"
            )
        except Exception as e:
            raise TokenEncryptionError(f"Unexpected error during decryption: {e}")

    def is_encrypted(self, data: str) -> bool:
        """
        Check if a string appears to be encrypted.

        This is a heuristic check - it attempts to decrypt the data
        and returns True if successful.

        Args:
            data: The string to check.

        Returns:
            True if the string can be decrypted, False otherwise.
        """
        try:
            if not data:
                return False
            self.decrypt(data)
            return True
        except (TokenEncryptionError, InvalidToken):
            return False


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.

    This generates a 32-byte URL-safe base64-encoded key suitable
    for use with TokenEncryption.

    Returns:
        A URL-safe base64-encoded encryption key.

    Example:
        >>> key = generate_encryption_key()
        >>> print(f"TOKEN_ENCRYPTION_KEY={key}")
    """
    key = Fernet.generate_key()
    return key.decode("utf-8")


def validate_encryption_key(key: str) -> bool:
    """
    Validate an encryption key format.

    Args:
        key: The encryption key to validate.

    Returns:
        True if the key is valid, False otherwise.
    """
    try:
        TokenEncryption(key)
        return True
    except TokenEncryptionError:
        return False


# Singleton instance for convenient access
_token_encryption_instance: Optional[TokenEncryption] = None


def get_token_encryption() -> TokenEncryption:
    """
    Get a singleton instance of TokenEncryption.

    This function provides a convenient way to access the token
    encryption utility without managing the instance yourself.

    Returns:
        A TokenEncryption instance.

    Raises:
        TokenEncryptionError: If TOKEN_ENCRYPTION_KEY is not set.
    """
    global _token_encryption_instance

    if _token_encryption_instance is None:
        _token_encryption_instance = TokenEncryption()

    return _token_encryption_instance
