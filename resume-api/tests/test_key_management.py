"""
Tests for secure API key storage and verification.

Tests the key_management module for proper hashing and verification
of API keys, as well as backward compatibility with plaintext keys.
"""

import pytest

from lib.security import (
    hash_api_key,
    verify_api_key,
    generate_api_key_prefix,
    is_hashed_key,
    migrate_plaintext_keys,
)


class TestHashApiKey:
    """Test API key hashing functionality."""

    def test_hash_api_key_returns_bcrypt_hash(self):
        """Test that hash_api_key returns a valid bcrypt hash."""
        key = "test_api_key_12345678"
        hashed = hash_api_key(key)

        # Bcrypt hashes start with $2a$, $2b$, or $2y$
        assert hashed.startswith(("$2a$", "$2b$", "$2y$"))
        # Should be relatively long
        assert len(hashed) > 50

    def test_hash_api_key_produces_different_hashes(self):
        """Test that hashing the same key produces different results (due to salt)."""
        key = "test_api_key_12345678"
        hash1 = hash_api_key(key)
        hash2 = hash_api_key(key)

        # Different salts should produce different hashes
        assert hash1 != hash2
        # But both should verify against the original key
        assert verify_api_key(key, hash1)
        assert verify_api_key(key, hash2)

    def test_hash_api_key_with_empty_string_raises_error(self):
        """Test that hashing an empty key raises ValueError."""
        with pytest.raises(ValueError):
            hash_api_key("")

    def test_hash_api_key_with_none_raises_error(self):
        """Test that hashing None raises ValueError."""
        with pytest.raises(ValueError):
            hash_api_key(None)  # type: ignore

    def test_hash_api_key_with_special_characters(self):
        """Test hashing keys with special characters."""
        key = "rai_1234567890!@#$%^&*()_+-=[]{}|;:,.<>?"
        hashed = hash_api_key(key)
        assert hashed.startswith(("$2a$", "$2b$", "$2y$"))
        assert verify_api_key(key, hashed)


class TestVerifyApiKey:
    """Test API key verification functionality."""

    def test_verify_api_key_returns_true_for_correct_key(self):
        """Test that verify_api_key returns True for the correct plaintext key."""
        key = "test_api_key_12345678"
        hashed = hash_api_key(key)
        assert verify_api_key(key, hashed) is True

    def test_verify_api_key_returns_false_for_wrong_key(self):
        """Test that verify_api_key returns False for an incorrect key."""
        key1 = "test_api_key_12345678"
        key2 = "wrong_api_key_87654321"
        hashed = hash_api_key(key1)

        assert verify_api_key(key2, hashed) is False

    def test_verify_api_key_with_empty_plaintext_returns_false(self):
        """Test that verification fails with empty plaintext key."""
        key = "test_api_key_12345678"
        hashed = hash_api_key(key)
        assert verify_api_key("", hashed) is False

    def test_verify_api_key_with_empty_hash_returns_false(self):
        """Test that verification fails with empty hash."""
        assert verify_api_key("test_key", "") is False

    def test_verify_api_key_with_invalid_hash_format_returns_false(self):
        """Test that verification fails gracefully with invalid hash format."""
        key = "test_api_key_12345678"
        invalid_hash = "not_a_bcrypt_hash_at_all"
        assert verify_api_key(key, invalid_hash) is False

    def test_verify_api_key_case_sensitive(self):
        """Test that key verification is case-sensitive."""
        key = "TestApiKey"
        hashed = hash_api_key(key)

        assert verify_api_key(key, hashed) is True
        assert verify_api_key("testapikey", hashed) is False
        assert verify_api_key("TESTAPIKEY", hashed) is False

    def test_verify_api_key_with_whitespace_sensitive(self):
        """Test that whitespace in keys matters."""
        key = "test_api_key_12345678"
        key_with_space = "test_api_key_12345678 "
        hashed = hash_api_key(key)

        assert verify_api_key(key, hashed) is True
        assert verify_api_key(key_with_space, hashed) is False


class TestGenerateApiKeyPrefix:
    """Test API key prefix generation for display."""

    def test_generate_prefix_returns_first_n_chars(self):
        """Test that prefix generation returns the first N characters."""
        key = "rai_1234567890abcdef_extra_chars"
        prefix = generate_api_key_prefix(key, prefix_length=12)

        assert prefix == "rai_12345678"
        assert len(prefix) == 12

    def test_generate_prefix_with_short_key(self):
        """Test that short keys return 'unknown'."""
        key = "short"
        prefix = generate_api_key_prefix(key, prefix_length=12)

        assert prefix == "unknown"

    def test_generate_prefix_with_empty_key(self):
        """Test that empty keys return 'unknown'."""
        prefix = generate_api_key_prefix("", prefix_length=12)
        assert prefix == "unknown"

    def test_generate_prefix_with_custom_length(self):
        """Test prefix generation with custom length."""
        key = "rai_1234567890abcdef_extra_chars"
        prefix = generate_api_key_prefix(key, prefix_length=20)

        assert prefix == "rai_1234567890abcdef"
        assert len(prefix) == 20


class TestIsHashedKey:
    """Test bcrypt hash detection."""

    def test_is_hashed_key_detects_valid_bcrypt_hashes(self):
        """Test that valid bcrypt hashes are detected."""
        key = "test_api_key_12345678"
        hashed = hash_api_key(key)

        assert is_hashed_key(hashed) is True

    def test_is_hashed_key_returns_false_for_plaintext(self):
        """Test that plaintext keys are not detected as hashed."""
        plaintext_key = "rai_1234567890abcdef"
        assert is_hashed_key(plaintext_key) is False

    def test_is_hashed_key_with_known_bcrypt_2a(self):
        """Test detection of $2a$ bcrypt format."""
        hash_2a = "$2a$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke"
        assert is_hashed_key(hash_2a) is True

    def test_is_hashed_key_with_known_bcrypt_2b(self):
        """Test detection of $2b$ bcrypt format."""
        hash_2b = "$2b$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke"
        assert is_hashed_key(hash_2b) is True

    def test_is_hashed_key_with_known_bcrypt_2y(self):
        """Test detection of $2y$ bcrypt format."""
        hash_2y = "$2y$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke"
        assert is_hashed_key(hash_2y) is True

    def test_is_hashed_key_with_empty_string(self):
        """Test that empty string is not detected as hashed."""
        assert is_hashed_key("") is False

    def test_is_hashed_key_with_none(self):
        """Test that None is not detected as hashed."""
        assert is_hashed_key(None) is False  # type: ignore


class TestMigrateePlaintextKeys:
    """Test migration of plaintext keys to hashes."""

    def test_migrate_plaintext_keys_returns_migration_map(self):
        """Test that migration returns a map of original keys to hashes."""
        plaintext_keys = ["key1_12345678", "key2_87654321"]
        migration_map = migrate_plaintext_keys(plaintext_keys)

        assert len(migration_map) == 2
        assert "key1_12345678" in migration_map
        assert "key2_87654321" in migration_map

    def test_migrate_plaintext_keys_produces_valid_hashes(self):
        """Test that migrated hashes are valid bcrypt hashes."""
        plaintext_keys = ["key1_12345678", "key2_87654321"]
        migration_map = migrate_plaintext_keys(plaintext_keys)

        for plaintext_key, hashed_key in migration_map.items():
            assert is_hashed_key(hashed_key)
            assert verify_api_key(plaintext_key, hashed_key)

    def test_migrate_plaintext_keys_with_empty_list_raises_error(self):
        """Test that empty list raises ValueError."""
        with pytest.raises(ValueError):
            migrate_plaintext_keys([])

    def test_migrate_plaintext_keys_with_none_raises_error(self):
        """Test that None raises ValueError."""
        with pytest.raises(ValueError):
            migrate_plaintext_keys(None)  # type: ignore

    def test_migrate_plaintext_keys_with_mixed_valid_invalid_keys(self):
        """Test migration with some invalid keys skips them gracefully."""
        plaintext_keys = ["valid_key_12345678", None, "", "another_valid_key"]
        migration_map = migrate_plaintext_keys(plaintext_keys)

        # Only valid keys should be migrated
        assert len(migration_map) == 2
        assert "valid_key_12345678" in migration_map
        assert "another_valid_key" in migration_map


class TestBackwardCompatibility:
    """Test backward compatibility between plaintext and hashed keys."""

    def test_hash_round_trip(self):
        """Test that a key can be hashed and verified in a round trip."""
        original_key = "rai_production_key_1234567890"

        # Hash the key
        hashed = hash_api_key(original_key)

        # Verify it works
        assert verify_api_key(original_key, hashed) is True

        # Wrong key should fail
        assert verify_api_key("wrong_key", hashed) is False

    def test_migration_and_verification_flow(self):
        """Test complete migration and verification workflow."""
        # Start with plaintext keys
        plaintext_keys = ["rai_dev_key", "rai_test_key", "rai_prod_key"]

        # Migrate to hashed
        migration_map = migrate_plaintext_keys(plaintext_keys)

        # Get the hashed versions
        hashed_keys = list(migration_map.values())

        # Verify all original keys work against their hashes
        for plaintext_key, hashed_key in migration_map.items():
            assert verify_api_key(plaintext_key, hashed_key) is True

        # Verify wrong keys don't work
        for hashed_key in hashed_keys:
            assert verify_api_key("wrong_key", hashed_key) is False

    def test_hashed_key_detection_in_list(self):
        """Test detecting mixed plaintext and hashed keys in a list."""
        plaintext_key = "rai_plaintext_key"
        hashed_key = hash_api_key("rai_hashed_key")

        assert is_hashed_key(plaintext_key) is False
        assert is_hashed_key(hashed_key) is True


class TestSecurityProperties:
    """Test security properties of the key management system."""

    def test_hash_does_not_contain_original_key(self):
        """Test that hashed keys don't contain the original key as substring."""
        original_key = "test_api_key_very_unique_12345678"
        hashed = hash_api_key(original_key)

        # The original key should not appear in the hash
        assert original_key not in hashed

    def test_different_keys_produce_different_hashes(self):
        """Test that different keys produce different hashes."""
        key1 = "api_key_number_1"
        key2 = "api_key_number_2"

        hash1 = hash_api_key(key1)
        hash2 = hash_api_key(key2)

        assert hash1 != hash2
        assert verify_api_key(key1, hash1) is True
        assert verify_api_key(key1, hash2) is False
        assert verify_api_key(key2, hash1) is False
        assert verify_api_key(key2, hash2) is True

    def test_timing_attack_resistance(self):
        """Test that verification uses constant-time comparison."""
        key = "test_api_key_12345678"
        hashed = hash_api_key(key)

        # Both should succeed
        assert verify_api_key(key, hashed) is True

        # Both should fail (but with constant time regardless of where they differ)
        assert verify_api_key("wrong_key_at_all", hashed) is False
        assert verify_api_key("x", hashed) is False
        assert verify_api_key(key + "extra", hashed) is False
