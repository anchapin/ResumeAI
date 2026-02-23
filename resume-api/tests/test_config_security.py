"""
Tests for security-related configuration.
"""
import os
import pytest
from config import Settings


class TestConfigSecurity:
    """Tests for configuration security."""

    def test_insecure_default_jwt_secret_replaced(self, monkeypatch):
        """Test that the insecure default JWT secret is replaced with a secure random one."""
        # Ensure JWT_SECRET is not in environment
        monkeypatch.delenv("JWT_SECRET", raising=False)

        # Instantiate settings (disable .env loading to force default)
        settings = Settings(_env_file=None)

        # Verify it was replaced
        assert settings.jwt_secret != "your-secret-key-change-in-production"
        # secrets.token_urlsafe(32) produces ~43 characters
        assert len(settings.jwt_secret) >= 43

    def test_custom_jwt_secret_preserved(self, monkeypatch):
        """Test that a custom JWT secret provided via env var is preserved."""
        custom_secret = "my-custom-secure-secret-key-12345"
        monkeypatch.setenv("JWT_SECRET", custom_secret)

        settings = Settings(_env_file=None)

        assert settings.jwt_secret == custom_secret

    def test_random_secret_generation(self, monkeypatch):
        """Test that different instances get different secrets when using default."""
        monkeypatch.delenv("JWT_SECRET", raising=False)

        s1 = Settings(_env_file=None)
        s2 = Settings(_env_file=None)

        # Verify that each instance gets a unique random secret
        assert s1.jwt_secret != s2.jwt_secret
        assert s1.jwt_secret != "your-secret-key-change-in-production"
        assert s2.jwt_secret != "your-secret-key-change-in-production"
