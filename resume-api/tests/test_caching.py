"""
Comprehensive tests for Redis/cache layer

Tests cache hit/miss scenarios, invalidation, TTL, decorators, and metrics.
"""

import asyncio
import time

import pytest

from lib.utils.cache import (
    CacheBackend,
    CacheConfig,
    CacheManager,
    InMemoryCache,
    set_cache_manager,
)
from lib.utils.cache_integration import (
    cache_async,
    get_cache_metrics,
    CacheKeyStrategy,
    CacheInvalidationHook,
    get_metrics_summary,
)
from config.cache_config import (
    CacheTTLConfig,
    get_cache_configs,
    initialize_cache as init_cache,
)


@pytest.fixture
async def in_memory_cache():
    """Create fresh in-memory cache for each test"""
    cache = InMemoryCache(max_size=100)
    yield cache
    await cache.clear()


@pytest.fixture
async def cache_manager():
    """Create fresh cache manager for each test"""
    manager = CacheManager(backend=CacheBackend.MEMORY, memory_max_size=100)
    set_cache_manager(manager)
    yield manager
    await manager.clear()


class TestInMemoryCacheBasics:
    """Test basic in-memory cache operations"""

    @pytest.mark.asyncio
    async def test_set_and_get(self, in_memory_cache):
        """Test basic set and get operations"""
        assert await in_memory_cache.set("key1", "value1", 300)
        assert await in_memory_cache.get("key1") == "value1"

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, in_memory_cache):
        """Test getting non-existent key returns None"""
        assert await in_memory_cache.get("nonexistent") is None

    @pytest.mark.asyncio
    async def test_delete(self, in_memory_cache):
        """Test deleting cache entries"""
        await in_memory_cache.set("key1", "value1", 300)
        assert await in_memory_cache.exists("key1")
        assert await in_memory_cache.delete("key1")
        assert not await in_memory_cache.exists("key1")

    @pytest.mark.asyncio
    async def test_ttl_expiration(self, in_memory_cache):
        """Test TTL expiration"""
        await in_memory_cache.set("key1", "value1", 1)  # 1 second TTL
        assert await in_memory_cache.get("key1") == "value1"

        # Wait for expiration
        await asyncio.sleep(1.1)
        assert await in_memory_cache.get("key1") is None

    @pytest.mark.asyncio
    async def test_permanent_entries(self, in_memory_cache):
        """Test entries with TTL=0 (permanent)"""
        await in_memory_cache.set("key1", "value1", 0)
        await asyncio.sleep(0.1)
        assert await in_memory_cache.get("key1") == "value1"

    @pytest.mark.asyncio
    async def test_clear(self, in_memory_cache):
        """Test clearing entire cache"""
        await in_memory_cache.set("key1", "value1", 300)
        await in_memory_cache.set("key2", "value2", 300)
        assert len(in_memory_cache.cache) == 2

        assert await in_memory_cache.clear()
        assert len(in_memory_cache.cache) == 0

    @pytest.mark.asyncio
    async def test_cache_hit_miss_tracking(self, in_memory_cache):
        """Test hit/miss statistics"""
        await in_memory_cache.set("key1", "value1", 300)

        # Miss
        assert await in_memory_cache.get("key2") is None
        assert in_memory_cache.misses == 1

        # Hit
        assert await in_memory_cache.get("key1") == "value1"
        assert in_memory_cache.hits == 1

    @pytest.mark.asyncio
    async def test_lru_eviction(self, in_memory_cache):
        """Test LRU eviction when cache is full"""
        small_cache = InMemoryCache(max_size=3)

        # Fill cache
        await small_cache.set("key1", "value1", 300)
        await small_cache.set("key2", "value2", 300)
        await small_cache.set("key3", "value3", 300)
        assert len(small_cache.cache) == 3

        # Add new entry (should evict oldest)
        await small_cache.set("key4", "value4", 300)
        assert len(small_cache.cache) == 3
        assert await small_cache.get("key1") is None  # key1 was evicted
        assert await small_cache.get("key4") == "value4"

        await small_cache.clear()


class TestCacheTags:
    """Test cache tag-based invalidation"""

    @pytest.mark.asyncio
    async def test_set_with_tags(self, in_memory_cache):
        """Test setting entries with tags"""
        tags = {"user", "profile"}
        assert await in_memory_cache.set("key1", "value1", 300, tags=tags)
        assert await in_memory_cache.get("key1") == "value1"

    @pytest.mark.asyncio
    async def test_delete_by_tags(self, in_memory_cache):
        """Test deleting entries by tags"""
        await in_memory_cache.set("key1", "value1", 300, tags={"user", "profile"})
        await in_memory_cache.set("key2", "value2", 300, tags={"user", "settings"})
        await in_memory_cache.set("key3", "value3", 300, tags={"resume"})

        # Delete by user tag
        count = await in_memory_cache.delete_by_tags({"user"})
        assert count == 2

        assert await in_memory_cache.get("key1") is None
        assert await in_memory_cache.get("key2") is None
        assert await in_memory_cache.get("key3") == "value3"

    @pytest.mark.asyncio
    async def test_delete_by_multiple_tags(self, in_memory_cache):
        """Test deleting with multiple tags (OR logic)"""
        await in_memory_cache.set("key1", "value1", 300, tags={"user"})
        await in_memory_cache.set("key2", "value2", 300, tags={"resume"})
        await in_memory_cache.set("key3", "value3", 300, tags={"both"})

        # Delete entries with either user OR resume tag
        count = await in_memory_cache.delete_by_tags({"user", "resume"})
        assert count == 2
        assert await in_memory_cache.get("key3") == "value3"


class TestCacheManager:
    """Test CacheManager functionality"""

    @pytest.mark.asyncio
    async def test_manager_set_get(self, cache_manager):
        """Test manager set/get operations"""
        assert await cache_manager.set("key1", {"data": "value"}, 300)
        result = await cache_manager.get("key1")
        assert result == {"data": "value"}

    @pytest.mark.asyncio
    async def test_generate_key(self, cache_manager):
        """Test cache key generation"""
        key1 = cache_manager.generate_key("prefix", "arg1", "arg2")
        key2 = cache_manager.generate_key("prefix", "arg1", "arg2")
        assert key1 == key2  # Same args = same key

        key3 = cache_manager.generate_key("prefix", "arg1", "arg3")
        assert key1 != key3  # Different args = different key

    @pytest.mark.asyncio
    async def test_generate_key_with_kwargs(self, cache_manager):
        """Test key generation with keyword arguments"""
        key1 = cache_manager.generate_key("prefix", "arg1", key1="val1", key2="val2")
        key2 = cache_manager.generate_key("prefix", "arg1", key2="val2", key1="val1")
        assert key1 == key2  # Order shouldn't matter for kwargs

    @pytest.mark.asyncio
    async def test_config_registration(self, cache_manager):
        """Test cache config registration"""
        config = CacheConfig(key_prefix="test", ttl_seconds=600, tags={"test"})
        cache_manager.register_config("test_config", config)

        assert "test_config" in cache_manager.configs
        assert cache_manager.configs["test_config"].ttl_seconds == 600

    @pytest.mark.asyncio
    async def test_set_with_config_ttl(self, cache_manager):
        """Test set operation using config TTL"""
        config = CacheConfig(key_prefix="test", ttl_seconds=600, tags={"test"})
        cache_manager.register_config("test_config", config)

        await cache_manager.set("key1", "value1", config_name="test_config")
        value = await cache_manager.get("key1")
        assert value == "value1"

    @pytest.mark.asyncio
    async def test_delete_by_tags(self, cache_manager):
        """Test manager delete by tags"""
        await cache_manager.set("key1", "value1", tags={"user"})
        await cache_manager.set("key2", "value2", tags={"resume"})

        count = await cache_manager.delete_by_tags({"user"})
        assert count == 1
        assert await cache_manager.get("key1") is None
        assert await cache_manager.get("key2") == "value2"


class TestCacheDecorators:
    """Test cache decorators"""

    @pytest.mark.asyncio
    async def test_cached_decorator_async(self, cache_manager):
        """Test @cached_async decorator"""
        call_count = 0

        @cache_async(ttl_seconds=300, key_prefix="test")
        async def expensive_function(x: int) -> int:
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.01)
            return x * 2

        # First call - should execute
        result1 = await expensive_function(5)
        assert result1 == 10
        assert call_count == 1

        # Second call - should be cached
        result2 = await expensive_function(5)
        assert result2 == 10
        assert call_count == 1  # Not incremented

        # Different argument - should execute
        result3 = await expensive_function(10)
        assert result3 == 20
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_cache_metrics(self, cache_manager):
        """Test cache metrics collection"""

        @cache_async(ttl_seconds=300, key_prefix="test")
        async def test_func(x: int) -> int:
            return x * 2

        # Make calls
        await test_func(5)  # Miss
        await test_func(5)  # Hit
        await test_func(10)  # Miss
        await test_func(10)  # Hit

        metrics = get_cache_metrics()
        stats = await metrics.get_stats("test_func")

        assert stats["hits"] == 2
        assert stats["misses"] == 2
        assert stats["hit_rate"] == 50.0

    @pytest.mark.asyncio
    async def test_cache_key_strategy_simple(self, cache_manager):
        """Test simple key strategy"""
        key = CacheKeyStrategy.simple("prefix", "arg1", "arg2", kwarg1="val1")
        assert isinstance(key, str)
        assert key.startswith("prefix:")

    @pytest.mark.asyncio
    async def test_cache_key_strategy_user_id(self, cache_manager):
        """Test user-scoped key strategy"""
        key = CacheKeyStrategy.by_user_id("profile", 123, "extra_arg")
        assert "user:123" in key

    @pytest.mark.asyncio
    async def test_cache_key_builder(self, cache_manager):
        """Test custom key builder"""

        def custom_key_builder(x: int) -> str:
            return f"custom:{x}"

        @cache_async(key_builder=custom_key_builder)
        async def test_func(x: int) -> int:
            return x * 2

        result = await test_func(5)
        assert result == 10

        # Verify key was generated correctly
        cached_value = await cache_manager.get("custom:5")
        assert cached_value == 10


class TestCacheInvalidation:
    """Test cache invalidation hooks"""

    @pytest.mark.asyncio
    async def test_invalidation_hook(self, cache_manager):
        """Test manual invalidation hook"""
        hook = CacheInvalidationHook({"user"})

        await cache_manager.set("key1", "value1", tags={"user"})
        await cache_manager.set("key2", "value2", tags={"resume"})

        count = await hook.invalidate()
        assert count == 1
        assert await cache_manager.get("key1") is None
        assert await cache_manager.get("key2") == "value2"

    @pytest.mark.asyncio
    async def test_on_user_update_hook(self, cache_manager):
        """Test user update invalidation"""
        await cache_manager.set("user:123:data", "value", tags={"user", "user:123"})

        count = await CacheInvalidationHook.on_user_update(123)
        assert count == 1
        assert await cache_manager.get("user:123:data") is None

    @pytest.mark.asyncio
    async def test_on_resume_update_hook(self, cache_manager):
        """Test resume update invalidation"""
        await cache_manager.set("resume:456:data", "value", tags={"resume", "resume:456"})

        count = await CacheInvalidationHook.on_resume_update(456)
        assert count == 1
        assert await cache_manager.get("resume:456:data") is None


class TestCacheConfiguration:
    """Test cache configuration module"""

    def test_cache_ttl_config(self):
        """Test TTL configuration constants"""
        assert CacheTTLConfig.RESUME_VARIANT == 300  # 5 min
        assert CacheTTLConfig.RESUME_PROFILE == 900  # 15 min
        assert CacheTTLConfig.USER_PROFILE == 1800  # 30 min
        assert CacheTTLConfig.SALARY_DATA == 86400  # 24 hours

    def test_cache_configs(self):
        """Test cache config retrieval"""
        configs = get_cache_configs()

        assert "resume:variants" in configs
        assert "user:profile" in configs
        assert "ai:response" in configs

        # Verify config properties
        resume_config = configs["resume:variants"]
        assert resume_config.ttl_seconds == CacheTTLConfig.RESUME_VARIANT
        assert "resume" in resume_config.tags

    @pytest.mark.asyncio
    async def test_initialize_cache_memory(self):
        """Test initializing memory cache"""
        manager = await init_cache(force_memory=True)

        assert isinstance(manager, CacheManager)
        assert manager.backend_type == CacheBackend.MEMORY

        # Verify configs are registered
        assert len(manager.configs) > 0

        await manager.clear()


class TestCachePerformance:
    """Performance and stress tests"""

    @pytest.mark.asyncio
    async def test_concurrent_cache_operations(self, cache_manager):
        """Test concurrent cache operations"""

        async def set_and_get(key: str, value: str):
            await cache_manager.set(key, value, 300)
            return await cache_manager.get(key)

        # Run concurrent operations
        tasks = [set_and_get(f"key{i}", f"value{i}") for i in range(50)]
        results = await asyncio.gather(*tasks)

        assert len(results) == 50
        assert all(r is not None for r in results)

    @pytest.mark.asyncio
    async def test_cache_performance_benefit(self, cache_manager):
        """Test that cache provides performance benefit"""
        execution_times = []

        @cache_async(ttl_seconds=300)
        async def slow_function(x: int) -> int:
            await asyncio.sleep(0.01)
            return x * 2

        # First call (cache miss)
        start = time.time()
        await slow_function(5)
        miss_time = time.time() - start
        execution_times.append(("miss", miss_time))

        # Second call (cache hit)
        start = time.time()
        await slow_function(5)
        hit_time = time.time() - start
        execution_times.append(("hit", hit_time))

        # Hit should be faster than miss
        assert hit_time < miss_time
        assert miss_time > 0.01  # Actual work done
        assert hit_time < 0.005  # Cache lookup only

    @pytest.mark.asyncio
    async def test_get_metrics_summary(self, cache_manager):
        """Test metrics summary generation"""

        @cache_async(ttl_seconds=300)
        async def test_func(x: int) -> int:
            return x * 2

        # Generate some cache activity
        await test_func(5)
        await test_func(5)

        summary = await get_metrics_summary()

        assert "cache" in summary
        assert "functions" in summary
        assert "total_hits" in summary
        assert "total_misses" in summary


class TestCacheStress:
    """Stress tests for cache"""

    @pytest.mark.asyncio
    async def test_many_entries(self, cache_manager):
        """Test cache with many entries"""
        num_entries = 1000

        # Add entries
        for i in range(num_entries):
            await cache_manager.set(f"key{i}", f"value{i}", 300)

        # Verify retrieval
        for i in range(0, num_entries, 100):
            value = await cache_manager.get(f"key{i}")
            assert value == f"value{i}"

    @pytest.mark.asyncio
    async def test_long_ttl_values(self, cache_manager):
        """Test entries with very long TTL"""
        # 1 week TTL
        await cache_manager.set("long_ttl_key", "long_ttl_value", 604800)
        value = await cache_manager.get("long_ttl_key")
        assert value == "long_ttl_value"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
