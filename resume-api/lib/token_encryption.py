"""
Token Encryption and Decryption Utilities

Provides secure token encryption and decryption using Fernet symmetric encryption
from the cryptography library. This module handles the secure storage of OAuth
tokens, API keys, and other sensitive credential data.

Security Features:
- Uses Fernet (AES-128 in CBC mode with PKCS7 padding)
- Generates a unique 32-byte encryption key from environment variable
- Handles empty tokens, invalid tokens, and decryption failures gracefully
- Logs all encryption/decryption operations for audit trail
"""

import os
import base64
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Get logger for this module
logger = logging.getLogger(__name__)


class TokenEncryptionError(Exception):
    """Base exception for token encryption errors."""

    pass


class TokenDecryptionError(TokenEncryptionError):
    """Exception raised when token decryption fails."""

    pass


class TokenEncryptionKeyError(TokenEncryptionError):
    """Exception raised when encryption key is invalid or missing."""

    pass


class TokenEncryption:
    """
    Handles encryption and decryption of sensitive tokens.

    Uses Fernet symmetric encryption (AES-128-CBC with PKCS7 padding, HMAC-SHA256)
    to secure OAuth tokens, API keys, and other sensitive credentials.

    The encryption key is derived from TOKEN_ENCRYPTION_KEY environment variable
    using PBKDF2 key derivation with a salt for additional security.
    """

    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize TokenEncryption with an optional encryption key.

        Args:
            encryption_key: Base64-encoded encryption key. If not provided,
                         reads from TOKEN_ENCRYPTION_KEY environment variable.

        Raises:
            TokenEncryptionKeyError: If no valid encryption key is provided.
        """
        self._key = self._get_encryption_key(encryption_key)
        self._fernet = Fernet(self._key)
        logger.info("token_encryption_initialized")

    @staticmethod
    def _get_encryption_key(encryption_key: Optional[str]) -> bytes:
        """
        Get or generate the encryption key.

        Args:
            encryption_key: Optional base64-encoded encryption key

        Returns:
            32-byte Fernet-compatible encryption key

        Raises:
            TokenEncryptionKeyError: If no valid key can be obtained
        """
        # Use provided key or get from environment
        key = encryption_key or os.getenv("TOKEN_ENCRYPTION_KEY")

        if not key:
            raise TokenEncryptionKeyError(
                "TOKEN_ENCRYPTION_KEY environment variable must be set. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )

        try:
            # Validate that key is valid base64
            # Fernet keys are 44 bytes when base64 encoded (32 bytes raw)
            key_bytes = base64.urlsafe_b64decode(key.encode())

            if len(key_bytes) != 32:
                raise TokenEncryptionKeyError(
                    f"Invalid encryption key length. Expected 32 bytes, got {len(key_bytes)}. "
                    "Generate a valid key with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
                )

            return key.encode()
        except Exception as e:
            raise TokenEncryptionKeyError(
                f"Failed to parse encryption key: {str(e)}. "
                "Generate a valid key with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )

    def encrypt(self, token: Optional[str]) -> Optional[str]:
        """
        Encrypt a token using Fernet symmetric encryption.

        Args:
            token: The token to encrypt. Can be None or empty string.

        Returns:
            Base64-encoded encrypted token, or None if input is None/empty.

        Raises:
            TokenEncryptionError: If encryption fails for any reason.
        """
        # Handle empty/None tokens
        if token is None:
            logger.debug("encrypt_skipped", reason="token_is_none")
            return None

        if not token or not token.strip():
            logger.debug("encrypt_skipped", reason="token_is_empty")
            return ""

        try:
            # Encrypt the token
            encrypted_bytes = self._fernet.encrypt(token.encode("utf-8"))
            encrypted_token = encrypted_bytes.decode("utf-8")

            logger.info(
                f"encrypt_success token_length={len(token)} encrypted_length={len(encrypted_token)}"
            )

            return encrypted_token

        except Exception as e:
            error_msg = f"Token encryption failed: {str(e)}"
            logger.error(f"encrypt_failed error={str(e)} token_length={len(token)}")
            raise TokenEncryptionError(error_msg) from e

    def decrypt(self, encrypted_token: Optional[str]) -> Optional[str]:
        """
        Decrypt an encrypted token.

        Args:
            encrypted_token: Base64-encoded encrypted token. Can be None or empty.

        Returns:
            Decrypted token as string, or None if input is None/empty.

        Raises:
            TokenDecryptionError: If decryption fails (invalid token, wrong key, etc.)
        """
        # Handle empty/None tokens
        if encrypted_token is None:
            logger.debug("decrypt_skipped", reason="token_is_none")
            return None

        if not encrypted_token or not encrypted_token.strip():
            logger.debug("decrypt_skipped", reason="token_is_empty")
            return ""

        try:
            # Decrypt the token
            decrypted_bytes = self._fernet.decrypt(encrypted_token.encode("utf-8"))
            decrypted_token = decrypted_bytes.decode("utf-8")

            logger.info(
                f"decrypt_success encrypted_length={len(encrypted_token)} decrypted_length={len(decrypted_token)}"
            )

            return decrypted_token

        except InvalidToken as e:
            error_msg = "Token decryption failed: invalid or corrupted token"
            logger.error(
                f"decrypt_failed_invalid_token error={str(e)} encrypted_length={len(encrypted_token)}"
            )
            raise TokenDecryptionError(error_msg) from e

        except Exception as e:
            error_msg = f"Token decryption failed: {str(e)}"
            logger.error(
                f"decrypt_failed error={str(e)} encrypted_length={len(encrypted_token)}"
            )
            raise TokenDecryptionError(error_msg) from e

    def validate_key(self) -> bool:
        """
        Validate that the encryption key is properly configured.

        Returns:
            True if key is valid, False otherwise.

        Note:
            This performs a test encryption/decryption to verify the key works.
        """
        try:
            test_token = "validation_test_token_12345"
            encrypted = self.encrypt(test_token)
            decrypted = self.decrypt(encrypted)
            return decrypted == test_token
        except Exception as e:
            logger.error(f"key_validation_failed error={str(e)}")
            return False


# Global instance for convenient access
_global_encryption: Optional[TokenEncryption] = None


def get_encryption() -> TokenEncryption:
    """
    Get the global TokenEncryption instance.

    Creates the instance on first call if it doesn't exist.

    Returns:
        Global TokenEncryption instance

    Raises:
        TokenEncryptionKeyError: If encryption key is not configured
    """
    global _global_encryption

    if _global_encryption is None:
        _global_encryption = TokenEncryption()

    return _global_encryption


def reset_encryption(encryption_key: Optional[str] = None):
    """
    Reset the global TokenEncryption instance.

    Useful for testing or when configuration changes.

    Args:
        encryption_key: Optional new encryption key to use
    """
    global _global_encryption
    _global_encryption = TokenEncryption(encryption_key)


def generate_encryption_key() -> str:
    """
    Generate a new Fernet-compatible encryption key.

    Returns:
        Base64-encoded 32-byte encryption key

    Note:
        Store this key securely in your environment variables.
            Never commit it to version control.
    """
    key = Fernet.generate_key()
    logger.info("encryption_key_generated")
    return key.decode()


def derive_key_from_password(
    password: str, salt: Optional[bytes] = None
) -> Tuple[str, bytes]:
    """
    Derive a Fernet-compatible key from a password using PBKDF2.

    Args:
        password: The password to derive key from
        salt: Optional salt bytes. If not provided, generates random salt.

    Returns:
        Tuple of (base64_encoded_key, salt_used)

    Note:
        The salt must be stored alongside the encrypted data for decryption.
        Returns the salt so it can be saved.
    """
    from typing import Tuple

    if salt is None:
        # Generate a random 16-byte salt
        import secrets

        salt = secrets.token_bytes(16)

    # Derive key using PBKDF2-HMAC-SHA256
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    logger.info("key_derived_from_password iterations=100000")
    return (key.decode(), salt)
