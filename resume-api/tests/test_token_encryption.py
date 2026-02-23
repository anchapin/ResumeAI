"""
Unit tests for token encryption utilities.
"""

import base64
import os
import pytest
from cryptography.fernet import InvalidToken  # noqa: F401

from lib.token_encryption import (
    TokenEncryption,
    TokenEncryptionError,
    generate_encryption_key,
    validate_encryption_key,
    get_token_encryption,
)


class TestGenerateEncryptionKey:
    """Tests for generate_encryption_key function."""

    def test_generate_key_returns_string(self):
        """Test that generate_encryption_key returns a string."""
        key = generate_encryption_key()
        assert isinstance(key, str)

    def test_generate_key_is_valid_base64(self):
        """Test that generated key is valid base64."""
        key = generate_encryption_key()
        # Should be able to decode as URL-safe base64
        decoded = base64.urlsafe_b64decode(key.encode())
        assert len(decoded) == 32

    def test_generate_key_is_unique(self):
        """Test that each generated key is unique."""
        key1 = generate_encryption_key()
        key2 = generate_encryption_key()
        assert key1 != key2


class TestValidateEncryptionKey:
    """Tests for validate_encryption_key function."""

    def test_validate_valid_key(self):
        """Test that a valid key passes validation."""
        key = generate_encryption_key()
        assert validate_encryption_key(key) is True

    def test_validate_invalid_key(self):
        """Test that an invalid key fails validation."""
        assert validate_encryption_key("invalid-key") is False
        assert validate_encryption_key("") is False
        assert validate_encryption_key("short") is False


class TestTokenEncryption:
    """Tests for TokenEncryption class."""

    @pytest.fixture
    def encryption_key(self):
        """Fixture providing a valid encryption key."""
        return generate_encryption_key()

    @pytest.fixture
    def token_encryption(self, encryption_key):
        """Fixture providing a TokenEncryption instance."""
        return TokenEncryption(encryption_key)

    def test_init_with_valid_key(self, encryption_key):
        """Test initialization with a valid key."""
        te = TokenEncryption(encryption_key)
        assert te.key is not None
        assert te.fernet is not None

    def test_init_without_key_raises_error(self):
        """Test that initialization without a key raises an error."""
        with pytest.raises(TokenEncryptionError) as exc_info:
            TokenEncryption()
        assert "TOKEN_ENCRYPTION_KEY" in str(exc_info.value)

    def test_init_with_invalid_key_raises_error(self):
        """Test that initialization with an invalid key raises an error."""
        with pytest.raises(TokenEncryptionError) as exc_info:
            TokenEncryption("invalid-key")
        assert "Invalid encryption key format" in str(exc_info.value)

    def test_encrypt_decrypt_simple_string(self, token_encryption):
        """Test encrypt and decrypt of a simple string."""
        plaintext = "hello world"
        encrypted = token_encryption.encrypt(plaintext)
        decrypted = token_encryption.decrypt(encrypted)
        assert decrypted == plaintext
        assert encrypted != plaintext

    def test_encrypt_decrypt_oauth_token(self, token_encryption):
        """Test encrypt and decrypt of an OAuth token."""
        plaintext = "ghp_1234567890abcdef1234567890abcdef12345678"
        encrypted = token_encryption.encrypt(plaintext)
        decrypted = token_encryption.decrypt(encrypted)
        assert decrypted == plaintext
        assert encrypted != plaintext

    def test_encrypt_decrypt_long_string(self, token_encryption):
        """Test encrypt and decrypt of a long string."""
        plaintext = "a" * 10000
        encrypted = token_encryption.encrypt(plaintext)
        decrypted = token_encryption.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_decrypt_special_characters(self, token_encryption):
        """Test encrypt and decrypt with special characters."""
        plaintext = "test!@#$%^&*()_+-=[]{}|;':\",./<>?"
        encrypted = token_encryption.encrypt(plaintext)
        decrypted = token_encryption.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_decrypt_unicode(self, token_encryption):
        """Test encrypt and decrypt with Unicode characters."""
        plaintext = "Hello 世界 🌍 Ñoño"
        encrypted = token_encryption.encrypt(plaintext)
        decrypted = token_encryption.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_empty_string_raises_error(self, token_encryption):
        """Test that encrypting an empty string raises an error."""
        with pytest.raises(TokenEncryptionError) as exc_info:
            token_encryption.encrypt("")
        assert "Cannot encrypt empty plaintext" in str(exc_info.value)

    def test_decrypt_empty_string_raises_error(self, token_encryption):
        """Test that decrypting an empty string raises an error."""
        with pytest.raises(TokenEncryptionError) as exc_info:
            token_encryption.decrypt("")
        assert "Cannot decrypt empty ciphertext" in str(exc_info.value)

    def test_decrypt_invalid_ciphertext_raises_error(self, token_encryption):
        """Test that decrypting invalid ciphertext raises an error."""
        with pytest.raises(TokenEncryptionError) as exc_info:
            token_encryption.decrypt("not-valid-encrypted-data")
        assert "Decryption failed" in str(exc_info.value)

    def test_decrypt_with_wrong_key(self):
        """Test that decryption with wrong key fails."""
        key1 = generate_encryption_key()
        key2 = generate_encryption_key()

        te1 = TokenEncryption(key1)
        te2 = TokenEncryption(key2)

        plaintext = "secret token"
        encrypted = te1.encrypt(plaintext)

        with pytest.raises(TokenEncryptionError) as exc_info:
            te2.decrypt(encrypted)
        assert "Decryption failed" in str(exc_info.value)

    def test_is_encrypted_with_encrypted_data(self, token_encryption):
        """Test is_encrypted with actually encrypted data."""
        plaintext = "test data"
        encrypted = token_encryption.encrypt(plaintext)
        assert token_encryption.is_encrypted(encrypted) is True

    def test_is_encrypted_with_plaintext(self, token_encryption):
        """Test is_encrypted with plaintext."""
        assert token_encryption.is_encrypted("not encrypted") is False
        assert token_encryption.is_encrypted("") is False

    def test_is_encrypted_with_wrong_key(self):
        """Test is_encrypted when using wrong key."""
        key1 = generate_encryption_key()
        key2 = generate_encryption_key()

        te1 = TokenEncryption(key1)
        te2 = TokenEncryption(key2)

        plaintext = "test data"
        encrypted = te1.encrypt(plaintext)

        # Should return False because we're using wrong key
        assert te2.is_encrypted(encrypted) is False

    def test_encryption_is_deterministic_with_same_data(self, token_encryption):
        """Test that encryption of the same data produces different results (nonce)."""
        plaintext = "same data"
        encrypted1 = token_encryption.encrypt(plaintext)
        encrypted2 = token_encryption.encrypt(plaintext)

        # Fernet includes a random nonce, so encrypted strings should differ
        assert encrypted1 != encrypted2

        # But both should decrypt to the same plaintext
        assert token_encryption.decrypt(encrypted1) == plaintext
        assert token_encryption.decrypt(encrypted2) == plaintext

    def test_multiple_encrypt_decrypt_cycles(self, token_encryption):
        """Test multiple encrypt/decrypt cycles."""
        plaintext = "original data"
        current = plaintext

        for i in range(10):
            encrypted = token_encryption.encrypt(current)
            decrypted = token_encryption.decrypt(encrypted)
            assert decrypted == plaintext
            current = decrypted


class TestGetTokenEncryption:
    """Tests for get_token_encryption singleton function."""

    @pytest.fixture(autouse=True)
    def reset_singleton(self):
        """Reset the singleton before each test."""
        # Import here to access and reset
        import lib.token_encryption

        original_instance = lib.token_encryption._token_encryption_instance
        lib.token_encryption._token_encryption_instance = None

        yield

        lib.token_encryption._token_encryption_instance = original_instance

    def test_get_token_encryption_without_env_var_raises_error(self):
        """Test that get_token_encryption raises error without env var."""
        # Ensure env var is not set
        env_key = "TOKEN_ENCRYPTION_KEY"
        original_value = os.environ.get(env_key)

        if env_key in os.environ:
            del os.environ[env_key]

        try:
            with pytest.raises(TokenEncryptionError) as exc_info:
                get_token_encryption()
            assert "TOKEN_ENCRYPTION_KEY" in str(exc_info.value)
        finally:
            # Restore original value
            if original_value is not None:
                os.environ[env_key] = original_value

    def test_get_token_encryption_with_env_var(self):
        """Test that get_token_encryption works with env var set."""
        key = generate_encryption_key()
        os.environ["TOKEN_ENCRYPTION_KEY"] = key

        te = get_token_encryption()
        assert isinstance(te, TokenEncryption)

        # Should return same instance on subsequent calls
        te2 = get_token_encryption()
        assert te is te2

    def test_get_token_encryption_singleton_behavior(self):
        """Test that get_token_encryption returns same instance."""
        key = generate_encryption_key()
        os.environ["TOKEN_ENCRYPTION_KEY"] = key

        te1 = get_token_encryption()
        te2 = get_token_encryption()
        te3 = get_token_encryption()

        assert te1 is te2
        assert te2 is te3
