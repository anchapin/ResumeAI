"""
GitHub API client for fetching repositories and user data.

Provides a clean interface for interacting with GitHub's REST API,
handling authentication, pagination, and error cases.
"""

import httpx
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)


@dataclass
class GitHubRepository:
    """Represents a GitHub repository."""

    id: int
    name: str
    full_name: str
    description: Optional[str]
    url: str
    language: Optional[str]
    stars: int
    forks: int
    is_private: bool
    updated_at: str
    topics: List[str]

    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> "GitHubRepository":
        """Create a GitHubRepository from GitHub API response."""
        return cls(
            id=data["id"],
            name=data["name"],
            full_name=data["full_name"],
            description=data.get("description"),
            url=data["html_url"],
            language=data.get("language"),
            stars=data["stargazers_count"],
            forks=data["forks_count"],
            is_private=data["private"],
            updated_at=data["updated_at"],
            topics=data.get("topics", []),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": self.id,
            "name": self.name,
            "full_name": self.full_name,
            "description": self.description,
            "url": self.url,
            "language": self.language,
            "stars": self.stars,
            "forks": self.forks,
            "private": self.is_private,
            "updated_at": self.updated_at,
            "topics": self.topics,
        }


class GitHubAPIClient:
    """
    Client for interacting with GitHub's REST API.

    Handles authentication via OAuth tokens, pagination,
    and common error cases.
    """

    GITHUB_API_BASE_URL = "https://api.github.com"
    DEFAULT_TIMEOUT = 30.0

    def __init__(self, access_token: str, timeout: float = DEFAULT_TIMEOUT):
        """
        Initialize the GitHub API client.

        Args:
            access_token: GitHub OAuth access token
            timeout: Request timeout in seconds
        """
        self.access_token = access_token
        self.timeout = timeout

    async def _make_request(
        self, method: str, endpoint: str, params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make an authenticated request to GitHub API.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path (e.g., "/user/repos")
            params: Query parameters

        Returns:
            Parsed JSON response

        Raises:
            httpx.HTTPStatusError: If the request fails with a 4xx/5xx status
            httpx.RequestError: If the request fails due to network issues
        """
        url = f"{self.GITHUB_API_BASE_URL}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ResumeAI",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(method, url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()

    async def get_user_repositories(
        self,
        sort: str = "updated",
        per_page: int = 30,
        page: int = 1,
        type: str = "all",
    ) -> List[GitHubRepository]:
        """
        Get repositories for the authenticated user.

        Args:
            sort: Sort order (created, updated, pushed, full_name)
            per_page: Number of results per page (max 100)
            page: Page number
            type: Repository type (all, owner, member)

        Returns:
            List of GitHubRepository objects

        Raises:
            httpx.HTTPStatusError: If authentication fails or request errors
        """
        try:
            logger.info(
                "github_api_fetch_repos",
                sort=sort,
                per_page=per_page,
                page=page,
                type=type,
            )

            params = {
                "sort": sort,
                "per_page": min(per_page, 100),  # GitHub API limit
                "page": page,
                "type": type,
            }

            response_data = await self._make_request("GET", "/user/repos", params)

            repositories = [
                GitHubRepository.from_api_response(repo) for repo in response_data
            ]

            logger.info(
                "github_api_fetch_repos_success",
                count=len(repositories),
            )

            return repositories

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.error(
                    "github_api_auth_failed",
                    status_code=e.response.status_code,
                    error=e.response.text[:200],
                )
                raise ValueError("Invalid or expired GitHub OAuth token") from e
            elif e.response.status_code == 403:
                logger.error(
                    "github_api_rate_limited",
                    status_code=e.response.status_code,
                    error=e.response.text[:200],
                )
                raise ValueError("GitHub API rate limit exceeded") from e
            else:
                logger.error(
                    "github_api_error",
                    status_code=e.response.status_code,
                    error=e.response.text[:200],
                )
                raise
        except httpx.RequestError as e:
            logger.error("github_api_request_error", error=str(e))
            raise

    async def get_user_profile(self) -> Dict[str, Any]:
        """
        Get the authenticated user's profile information.

        Returns:
            User profile data from GitHub

        Raises:
            httpx.HTTPStatusError: If authentication fails or request errors
        """
        try:
            logger.info("github_api_fetch_user_profile")

            profile = await self._make_request("GET", "/user")

            logger.info(
                "github_api_fetch_user_profile_success",
                username=profile.get("login"),
            )

            return profile

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.error(
                    "github_api_auth_failed",
                    status_code=e.response.status_code,
                )
                raise ValueError("Invalid or expired GitHub OAuth token") from e
            else:
                logger.error(
                    "github_api_error",
                    status_code=e.response.status_code,
                )
                raise
        except httpx.RequestError as e:
            logger.error("github_api_request_error", error=str(e))
            raise

    async def test_connection(self) -> bool:
        """
        Test if the access token is valid.

        Returns:
            True if token is valid, False otherwise
        """
        try:
            await self.get_user_profile()
            return True
        except (ValueError, httpx.HTTPStatusError, httpx.RequestError):
            return False
