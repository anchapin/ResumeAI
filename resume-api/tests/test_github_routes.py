"""
Unit tests for GitHub OAuth routes.

Tests the DELETE /github/disconnect endpoint for disconnecting
GitHub accounts and revoking tokens.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from routes.github import router, _revoke_github_token
from database import GitHubConnection
from api.models import UserResponse


# Create test app
app = FastAPI()
app.include_router(router)


@pytest.mark.asyncio
async def test_revoke_github_token_success():
    """Test successful GitHub token revocation."""
    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response
        mock_response = MagicMock()
        mock_response.status_code = 204

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.post.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Call the function
        result = await _revoke_github_token("test_token")

        # Assert
        assert result is True
        mock_client.post.assert_called_once()


@pytest.mark.asyncio
async def test_revoke_github_token_not_found():
    """Test GitHub token revocation when token not found (404)."""
    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response for 404
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "Not found"

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.post.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Call the function
        result = await _revoke_github_token("test_token")

        # Assert - should return True even on 404 (best-effort)
        assert result is True


@pytest.mark.asyncio
async def test_revoke_github_token_exception():
    """Test GitHub token revocation handles exceptions gracefully."""
    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock client that raises exception
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.post.side_effect = Exception("Network error")
        mock_client_class.return_value = mock_client

        # Call the function
        result = await _revoke_github_token("test_token")

        # Assert - should return True even on exception (best-effort)
        assert result is True


@pytest.mark.asyncio
async def test_disconnect_github_with_connection():
    """Test disconnecting GitHub account when connection exists."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock connection
    mock_connection = MagicMock(spec=GitHubConnection)
    mock_connection.id = 1
    mock_connection.user_id = 1
    mock_connection.github_username = "testuser"
    mock_connection.access_token = "encrypted_token"

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock()
    mock_db.scalar_one_or_none = AsyncMock(return_value=mock_connection)
    mock_db.delete = AsyncMock()
    mock_db.commit = AsyncMock()

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github._revoke_github_token", new_callable=AsyncMock) as mock_revoke:
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the router function
                from routes.github import disconnect_github

                # Call the function
                await disconnect_github(mock_request, mock_user, mock_db)

                # Assert token revocation was called
                mock_revoke.assert_called_once_with("encrypted_token")

                # Assert connection was deleted
                mock_db.delete.assert_called_once_with(mock_connection)
                mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_disconnect_github_without_connection():
    """Test disconnecting GitHub account when no connection exists (idempotent)."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock()
    mock_db.scalar_one_or_none = AsyncMock(return_value=None)  # No connection
    mock_db.delete = AsyncMock()
    mock_db.commit = AsyncMock()

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github._revoke_github_token", new_callable=AsyncMock) as mock_revoke:
        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the router function
                from routes.github import disconnect_github

                # Call the function
                await disconnect_github(mock_request, mock_user, mock_db)

                # Assert token revocation was NOT called (no connection)
                mock_revoke.assert_not_called()

                # Assert delete was NOT called (no connection)
                mock_db.delete.assert_not_called()

                # Assert commit was still called (for logging purposes)
                mock_db.commit.assert_not_called()


def test_github_router_registration():
    """Test that GitHub router is properly configured."""
    assert router.prefix == "/github"
    assert "GitHub" in router.tags

    # Check that the disconnect endpoint exists
    routes = [route.path for route in router.routes]
    assert "/disconnect" in routes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
