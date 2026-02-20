"""
GitHub API Client for OAuth-based API calls.

This module provides an async client for interacting with the GitHub API using OAuth tokens.
It includes error handling for rate limiting, token expiration, and network errors,
as well as retry logic with exponential backoff.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field

from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)


# =============================================================================
# Exceptions
# =============================================================================


class GitHubAPIError(Exception):
    """Base exception for GitHub API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class GitHubRateLimitError(GitHubAPIError):
    """Raised when GitHub API rate limit is exceeded."""

    def __init__(
        self,
        message: str = "GitHub API rate limit exceeded",
        reset_at: Optional[int] = None,
        retry_after: Optional[int] = None,
    ):
        super().__init__(message, status_code=403)
        self.reset_at = reset_at
        self.retry_after = retry_after


class GitHubAuthenticationError(GitHubAPIError):
    """Raised when authentication fails (invalid/expired token)."""

    def __init__(self, message: str = "GitHub authentication failed"):
        super().__init__(message, status_code=401)


class GitHubNetworkError(GitHubAPIError):
    """Raised when network-related errors occur."""

    def __init__(self, message: str = "Network error occurred"):
        super().__init__(message)


class GitHubNotFoundError(GitHubAPIError):
    """Raised when a resource is not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


# =============================================================================
# Response Models
# =============================================================================


class GitHubUser(BaseModel):
    """GitHub user information."""

    id: int
    login: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: str
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    blog: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    following: int = 0
    created_at: str
    updated_at: str
    type: str = "User"
    site_admin: bool = False
    hireable: Optional[bool] = None


class GitHubRepository(BaseModel):
    """GitHub repository information."""

    id: int
    node_id: Optional[str] = None
    name: str
    full_name: str
    owner: Dict[str, Any] = Field(default_factory=dict)
    private: bool = False
    description: Optional[str] = None
    fork: bool = False
    created_at: str
    updated_at: str
    pushed_at: str
    homepage: Optional[str] = None
    size: int = 0
    stargazers_count: int = 0
    watchers_count: int = 0
    language: Optional[str] = None
    forks_count: int = 0
    open_issues_count: int = 0
    default_branch: str = "main"
    topics: List[str] = Field(default_factory=list)
    archived: bool = False
    disabled: bool = False
    visibility: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = None
    license: Optional[Dict[str, Any]] = None


class GitHubTopic(BaseModel):
    """GitHub topic information."""

    name: str
    display_name: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    created_by: Optional[str] = None
    curated: bool = False
    featured: bool = False


# =============================================================================
# GitHub API Client
# =============================================================================


class GitHubAPIClient:
    """
    Async GitHub API client with OAuth token authentication.

    Provides methods for common GitHub API operations with built-in error handling,
    rate limit awareness, and retry logic with exponential backoff.
    """

    # GitHub API base URL
    BASE_URL = "https://api.github.com"

    # Maximum number of retry attempts
    MAX_RETRIES = 3

    # Base delay for exponential backoff (in seconds)
    BASE_RETRY_DELAY = 1.0

    def __init__(self, oauth_token: str, timeout: float = 30.0):
        """
        Initialize the GitHub API client.

        Args:
            oauth_token: OAuth token for GitHub API authentication
            timeout: Request timeout in seconds (default: 30.0)
        """
        self.oauth_token = oauth_token
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_client()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def _ensure_client(self) -> httpx.AsyncClient:
        """Ensure the HTTP client is initialized."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers=self._get_default_headers(),
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()

    def _get_default_headers(self) -> Dict[str, str]:
        """Get default headers for API requests."""
        return {
            "Authorization": f"Bearer {self.oauth_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ResumeAI-GitHubAPIClient/1.0",
        }

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        retry_count: int = 0,
    ) -> Dict[str, Any]:
        """
        Make an authenticated request to the GitHub API.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE, etc.)
            endpoint: API endpoint path (e.g., "/user")
            params: Query parameters
            json_data: JSON body for POST/PUT requests
            retry_count: Current retry attempt number

        Returns:
            Parsed JSON response data

        Raises:
            GitHubAPIError: For various API errors
            GitHubNetworkError: For network-related errors
        """
        client = await self._ensure_client()
        url = f"{self.BASE_URL}{endpoint}"

        try:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
            )

            # Check for rate limiting
            self._check_rate_limit(response)

            # Handle non-2xx responses
            if response.status_code >= 400:
                await self._handle_error_response(response)

            return response.json()

        except httpx.TimeoutException as e:
            logger.error(
                "github_timeout",
                method=method,
                endpoint=endpoint,
                timeout=self.timeout,
            )
            if retry_count < self.MAX_RETRIES:
                delay = self._calculate_retry_delay(retry_count)
                await asyncio.sleep(delay)
                return await self._make_request(method, endpoint, params, json_data, retry_count + 1)
            raise GitHubNetworkError(f"Request timeout: {str(e)}")

        except httpx.NetworkError as e:
            logger.error(
                "github_network_error",
                method=method,
                endpoint=endpoint,
                error=str(e),
            )
            if retry_count < self.MAX_RETRIES:
                delay = self._calculate_retry_delay(retry_count)
                await asyncio.sleep(delay)
                return await self._make_request(method, endpoint, params, json_data, retry_count + 1)
            raise GitHubNetworkError(f"Network error: {str(e)}")

        except httpx.HTTPStatusError as e:
            logger.error(
                "github_http_error",
                method=method,
                endpoint=endpoint,
                status_code=e.response.status_code,
                error=str(e),
            )
            if e.response.status_code in (429, 500, 502, 503, 504) and retry_count < self.MAX_RETRIES:
                delay = self._calculate_retry_delay(retry_count)
                await asyncio.sleep(delay)
                return await self._make_request(method, endpoint, params, json_data, retry_count + 1)
            raise GitHubAPIError(f"HTTP error: {str(e)}", status_code=e.response.status_code)

    def _check_rate_limit(self, response: httpx.Response):
        """
        Check if rate limit has been exceeded.

        Args:
            response: HTTP response object

        Raises:
            GitHubRateLimitError: If rate limit is exceeded
        """
        remaining = response.headers.get("X-RateLimit-Remaining")
        limit = response.headers.get("X-RateLimit-Limit")
        reset = response.headers.get("X-RateLimit-Reset")
        retry_after = response.headers.get("Retry-After")

        if remaining is not None and int(remaining) == 0:
            reset_time = int(reset) if reset else None
            retry_time = int(retry_after) if retry_after else None
            logger.warning(
                "github_rate_limit_exceeded",
                limit=limit,
                reset_at=reset_time,
                retry_after=retry_time,
            )
            raise GitHubRateLimitError(
                reset_at=reset_time,
                retry_after=retry_time,
            )

        # Log rate limit status for monitoring
        if remaining is not None and limit is not None:
            remaining_int = int(remaining)
            limit_int = int(limit)
            usage_percent = ((limit_int - remaining_int) / limit_int) * 100

            logger.info(
                "github_rate_limit_status",
                remaining=remaining,
                limit=limit,
                usage_percent=round(usage_percent, 2),
                endpoint=response.request.url.path,
            )

            # Warn if using more than 80% of rate limit
            if usage_percent > 80:
                logger.warning(
                    "github_rate_limit_warning",
                    usage_percent=round(usage_percent, 2),
                    remaining=remaining,
                )

    async def _handle_error_response(self, response: httpx.Response):
        """
        Handle error responses from GitHub API.

        Args:
            response: HTTP response object with error status

        Raises:
            GitHubAPIError: Appropriate error based on status code
        """
        status_code = response.status_code
        error_data: Optional[Dict] = None

        try:
            error_data = response.json()
            message = error_data.get("message", "Unknown error")
        except Exception:
            message = response.text or "Unknown error"

        logger.error(
            "github_api_error",
            status_code=status_code,
            message=message,
            endpoint=response.request.url.path,
        )

        if status_code == 401:
            raise GitHubAuthenticationError(f"Invalid or expired token: {message}")
        elif status_code == 403:
            raise GitHubRateLimitError(message)
        elif status_code == 404:
            raise GitHubNotFoundError(message)
        else:
            raise GitHubAPIError(message, status_code=status_code, response_data=error_data)

    def _calculate_retry_delay(self, retry_count: int) -> float:
        """
        Calculate exponential backoff delay for retries.

        Args:
            retry_count: Current retry attempt number

        Returns:
            Delay in seconds
        """
        return self.BASE_RETRY_DELAY * (2 ** retry_count)

    # =========================================================================
    # API Methods
    # =========================================================================

    async def get_user(self, username: Optional[str] = None) -> GitHubUser:
        """
        Get user information from GitHub.

        Args:
            username: GitHub username. If None, gets the authenticated user.

        Returns:
            GitHubUser object with user information

        Raises:
            GitHubNotFoundError: If user not found
            GitHubAuthenticationError: If authentication fails
            GitHubRateLimitError: If rate limit exceeded
            GitHubNetworkError: For network errors
        """
        endpoint = f"/user/{username}" if username else "/user"

        logger.info(
            "github_get_user",
            username=username or "authenticated_user",
        )

        data = await self._make_request("GET", endpoint)
        return GitHubUser(**data)

    async def list_repos(
        self,
        username: Optional[str] = None,
        type: str = "all",
        sort: str = "updated",
        direction: str = "desc",
        per_page: int = 30,
        page: int = 1,
    ) -> List[GitHubRepository]:
        """
        List repositories for a user.

        Args:
            username: GitHub username. If None, lists authenticated user's repos.
            type: Repository type (all, owner, member). Default: "all"
            sort: Sort field (created, updated, pushed, full_name). Default: "updated"
            direction: Sort direction (asc, desc). Default: "desc"
            per_page: Number of results per page (max 100). Default: 30
            page: Page number. Default: 1

        Returns:
            List of GitHubRepository objects

        Raises:
            GitHubNotFoundError: If user not found
            GitHubAuthenticationError: If authentication fails
            GitHubRateLimitError: If rate limit exceeded
            GitHubNetworkError: For network errors
        """
        endpoint = f"/user/{username}/repos" if username else "/user/repos"

        params = {
            "type": type,
            "sort": sort,
            "direction": direction,
            "per_page": min(per_page, 100),  # GitHub max is 100
            "page": page,
        }

        logger.info(
            "github_list_repos",
            username=username or "authenticated_user",
            type=type,
            per_page=per_page,
            page=page,
        )

        data = await self._make_request("GET", endpoint, params=params)
        return [GitHubRepository(**repo) for repo in data]

    async def get_repo_topics(
        self,
        owner: str,
        repo: str,
    ) -> List[str]:
        """
        Get topics for a repository.

        Args:
            owner: Repository owner username
            repo: Repository name

        Returns:
            List of topic names

        Raises:
            GitHubNotFoundError: If repository not found
            GitHubAuthenticationError: If authentication fails
            GitHubRateLimitError: If rate limit exceeded
            GitHubNetworkError: For network errors
        """
        endpoint = f"/repos/{owner}/{repo}/topics"

        logger.info(
            "github_get_repo_topics",
            owner=owner,
            repo=repo,
        )

        data = await self._make_request("GET", endpoint)
        return data.get("names", [])

    async def get_repo(
        self,
        owner: str,
        repo: str,
    ) -> GitHubRepository:
        """
        Get detailed repository information.

        Args:
            owner: Repository owner username
            repo: Repository name

        Returns:
            GitHubRepository object with detailed repository information

        Raises:
            GitHubNotFoundError: If repository not found
            GitHubAuthenticationError: If authentication fails
            GitHubRateLimitError: If rate limit exceeded
            GitHubNetworkError: For network errors
        """
        endpoint = f"/repos/{owner}/{repo}"

        logger.info(
            "github_get_repo",
            owner=owner,
            repo=repo,
        )

        data = await self._make_request("GET", endpoint)
        return GitHubRepository(**data)

    # =========================================================================
    # Additional Utility Methods
    # =========================================================================

    async def get_rate_limit_status(self) -> Dict[str, Any]:
        """
        Get current rate limit status.

        Returns:
            Dictionary with rate limit information for different resources

        Raises:
            GitHubNetworkError: For network errors
        """
        logger.info("github_get_rate_limit_status")

        data = await self._make_request("GET", "/rate_limit")
        return data
