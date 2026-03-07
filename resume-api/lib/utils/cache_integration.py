"""
Cache Integration Module

Provides decorators and utilities for automatic caching of function results.
Supports both sync and async functions with customizable cache strategies.
"""

import asyncio
import functools
import logging
import time
from typing import Any, Callable, Dict, Optional, Set, TypeVar

from lib.utils.cache import get_cache_manager

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


class CacheMetrics:
    """Track cache performance metrics"""

    def __init__(self):
        self.hits: Dict[str, int] = {}
        self.misses: Dict[str, int] = {}
        self.execution_times: Dict[str, list] = {}
        self.lock = asyncio.Lock()

    async def record_hit(self, func_name: str, execution_time: float = 0):
        """Record cache hit"""
        async with self.lock:
            self.hits[func_name] = self.hits.get(func_name, 0) + 1
            if func_name not in self.execution_times:
                self.execution_times[func_name] = []
            self.execution_times[func_name].append(("cache", execution_time))

    async def record_miss(self, func_name: str, execution_time: float):
        """Record cache miss and execution time"""
        async with self.lock:
            self.misses[func_name] = self.misses.get(func_name, 0) + 1
            if func_name not in self.execution_times:
                self.execution_times[func_name] = []
            self.execution_times[func_name].append(("compute", execution_time))

    async def get_stats(self, func_name: str) -> Dict[str, Any]:
        """Get statistics for a function"""
        async with self.lock:
            hits = self.hits.get(func_name, 0)
            misses = self.misses.get(func_name, 0)
            total = hits + misses

            times = self.execution_times.get(func_name, [])
            cache_times = [t[1] for t in times if t[0] == "cache"]
            compute_times = [t[1] for t in times if t[0] == "compute"]

            return {
                "hits": hits,
                "misses": misses,
                "hit_rate": (hits / total * 100) if total > 0 else 0,
                "avg_cache_time": (sum(cache_times) / len(cache_times) if cache_times else 0),
                "avg_compute_time": (
                    sum(compute_times) / len(compute_times) if compute_times else 0
                ),
            }


# Global metrics instance
_metrics = CacheMetrics()


def get_cache_metrics() -> CacheMetrics:
    """Get global cache metrics instance"""
    return _metrics


class CacheKeyStrategy:
    """Strategy for generating cache keys"""

    @staticmethod
    def simple(prefix: str, *args, **kwargs) -> str:
        """Simple key strategy: prefix:arg1:arg2..."""
        cache_mgr = get_cache_manager()
        return cache_mgr.generate_key(prefix, *args, **kwargs)

    @staticmethod
    def by_user_id(prefix: str, user_id: int, *args, **kwargs) -> str:
        """Key strategy with user scoping"""
        cache_mgr = get_cache_manager()
        return cache_mgr.generate_key(f"{prefix}:user:{user_id}", *args, **kwargs)

    @staticmethod
    def by_request_id(prefix: str, request_id: str, *args, **kwargs) -> str:
        """Key strategy with request scoping"""
        cache_mgr = get_cache_manager()
        return cache_mgr.generate_key(f"{prefix}:request:{request_id}", *args, **kwargs)


def cached(
    ttl_seconds: int = 300,
    key_prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None,
    tags: Optional[Set[str]] = None,
    config_name: Optional[str] = None,
) -> Callable[[F], F]:
    """
    Decorator for caching function results

    Args:
        ttl_seconds: Time to live in seconds (default 5 min)
        key_prefix: Cache key prefix (defaults to function name)
        key_builder: Custom function to build cache key
        tags: Tags for cache invalidation
        config_name: Cache config name to use

    Example:
        @cached(ttl_seconds=600, key_prefix="user_profile")
        def get_user_profile(user_id: int) -> dict:
            return {"id": user_id, "name": "John"}
    """

    def decorator(func: F) -> F:
        prefix = key_prefix or f"{func.__module__}:{func.__name__}"

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            cache_mgr = get_cache_manager()

            # Generate cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = CacheKeyStrategy.simple(prefix, *args, **kwargs)

            # Try cache hit
            start_time = time.time()
            cached_value = await cache_mgr.get(cache_key)
            hit_time = time.time() - start_time

            if cached_value is not None:
                await _metrics.record_hit(func.__name__, hit_time)
                logger.debug(f"Cache hit for {func.__name__}: {cache_key}")
                return cached_value

            # Cache miss - execute function
            start_time = time.time()
            result = (
                await func(*args, **kwargs)
                if asyncio.iscoroutinefunction(func)
                else func(*args, **kwargs)
            )
            exec_time = time.time() - start_time
            await _metrics.record_miss(func.__name__, exec_time)

            # Store in cache
            await cache_mgr.set(
                cache_key,
                result,
                ttl_seconds=ttl_seconds,
                config_name=config_name,
                tags=tags,
            )

            logger.debug(f"Cache miss for {func.__name__}: {cache_key} (exec: {exec_time:.3f}s)")
            return result

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            cache_mgr = get_cache_manager()

            # Generate cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = CacheKeyStrategy.simple(prefix, *args, **kwargs)

            # Try cache hit (need to run async code)
            loop = asyncio.get_event_loop()

            start_time = time.time()
            cached_value = loop.run_until_complete(cache_mgr.get(cache_key))
            hit_time = time.time() - start_time

            if cached_value is not None:
                loop.run_until_complete(_metrics.record_hit(func.__name__, hit_time))
                logger.debug(f"Cache hit for {func.__name__}: {cache_key}")
                return cached_value

            # Cache miss - execute function
            start_time = time.time()
            result = func(*args, **kwargs)
            exec_time = time.time() - start_time
            loop.run_until_complete(_metrics.record_miss(func.__name__, exec_time))

            # Store in cache
            loop.run_until_complete(
                cache_mgr.set(
                    cache_key,
                    result,
                    ttl_seconds=ttl_seconds,
                    config_name=config_name,
                    tags=tags,
                )
            )

            logger.debug(f"Cache miss for {func.__name__}: {cache_key} (exec: {exec_time:.3f}s)")
            return result

        # Return appropriate wrapper
        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        else:
            return sync_wrapper  # type: ignore

    return decorator


def cache_async(
    ttl_seconds: int = 300,
    key_prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None,
    tags: Optional[Set[str]] = None,
    config_name: Optional[str] = None,
) -> Callable[[F], F]:
    """
    Decorator for caching async function results

    Args:
        ttl_seconds: Time to live in seconds (default 5 min)
        key_prefix: Cache key prefix (defaults to function name)
        key_builder: Custom function to build cache key
        tags: Tags for cache invalidation
        config_name: Cache config name to use

    Example:
        @cache_async(ttl_seconds=600, key_prefix="api_call")
        async def fetch_user_data(user_id: int) -> dict:
            return await api.get(f"/users/{user_id}")
    """
    return cached(
        ttl_seconds=ttl_seconds,
        key_prefix=key_prefix,
        key_builder=key_builder,
        tags=tags,
        config_name=config_name,
    )


class CacheInvalidationHook:
    """Hook for cache invalidation on data changes"""

    def __init__(self, tags: Set[str]):
        self.tags = tags

    async def invalidate(self) -> int:
        """Invalidate all cache entries with registered tags"""
        cache_mgr = get_cache_manager()
        count = await cache_mgr.delete_by_tags(self.tags)
        logger.info(f"Invalidated {count} cache entries with tags: {self.tags}")
        return count

    @staticmethod
    async def on_user_update(user_id: int) -> int:
        """Invalidate user-related cache"""
        hook = CacheInvalidationHook({"user", f"user:{user_id}"})
        return await hook.invalidate()

    @staticmethod
    async def on_resume_update(resume_id: int) -> int:
        """Invalidate resume-related cache"""
        hook = CacheInvalidationHook({"resume", f"resume:{resume_id}"})
        return await hook.invalidate()

    @staticmethod
    async def on_variant_update(variant_id: int) -> int:
        """Invalidate variant-related cache"""
        hook = CacheInvalidationHook({"variant", f"variant:{variant_id}"})
        return await hook.invalidate()


async def get_metrics_summary() -> Dict[str, Any]:
    """Get summary of all cache metrics"""
    cache_mgr = get_cache_manager()
    cache_stats = await cache_mgr.get_stats()

    func_stats = {}
    for func_name in set(list(_metrics.hits.keys()) + list(_metrics.misses.keys())):
        func_stats[func_name] = await _metrics.get_stats(func_name)

    return {
        "cache": cache_stats,
        "functions": func_stats,
        "total_hits": sum(_metrics.hits.values()),
        "total_misses": sum(_metrics.misses.values()),
    }
