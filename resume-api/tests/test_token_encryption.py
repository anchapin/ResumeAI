"""
Unit tests for token encryption utilities.

Tests cover:
- Basic encryption and decryption
- Edge cases (empty tokens, None tokens, special characters)
- Error handling (invalid keys, corrupted tokens)
- Key validation
- Password-based key derivation
"""

import pytest
import os
from cryptography.fernet import Fernet

from lib.token_encryption import (
    TokenEncryption,
    TokenEncryptionError,
    TokenDecryptionError,
    TokenEncryptionKeyError,
    get_encryption,
    reset_encryption,
    generate_encryption_key,
    derive_key_from_password,
)


@pytest.fixture
def test_encryption_key():
    """Generate a test encryption key."""
    return generate_encryption_key()


@pytest.fixture
def encryption_instance(test_encryption_key):
    """Create a TokenEncryption instance with test key."""
    return TokenEncryption(test_encryption_key)


class TestTokenEncryption:
    """Test suite for TokenEncryption class."""

    def test_encrypt_decrypt_basic(self, encryption_instance):
        """Test basic encryption and decryption."""
        original_token = "my_secret_token_12345"
        encrypted = encryption_instance.encrypt(original_token)
        decrypted = encryption_instance.decrypt(encrypted)

        assert encrypted != original_token
        assert decrypted == original_token
        assert len(encrypted) > len(original_token)

    def test_encrypt_none_token(self, encryption_instance):
        """Test encryption with None token."""
        result = encryption_instance.encrypt(None)
        assert result is None

    def test_decrypt_none_token(self, encryption_instance):
        """Test decryption with None token."""
        result = encryption_instance.decrypt(None)
        assert result is None

    def test_encrypt_empty_token(self, encryption_instance):
        """Test encryption with empty string."""
        result = encryption_instance.encrypt("")
        assert result == ""

    def test_decrypt_empty_token(self, encryption_instance):
        """Test decryption with empty string."""
        result = encryption_instance.decrypt("")
        assert result == ""

    def test_encrypt_whitespace_only(self, encryption_instance):
        """Test encryption with whitespace-only string."""
        result = encryption_instance.encrypt("   ")
        assert result == ""

    def test_encrypt_special_characters(self, encryption_instance):
        """Test encryption with special characters."""
        special_chars = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`"
        encrypted = encryption_instance.encrypt(special_chars)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == special_chars

    def test_encrypt_unicode(self, encryption_instance):
        """Test encryption with Unicode characters."""
        unicode_text = "Hello 世界 🌍 Привет مرحبا"
        encrypted = encryption_instance.encrypt(unicode_text)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == unicode_text

    def test_encrypt_long_token(self, encryption_instance):
        """Test encryption with very long token."""
        long_token = "x" * 10000
        encrypted = encryption_instance.encrypt(long_token)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == long_token

    def test_decrypt_invalid_token(self, encryption_instance):
        """Test decryption with invalid/corrupted token."""
        with pytest.raises(TokenDecryptionError) as exc_info:
            encryption_instance.decrypt("invalid_token")

        assert "invalid or corrupted token" in str(exc_info.value).lower()

    def test_decrypt_wrong_key(self):
        """Test decryption with wrong encryption key."""
        key1 = generate_encryption_key()
        key2 = generate_encryption_key()

        encryptor1 = TokenEncryption(key1)
        encryptor2 = TokenEncryption(key2)

        token = "secret_token"
        encrypted = encryptor1.encrypt(token)

        with pytest.raises(TokenDecryptionError):
            encryptor2.decrypt(encrypted)

    def test_no_encryption_key_raises_error(self, monkeypatch):
        """Test that missing encryption key raises error."""
        monkeypatch.delenv("TOKEN_ENCRYPTION_KEY", raising=False)

        with pytest.raises(TokenEncryptionKeyError) as exc_info:
            TokenEncryption()

        assert "TOKEN_ENCRYPTION_KEY" in str(exc_info.value)

    def test_invalid_encryption_key_raises_error(self):
        """Test that invalid encryption key raises error."""
        with pytest.raises(TokenEncryptionKeyError):
            TokenEncryption("not_a_valid_base64_key")

    def test_wrong_key_length_raises_error(self):
        """Test that wrong key length raises error."""
        # Generate a key but truncate it
        valid_key = generate_encryption_key()
        short_key = valid_key[:20]  # Too short

        with pytest.raises(TokenEncryptionKeyError) as exc_info:
            TokenEncryption(short_key)

        assert "Invalid encryption key length" in str(exc_info.value)

    def test_validate_key(self, encryption_instance):
        """Test key validation method."""
        assert encryption_instance.validate_key() is True

    def test_multiple_encrypt_decrypt_roundtrip(self, encryption_instance):
        """Test multiple encryption/decryption cycles."""
        original = "test_token_for_multiple_cycles"

        for _ in range(10):
            encrypted = encryption_instance.encrypt(original)
            decrypted = encryption_instance.decrypt(encrypted)
            assert decrypted == original

    def test_different_tokens_produce_different_ciphertexts(
        self, encryption_instance
    ):
        """Test that different tokens produce different ciphertexts."""
        token1 = "token_1"
        token2 = "token_2"

        encrypted1 = encryption_instance.encrypt(token1)
        encrypted2 = encryption_instance.encrypt(token2)

        assert encrypted1 != encrypted2

    def test_same_token_produces_different_ciphertexts(
        self, encryption_instance
    ):
        """Test that encrypting same token multiple times produces different ciphertexts (due to random IV)."""
        token = "same_token"

        encrypted1 = encryption_instance.encrypt(token)
        encrypted2 = encryption_instance.encrypt(token)

        assert encrypted1 != encrypted2

    def test_oauth_token_format(self, encryption_instance):
        """Test with realistic OAuth token format."""
        # GitHub-style OAuth token
        github_token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
        encrypted = encryption_instance.encrypt(github_token)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == github_token

    def test_bearer_token_format(self, encryption_instance):
        """Test with bearer token format."""
        bearer_token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"
        encrypted = encryption_instance.encrypt(bearer_token)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == bearer_token


class TestGlobalEncryption:
    """Test suite for global encryption instance."""

    def test_get_encryption_returns_instance(self, test_encryption_key, monkeypatch):
        """Test that get_encryption returns an instance."""
        monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", test_encryption_key)

        encryptor = get_encryption()
        assert isinstance(encryptor, TokenEncryption)

    def test_get_encryption_returns_same_instance(self, test_encryption_key, monkeypatch):
        """Test that get_encryption returns same instance on subsequent calls."""
        monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", test_encryption_key)

        encryptor1 = get_encryption()
        encryptor2 = get_encryption()

        assert encryptor1 is encryptor2

    def test_reset_encryption_creates_new_instance(self, test_encryption_key):
        """Test that reset_encryption creates new instance."""
        encryptor1 = get_encryption()
        reset_encryption(test_encryption_key)
        encryptor2 = get_encryption()

        assert encryptor1 is not encryptor2

    def test_reset_encryption_with_new_key(self, test_encryption_key):
        """Test that reset_encryption with new key works."""
        token = "test_token"

        # Encrypt with first instance
        encryptor1 = get_encryption()
        encrypted1 = encryptor1.encrypt(token)

        # Reset with new key
        new_key = generate_encryption_key()
        reset_encryption(new_key)

        # Try to decrypt with new instance (should fail)
        encryptor2 = get_encryption()
        with pytest.raises(TokenDecryptionError):
            encryptor2.decrypt(encrypted1)


class TestUtilityFunctions:
    """Test suite for utility functions."""

    def test_generate_encryption_key(self):
        """Test key generation produces valid key."""
        key = generate_encryption_key()

        assert isinstance(key, str)
        assert len(key) == 44  # Fernet keys are 44 bytes base64 encoded

        # Verify it's valid base64
        try:
            Fernet(key.encode())
        except Exception as e:
            pytest.fail(f"Generated key is not valid Fernet key: {e}")

    def test_generate_encryption_key_produces_unique_keys(self):
        """Test that key generation produces unique keys."""
        keys = [generate_encryption_key() for _ in range(10)]

        assert len(set(keys)) == 10  # All keys should be unique

    def test_derive_key_from_password(self):
        """Test password-based key derivation."""
        password = "my_secure_password"
        key, salt = derive_key_from_password(password)

        assert isinstance(key, str)
        assert isinstance(salt, bytes)
        assert len(salt) == 16  # Salt is 16 bytes

        # Verify key is valid Fernet key
        try:
            Fernet(key.encode())
        except Exception as e:
            pytest.fail(f"Derived key is not valid Fernet key: {e}")

    def test_derive_key_with_custom_salt(self):
        """Test password-based key derivation with custom salt."""
        password = "my_secure_password"
        custom_salt = b"custom_salt_1234"

        key1, salt1 = derive_key_from_password(password, custom_salt)
        key2, salt2 = derive_key_from_password(password, custom_salt)

        # Same password + same salt = same key
        assert key1 == key2
        assert salt1 == custom_salt
        assert salt2 == custom_salt

    def test_derive_key_different_passwords_different_keys(self):
        """Test that different passwords produce different keys."""
        salt = b"test_salt"

        key1, _ = derive_key_from_password("password1", salt)
        key2, _ = derive_key_from_password("password2", salt)

        assert key1 != key2

    def test_derive_key_with_custom_salt_generates_different_salt_if_not_provided(
        self
    ):
        """Test that random salt is generated when not provided."""
        password = "my_secure_password"

        _, salt1 = derive_key_from_password(password)
        _, salt2 = derive_key_from_password(password)

        # Different random salts should be generated
        assert salt1 != salt2
        assert len(salt1) == 16
        assert len(salt2) == 16

    def test_derived_key_can_encrypt_decrypt(self):
        """Test that derived key works for encryption/decryption."""
        password = "my_secure_password"
        key, salt = derive_key_from_password(password)

        encryptor = TokenEncryption(key)
        token = "test_token"

        encrypted = encryptor.encrypt(token)
        decrypted = encryptor.decrypt(encrypted)

        assert decrypted == token


class TestEdgeCases:
    """Test edge cases and error scenarios."""

    def test_encrypt_decrypt_binary_like_string(self, encryption_instance):
        """Test with string that looks like binary data."""
        binary_like = "\x00\x01\x02\x03\x04\x05"
        encrypted = encryption_instance.encrypt(binary_like)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == binary_like

    def test_encrypt_decrypt_newlines_and_tabs(self, encryption_instance):
        """Test with string containing newlines and tabs."""
        special_whitespace = "line1\nline2\ttabbed\n\nnewline"
        encrypted = encryption_instance.encrypt(special_whitespace)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == special_whitespace

    def test_very_long_unicode(self, encryption_instance):
        """Test with very long Unicode string."""
        long_unicode = "🌍 " * 1000  # 5000 characters
        encrypted = encryption_instance.encrypt(long_unicode)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == long_unicode

    def test_json_string(self, encryption_instance):
        """Test with JSON-formatted string."""
        json_str = '{"access_token":"abc123","refresh_token":"def456","expires_in":3600}'
        encrypted = encryption_instance.encrypt(json_str)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == json_str

    def test_url_encoded_string(self, encryption_instance):
        """Test with URL-encoded string."""
        url_encoded = "code=abc123&state=xyz789&redirect_uri=https%3A%2F%2Fexample.com"
        encrypted = encryption_instance.encrypt(url_encoded)
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == url_encoded


class TestErrorHandling:
    """Test comprehensive error handling."""

    def test_decrypt_with_modified_ciphertext(self, encryption_instance):
        """Test that modifying ciphertext causes decryption to fail."""
        token = "secret_token"
        encrypted = encryption_instance.encrypt(token)

        # Modify the ciphertext
        modified = encrypted[:-1] + "X" if encrypted else "X"

        with pytest.raises(TokenDecryptionError):
            encryption_instance.decrypt(modified)

    def test_decrypt_with_truncated_ciphertext(self, encryption_instance):
        """Test that truncating ciphertext causes decryption to fail."""
        token = "secret_token"
        encrypted = encryption_instance.encrypt(token)

        # Truncate the ciphertext
        truncated = encrypted[:10]

        with pytest.raises(TokenDecryptionError):
            encryption_instance.decrypt(truncated)

    def test_decrypt_with_empty_bytes_as_string(self, encryption_instance):
        """Test that empty string decrypts to empty string."""
        result = encryption_instance.decrypt("")
        assert result == ""

    def test_multiple_invalid_decryption_attempts(self, encryption_instance):
        """Test that multiple failed decryption attempts don't corrupt state."""
        valid_token = "valid_token"
        encrypted = encryption_instance.encrypt(valid_token)

        # Attempt several invalid decryptions
        for i in range(5):
            try:
                encryption_instance.decrypt(f"invalid_{i}")
            except TokenDecryptionError:
                pass

        # Verify that valid decryption still works
        decrypted = encryption_instance.decrypt(encrypted)
        assert decrypted == valid_token
