"""
Unit tests for GitHub OAuth routes using TestClient.

Tests the DELETE /github/disconnect endpoint for disconnecting
GitHub accounts and revoking tokens, and GET /github/projects
endpoint for fetching user repositories.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from database import GitHubConnection

# Create test app with all necessary dependencies
from routes.github import router

app = FastAPI()
app.include_router(router)

# We need to mock the dependencies for testing
from fastapi.security import HTTPBearer

security = HTTPBearer()


@pytest.fixture
def mock_current_user():
    """Create a mock authenticated user."""
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    user.username = "testuser"
    user.full_name = "Test User"
    user.is_active = True
    user.is_superuser = False
    user.is_verified = True
    return user


@pytest.fixture
def mock_github_connection():
    """Create a mock GitHub connection."""
    connection = MagicMock(spec=GitHubConnection)
    connection.id = 1
    connection.user_id = 1
    connection.github_user_id = "123456"
    connection.github_username = "testuser"
    connection.access_token = "gho_test_token"
    connection.refresh_token = None
    connection.token_type = "bearer"
    connection.scope = "repo,read:org"
    connection.expires_at = None
    connection.created_at = datetime.now(timezone.utc)
    connection.updated_at = datetime.now(timezone.utc)
    connection.last_used_at = None
    connection.is_active = True
    return connection


# Tests for GET /github/projects endpoint
@pytest.mark.asyncio
async def test_get_github_projects_success(mock_current_user, mock_github_connection):
    """Test successfully fetching GitHub projects."""
    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    # The execute returns a Result object, which has scalar_one_or_none method
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_github_connection
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.commit = AsyncMock()

    # Create a simple class to mock GitHubRepository
    class MockGitHubRepository:
        def __init__(self):
            self.id = 123
            self.name = "test-repo"
            self.full_name = "testuser/test-repo"
            self.description = "A test repository"
            self.url = "https://github.com/testuser/test-repo"
            self.language = "Python"
            self.stars = 100
            self.forks = 25
            self.is_private = False
            self.updated_at = "2024-01-01T00:00:00Z"
            self.topics = ["python", "test"]

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            with patch("routes.github.GitHubAPIClient") as mock_client_class:
                # Create mock client instance
                mock_client = AsyncMock()
                mock_client.get_user_repositories = AsyncMock(return_value=[MockGitHubRepository()])
                mock_client_class.return_value = mock_client

                # Import the function after patching
                from routes.github import get_github_projects

                # Create mock request
                mock_request = MagicMock()

                # Call the function
                result = await get_github_projects(
                    mock_request,
                    mock_current_user,
                    mock_db,
                    sort="updated",
                    per_page=30,
                    page=1,
                    repo_type="all",
                )

                # Assert result
                assert result.count == 1
                assert result.username == "testuser"
                assert len(result.projects) == 1
                assert result.projects[0].name == "test-repo"
                assert result.projects[0].language == "Python"
                assert result.projects[0].stars == 100


@pytest.mark.asyncio
async def test_get_github_projects_no_connection(mock_current_user):
    """Test fetching projects when no GitHub connection exists."""
    # Create mock database session with no connection
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None  # No connection
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            from routes.github import get_github_projects

            # Create mock request
            mock_request = MagicMock()

            # Call the function and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request,
                    mock_current_user,
                    mock_db,
                    sort="updated",
                    per_page=30,
                    page=1,
                    repo_type="all",
                )

            # Assert it's an HTTPException with 403 status
            assert exc_info.value.status_code == 403
            assert "No GitHub connection found" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_github_projects_token_expired(mock_current_user, mock_github_connection):
    """Test fetching projects when token is expired."""
    # Set token as expired
    mock_github_connection.expires_at = datetime.now(timezone.utc) - timedelta(days=1)

    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_github_connection
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            from routes.github import get_github_projects

            # Create mock request
            mock_request = MagicMock()

            # Call the function and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request,
                    mock_current_user,
                    mock_db,
                    sort="updated",
                    per_page=30,
                    page=1,
                    repo_type="all",
                )

            # Assert it's an HTTPException with 403 status
            assert exc_info.value.status_code == 403
            assert "expired" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_get_github_projects_invalid_token(mock_current_user, mock_github_connection):
    """Test fetching projects when token is invalid (401 from GitHub)."""
    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_github_connection
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            with patch("routes.github.GitHubAPIClient") as mock_client_class:
                # Create mock client that raises ValueError for invalid token
                mock_client = AsyncMock()
                mock_client.get_user_repositories = AsyncMock(
                    side_effect=ValueError("Invalid or expired GitHub OAuth token")
                )
                mock_client_class.return_value = mock_client

                from routes.github import get_github_projects

                # Create mock request
                mock_request = MagicMock()

                # Call the function and expect HTTPException
                with pytest.raises(Exception) as exc_info:
                    await get_github_projects(
                        mock_request,
                        mock_current_user,
                        mock_db,
                        sort="updated",
                        per_page=30,
                        page=1,
                        repo_type="all",
                    )

                # Assert it's an HTTPException with 403 status
                assert exc_info.value.status_code == 403
                assert "token error" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_get_github_projects_rate_limited(mock_current_user, mock_github_connection):
    """Test fetching projects when GitHub API rate limit is exceeded."""
    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_github_connection
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            with patch("routes.github.GitHubAPIClient") as mock_client_class:
                # Create mock client that raises ValueError for rate limit
                mock_client = AsyncMock()
                mock_client.get_user_repositories = AsyncMock(
                    side_effect=ValueError("GitHub API rate limit exceeded")
                )
                mock_client_class.return_value = mock_client

                from routes.github import get_github_projects

                # Create mock request
                mock_request = MagicMock()

                # Call the function and expect HTTPException
                with pytest.raises(Exception) as exc_info:
                    await get_github_projects(
                        mock_request,
                        mock_current_user,
                        mock_db,
                        sort="updated",
                        per_page=30,
                        page=1,
                        repo_type="all",
                    )

                # Assert it's an HTTPException with 403 status
                assert exc_info.value.status_code == 403
                assert "rate limit" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_get_github_projects_invalid_sort_parameter(mock_current_user):
    """Test fetching projects with invalid sort parameter."""
    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            from routes.github import get_github_projects

            # Create mock request
            mock_request = MagicMock()

            # Call the function with invalid sort parameter and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request,
                    mock_current_user,
                    mock_db,
                    sort="invalid",
                    per_page=30,
                    page=1,
                    repo_type="all",
                )

            # Assert it's an HTTPException with 422 status
            assert exc_info.value.status_code == 422
            assert "Invalid sort value" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_github_projects_invalid_per_page(mock_current_user):
    """Test fetching projects with invalid per_page parameter."""
    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            from routes.github import get_github_projects

            # Create mock request
            mock_request = MagicMock()

            # Call the function with invalid per_page parameter and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request,
                    mock_current_user,
                    mock_db,
                    sort="updated",
                    per_page=200,
                    page=1,
                    repo_type="all",
                )

            # Assert it's an HTTPException with 422 status
            assert exc_info.value.status_code == 422
            assert "per_page must be between 1 and 100" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_github_projects_invalid_repo_type(mock_current_user):
    """Test fetching projects with invalid repo_type parameter."""
    # Create mock database session
    mock_db = AsyncMock(spec=AsyncSession)

    with patch("routes.github.get_current_user", return_value=mock_current_user):
        with patch("routes.github.get_async_session", return_value=mock_db):
            from routes.github import get_github_projects

            # Create mock request
            mock_request = MagicMock()

            # Call the function with invalid repo_type parameter and expect HTTPException
            with pytest.raises(Exception) as exc_info:
                await get_github_projects(
                    mock_request,
                    mock_current_user,
                    mock_db,
                    sort="updated",
                    per_page=30,
                    page=1,
                    repo_type="invalid",
                )

            # Assert it's an HTTPException with 422 status
            assert exc_info.value.status_code == 422
            assert "Invalid repo_type" in str(exc_info.value.detail)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
