"""
Unit tests for GitHub OAuth routes.

Tests the DELETE /github/disconnect endpoint for disconnecting
GitHub accounts and revoking tokens, and GET /github/projects
endpoint for fetching user repositories.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from routes.github import (
    router,
    _revoke_github_token,
    GitHubProjectResponse,
    GitHubProjectsListResponse,
)
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
    # Routes include the full path with prefix
    assert "/github/disconnect" in routes
    assert "/github/projects" in routes


# Tests for GET /github/projects endpoint
@pytest.mark.asyncio
async def test_get_github_projects_success():
    """Test successfully fetching GitHub projects."""
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
    mock_connection.expires_at = None
    mock_connection.last_used_at = None

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock()
    mock_db.scalar_one_or_none = AsyncMock(return_value=mock_connection)
    mock_db.commit = AsyncMock()

    # Create mock request
    mock_request = MagicMock()

    # Mock GitHubAPIClient response
    mock_repositories = [
        MagicMock(
            id=123,
            name="test-repo",
            full_name="testuser/test-repo",
            description="A test repository",
            url="https://github.com/testuser/test-repo",
            language="Python",
            stars=100,
            forks=25,
            is_private=False,
            updated_at="2024-01-01T00:00:00Z",
            topics=["python", "test"],
        )
    ]

    with patch("routes.github.GitHubAPIClient") as mock_client_class:
        # Create mock client instance
        mock_client = AsyncMock()
        mock_client.get_user_repositories = AsyncMock(return_value=mock_repositories)
        mock_client_class.return_value = mock_client

        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the router function
                from routes.github import get_github_projects

                # Call the function
                result = await get_github_projects(
                    mock_request, mock_user, mock_db, sort="updated", per_page=30, page=1, repo_type="all"
                )

                # Assert result
                assert isinstance(result, GitHubProjectsListResponse)
                assert result.count == 1
                assert result.username == "testuser"
                assert len(result.projects) == 1
                assert result.projects[0].name == "test-repo"
                assert result.projects[0].language == "Python"
                assert result.projects[0].stars == 100

                # Assert GitHub API client was called with correct parameters
                mock_client.get_user_repositories.assert_called_once_with(
                    sort="updated", per_page=30, page=1, type="all"
                )

                # Assert last_used_at was updated
                assert mock_connection.last_used_at is not None
                mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_get_github_projects_no_connection():
    """Test fetching projects when no GitHub connection exists."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session with no connection
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock()
    mock_db.scalar_one_or_none = AsyncMock(return_value=None)  # No connection
    mock_db.commit = AsyncMock()

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github.get_current_user", return_value=mock_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            # Import the router function
            from routes.github import get_github_projects

            # Call the function and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request, mock_user, mock_db, sort="updated", per_page=30, page=1, repo_type="all"
                )

            # Assert it's an HTTPException with 403 status
            assert exc_info.value.status_code == 403
            assert "No GitHub connection found" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_github_projects_token_expired():
    """Test fetching projects when token is expired."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock connection with expired token
    mock_connection = MagicMock(spec=GitHubConnection)
    mock_connection.id = 1
    mock_connection.user_id = 1
    mock_connection.github_username = "testuser"
    mock_connection.access_token = "encrypted_token"
    mock_connection.expires_at = datetime.now(timezone.utc) - timedelta(days=1)  # Expired
    mock_connection.last_used_at = None

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock()
    mock_db.scalar_one_or_none = AsyncMock(return_value=mock_connection)
    mock_db.commit = AsyncMock()

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github.get_current_user", return_value=mock_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            # Import the router function
            from routes.github import get_github_projects

            # Call the function and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request, mock_user, mock_db, sort="updated", per_page=30, page=1, repo_type="all"
                )

            # Assert it's an HTTPException with 403 status
            assert exc_info.value.status_code == 403
            assert "expired" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_get_github_projects_invalid_token():
    """Test fetching projects when token is invalid (401 from GitHub)."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock connection
    mock_connection = MagicMock(spec=GitHubConnection)
    mock_connection.id = 1
    mock_connection.user_id = 1
    mock_connection.github_username = "testuser"
    mock_connection.access_token = "invalid_token"
    mock_connection.expires_at = None
    mock_connection.last_used_at = None

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock()
    mock_db.scalar_one_or_none = AsyncMock(return_value=mock_connection)
    mock_db.commit = AsyncMock()

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github.GitHubAPIClient") as mock_client_class:
        # Create mock client that raises ValueError for invalid token
        mock_client = AsyncMock()
        mock_client.get_user_repositories = AsyncMock(
            side_effect=ValueError("Invalid or expired GitHub OAuth token")
        )
        mock_client_class.return_value = mock_client

        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the router function
                from routes.github import get_github_projects

                # Call the function and expect HTTPException
                with pytest.raises(Exception) as exc_info:
                    await get_github_projects(
                        mock_request, mock_user, mock_db, sort="updated", per_page=30, page=1, repo_type="all"
                    )

                # Assert it's an HTTPException with 403 status
                assert exc_info.value.status_code == 403
                assert "token error" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_get_github_projects_rate_limited():
    """Test fetching projects when GitHub API rate limit is exceeded."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock connection
    mock_connection = MagicMock(spec=GitHubConnection)
    mock_connection.id = 1
    mock_connection.user_id = 1
    mock_connection.github_username = "testuser"
    mock_connection.access_token = "valid_token"
    mock_connection.expires_at = None
    mock_connection.last_used_at = None

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.execute = AsyncMock()
    mock_db.scalar_one_or_none = AsyncMock(return_value=mock_connection)
    mock_db.commit = AsyncMock()

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github.GitHubAPIClient") as mock_client_class:
        # Create mock client that raises ValueError for rate limit
        mock_client = AsyncMock()
        mock_client.get_user_repositories = AsyncMock(
            side_effect=ValueError("GitHub API rate limit exceeded")
        )
        mock_client_class.return_value = mock_client

        with patch("routes.github.get_current_user", return_value=mock_user):
            with patch("routes.github.get_async_session", return_value=mock_db):
                # Import the router function
                from routes.github import get_github_projects

                # Call the function and expect HTTPException
                with pytest.raises(Exception) as exc_info:
                    await get_github_projects(
                        mock_request, mock_user, mock_db, sort="updated", per_page=30, page=1, repo_type="all"
                    )

                # Assert it's an HTTPException with 403 status
                assert exc_info.value.status_code == 403
                assert "rate limit" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_get_github_projects_invalid_sort_parameter():
    """Test fetching projects with invalid sort parameter."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github.get_current_user", return_value=mock_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            # Import the router function
            from routes.github import get_github_projects

            # Call the function with invalid sort parameter and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request, mock_user, mock_db, sort="invalid", per_page=30, page=1, repo_type="all"
                )

            # Assert it's an HTTPException with 422 status
            assert exc_info.value.status_code == 422
            assert "Invalid sort value" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_github_projects_invalid_per_page():
    """Test fetching projects with invalid per_page parameter."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github.get_current_user", return_value=mock_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            # Import the router function
            from routes.github import get_github_projects

            # Call the function with invalid per_page parameter and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request, mock_user, mock_db, sort="updated", per_page=200, page=1, repo_type="all"
                )

            # Assert it's an HTTPException with 422 status
            assert exc_info.value.status_code == 422
            assert "per_page must be between 1 and 100" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_github_projects_invalid_repo_type():
    """Test fetching projects with invalid repo_type parameter."""
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)

    # Create mock request
    mock_request = MagicMock()

    with patch("routes.github.get_current_user", return_value=mock_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            # Import the router function
            from routes.github import get_github_projects

            # Call the function with invalid repo_type parameter and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request, mock_user, mock_db, sort="updated", per_page=30, page=1, repo_type="invalid"
                )

            # Assert it's an HTTPException with 422 status
            assert exc_info.value.status_code == 422
            assert "Invalid repo_type" in str(exc_info.value.detail)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
