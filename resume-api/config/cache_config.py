"""
Redis and Cache Configuration

Handles Redis connection pooling, cache settings per data type,
and fallback to in-memory cache on failures.
"""

import asyncio
import logging
import os
from typing import Any, Optional
from contextlib import asynccontextmanager

from lib.utils.cache import (
    CacheManager,
    CacheBackend,
    CacheConfig,
    get_cache_manager,
    set_cache_manager,
)

logger = logging.getLogger(__name__)


class RedisConnectionPool:
    """Manages Redis connection pooling and health checks"""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        max_connections: int = 10,
        socket_timeout: int = 5,
        socket_connect_timeout: int = 5,
        health_check_interval: int = 30,
    ):
        self.host = host
        self.port = port
        self.db = db
        self.max_connections = max_connections
        self.socket_timeout = socket_timeout
        self.socket_connect_timeout = socket_connect_timeout
        self.health_check_interval = health_check_interval

        self.redis_client: Optional[Any] = None
        self.is_available = False
        self._health_check_task: Optional[asyncio.Task] = None

    async def connect(self) -> bool:
        """
        Connect to Redis with fallback

        Returns:
            True if connected, False if using fallback
        """
        try:
            import aioredis
        except ImportError:
            logger.warning("aioredis not installed, using in-memory cache")
            return False

        try:
            # Create connection pool
            self.redis_client = await aioredis.create_redis_pool(
                f"redis://{self.host}:{self.port}/{self.db}",
                maxsize=self.max_connections,
                timeout=self.socket_timeout,
                encoding="utf-8",
            )

            # Verify connection
            await self.redis_client.ping()
            self.is_available = True
            logger.info(f"Connected to Redis at {self.host}:{self.port}")

            # Start health check
            self._health_check_task = asyncio.create_task(self._health_check_loop())

            return True

        except ImportError:
            logger.warning("aioredis not installed, using in-memory cache")
            return False
        except Exception as e:
            logger.warning(
                f"Failed to connect to Redis at {self.host}:{self.port}: {e}. "
                "Falling back to in-memory cache."
            )
            self.is_available = False
            return False

    async def _health_check_loop(self):
        """Periodically check Redis health"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)

                if self.redis_client:
                    await self.redis_client.ping()
                    if not self.is_available:
                        self.is_available = True
                        logger.info("Redis connection restored")

            except Exception as e:
                if self.is_available:
                    self.is_available = False
                    logger.warning(f"Redis health check failed: {e}")

    async def disconnect(self):
        """Disconnect from Redis"""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass

        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()
            logger.info("Disconnected from Redis")

    @asynccontextmanager
    async def get_client(self):
        """Get Redis client with fallback"""
        if self.is_available and self.redis_client:
            yield self.redis_client
        else:
            yield None


class CacheTTLConfig:
    """Cache TTL settings for different data types"""

    # Resume-related cache
    RESUME_VARIANT = 300  # 5 minutes
    RESUME_PROFILE = 900  # 15 minutes
    RESUME_TEMPLATE = 3600  # 1 hour (templates change less frequently)

    # Tailoring cache
    TAILORING_RESULT = 600  # 10 minutes
    JD_ANALYSIS = 1800  # 30 minutes

    # User-related cache
    USER_PROFILE = 1800  # 30 minutes
    USER_SETTINGS = 3600  # 1 hour
    API_KEY = 3600  # 1 hour

    # Third-party integrations
    LINKEDIN_PROFILE = 3600  # 1 hour
    GITHUB_DATA = 3600  # 1 hour
    SALARY_DATA = 86400  # 24 hours (rarely changes)

    # AI API responses
    AI_RESPONSE = 600  # 10 minutes

    # General
    DEFAULT = 300  # 5 minutes


def get_cache_configs() -> dict:
    """Get all cache configurations for data types"""
    return {
        # Resume variants
        "resume:variants": CacheConfig(
            key_prefix="resume:variants",
            ttl_seconds=CacheTTLConfig.RESUME_VARIANT,
            tags={"resume", "variants"},
        ),
        # Resume profiles
        "resume:profile": CacheConfig(
            key_prefix="resume:profile",
            ttl_seconds=CacheTTLConfig.RESUME_PROFILE,
            tags={"resume", "profile"},
        ),
        # Resume templates
        "resume:template": CacheConfig(
            key_prefix="resume:template",
            ttl_seconds=CacheTTLConfig.RESUME_TEMPLATE,
            tags={"resume", "template"},
        ),
        # Tailoring results
        "tailoring:result": CacheConfig(
            key_prefix="tailoring:result",
            ttl_seconds=CacheTTLConfig.TAILORING_RESULT,
            tags={"tailoring", "resume"},
        ),
        # Job description analysis
        "jd:analysis": CacheConfig(
            key_prefix="jd:analysis",
            ttl_seconds=CacheTTLConfig.JD_ANALYSIS,
            tags={"jd", "analysis"},
        ),
        # User profiles
        "user:profile": CacheConfig(
            key_prefix="user:profile",
            ttl_seconds=CacheTTLConfig.USER_PROFILE,
            tags={"user", "profile"},
        ),
        # User settings
        "user:settings": CacheConfig(
            key_prefix="user:settings",
            ttl_seconds=CacheTTLConfig.USER_SETTINGS,
            tags={"user", "settings"},
        ),
        # API keys
        "api:key": CacheConfig(
            key_prefix="api:key",
            ttl_seconds=CacheTTLConfig.API_KEY,
            tags={"api", "auth"},
        ),
        # LinkedIn profiles
        "linkedin:profile": CacheConfig(
            key_prefix="linkedin:profile",
            ttl_seconds=CacheTTLConfig.LINKEDIN_PROFILE,
            tags={"linkedin", "external"},
        ),
        # GitHub data
        "github:data": CacheConfig(
            key_prefix="github:data",
            ttl_seconds=CacheTTLConfig.GITHUB_DATA,
            tags={"github", "external"},
        ),
        # Salary data
        "salary:data": CacheConfig(
            key_prefix="salary:data",
            ttl_seconds=CacheTTLConfig.SALARY_DATA,
            tags={"salary", "external"},
        ),
        # AI responses
        "ai:response": CacheConfig(
            key_prefix="ai:response",
            ttl_seconds=CacheTTLConfig.AI_RESPONSE,
            tags={"ai", "generation"},
        ),
    }


async def initialize_cache(
    redis_host: Optional[str] = None,
    redis_port: Optional[int] = None,
    force_memory: bool = False,
) -> CacheManager:
    """
    Initialize cache manager with Redis or in-memory backend

    Args:
        redis_host: Redis host (default from env or localhost)
        redis_port: Redis port (default from env or 6379)
        force_memory: Force in-memory cache even if Redis available

    Returns:
        Initialized CacheManager instance
    """
    # Get Redis configuration from environment
    redis_host = redis_host or os.getenv("REDIS_HOST", "localhost")
    redis_port = redis_port or int(os.getenv("REDIS_PORT", 6379))

    cache_manager: Optional[CacheManager] = None

    # Try Redis if not forced to memory
    if not force_memory:
        pool = RedisConnectionPool(host=redis_host, port=redis_port)
        if await pool.connect():
            try:
                cache_manager = CacheManager(
                    backend=CacheBackend.REDIS,
                    redis_client=pool.redis_client,
                )
                logger.info("Using Redis cache backend")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis cache: {e}")

    # Fallback to in-memory cache
    if cache_manager is None:
        cache_manager = CacheManager(backend=CacheBackend.MEMORY)
        logger.info("Using in-memory cache backend")

    # Register all cache configurations
    for config_name, config in get_cache_configs().items():
        cache_manager.register_config(config_name, config)

    # Set as global instance
    set_cache_manager(cache_manager)

    return cache_manager


async def get_cache_stats() -> dict:
    """Get current cache statistics"""
    cache_mgr = get_cache_manager()
    return await cache_mgr.get_stats()


async def invalidate_cache_tags(*tags: str) -> int:
    """
    Invalidate cache by tags

    Args:
        *tags: Tags to invalidate

    Returns:
        Number of entries invalidated
    """
    cache_mgr = get_cache_manager()
    return await cache_mgr.delete_by_tags(set(tags))


async def clear_all_cache() -> bool:
    """Clear entire cache"""
    cache_mgr = get_cache_manager()
    return await cache_mgr.clear()
