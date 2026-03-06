"""
Redis and In-Memory Cache Manager

Provides flexible caching with support for both Redis and in-memory backends.
Implements cache invalidation strategies, TTL management, and cache warming.
"""

import asyncio
import hashlib
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, TypeVar
from collections import OrderedDict
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheBackend(str, Enum):
    """Available cache backends"""

    REDIS = "redis"
    MEMORY = "memory"


class InvalidationStrategy(str, Enum):
    """Cache invalidation strategies"""

    TTL = "ttl"  # Time-based expiration
    LRU = "lru"  # Least Recently Used
    FIFO = "fifo"  # First In First Out
    MANUAL = "manual"  # Manual invalidation only


@dataclass
class CacheConfig:
    """Cache configuration for a specific data type"""

    key_prefix: str
    ttl_seconds: int = 300  # 5 minutes default
    max_entries: int = 1000  # For in-memory cache
    strategy: InvalidationStrategy = InvalidationStrategy.TTL
    tags: Set[str] = None  # For grouped invalidation

    def __post_init__(self):
        if self.tags is None:
            self.tags = set()


@dataclass
class CacheEntry:
    """Internal cache entry structure"""

    key: str
    value: Any
    created_at: float
    ttl_seconds: int
    accessed_at: float
    hit_count: int = 0
    tags: Set[str] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = set()

    def is_expired(self) -> bool:
        """Check if cache entry has expired"""
        if self.ttl_seconds <= 0:
            return False
        elapsed = time.time() - self.created_at
        return elapsed > self.ttl_seconds

    def update_access(self):
        """Update access time and hit count"""
        self.accessed_at = time.time()
        self.hit_count += 1


class CacheBackendInterface(ABC):
    """Abstract base class for cache backends"""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        pass

    @abstractmethod
    async def set(
        self, key: str, value: Any, ttl_seconds: int, tags: Optional[Set[str]] = None
    ) -> bool:
        """Set value in cache"""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        pass

    @abstractmethod
    async def delete_by_tags(self, tags: Set[str]) -> int:
        """Delete all keys with given tags"""
        pass

    @abstractmethod
    async def clear(self) -> bool:
        """Clear entire cache"""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        pass

    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        pass


class InMemoryCache(CacheBackendInterface):
    """In-memory cache backend using OrderedDict for LRU"""

    def __init__(self, max_size: int = 10000):
        self.cache: Dict[str, CacheEntry] = OrderedDict()
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
        self.tag_index: Dict[str, Set[str]] = {}  # tag -> set of keys
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from in-memory cache"""
        async with self._lock:
            if key not in self.cache:
                self.misses += 1
                return None

            entry = self.cache[key]

            # Check expiration
            if entry.is_expired():
                del self.cache[key]
                self.misses += 1
                return None

            # Update access for LRU
            entry.update_access()
            self.cache.move_to_end(key)
            self.hits += 1

            return entry.value

    async def set(
        self, key: str, value: Any, ttl_seconds: int, tags: Optional[Set[str]] = None
    ) -> bool:
        """Set value in in-memory cache"""
        async with self._lock:
            # Evict LRU if needed
            while len(self.cache) >= self.max_size and len(self.cache) > 0:
                evicted_key, evicted_entry = self.cache.popitem(last=False)
                # Remove from tag index
                for tag in evicted_entry.tags:
                    if tag in self.tag_index:
                        self.tag_index[tag].discard(evicted_key)
                logger.debug(f"Evicted {evicted_key} from cache (LRU)")

            # Create entry
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=time.time(),
                ttl_seconds=ttl_seconds,
                accessed_at=time.time(),
                tags=tags or set(),
            )

            # Update tag index
            for tag in entry.tags:
                if tag not in self.tag_index:
                    self.tag_index[tag] = set()
                self.tag_index[tag].add(key)

            self.cache[key] = entry
            self.cache.move_to_end(key)  # Move to end (most recent)

            return True

    async def delete(self, key: str) -> bool:
        """Delete key from in-memory cache"""
        async with self._lock:
            if key in self.cache:
                entry = self.cache[key]
                # Remove from tag index
                for tag in entry.tags:
                    if tag in self.tag_index:
                        self.tag_index[tag].discard(key)
                del self.cache[key]
                return True
            return False

    async def delete_by_tags(self, tags: Set[str]) -> int:
        """Delete all keys with given tags"""
        async with self._lock:
            keys_to_delete = set()
            for tag in tags:
                if tag in self.tag_index:
                    keys_to_delete.update(self.tag_index[tag])

            count = 0
            for key in keys_to_delete:
                if key in self.cache:
                    entry = self.cache[key]
                    for tag in entry.tags:
                        if tag in self.tag_index:
                            self.tag_index[tag].discard(key)
                    del self.cache[key]
                    count += 1

            return count

    async def clear(self) -> bool:
        """Clear entire cache"""
        async with self._lock:
            self.cache.clear()
            self.tag_index.clear()
            self.hits = 0
            self.misses = 0
            return True

    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        async with self._lock:
            if key not in self.cache:
                return False

            entry = self.cache[key]
            if entry.is_expired():
                del self.cache[key]
                return False

            return True

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        async with self._lock:
            total = self.hits + self.misses
            hit_rate = (self.hits / total * 100) if total > 0 else 0

            return {
                "backend": "memory",
                "size": len(self.cache),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": hit_rate,
                "tags": len(self.tag_index),
            }


class RedisCache(CacheBackendInterface):
    """Redis cache backend"""

    def __init__(self, redis_client: Any):
        """
        Initialize Redis cache

        Args:
            redis_client: redis.asyncio client instance
        """
        self.redis = redis_client
        self.hits = 0
        self.misses = 0
        self.tag_index: Dict[str, Set[str]] = {}  # tag -> set of keys

    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis"""
        try:
            value = await self.redis.get(key)
            if value is None:
                self.misses += 1
                return None

            self.hits += 1
            # Try to deserialize JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value

        except Exception as e:
            logger.warning(f"Redis get error for {key}: {e}")
            self.misses += 1
            return None

    async def set(
        self, key: str, value: Any, ttl_seconds: int, tags: Optional[Set[str]] = None
    ) -> bool:
        """Set value in Redis"""
        try:
            # Serialize value
            try:
                serialized = json.dumps(value)
            except TypeError:
                serialized = str(value)

            # Set with TTL
            await self.redis.setex(key, ttl_seconds, serialized)

            # Track tags
            if tags:
                for tag in tags:
                    tag_key = f"tag:{tag}"
                    await self.redis.sadd(tag_key, key)
                    # Set expiry on tag key
                    await self.redis.expire(tag_key, max(ttl_seconds, 86400))

            return True

        except Exception as e:
            logger.warning(f"Redis set error for {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from Redis"""
        try:
            result = await self.redis.delete(key)
            return result > 0
        except Exception as e:
            logger.warning(f"Redis delete error for {key}: {e}")
            return False

    async def delete_by_tags(self, tags: Set[str]) -> int:
        """Delete all keys with given tags"""
        try:
            count = 0
            for tag in tags:
                tag_key = f"tag:{tag}"
                keys = await self.redis.smembers(tag_key)
                if keys:
                    count += await self.redis.delete(*keys)
                await self.redis.delete(tag_key)
            return count
        except Exception as e:
            logger.warning(f"Redis delete by tags error: {e}")
            return 0

    async def clear(self) -> bool:
        """Clear entire cache"""
        try:
            await self.redis.flushdb()
            return True
        except Exception as e:
            logger.warning(f"Redis clear error: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            result = await self.redis.exists(key)
            return result > 0
        except Exception as e:
            logger.warning(f"Redis exists error for {key}: {e}")
            return False

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics from Redis INFO"""
        try:
            info = await self.redis.info("stats")
            total = self.hits + self.misses
            hit_rate = (self.hits / total * 100) if total > 0 else 0

            return {
                "backend": "redis",
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": hit_rate,
                "memory_usage": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "evicted_keys": info.get("evicted_keys", 0),
            }
        except Exception as e:
            logger.warning(f"Redis stats error: {e}")
            return {"backend": "redis", "error": str(e)}


class CacheManager:
    """
    Main cache manager with support for multiple backends and configurations
    """

    def __init__(
        self,
        backend: CacheBackend = CacheBackend.MEMORY,
        redis_client: Optional[Any] = None,
        memory_max_size: int = 10000,
    ):
        """
        Initialize cache manager

        Args:
            backend: Cache backend to use (redis or memory)
            redis_client: Redis client instance (required if backend=REDIS)
            memory_max_size: Maximum size for in-memory cache
        """
        self.backend_type = backend

        if backend == CacheBackend.REDIS and redis_client is None:
            raise ValueError("redis_client is required for REDIS backend")

        if backend == CacheBackend.REDIS:
            self.backend = RedisCache(redis_client)
        else:
            self.backend = InMemoryCache(max_size=memory_max_size)

        self.configs: Dict[str, CacheConfig] = {}
        self._warmup_functions: List[Callable] = []

    def register_config(self, name: str, config: CacheConfig) -> None:
        """Register cache configuration for a data type"""
        self.configs[name] = config
        logger.info(f"Registered cache config '{name}': TTL={config.ttl_seconds}s")

    def register_warmup_function(self, func: Callable) -> None:
        """Register a function to warm up cache on startup"""
        self._warmup_functions.append(func)

    async def warmup(self) -> Dict[str, int]:
        """Warm up cache by executing all registered warmup functions"""
        results = {}
        for func in self._warmup_functions:
            try:
                result = await func() if asyncio.iscoroutinefunction(func) else func()
                name = func.__name__
                results[name] = result
                logger.info(f"Cache warmup '{name}': {result} entries")
            except Exception as e:
                logger.error(f"Cache warmup error in {func.__name__}: {e}")

        return results

    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """
        Generate cache key from prefix and arguments

        Args:
            prefix: Cache key prefix
            *args: Positional arguments to include in key
            **kwargs: Keyword arguments to include in key

        Returns:
            Generated cache key
        """
        key_parts = [prefix]

        # Add positional arguments
        for arg in args:
            if isinstance(arg, (str, int, float, bool)):
                key_parts.append(str(arg))
            else:
                key_parts.append(hashlib.md5(str(arg).encode()).hexdigest())

        # Add keyword arguments (sorted for consistency)
        if kwargs:
            kwargs_str = json.dumps(kwargs, sort_keys=True, default=str)
            key_parts.append(hashlib.md5(kwargs_str.encode()).hexdigest())

        return ":".join(key_parts)

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        value = await self.backend.get(key)
        if value is not None:
            logger.debug(f"Cache hit: {key}")
        else:
            logger.debug(f"Cache miss: {key}")
        return value

    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        config_name: Optional[str] = None,
        tags: Optional[Set[str]] = None,
    ) -> bool:
        """
        Set value in cache

        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: TTL in seconds (overrides config)
            config_name: Config name to use TTL from
            tags: Tags for grouped invalidation

        Returns:
            Success status
        """
        # Determine TTL
        if ttl_seconds is None:
            if config_name and config_name in self.configs:
                ttl_seconds = self.configs[config_name].ttl_seconds
            else:
                ttl_seconds = 300  # Default 5 minutes

        # Merge tags
        all_tags = tags or set()
        if config_name and config_name in self.configs:
            all_tags = all_tags.union(self.configs[config_name].tags)

        result = await self.backend.set(key, value, ttl_seconds, all_tags)
        logger.debug(f"Cache set: {key} (TTL={ttl_seconds}s)")
        return result

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        result = await self.backend.delete(key)
        logger.debug(f"Cache delete: {key}")
        return result

    async def delete_by_tags(self, tags: Set[str]) -> int:
        """Delete all keys with given tags"""
        count = await self.backend.delete_by_tags(tags)
        logger.debug(f"Cache invalidated {count} entries with tags: {tags}")
        return count

    async def clear(self) -> bool:
        """Clear entire cache"""
        result = await self.backend.clear()
        logger.info("Cache cleared")
        return result

    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        return await self.backend.exists(key)

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = await self.backend.get_stats()
        stats["registered_configs"] = len(self.configs)
        stats["warmup_functions"] = len(self._warmup_functions)
        return stats


# Global cache manager instance
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """Get global cache manager instance"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager(backend=CacheBackend.MEMORY)
    return _cache_manager


def set_cache_manager(manager: CacheManager) -> None:
    """Set global cache manager instance"""
    global _cache_manager
    _cache_manager = manager


async def initialize_cache(
    backend: CacheBackend = CacheBackend.MEMORY, redis_client: Optional[Any] = None
) -> CacheManager:
    """
    Initialize and set global cache manager

    Args:
        backend: Cache backend to use
        redis_client: Redis client (for Redis backend)

    Returns:
        Initialized cache manager
    """
    manager = CacheManager(backend=backend, redis_client=redis_client)
    set_cache_manager(manager)
    return manager


from functools import wraps


def cached(
    config_name: str,
    key_prefix: Optional[str] = None,
    ttl: Optional[int] = None,
    tags: Optional[Set[str]] = None,
):
    """
    FastAPI route decorator for caching

    Args:
        config_name: Name of the cache config to use
        key_prefix: Override default prefix
        ttl: Override default TTL
        tags: Additional tags for invalidation
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_mgr = get_cache_manager()
            # Find Response object in kwargs to set headers
            response = None
            filtered_kwargs = {}
            for k, v in kwargs.items():
                if isinstance(v, Response):
                    response = v
                elif not isinstance(v, Request) and not str(type(v)).endswith(
                    "AuthorizedAPIKey'>"
                ):
                    filtered_kwargs[k] = v

            # Generate cache key using only serializable kwargs
            prefix = key_prefix or (
                cache_mgr.configs[config_name].key_prefix
                if config_name in cache_mgr.configs
                else func.__name__
            )
            cache_key = cache_mgr.generate_key(prefix, *args, **filtered_kwargs)

            # Try to get from cache
            cached_value = await cache_mgr.get(cache_key)

            if cached_value is not None:
                if response:
                    response.headers["X-Cache"] = "HIT"
                    current_ttl = (
                        ttl or cache_mgr.configs[config_name].ttl_seconds
                        if config_name in cache_mgr.configs
                        else 300
                    )
                    response.headers["Cache-Control"] = (
                        f"public, max-age={str(current_ttl)}"
                    )
                return cached_value

            # Execute function
            result = await func(*args, **kwargs)
            if asyncio.iscoroutine(result):
                result = await result

            # Save to cache
            if result is not None:
                # Handle Pydantic models
                serializable_result = result
                if hasattr(result, "model_dump"):
                    serializable_result = result.model_dump()
                elif hasattr(result, "dict"):
                    serializable_result = result.dict()

                await cache_mgr.set(
                    cache_key,
                    serializable_result,
                    ttl_seconds=ttl,
                    config_name=config_name,
                    tags=tags,
                )
                if response:
                    response.headers["X-Cache"] = "MISS"

            return result

        return wrapper

    return decorator
