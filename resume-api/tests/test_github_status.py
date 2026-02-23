"""
Unit tests for GitHub status endpoint.

Tests GET /github/status endpoint for checking GitHub connection
status in both OAuth and CLI modes.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from routes.github import router, get_github_status, _get_cli_status, _get_oauth_status
from database import GitHubConnection
from api.models import UserResponse, GitHubStatusResponse
from config import settings


# Create test app
app = FastAPI()
app.include_router(router)


@pytest.mark.asyncio
async def test_get_github_status_oauth_mode_connected():
    """Test GitHub status in OAuth mode when user is connected."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock connection
    mock_connection = MagicMock(spec=GitHubConnection)
    mock_connection.github_user_id = "123456"
    mock_connection.github_username = "testuser"
    mock_connection.created_at = datetime.now()
    mock_connection.is_active = True

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=mock_connection)
    mock_db.execute = MagicMock(return_value=mock_result)

    # Create mock request
    mock_request = MagicMock()

    # Mock settings to use OAuth mode
    with patch.object(settings, 'github_auth_mode', 'oauth'):
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                response = await get_github_status(mock_request, mock_user, mock_db)

                # Assert response structure
                assert isinstance(response, GitHubStatusResponse)
                assert response.authenticated is True
                assert response.mode == "oauth"
                assert response.username == "testuser"
                assert response.github_user_id == "123456"
                assert response.connected_at is not None
                assert response.error is None


@pytest.mark.asyncio
async def test_get_github_status_oauth_mode_not_connected():
    """Test GitHub status in OAuth mode when user is not connected."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session with no connection
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=None)
    mock_db.execute = MagicMock(return_value=mock_result)

    # Create mock request
    mock_request = MagicMock()

    # Mock settings to use OAuth mode
    with patch.object(settings, 'github_auth_mode', 'oauth'):
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                response = await get_github_status(mock_request, mock_user, mock_db)

                # Assert response structure
                assert isinstance(response, GitHubStatusResponse)
                assert response.authenticated is False
                assert response.mode == "oauth"
                assert response.username is None
                assert response.github_user_id is None
                assert response.connected_at is None
                assert response.error is not None


@pytest.mark.asyncio
async def test_get_github_status_cli_mode_authenticated():
    """Test GitHub status in CLI mode when CLI is authenticated."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session (not used in CLI mode)
    mock_db = AsyncMock(spec=AsyncSession)

    # Create mock request
    mock_request = MagicMock()

    # Mock CLI status check to return authenticated
    mock_cli_status = {
        "authenticated": True,
        "username": "cliuser",
        "error": None
    }

    # Mock settings to use CLI mode
    with patch.object(settings, 'github_auth_mode', 'cli'):
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                with patch("routes.github.check_gh_cli_status", return_value=mock_cli_status):
                    response = await get_github_status(mock_request, mock_user, mock_db)

                    # Assert response structure
                    assert isinstance(response, GitHubStatusResponse)
                    assert response.authenticated is True
                    assert response.mode == "cli"
                    assert response.username == "cliuser"
                    assert response.github_user_id is None  # CLI mode doesn't have GitHub user ID
                    assert response.connected_at is None  # CLI mode doesn't have connection time
                    assert response.error is None


@pytest.mark.asyncio
async def test_get_github_status_cli_mode_not_authenticated():
    """Test GitHub status in CLI mode when CLI is not authenticated."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session (not used in CLI mode)
    mock_db = AsyncMock(spec=AsyncSession)

    # Create mock request
    mock_request = MagicMock()

    # Mock CLI status check to return not authenticated
    mock_cli_status = {
        "authenticated": False,
        "username": None,
        "error": "GitHub CLI not authenticated"
    }

    # Mock settings to use CLI mode
    with patch.object(settings, 'github_auth_mode', 'cli'):
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                with patch("routes.github.check_gh_cli_status", return_value=mock_cli_status):
                    response = await get_github_status(mock_request, mock_user, mock_db)

                    # Assert response structure
                    assert isinstance(response, GitHubStatusResponse)
                    assert response.authenticated is False
                    assert response.mode == "cli"
                    assert response.username is None
                    assert response.github_user_id is None
                    assert response.connected_at is None
                    assert response.error == "GitHub CLI not authenticated"


@pytest.mark.asyncio
async def test_get_oauth_status_with_exception():
    """Test OAuth status check handles database exceptions."""
    # Create mock database session that raises exception
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = MagicMock(side_effect=Exception("Database error"))

    user_id = 1

    response = await _get_oauth_status(user_id, mock_db)

    # Assert error is handled gracefully
    assert isinstance(response, GitHubStatusResponse)
    assert response.authenticated is False
    assert response.mode == "oauth"
    assert response.username is None
    assert response.github_user_id is None
    assert response.connected_at is None
    assert "Failed to check OAuth status" in response.error


@pytest.mark.asyncio
async def test_get_cli_status_with_exception():
    """Test CLI status check handles exceptions."""
    # Mock check_gh_cli_status to raise exception
    with patch("routes.github.check_gh_cli_status", side_effect=Exception("CLI error")):
        response = await _get_cli_status()

        # Assert error is handled gracefully
        assert isinstance(response, GitHubStatusResponse)
        assert response.authenticated is False
        assert response.mode == "cli"
        assert response.username is None
        assert response.github_user_id is None
        assert response.connected_at is None
        assert "Failed to check CLI status" in response.error


def test_github_status_endpoint_exists():
    """Test that the status endpoint is registered."""
    routes = [route.path for route in router.routes]
    assert "/status" in routes
    assert "/disconnect" in routes


def test_github_router_prefix():
    """Test that GitHub router has correct prefix."""
    assert router.prefix == "/github"
    assert "GitHub" in router.tags


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
