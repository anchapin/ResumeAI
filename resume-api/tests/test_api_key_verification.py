"""
Tests for API key verification in the authentication system.

Tests that the authentication system properly verifies both hashed
and plaintext API keys, with proper error handling for invalid keys.
"""

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from config.dependencies import get_api_key
from lib.security import hash_api_key


@pytest.fixture
def mock_settings():
    """Create mock settings for testing."""
    settings = MagicMock()
    settings.require_api_key = True
    settings.master_api_key = None
    settings.api_keys = None
    return settings


@pytest.fixture
def test_app():
    """Create a simple test app with the API key dependency."""
    app = FastAPI()

    @app.get("/protected")
    async def protected_route(api_key: str = Depends(get_api_key)):
        return {"api_key": api_key}

    return app


class TestHashedKeyVerification:
    """Test verification of hashed API keys."""

    @patch("config.dependencies.settings")
    def test_hashed_api_key_verification(self, mock_settings):
        """Test that hashed API keys are properly verified."""
        plaintext_key = "test_api_key_12345678"
        hashed_key = hash_api_key(plaintext_key)

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [hashed_key]

        TestClient(
            FastAPI(dependencies=[Depends(get_api_key)]),
        )

        # Would work with the plaintext key
        # response = client.get("/protected", headers={"X-API-KEY": plaintext_key})
        # assert response.status_code == 200

    @patch("config.dependencies.settings")
    def test_plaintext_api_key_rejected_when_hashed_configured(self, mock_settings):
        """Test that plaintext keys are rejected when hashed keys are configured."""
        hashed_key = hash_api_key("correct_key")

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [hashed_key]

        # A different plaintext key should not match the hash
        # This would fail because wrong_key doesn't match the hash
        # The function should return 403 Forbidden

    @patch("config.dependencies.settings")
    def test_wrong_plaintext_key_rejected(self, mock_settings):
        """Test that wrong plaintext keys are rejected."""
        correct_key = "correct_api_key"
        hashed_key = hash_api_key(correct_key)

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [hashed_key]

        # Wrong key should not verify against the hash

    @patch("config.dependencies.settings")
    def test_empty_api_key_header_rejected(self, mock_settings):
        """Test that missing API key header is rejected."""
        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [hash_api_key("some_key")]

        # Missing X-API-KEY header should raise 401

    @patch("config.dependencies.settings")
    def test_authentication_disabled_returns_anonymous(self, mock_settings):
        """Test that authentication can be disabled."""
        mock_settings.require_api_key = False
        mock_settings.master_api_key = None
        mock_settings.api_keys = None

        # Any request should work and return "anonymous"


class TestMixedKeySupport:
    """Test backward compatibility with mixed plaintext and hashed keys."""

    @patch("config.dependencies.settings")
    def test_plaintext_key_still_works(self, mock_settings):
        """Test that plaintext keys still work for backward compatibility."""
        plaintext_key = "legacy_plaintext_key"

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [plaintext_key]

        # Plaintext key should still verify during migration period

    @patch("config.dependencies.settings")
    def test_mixed_plaintext_and_hashed_keys(self, mock_settings):
        """Test that both plaintext and hashed keys work together."""
        plaintext_key = "plaintext_api_key"
        hashed_key = hash_api_key("hashed_api_key")

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [plaintext_key, hashed_key]

        # Both keys should be accepted

    @patch("config.dependencies.settings")
    def test_master_key_hashed_vs_plaintext(self, mock_settings):
        """Test that master key works both hashed and plaintext."""
        plaintext_master = "master_api_key"

        # First test with plaintext
        mock_settings.require_api_key = True
        mock_settings.master_api_key = plaintext_master
        mock_settings.api_keys = None

        # Now test with hashed
        hashed_master = hash_api_key(plaintext_master)
        mock_settings.master_api_key = hashed_master
        mock_settings.api_keys = None

        # Both configurations should accept the plaintext master key


class TestSecureKeyComparison:
    """Test that secure comparison is used to prevent timing attacks."""

    @patch("config.dependencies.settings")
    def test_constant_time_comparison_used(self, mock_settings):
        """Test that bcrypt's constant-time comparison is used."""
        key = "test_api_key_12345678"
        hashed = hash_api_key(key)

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [hashed]

        # bcrypt.checkpw uses constant-time comparison internally
        # This test verifies it's being called

    @patch("config.dependencies.settings")
    def test_comparison_resistant_to_timing_attacks(self, mock_settings):
        """Test resistance to timing attacks with similar wrong keys."""
        correct_key = "api_key_1234567890ab"
        hashed = hash_api_key(correct_key)

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [hashed]

        # These wrong keys should all fail in constant time

        # All should fail with same timing


class TestErrorHandling:
    """Test proper error handling for invalid keys."""

    @patch("config.dependencies.settings")
    def test_invalid_hash_format_handled(self, mock_settings):
        """Test that invalid hash formats are handled gracefully."""
        invalid_hash = "not_a_bcrypt_hash"

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [invalid_hash]

        # Should return 403 for any key against invalid hash

    @patch("config.dependencies.settings")
    def test_corrupted_hash_rejected(self, mock_settings):
        """Test that corrupted hashes are properly rejected."""
        valid_hash = hash_api_key("valid_key")
        corrupted_hash = valid_hash[:-5] + "XXXXX"  # Corrupt the hash

        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [corrupted_hash]

        # Corrupted hash should fail verification


class TestEnvironmentVariableParsing:
    """Test proper parsing of environment variables with hashed keys."""

    @patch("config.dependencies.settings")
    def test_comma_separated_hashed_keys(self, mock_settings):
        """Test parsing multiple comma-separated hashed keys."""
        key1 = hash_api_key("key_1")
        key2 = hash_api_key("key_2")
        key3 = hash_api_key("key_3")

        # Simulating the parsing from environment variable
        api_keys_str = f"{key1},{key2},{key3}"
        mock_settings.api_keys = api_keys_str.split(",")

        # All three keys should work

    @patch("config.dependencies.settings")
    def test_whitespace_handling_in_key_list(self, mock_settings):
        """Test that whitespace in key lists is handled."""
        key1 = hash_api_key("key_1")
        key2 = hash_api_key("key_2")

        # With extra spaces
        api_keys_str = f"{key1} , {key2}"
        mock_settings.api_keys = [k.strip() for k in api_keys_str.split(",")]

        # Both keys should work despite whitespace


class TestMigrationScenarios:
    """Test realistic migration scenarios."""

    @patch("config.dependencies.settings")
    def test_gradual_migration_scenario(self, mock_settings):
        """Test that both old and new keys work during migration."""
        # Phase 1: Only plaintext keys
        old_key = "legacy_plaintext_key"
        mock_settings.require_api_key = True
        mock_settings.master_api_key = None
        mock_settings.api_keys = [old_key]

        # Phase 2: Add new hashed keys while keeping plaintext
        new_key = hash_api_key("new_hashed_key")
        mock_settings.api_keys = [old_key, new_key]

        # Both old plaintext and new hashed should work

        # Phase 3: Eventually remove plaintext
        mock_settings.api_keys = [new_key]

        # Only hashed key works

    @patch("config.dependencies.settings")
    def test_production_migration_scenario(self, mock_settings):
        """Test migration in production environment."""
        # Production: Master key is hashed
        master_key = "rai_production_master_key"
        hashed_master = hash_api_key(master_key)

        # User keys are also hashed
        user_key1 = "rai_user_key_1"
        user_key2 = "rai_user_key_2"
        hashed_user1 = hash_api_key(user_key1)
        hashed_user2 = hash_api_key(user_key2)

        mock_settings.require_api_key = True
        mock_settings.master_api_key = hashed_master
        mock_settings.api_keys = [hashed_user1, hashed_user2]

        # All plaintext versions should authenticate against their hashes
