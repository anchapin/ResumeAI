"""
Caching utilities for GitHub API responses.

Provides in-memory caching with TTL to minimize API calls.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, Optional


class GitHubCache:
    """In-memory cache for GitHub API responses with TTL support."""

    # Default TTL for repository list (5 minutes)
    DEFAULT_REPO_LIST_TTL = 300

    # Default TTL for individual repo details (15 minutes)
    DEFAULT_REPO_DETAIL_TTL = 900

    # Default TTL for README content (15 minutes)
    DEFAULT_README_TTL = 900

    def __init__(self):
        """Initialize the cache."""
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    def _get_key(self, prefix: str, identifier: str) -> str:
        """
        Generate a cache key.

        Args:
            prefix: Key prefix (e.g., "repos", "readme")
            identifier: Unique identifier for the cached item

        Returns:
            Cache key string
        """
        return f"github:{prefix}:{identifier}"

    def _get_lock(self, key: str) -> asyncio.Lock:
        """
        Get or create a lock for a cache key.

        Args:
            key: Cache key

        Returns:
            Asyncio lock for thread-safe operations
        """
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get value from cache if not expired.

        Args:
            key: Cache key

        Returns:
            Cached data or None if not found/expired
        """
        if key not in self._cache:
            return None

        entry = self._cache[key]
        expires_at = entry.get("expires_at")

        if expires_at and datetime.now() > expires_at:
            # Cache expired, remove it
            del self._cache[key]
            return None

        return entry.get("data")

    async def set(
        self,
        key: str,
        data: Dict[str, Any],
        ttl_seconds: int = DEFAULT_REPO_LIST_TTL,
    ) -> None:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            data: Data to cache
            ttl_seconds: Time-to-live in seconds
        """
        self._cache[key] = {
            "data": data,
            "expires_at": datetime.now() + timedelta(seconds=ttl_seconds),
            "created_at": datetime.now(),
        }

    async def invalidate(self, pattern: Optional[str] = None) -> None:
        """
        Invalidate cache entries matching a pattern.

        Args:
            pattern: Pattern to match (e.g., "github:repos:*").
                    If None, clears entire cache.
        """
        if pattern is None:
            self._cache.clear()
            self._locks.clear()
            return

        # Remove trailing wildcard for matching
        if pattern.endswith("*"):
            prefix = pattern[:-1]
            keys_to_delete = [key for key in self._cache.keys() if key.startswith(prefix)]
        else:
            keys_to_delete = [key for key in self._cache.keys() if key == pattern]

        for key in keys_to_delete:
            del self._cache[key]
            if key in self._locks:
                del self._locks[key]

    async def get_or_set(
        self,
        key: str,
        fetch_func,
        ttl_seconds: int = DEFAULT_REPO_LIST_TTL,
    ) -> Dict[str, Any]:
        """
        Get from cache or fetch and cache.

        Args:
            key: Cache key
            fetch_func: Async function to fetch data if not cached
            ttl_seconds: TTL for caching

        Returns:
            Cached or freshly fetched data
        """
        lock = self._get_lock(key)

        async with lock:
            # Try cache first
            cached = await self.get(key)
            if cached is not None:
                return cached

            # Fetch new data
            data = await fetch_func()

            # Cache the result
            await self.set(key, data, ttl_seconds)

            return data


# Global cache instance
github_cache = GitHubCache()


def cache_github_repos(ttl: int = GitHubCache.DEFAULT_REPO_LIST_TTL):
    """
    Decorator to cache repository list responses.

    Args:
        ttl: Cache TTL in seconds

    Returns:
        Decorator function
    """

    def decorator(func):
        async def wrapper(user_id: int, *args, **kwargs):
            # Build cache key
            params_str = "&".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
            key = f"github:repos:{user_id}:{params_str}"

            # Try cache first
            cached = await github_cache.get(key)
            if cached:
                return cached

            # Fetch fresh data
            result = await func(user_id, *args, **kwargs)

            # Cache the result
            await github_cache.set(key, result, ttl)

            return result

        return wrapper

    return decorator


def cache_github_repo_detail(ttl: int = GitHubCache.DEFAULT_REPO_DETAIL_TTL):
    """
    Decorator to cache individual repository details.

    Args:
        ttl: Cache TTL in seconds

    Returns:
        Decorator function
    """

    def decorator(func):
        async def wrapper(owner: str, repo: str, *args, **kwargs):
            key = f"github:repo:{owner}/{repo}"

            cached = await github_cache.get(key)
            if cached:
                return cached

            result = await func(owner, repo, *args, **kwargs)
            await github_cache.set(key, result, ttl)

            return result

        return wrapper

    return decorator


def cache_github_readme(ttl: int = GitHubCache.DEFAULT_README_TTL):
    """
    Decorator to cache README content.

    Args:
        ttl: Cache TTL in seconds

    Returns:
        Decorator function
    """

    def decorator(func):
        async def wrapper(owner: str, repo: str, *args, **kwargs):
            key = f"github:readme:{owner}/{repo}"

            cached = await github_cache.get(key)
            if cached:
                return cached

            result = await func(owner, repo, *args, **kwargs)
            await github_cache.set(key, result, ttl)

            return result

        return wrapper

    return decorator
