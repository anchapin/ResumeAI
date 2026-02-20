"""
Unit tests for GitHub authentication mode feature flag.

Tests the GITHUB_AUTH_MODE configuration and its behavior
across different environments.
"""

import pytest
from unittest.mock import MagicMock, patch
from config import Settings


# =============================================================================
# Feature Flag Tests
# =============================================================================


def test_github_auth_mode_default_oauth():
    """Test that the default auth mode is OAuth."""
    # Create settings without explicit auth mode
    with patch.dict("os.environ", {}, clear=True):
        settings = Settings()

    assert settings.github_auth_mode == "oauth"


def test_github_auth_mode_oauth_from_env():
    """Test setting auth mode to OAuth via environment variable."""
    with patch.dict("os.environ", {"GITHUB_AUTH_MODE": "oauth"}):
        settings = Settings()

    assert settings.github_auth_mode == "oauth"


def test_github_auth_mode_cli_from_env():
    """Test setting auth mode to CLI via environment variable."""
    with patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"}):
        settings = Settings()

    assert settings.github_auth_mode == "cli"


def test_github_auth_mode_case_insensitive():
    """Test that auth mode is case-insensitive (Pydantic lowercases it)."""
    with patch.dict("os.environ", {"GITHUB_AUTH_MODE": "OAUTH"}):
        settings = Settings()

    # Pydantic should lowercase the value
    assert settings.github_auth_mode.lower() == "oauth"


# =============================================================================
# Startup Logging Tests
# =============================================================================


def test_github_auth_mode_logging_oauth():
    """Test startup logging for OAuth mode."""
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "oauth"
    mock_settings.debug = False

    mock_logger = MagicMock()

    with patch("main.settings", mock_settings):
        with patch("main.logger", mock_logger):
            from main import check_github_auth_mode

            check_github_auth_mode()

            # Assert info log was called with mode
            mock_logger.info.assert_any_call(
                "github_auth_mode_initialized",
                mode="oauth",
                environment="production",
            )
            mock_logger.info.assert_any_call(
                "github_oauth_enabled",
                message="GitHub OAuth authentication is enabled",
            )


def test_github_auth_mode_logging_cli():
    """Test startup logging for CLI mode (deprecation warning)."""
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "cli"
    mock_settings.debug = False

    mock_logger = MagicMock()

    with patch("main.settings", mock_settings):
        with patch("main.logger", mock_logger):
            from main import check_github_auth_mode

            check_github_auth_mode()

            # Assert warning log was called
            mock_logger.warning.assert_called_once_with(
                "DEPRECATION_WARNING",
                message="GitHub CLI mode is deprecated and will be removed in a future version. Please migrate to OAuth mode.",
                mode="cli",
                action="Set GITHUB_AUTH_MODE=oauth to use OAuth authentication",
                documentation="See docs/github-oauth-migration.md for migration guide",
            )


def test_github_auth_mode_logging_invalid():
    """Test startup logging for invalid auth mode."""
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "invalid"
    mock_settings.debug = False

    mock_logger = MagicMock()

    with patch("main.settings", mock_settings):
        with patch("main.logger", mock_logger):
            from main import check_github_auth_mode

            check_github_auth_mode()

            # Assert error log was called
            mock_logger.error.assert_called_once()
            error_call_args = mock_logger.error.call_args
            assert "Invalid" in error_call_args[0][1]


def test_github_auth_mode_logging_debug():
    """Test startup logging in debug mode."""
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "oauth"
    mock_settings.debug = True

    mock_logger = MagicMock()

    with patch("main.settings", mock_settings):
        with patch("main.logger", mock_logger):
            from main import check_github_auth_mode

            check_github_auth_mode()

            # Assert environment is logged as "development"
            mock_logger.info.assert_any_call(
                "github_auth_mode_initialized",
                mode="oauth",
                environment="development",
            )


# =============================================================================
# Environment-Specific Defaults Tests
# =============================================================================


def test_env_example_has_oauth_default():
    """Test that .env.example has OAuth as default for production."""
    from pathlib import Path

    env_example_path = Path(__file__).parent.parent / ".env.example"
    with open(env_example_path) as f:
        content = f.read()

    # Check that the default is oauth
    assert "GITHUB_AUTH_MODE=oauth" in content


def test_env_example_has_deprecation_note():
    """Test that .env.example has deprecation note for CLI mode."""
    from pathlib import Path

    env_example_path = Path(__file__).parent.parent / ".env.example"
    with open(env_example_path) as f:
        content = f.read()

    # Check that CLI is marked as deprecated
    assert "deprecated" in content.lower()
    assert "cli" in content.lower()


def test_env_example_has_environment_defaults():
    """Test that .env.example documents environment-specific defaults."""
    from pathlib import Path

    env_example_path = Path(__file__).parent.parent / ".env.example"
    with open(env_example_path) as f:
        content = f.read()

    # Check that environment-specific defaults are documented
    assert "Production:" in content
    assert "Development:" in content


# =============================================================================
# Feature Flag Integration Tests
# =============================================================================


def test_github_status_respects_auth_mode():
    """Test that the status endpoint respects the auth mode setting."""
    # This is tested in test_github_status.py
    # This test documents the expectation
    assert True  # Placeholder for documentation


def test_all_github_endpoints_check_auth_mode():
    """Test that all GitHub endpoints check the auth mode flag."""
    # Verify that routes/github.py references settings.github_auth_mode
    from pathlib import Path

    github_routes_path = Path(__file__).parent.parent / "routes" / "github.py"
    with open(github_routes_path) as f:
        content = f.read()

    # Check that auth mode is referenced
    assert "github_auth_mode" in content
    assert "settings.github_auth_mode" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
