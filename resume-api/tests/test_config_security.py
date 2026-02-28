import os
import secrets
from unittest import mock

# We need to mock environment variables before importing settings
# But settings is instantiated at module level in config/__init__.py
# So we need to reload the module or patch the Settings class

from config import Settings


def test_secure_default_jwt_secret():
    """Test that JWT_SECRET is required and fails fast in production."""
    # Ensure no JWT_SECRET env var and production mode
    with mock.patch.dict(os.environ, {}, clear=True):
        # Settings should raise ValidationError in production mode
        try:
            Settings()
            assert False, (
                "Expected ValidationError for missing JWT_SECRET in production"
            )
        except Exception as e:
            # Verify the error message mentions JWT_SECRET
            assert "JWT_SECRET" in str(e)
            assert "production" in str(e)


def test_insecure_jwt_secret_replacement():
    """Test that insecure default secret raises an error."""
    insecure_secret = "your-secret-key-change-in-production"
    with mock.patch.dict(os.environ, {"JWT_SECRET": insecure_secret}):
        # Should raise ValidationError for insecure defaults
        try:
            Settings()
            assert False, "Expected ValidationError for insecure JWT_SECRET"
        except Exception as e:
            # Verify the error message mentions security
            assert "SECURITY ERROR" in str(e)
            assert "insecure" in str(e)


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


def test_development_mode_missing_secret():
    """Test that development mode generates a temporary secret with warning."""
    # Ensure no JWT_SECRET env var but DEBUG=true
    with mock.patch.dict(os.environ, {"DEBUG": "true"}, clear=True):
        settings = Settings()
        assert settings.jwt_secret is not None
        assert len(settings.jwt_secret) >= 32
        # In dev mode, a temporary secret is generated (not empty)
