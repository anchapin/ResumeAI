
import os
import secrets
from unittest import mock
import pytest
from pydantic import ValidationError

# We need to mock environment variables before importing settings
# But settings is instantiated at module level in config/__init__.py
# So we need to reload the module or patch the Settings class

from config import Settings

def test_secure_default_jwt_secret():
    """Test that a random secret is generated if no env var is present."""
    # Ensure no JWT_SECRET env var
    with mock.patch.dict(os.environ, {}, clear=True):
        # We need to re-instantiate Settings because it reads env at init
        settings = Settings()
        assert settings.jwt_secret is not None
        assert len(settings.jwt_secret) >= 32
        assert settings.jwt_secret != "your-secret-key-change-in-production"

def test_insecure_jwt_secret_replacement():
    """Test that the insecure default secret is replaced with a warning."""
    insecure_secret = "your-secret-key-change-in-production"
    with mock.patch.dict(os.environ, {"JWT_SECRET": insecure_secret}):
        # We need to catch the log warning too, but focusing on the value replacement first
        with mock.patch("config.logging.getLogger") as mock_logger:
            settings = Settings()

            # The validator should have replaced it
            assert settings.jwt_secret != insecure_secret
            assert len(settings.jwt_secret) >= 32

            # Verify critical log was called
            mock_logger.return_value.critical.assert_called()

def test_short_jwt_secret_warning():
    """Test that a short secret triggers a warning."""
    short_secret = "short_secret"
    with mock.patch.dict(os.environ, {"JWT_SECRET": short_secret}):
        with mock.patch("config.logging.getLogger") as mock_logger:
            settings = Settings()

            # Value should be accepted (we don't block it, just warn)
            assert settings.jwt_secret == short_secret

            # Verify warning log was called
            mock_logger.return_value.warning.assert_called()

def test_valid_custom_jwt_secret():
    """Test that a valid custom secret is accepted."""
    custom_secret = secrets.token_urlsafe(32)
    with mock.patch.dict(os.environ, {"JWT_SECRET": custom_secret}):
        settings = Settings()
        assert settings.jwt_secret == custom_secret
