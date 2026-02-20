"""
Unit tests for GitHub API client.

Tests the GitHubAPIClient class for making authenticated requests to GitHub's REST API.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from datetime import datetime, timezone

from lib.github_client import GitHubAPIClient, GitHubRepository


@pytest.mark.asyncio
async def test_github_repository_from_api_response():
    """Test creating GitHubRepository from API response."""
    api_data = {
        "id": 123,
        "name": "test-repo",
        "full_name": "testuser/test-repo",
        "description": "A test repository",
        "html_url": "https://github.com/testuser/test-repo",
        "language": "Python",
        "stargazers_count": 100,
        "forks_count": 25,
        "private": False,
        "updated_at": "2024-01-01T00:00:00Z",
        "topics": ["python", "test"],
    }

    repo = GitHubRepository.from_api_response(api_data)

    assert repo.id == 123
    assert repo.name == "test-repo"
    assert repo.full_name == "testuser/test-repo"
    assert repo.description == "A test repository"
    assert repo.url == "https://github.com/testuser/test-repo"
    assert repo.language == "Python"
    assert repo.stars == 100
    assert repo.forks == 25
    assert repo.is_private is False
    assert repo.updated_at == "2024-01-01T00:00:00Z"
    assert repo.topics == ["python", "test"]


def test_github_repository_to_dict():
    """Test converting GitHubRepository to dictionary."""
    repo = GitHubRepository(
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

    result = repo.to_dict()

    assert result["id"] == 123
    assert result["name"] == "test-repo"
    assert result["full_name"] == "testuser/test-repo"
    assert result["description"] == "A test repository"
    assert result["url"] == "https://github.com/testuser/test-repo"
    assert result["language"] == "Python"
    assert result["stars"] == 100
    assert result["forks"] == 25
    assert result["private"] is False
    assert result["updated_at"] == "2024-01-01T00:00:00Z"
    assert result["topics"] == ["python", "test"]


@pytest.mark.asyncio
async def test_github_api_client_get_user_repositories():
    """Test fetching user repositories successfully."""
    mock_response_data = [
        {
            "id": 123,
            "name": "test-repo",
            "full_name": "testuser/test-repo",
            "description": "A test repository",
            "html_url": "https://github.com/testuser/test-repo",
            "language": "Python",
            "stargazers_count": 100,
            "forks_count": 25,
            "private": False,
            "updated_at": "2024-01-01T00:00:00Z",
            "topics": ["python", "test"],
        }
    ]

    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response
        mock_response = MagicMock()
        mock_response.json.return_value = mock_response_data

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.request.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Create client
        client = GitHubAPIClient(access_token="test_token")

        # Call method
        repos = await client.get_user_repositories()

        # Assert
        assert len(repos) == 1
        assert repos[0].name == "test-repo"
        assert repos[0].language == "Python"
        assert repos[0].stars == 100

        # Assert request was made correctly
        mock_client.request.assert_called_once()
        call_args = mock_client.request.call_args
        assert call_args[0][0] == "GET"
        assert "/user/repos" in call_args[0][1]
        assert call_args[1]["params"]["sort"] == "updated"
        assert call_args[1]["params"]["per_page"] == 30


@pytest.mark.asyncio
async def test_github_api_client_auth_failure():
    """Test handling of authentication failure (401)."""
    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response for 401
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Unauthorized", request=MagicMock(), response=mock_response
        )

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.request.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Create client
        client = GitHubAPIClient(access_token="invalid_token")

        # Call method and expect ValueError
        with pytest.raises(ValueError) as exc_info:
            await client.get_user_repositories()

        assert "Invalid or expired GitHub OAuth token" in str(exc_info.value)


@pytest.mark.asyncio
async def test_github_api_client_rate_limit():
    """Test handling of rate limit (403)."""
    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response for 403
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.text = "API rate limit exceeded"
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Rate limit", request=MagicMock(), response=mock_response
        )

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.request.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Create client
        client = GitHubAPIClient(access_token="test_token")

        # Call method and expect ValueError
        with pytest.raises(ValueError) as exc_info:
            await client.get_user_repositories()

        assert "GitHub API rate limit exceeded" in str(exc_info.value)


@pytest.mark.asyncio
async def test_github_api_client_request_error():
    """Test handling of network errors."""
    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock client that raises RequestError
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.request.side_effect = httpx.RequestError("Network error")
        mock_client_class.return_value = mock_client

        # Create client
        client = GitHubAPIClient(access_token="test_token")

        # Call method and expect RequestError
        with pytest.raises(httpx.RequestError) as exc_info:
            await client.get_user_repositories()

        assert "Network error" in str(exc_info.value)


@pytest.mark.asyncio
async def test_github_api_client_get_user_profile():
    """Test fetching user profile successfully."""
    mock_response_data = {
        "id": 123456,
        "login": "testuser",
        "name": "Test User",
        "email": "test@example.com",
    }

    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response
        mock_response = MagicMock()
        mock_response.json.return_value = mock_response_data

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.request.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Create client
        client = GitHubAPIClient(access_token="test_token")

        # Call method
        profile = await client.get_user_profile()

        # Assert
        assert profile["login"] == "testuser"
        assert profile["name"] == "Test User"
        assert profile["email"] == "test@example.com"

        # Assert request was made correctly
        mock_client.request.assert_called_once()
        call_args = mock_client.request.call_args
        assert call_args[0][0] == "GET"
        assert "/user" in call_args[0][1]


@pytest.mark.asyncio
async def test_github_api_client_test_connection_success():
    """Test connection testing with valid token."""
    mock_response_data = {
        "id": 123456,
        "login": "testuser",
    }

    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response
        mock_response = MagicMock()
        mock_response.json.return_value = mock_response_data

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.request.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Create client
        client = GitHubAPIClient(access_token="test_token")

        # Test connection
        result = await client.test_connection()

        # Assert
        assert result is True


@pytest.mark.asyncio
async def test_github_api_client_test_connection_failure():
    """Test connection testing with invalid token."""
    with patch("httpx.AsyncClient") as mock_client_class:
        # Create mock response for 401
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Unauthorized", request=MagicMock(), response=mock_response
        )

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.request.return_value = mock_response
        mock_client_class.return_value = mock_client

        # Create client
        client = GitHubAPIClient(access_token="invalid_token")

        # Test connection
        result = await client.test_connection()

        # Assert
        assert result is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
