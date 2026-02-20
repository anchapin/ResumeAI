"""
Unit tests for GitHub API Client.

Tests cover:
- User retrieval
- Repository listing
- Repository topics retrieval
- Repository details retrieval
- Error handling (rate limiting, authentication, network errors)
- Retry logic with exponential backoff
- Rate limit header parsing
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx

# Add resume-api to python path
sys.path.insert(0, str(Path("resume-api").absolute()))

from lib.github_api_client import (
    GitHubAPIClient,
    GitHubAPIError,
    GitHubRateLimitError,
    GitHubAuthenticationError,
    GitHubNetworkError,
    GitHubNotFoundError,
    GitHubUser,
    GitHubRepository,
    GitHubTopic,
)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_oauth_token():
    """Fixture for OAuth token."""
    return "gho_test_token_1234567890abcdef"


@pytest.fixture
def github_client(mock_oauth_token):
    """Fixture for GitHub API client."""
    return GitHubAPIClient(oauth_token=mock_oauth_token)


@pytest.fixture
def mock_user_data():
    """Fixture for mock user data."""
    return {
        "id": 123456,
        "login": "testuser",
        "name": "Test User",
        "email": "test@example.com",
        "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4",
        "bio": "Test bio",
        "company": "Test Company",
        "location": "Test City",
        "blog": "https://example.com",
        "public_repos": 10,
        "followers": 100,
        "following": 50,
        "created_at": "2020-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "type": "User",
        "site_admin": False,
        "hireable": True,
    }


@pytest.fixture
def mock_repo_data():
    """Fixture for mock repository data."""
    return {
        "id": 123456789,
        "node_id": "R_kgDOG_123A",
        "name": "test-repo",
        "full_name": "testuser/test-repo",
        "owner": {
            "login": "testuser",
            "id": 123456,
            "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4",
        },
        "private": False,
        "description": "Test repository",
        "fork": False,
        "created_at": "2020-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "pushed_at": "2024-01-01T00:00:00Z",
        "homepage": "https://example.com",
        "size": 1000,
        "stargazers_count": 10,
        "watchers_count": 10,
        "language": "Python",
        "forks_count": 5,
        "open_issues_count": 2,
        "default_branch": "main",
        "topics": ["python", "test"],
        "archived": False,
        "disabled": False,
        "visibility": "public",
        "permissions": {"admin": True, "push": True, "pull": True},
        "license": {
            "key": "mit",
            "name": "MIT License",
            "spdx_id": "MIT",
            "url": "https://api.github.com/licenses/mit",
        },
    }


@pytest.fixture
def mock_repos_list():
    """Fixture for mock repositories list."""
    return [
        {
            "id": 123456789,
            "node_id": "R_kgDOG_123A",
            "name": "repo1",
            "full_name": "testuser/repo1",
            "owner": {"login": "testuser", "id": 123456},
            "private": False,
            "description": "First repo",
            "fork": False,
            "created_at": "2020-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "pushed_at": "2024-01-01T00:00:00Z",
            "size": 500,
            "stargazers_count": 5,
            "watchers_count": 5,
            "language": "Python",
            "forks_count": 2,
            "open_issues_count": 1,
            "default_branch": "main",
            "topics": ["python"],
            "archived": False,
            "disabled": False,
        },
        {
            "id": 987654321,
            "node_id": "R_kgDOG_456B",
            "name": "repo2",
            "full_name": "testuser/repo2",
            "owner": {"login": "testuser", "id": 123456},
            "private": False,
            "description": "Second repo",
            "fork": False,
            "created_at": "2020-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "pushed_at": "2024-01-01T00:00:00Z",
            "size": 750,
            "stargazers_count": 8,
            "watchers_count": 8,
            "language": "JavaScript",
            "forks_count": 3,
            "open_issues_count": 0,
            "default_branch": "main",
            "topics": ["javascript"],
            "archived": False,
            "disabled": False,
        },
    ]


# =============================================================================
# Tests for Initialization
# =============================================================================


def test_client_initialization(mock_oauth_token):
    """Test client initialization with OAuth token."""
    client = GitHubAPIClient(oauth_token=mock_oauth_token)
    assert client.oauth_token == mock_oauth_token
    assert client.timeout == 30.0
    assert client.MAX_RETRIES == 3
    assert client.BASE_RETRY_DELAY == 1.0


def test_client_initialization_custom_timeout(mock_oauth_token):
    """Test client initialization with custom timeout."""
    client = GitHubAPIClient(oauth_token=mock_oauth_token, timeout=60.0)
    assert client.timeout == 60.0


# =============================================================================
# Tests for Headers
# =============================================================================


def test_default_headers(github_client):
    """Test default headers are correctly set."""
    headers = github_client._get_default_headers()
    assert headers["Authorization"] == f"Bearer {github_client.oauth_token}"
    assert headers["Accept"] == "application/vnd.github.v3+json"
    assert "User-Agent" in headers


# =============================================================================
# Tests for Rate Limit Check
# =============================================================================


def test_rate_limit_not_exceeded(github_client):
    """Test rate limit check when not exceeded."""
    mock_response = MagicMock()
    mock_response.headers = {
        "X-RateLimit-Remaining": "100",
        "X-RateLimit-Limit": "5000",
        "X-RateLimit-Reset": "1234567890",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    # Should not raise exception
    github_client._check_rate_limit(mock_response)


def test_rate_limit_exceeded(github_client):
    """Test rate limit check when exceeded."""
    mock_response = MagicMock()
    mock_response.headers = {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Limit": "5000",
        "X-RateLimit-Reset": "1234567890",
        "Retry-After": "60",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with pytest.raises(GitHubRateLimitError) as exc_info:
        github_client._check_rate_limit(mock_response)

    assert exc_info.value.reset_at == 1234567890
    assert exc_info.value.retry_after == 60


def test_rate_limit_warning(github_client):
    """Test rate limit warning when usage > 80%."""
    mock_response = MagicMock()
    mock_response.headers = {
        "X-RateLimit-Remaining": "900",  # 82% used (4100/5000)
        "X-RateLimit-Limit": "5000",
        "X-RateLimit-Reset": "1234567890",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    # Should not raise exception but log warning
    github_client._check_rate_limit(mock_response)


# =============================================================================
# Tests for Retry Delay Calculation
# =============================================================================


@pytest.mark.parametrize(
    "retry_count,expected_delay",
    [
        (0, 1.0),
        (1, 2.0),
        (2, 4.0),
        (3, 8.0),
    ],
)
def test_retry_delay_calculation(github_client, retry_count, expected_delay):
    """Test exponential backoff delay calculation."""
    delay = github_client._calculate_retry_delay(retry_count)
    assert delay == expected_delay


# =============================================================================
# Tests for Error Handling
# =============================================================================


@pytest.mark.asyncio
async def test_401_authentication_error(github_client):
    """Test handling of 401 authentication error."""
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"message": "Bad credentials"}
    mock_response.text = "Bad credentials"
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with pytest.raises(GitHubAuthenticationError) as exc_info:
        await github_client._handle_error_response(mock_response)

    assert "Invalid or expired token" in str(exc_info.value)


@pytest.mark.asyncio
async def test_403_rate_limit_error(github_client):
    """Test handling of 403 rate limit error."""
    mock_response = MagicMock()
    mock_response.status_code = 403
    mock_response.json.return_value = {"message": "API rate limit exceeded"}
    mock_response.text = "API rate limit exceeded"
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with pytest.raises(GitHubRateLimitError):
        await github_client._handle_error_response(mock_response)


@pytest.mark.asyncio
async def test_404_not_found_error(github_client):
    """Test handling of 404 not found error."""
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.json.return_value = {"message": "Not Found"}
    mock_response.text = "Not Found"
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user/nonexistent"

    with pytest.raises(GitHubNotFoundError):
        await github_client._handle_error_response(mock_response)


@pytest.mark.asyncio
async def test_generic_api_error(github_client):
    """Test handling of generic API error."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.json.return_value = {"message": "Internal Server Error"}
    mock_response.text = "Internal Server Error"
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with pytest.raises(GitHubAPIError) as exc_info:
        await github_client._handle_error_response(mock_response)

    assert exc_info.value.status_code == 500


# =============================================================================
# Tests for get_user()
# =============================================================================


@pytest.mark.asyncio
async def test_get_authenticated_user(github_client, mock_user_data):
    """Test getting authenticated user."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_data
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        user = await github_client.get_user()

        assert isinstance(user, GitHubUser)
        assert user.login == "testuser"
        assert user.name == "Test User"
        assert user.email == "test@example.com"
        assert user.public_repos == 10


@pytest.mark.asyncio
async def test_get_user_by_username(github_client, mock_user_data):
    """Test getting user by username."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_data
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user/testuser"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        user = await github_client.get_user(username="testuser")

        assert isinstance(user, GitHubUser)
        assert user.login == "testuser"


@pytest.mark.asyncio
async def test_get_user_not_found(github_client):
    """Test getting non-existent user raises 404 error."""
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.json.return_value = {"message": "Not Found"}
    mock_response.text = "Not Found"
    mock_response.headers = {}
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user/nonexistent"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        with pytest.raises(GitHubNotFoundError):
            await github_client.get_user(username="nonexistent")


# =============================================================================
# Tests for list_repos()
# =============================================================================


@pytest.mark.asyncio
async def test_list_repos_authenticated_user(github_client, mock_repos_list):
    """Test listing authenticated user's repositories."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_repos_list
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user/repos"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        repos = await github_client.list_repos()

        assert len(repos) == 2
        assert all(isinstance(repo, GitHubRepository) for repo in repos)
        assert repos[0].name == "repo1"
        assert repos[1].name == "repo2"


@pytest.mark.asyncio
async def test_list_repos_by_username(github_client, mock_repos_list):
    """Test listing repositories for a specific user."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_repos_list
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user/testuser/repos"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        repos = await github_client.list_repos(username="testuser")

        assert len(repos) == 2
        assert repos[0].full_name == "testuser/repo1"


@pytest.mark.asyncio
async def test_list_repos_with_filters(github_client, mock_repos_list):
    """Test listing repositories with filters."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_repos_list
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user/repos"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        repos = await github_client.list_repos(
            type="owner",
            sort="created",
            direction="asc",
            per_page=10,
            page=1,
        )

        assert len(repos) == 2
        # Verify params were passed correctly
        call_kwargs = mock_client.request.call_args[1]
        assert call_kwargs["params"]["type"] == "owner"
        assert call_kwargs["params"]["sort"] == "created"
        assert call_kwargs["params"]["direction"] == "asc"
        assert call_kwargs["params"]["per_page"] == 10


@pytest.mark.asyncio
async def test_list_repos_per_page_limit(github_client, mock_repos_list):
    """Test that per_page is limited to max 100."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_repos_list
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user/repos"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        await github_client.list_repos(per_page=150)

        # Verify per_page was capped at 100
        call_kwargs = mock_client.request.call_args[1]
        assert call_kwargs["params"]["per_page"] == 100


# =============================================================================
# Tests for get_repo_topics()
# =============================================================================


@pytest.mark.asyncio
async def test_get_repo_topics(github_client):
    """Test getting repository topics."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"names": ["python", "api", "github"]}
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/repos/testuser/test-repo/topics"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        topics = await github_client.get_repo_topics("testuser", "test-repo")

        assert topics == ["python", "api", "github"]


@pytest.mark.asyncio
async def test_get_repo_topics_not_found(github_client):
    """Test getting topics for non-existent repository."""
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.json.return_value = {"message": "Not Found"}
    mock_response.text = "Not Found"
    mock_response.headers = {}
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/repos/nonexistent/repo/topics"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        with pytest.raises(GitHubNotFoundError):
            await github_client.get_repo_topics("nonexistent", "repo")


@pytest.mark.asyncio
async def test_get_repo_topics_empty(github_client):
    """Test getting topics when repository has no topics."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"names": []}
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/repos/testuser/test-repo/topics"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        topics = await github_client.get_repo_topics("testuser", "test-repo")

        assert topics == []


# =============================================================================
# Tests for get_repo()
# =============================================================================


@pytest.mark.asyncio
async def test_get_repo(github_client, mock_repo_data):
    """Test getting repository details."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_repo_data
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/repos/testuser/test-repo"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        repo = await github_client.get_repo("testuser", "test-repo")

        assert isinstance(repo, GitHubRepository)
        assert repo.name == "test-repo"
        assert repo.full_name == "testuser/test-repo"
        assert repo.language == "Python"
        assert repo.stargazers_count == 10
        assert "python" in repo.topics
        assert "test" in repo.topics


@pytest.mark.asyncio
async def test_get_repo_not_found(github_client):
    """Test getting non-existent repository."""
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.json.return_value = {"message": "Not Found"}
    mock_response.text = "Not Found"
    mock_response.headers = {}
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/repos/nonexistent/repo"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        with pytest.raises(GitHubNotFoundError):
            await github_client.get_repo("nonexistent", "repo")


# =============================================================================
# Tests for get_rate_limit_status()
# =============================================================================


@pytest.mark.asyncio
async def test_get_rate_limit_status(github_client):
    """Test getting rate limit status."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "resources": {
            "core": {
                "limit": 5000,
                "remaining": 4999,
                "reset": 1234567890,
                "used": 1,
            },
            "search": {
                "limit": 30,
                "remaining": 30,
                "reset": 1234567890,
                "used": 0,
            },
        }
    }
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/rate_limit"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        mock_ensure.return_value = mock_client

        status = await github_client.get_rate_limit_status()

        assert "resources" in status
        assert "core" in status["resources"]
        assert status["resources"]["core"]["limit"] == 5000
        assert status["resources"]["core"]["remaining"] == 4999


# =============================================================================
# Tests for Retry Logic
# =============================================================================


@pytest.mark.asyncio
async def test_retry_on_timeout(github_client, mock_user_data):
    """Test retry logic on timeout."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_data
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        # First call times out, second succeeds
        mock_client.request.side_effect = [
            httpx.TimeoutException("Timeout"),
            mock_response,
        ]
        mock_ensure.return_value = mock_client

        with patch("asyncio.sleep") as mock_sleep:
            user = await github_client.get_user()

            assert user.login == "testuser"
            assert mock_sleep.call_count == 1


@pytest.mark.asyncio
async def test_retry_on_network_error(github_client, mock_user_data):
    """Test retry logic on network error."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_data
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        # First call fails with network error, second succeeds
        mock_client.request.side_effect = [
            httpx.NetworkError("Connection error"),
            mock_response,
        ]
        mock_ensure.return_value = mock_client

        with patch("asyncio.sleep") as mock_sleep:
            user = await github_client.get_user()

            assert user.login == "testuser"
            assert mock_sleep.call_count == 1


@pytest.mark.asyncio
async def test_retry_on_server_error(github_client, mock_user_data):
    """Test retry logic on 5xx server errors."""
    error_response = MagicMock()
    error_response.status_code = 503
    error_response.headers = {}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_data
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"
    error_response.request = MagicMock()
    error_response.request.url = MagicMock()
    error_response.request.url.path = "/user"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        # First call returns 503, second succeeds
        mock_client.request.side_effect = [
            httpx.HTTPStatusError("Service Unavailable", request=MagicMock(), response=error_response),
            mock_response,
        ]
        mock_ensure.return_value = mock_client

        with patch("asyncio.sleep") as mock_sleep:
            user = await github_client.get_user()

            assert user.login == "testuser"
            assert mock_sleep.call_count == 1


@pytest.mark.asyncio
async def test_max_retries_exceeded(github_client):
    """Test that max retries are respected and error is raised."""
    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        # All calls time out
        mock_client.request.side_effect = httpx.TimeoutException("Timeout")
        mock_ensure.return_value = mock_client

        with patch("asyncio.sleep"):
            with pytest.raises(GitHubNetworkError) as exc_info:
                await github_client.get_user()

            assert "Request timeout" in str(exc_info.value)


@pytest.mark.asyncio
async def test_exponential_backoff(github_client, mock_user_data):
    """Test exponential backoff delay increases with each retry."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_data
    mock_response.headers = {
        "X-RateLimit-Remaining": "4999",
        "X-RateLimit-Limit": "5000",
    }
    mock_response.request = MagicMock()
    mock_response.request.url = MagicMock()
    mock_response.request.url.path = "/user"

    with patch.object(github_client, "_ensure_client") as mock_ensure:
        mock_client = AsyncMock()
        # Two timeouts, then success
        mock_client.request.side_effect = [
            httpx.TimeoutException("Timeout"),
            httpx.TimeoutException("Timeout"),
            mock_response,
        ]
        mock_ensure.return_value = mock_client

        with patch("asyncio.sleep") as mock_sleep:
            user = await github_client.get_user()

            assert user.login == "testuser"
            # Should have slept twice with increasing delays
            assert mock_sleep.call_count == 2
            # Check exponential backoff: 1st retry = 1s, 2nd retry = 2s
            mock_sleep.assert_any_call(1.0)
            mock_sleep.assert_any_call(2.0)


# =============================================================================
# Tests for Context Manager
# =============================================================================


@pytest.mark.asyncio
async def test_async_context_manager(github_client):
    """Test async context manager functionality."""
    # Create a fresh client for this test to avoid state issues
    client = GitHubAPIClient(oauth_token="test_token")

    async with client as ctx_client:
        assert ctx_client is client
        # Client should be initialized
        assert client._client is not None

    # After exit, client should be closed (or None if never fully initialized)
    # We can't assert aclose.called because we're not mocking the client anymore
    # Instead, verify the client behaves correctly after context exit
    assert client._client is None or client._client.is_closed


# =============================================================================
# Tests for Pydantic Models
# =============================================================================


def test_github_user_model(mock_user_data):
    """Test GitHubUser model validation."""
    user = GitHubUser(**mock_user_data)
    assert user.id == 123456
    assert user.login == "testuser"
    assert user.name == "Test User"
    assert user.email == "test@example.com"
    assert user.public_repos == 10
    assert user.followers == 100


def test_github_repository_model(mock_repo_data):
    """Test GitHubRepository model validation."""
    repo = GitHubRepository(**mock_repo_data)
    assert repo.id == 123456789
    assert repo.name == "test-repo"
    assert repo.full_name == "testuser/test-repo"
    assert repo.language == "Python"
    assert repo.stargazers_count == 10
    assert "python" in repo.topics


def test_github_topic_model():
    """Test GitHubTopic model validation."""
    topic = GitHubTopic(
        name="python",
        display_name="Python",
        short_description="Python programming language",
        description="Python programming language",
        created_by="github",
        curated=True,
        featured=True,
    )
    assert topic.name == "python"
    assert topic.display_name == "Python"
    assert topic.curated is True
