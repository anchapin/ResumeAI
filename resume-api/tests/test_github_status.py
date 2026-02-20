"""
Unit and integration tests for GitHub status endpoint.

Tests the GET /github/status endpoint with:
- OAuth mode (database check)
- CLI mode (gh CLI check)
- Feature flag behavior
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession

from routes.github import router, get_github_status
from database import User, UserGitHubConnection
from api.models import GitHubStatusResponse

# Create test app
app = FastAPI()
app.include_router(router)


# =============================================================================
# OAuth Mode Tests
# =============================================================================


@pytest.mark.asyncio
async def test_github_status_oauth_connected():
    """Test GitHub status in OAuth mode when user is connected."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock connection
    mock_connection = MagicMock(spec=UserGitHubConnection)
    mock_connection.user_id = 1
    mock_connection.github_username = "testuser"
    mock_connection.is_active = True

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=mock_connection)
    mock_db.execute = AsyncMock(return_value=mock_result)

    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "oauth"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the function after patching
                from routes.github import get_github_status

                # Call function
                response = await get_github_status(mock_user)

                # Assert
                assert isinstance(response, GitHubStatusResponse)
                assert response.connection_status == "connected"
                assert response.auth_mode == "oauth"
                assert response.github_username == "testuser"
                assert response.message is None


@pytest.mark.asyncio
async def test_github_status_oauth_not_connected():
    """Test GitHub status in OAuth mode when user is not connected."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session with no connection
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=None)
    mock_db.execute = AsyncMock(return_value=mock_result)

    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "oauth"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the function after patching
                from routes.github import get_github_status

                # Call function
                response = await get_github_status(mock_user)

                # Assert
                assert isinstance(response, GitHubStatusResponse)
                assert response.connection_status == "not_connected"
                assert response.auth_mode == "oauth"
                assert response.github_username is None
                assert response.message is None


@pytest.mark.asyncio
async def test_github_status_oauth_no_auth():
    """Test GitHub status in OAuth mode when not authenticated."""
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "oauth"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.get_current_user", return_value=None):
            # Import the function after patching
            from routes.github import get_github_status

            # Call function
            response = await get_github_status(None)

            # Assert
            assert isinstance(response, GitHubStatusResponse)
            assert response.connection_status == "not_connected"
            assert response.auth_mode == "oauth"
            assert response.github_username is None
            assert "Authentication required" in (response.message or "")


# =============================================================================
# CLI Mode Tests (Deprecated)
# =============================================================================


@pytest.mark.asyncio
async def test_github_status_cli_connected():
    """Test GitHub status in CLI mode when gh CLI is authenticated."""
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "cli"

    # Mock subprocess run result
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "Logged in to github.com as testuser (key)\n"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.subprocess.run", return_value=mock_result):
            with patch("routes.github.get_current_user", return_value=None):
                # Import the function after patching
                from routes.github import get_github_status

                # Call function
                response = await get_github_status(None)

                # Assert
                assert isinstance(response, GitHubStatusResponse)
                assert response.connection_status == "connected"
                assert response.auth_mode == "cli"
                assert response.github_username == "testuser"
                assert response.message is None


@pytest.mark.asyncio
async def test_github_status_cli_not_authenticated():
    """Test GitHub status in CLI mode when gh CLI is not authenticated."""
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "cli"

    # Mock subprocess run result (not authenticated)
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stdout = "not logged in"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.subprocess.run", return_value=mock_result):
            with patch("routes.github.get_current_user", return_value=None):
                # Import the function after patching
                from routes.github import get_github_status

                # Call function
                response = await get_github_status(None)

                # Assert
                assert isinstance(response, GitHubStatusResponse)
                assert response.connection_status == "not_connected"
                assert response.auth_mode == "cli"
                assert response.github_username is None
                assert response.message is None


@pytest.mark.asyncio
async def test_github_status_cli_not_found():
    """Test GitHub status in CLI mode when gh CLI is not installed."""
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "cli"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.subprocess.run", side_effect=FileNotFoundError):
            with patch("routes.github.get_current_user", return_value=None):
                # Import the function after patching
                from routes.github import get_github_status

                # Call function
                response = await get_github_status(None)

                # Assert
                assert isinstance(response, GitHubStatusResponse)
                assert response.connection_status == "not_connected"
                assert response.auth_mode == "cli"
                assert response.github_username is None
                assert "not found" in (response.message or "")


@pytest.mark.asyncio
async def test_github_status_cli_timeout():
    """Test GitHub status in CLI mode when gh CLI check times out."""
    from subprocess import TimeoutExpired

    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "cli"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.subprocess.run", side_effect=TimeoutExpired("gh", 5)):
            with patch("routes.github.get_current_user", return_value=None):
                # Import the function after patching
                from routes.github import get_github_status

                # Call function
                response = await get_github_status(None)

                # Assert
                assert isinstance(response, GitHubStatusResponse)
                assert response.connection_status == "error"
                assert response.auth_mode == "cli"
                assert response.github_username is None
                assert "timed out" in (response.message or "")


# =============================================================================
# Error Handling Tests
# =============================================================================


@pytest.mark.asyncio
async def test_github_status_invalid_auth_mode():
    """Test GitHub status with invalid auth mode."""
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "invalid_mode"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.get_current_user", return_value=None):
            # Import the function after patching
            from routes.github import get_github_status

            # Call function
            response = await get_github_status(None)

            # Assert
            assert isinstance(response, GitHubStatusResponse)
            assert response.connection_status == "error"
            assert response.auth_mode == "invalid_mode"
            assert "Invalid" in (response.message or "")


@pytest.mark.asyncio
async def test_github_status_oauth_database_error():
    """Test GitHub status in OAuth mode with database error."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session that raises error
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock(side_effect=Exception("Database error"))

    # Mock settings
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "oauth"

    with patch("routes.github.settings", mock_settings):
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the function after patching
                from routes.github import get_github_status

                # Call function
                response = await get_github_status(mock_user)

                # Assert - should handle error gracefully
                assert isinstance(response, GitHubStatusResponse)
                assert response.connection_status == "error"
                assert response.auth_mode == "oauth"
                assert "error" in (response.message or "").lower()


# =============================================================================
# Integration Tests
# =============================================================================


@pytest.mark.asyncio
async def test_github_status_endpoint_oauth_mode():
    """Test the /github/status endpoint with OAuth mode via HTTP client."""
    from fastapi.testclient import TestClient

    # Create test app
    test_app = FastAPI()
    test_app.include_router(router)

    # Mock settings to use OAuth mode
    mock_settings = MagicMock()
    mock_settings.github_auth_mode = "oauth"

    with patch("routes.github.settings", mock_settings):
        client = TestClient(test_app)

        # Test without authentication
        response = client.get("/github/status")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["connection_status"] == "not_connected"
        assert data["auth_mode"] == "oauth"
        assert "github_username" in data


@pytest.mark.asyncio
async def test_github_status_response_model():
    """Test that the response model has correct structure."""
    response = GitHubStatusResponse(
        connection_status="connected",
        auth_mode="oauth",
        github_username="testuser",
        message=None,
    )

    assert response.connection_status == "connected"
    assert response.auth_mode == "oauth"
    assert response.github_username == "testuser"
    assert response.message is None

    # Test with message
    response_with_msg = GitHubStatusResponse(
        connection_status="error",
        auth_mode="oauth",
        github_username=None,
        message="Test error message",
    )

    assert response_with_msg.connection_status == "error"
    assert response_with_msg.message == "Test error message"


def test_github_status_endpoint_exists():
    """Test that the status endpoint is registered."""
    routes = [route.path for route in router.routes]
    assert "/github/status" in routes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
