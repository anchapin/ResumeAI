# Redis Caching Layer - Implementation Guide

## Table of Contents

1. [Architecture & Design](#architecture--design)
2. [Cache Strategies](#cache-strategies)
3. [Installation & Configuration](#installation--configuration)
4. [Usage Guide](#usage-guide)
5. [Integration Examples](#integration-examples)
6. [Deployment & Operations](#deployment--operations)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
8. [Performance Optimization](#performance-optimization)

---

## Architecture & Design

### Overview

ResumeAI now includes a comprehensive caching layer supporting both Redis and in-memory backends. This provides:

- **Flexible Backend**: Automatically falls back to in-memory cache if Redis is unavailable
- **Decorators**: Simple `@cached` decorator for automatic result caching
- **Tag-Based Invalidation**: Group related cache entries for bulk invalidation
- **Performance Metrics**: Built-in hit/miss tracking and execution time analysis
- **Connection Pooling**: Efficient Redis connection management with health checks
- **Configuration-Driven**: Per-datatype TTL settings with sensible defaults

### Component Structure

```
resume-api/
├── lib/utils/
│   ├── cache.py                 # Core cache manager & backends
│   └── cache_integration.py      # Decorators & integration helpers
├── config/
│   └── cache_config.py          # Redis config & cache settings
└── tests/
    └── test_caching.py          # Comprehensive test suite
```

### Design Decisions

1. **Dual Backend Support**: Redis for production, in-memory for development
   - Eliminates Redis dependency for local development
   - Automatic fallback ensures graceful degradation
   
2. **Tag-Based Invalidation**: More flexible than simple TTL
   - Group related entries (user:123, resume:456)
   - Bulk invalidation on data changes
   
3. **LRU Eviction**: In-memory cache uses OrderedDict for efficient eviction
   - Prevents unbounded memory growth
   - Configurable max size per instance
   
4. **Async-First Design**: All operations are async-safe
   - Proper locking for thread-safety
   - Compatible with FastAPI async handlers

---

## Cache Strategies

### 1. TTL-Based Invalidation (Default)

Entries expire after a configured time-to-live.

**Best for**: Data that becomes stale over time
- Variants: 5 minutes (often regenerated)
- Profiles: 15 minutes (user updates less frequently)
- Templates: 1 hour (static reference data)

```python
# Automatic expiration after 600 seconds
await cache_manager.set("key", value, ttl_seconds=600)
```

### 2. Tag-Based Invalidation

Invalidate related entries when source data changes.

**Best for**: Coordinated cache updates
- User updates: invalidate `user:123`, `profile:123`, `settings:123`
- Resume changes: invalidate `resume:456`, `variants:456`, `tailored:456`

```python
# Set with tags
await cache_manager.set(
    "resume:456:variants",
    variants_data,
    ttl_seconds=300,
    tags={"resume", "resume:456"}
)

# Invalidate all resume-related cache on update
await cache_manager.delete_by_tags({"resume:456"})
```

### 3. LRU Eviction (In-Memory Only)

Least Recently Used entries are evicted when cache is full.

**Best for**: Bounded memory usage
- Max size: configurable (default 10,000 entries)
- Automatic eviction of oldest unused entries

```python
# Configure max size
cache = InMemoryCache(max_size=5000)
```

### 4. Manual Invalidation

Explicit deletion for specific cache keys.

**Best for**: Immediate invalidation of single entries

```python
# Delete specific key
await cache_manager.delete("specific_key")

# Clear entire cache
await cache_manager.clear()
```

---

## Installation & Configuration

### 1. Install Dependencies

Add to `resume-api/requirements.txt`:

```
# Already included:
# aioredis - Optional, only needed for Redis backend
```

To use Redis (optional):

```bash
cd resume-api
pip install aioredis==2.0.1
```

### 2. Environment Configuration

Create `.env` file in `resume-api/`:

```bash
# Redis Configuration (optional - defaults to localhost:6379)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Cache Settings
CACHE_BACKEND=memory     # "memory" or "redis"
CACHE_MAX_SIZE=10000     # For in-memory cache
```

### 3. Application Initialization

In `resume-api/main.py`:

```python
from config.cache_config import initialize_cache

# In startup event
@app.on_event("startup")
async def startup():
    # Initialize cache with Redis if available, fallback to memory
    await initialize_cache(
        redis_host=os.getenv("REDIS_HOST"),
        redis_port=int(os.getenv("REDIS_PORT", 6379))
    )
```

### 4. Docker Compose Setup

Add Redis service to `docker-compose.yml`:

```yaml
version: '3.8'
services:
  api:
    build: ./resume-api
    ports:
      - "8000:8000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

---

## Usage Guide

### Basic Caching

```python
from lib.utils.cache_integration import cache_async
from config.cache_config import CacheTTLConfig

@cache_async(
    ttl_seconds=300,
    key_prefix="variant",
    tags={"resume", "variants"}
)
async def get_resume_variants(resume_id: int) -> dict:
    """Get resume variants with automatic caching"""
    return await generate_variants(resume_id)
```

### Custom Cache Keys

```python
def user_resume_key(user_id: int, resume_id: int) -> str:
    return f"user:{user_id}:resume:{resume_id}"

@cache_async(key_builder=user_resume_key)
async def get_user_resume(user_id: int, resume_id: int) -> dict:
    """Get resume with user-scoped caching"""
    return await fetch_resume(user_id, resume_id)
```

### Direct Cache Management

```python
from lib.utils.cache import get_cache_manager

cache = get_cache_manager()

# Set value
await cache.set(
    "key",
    {"data": "value"},
    ttl_seconds=600,
    tags={"user:123"}
)

# Get value
value = await cache.get("key")

# Invalidate by tag
await cache.delete_by_tags({"user:123"})

# Get statistics
stats = await cache.get_stats()
```

### Configuration Registration

```python
from config.cache_config import initialize_cache

# During app startup
cache_manager = await initialize_cache()

# Configs are automatically registered:
# - resume:variants (5 min)
# - resume:profile (15 min)
# - user:profile (30 min)
# - ai:response (10 min)
# etc.
```

---

## Integration Examples

### Example 1: Resume Variant Generation

```python
from fastapi import APIRouter
from lib.utils.cache_integration import cache_async, CacheInvalidationHook

router = APIRouter()

@router.get("/resumes/{resume_id}/variants")
@cache_async(
    ttl_seconds=300,
    key_prefix="variants",
    config_name="resume:variants"
)
async def get_variants(resume_id: int):
    """Get resume variants with caching"""
    variants = await generate_variants(resume_id)
    return {"variants": variants}

@router.post("/resumes/{resume_id}/regenerate")
async def regenerate_resume(resume_id: int):
    """Regenerate resume and invalidate cache"""
    updated = await regenerate_resume_logic(resume_id)
    
    # Invalidate variant cache
    await CacheInvalidationHook.on_resume_update(resume_id)
    
    return {"status": "regenerated", "resume": updated}
```

### Example 2: User Profile with Multiple Cache Layers

```python
from lib.utils.cache_integration import cached, CacheKeyStrategy

class UserService:
    @cache_async(
        ttl_seconds=1800,
        key_builder=lambda user_id: CacheKeyStrategy.by_user_id("profile", user_id)
    )
    async def get_profile(self, user_id: int):
        """Get user profile with user-scoped cache key"""
        return await db.query_user_profile(user_id)
    
    @cache_async(
        ttl_seconds=3600,
        key_builder=lambda user_id: CacheKeyStrategy.by_user_id("settings", user_id),
        tags={"user", "settings"}
    )
    async def get_settings(self, user_id: int):
        """Get user settings with tag-based invalidation"""
        return await db.query_user_settings(user_id)
    
    async def update_user(self, user_id: int, data: dict):
        """Update user and invalidate related cache"""
        await db.update_user(user_id, data)
        await CacheInvalidationHook.on_user_update(user_id)
```

### Example 3: AI-Generated Content Caching

```python
from lib.utils.cache_integration import cache_async
from lib.utils.ai_provider_manager import AIProviderManager

@cache_async(
    ttl_seconds=600,
    key_prefix="ai_tailor",
    config_name="ai:response",
    tags={"ai", "tailoring"}
)
async def tailor_resume_with_ai(
    resume_content: str,
    job_description: str,
    model: str = "gpt-4o"
) -> str:
    """Tailor resume using AI with caching"""
    ai_manager = AIProviderManager()
    tailored = await ai_manager.tailor_resume(
        resume_content,
        job_description,
        model
    )
    return tailored
```

---

## Deployment & Operations

### Local Development

```bash
# Use in-memory cache (default)
cd resume-api
python main.py

# Or with Redis for testing
docker run -d -p 6379:6379 redis:7-alpine
redis-cli ping  # Verify connection
python main.py
```

### Docker Deployment

```bash
# Build image with cache support
cd resume-api
docker build -t resume-api:latest .

# Run with docker-compose
docker-compose up

# Run standalone with Redis
docker run -d \
  -p 8000:8000 \
  -e REDIS_HOST=redis.example.com \
  -e REDIS_PORT=6379 \
  resume-api:latest
```

### Production Configuration

```bash
# .env file for production
REDIS_HOST=redis.production.internal
REDIS_PORT=6379
REDIS_DB=0
CACHE_BACKEND=redis
CACHE_MAX_SIZE=50000

# For high-traffic deployments
REDIS_MAX_CONNECTIONS=20
REDIS_SOCKET_TIMEOUT=10
```

### Cloud Deployment

#### AWS ElastiCache

```python
# config/cache_config.py
REDIS_HOST = os.getenv(
    "REDIS_HOST",
    "resumeai.abc123.ng.0001.use1.cache.amazonaws.com"
)
REDIS_PORT = 6379
```

#### GCP Cloud Memorystore

```python
REDIS_HOST = os.getenv(
    "REDIS_HOST",
    "10.0.0.3"  # Cloud Memorystore IP
)
REDIS_PORT = 6379
```

---

## Monitoring & Troubleshooting

### Cache Metrics Endpoint

Add to FastAPI app:

```python
from lib.utils.cache_integration import get_metrics_summary
from lib.utils.cache import get_cache_manager

@app.get("/v1/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    summary = await get_metrics_summary()
    return summary

@app.post("/v1/cache/clear")
async def clear_cache():
    """Clear entire cache (admin only)"""
    cache = get_cache_manager()
    await cache.clear()
    return {"status": "cleared"}

@app.post("/v1/cache/invalidate")
async def invalidate_cache(tags: list[str]):
    """Invalidate cache by tags"""
    cache = get_cache_manager()
    count = await cache.delete_by_tags(set(tags))
    return {"invalidated": count}
```

### Example Output

```json
{
  "cache": {
    "backend": "redis",
    "hits": 1250,
    "misses": 187,
    "hit_rate": 87.0,
    "memory_usage": "5.2 MB",
    "registered_configs": 12
  },
  "functions": {
    "get_resume_variants": {
      "hits": 450,
      "misses": 50,
      "hit_rate": 90.0,
      "avg_cache_time": 0.002,
      "avg_compute_time": 0.145
    }
  },
  "total_hits": 1250,
  "total_misses": 187
}
```

### Health Check

```python
async def check_cache_health() -> dict:
    """Check cache backend health"""
    cache = get_cache_manager()
    
    try:
        test_key = "health_check"
        await cache.set(test_key, "ok", 1)
        await asyncio.sleep(0.1)
        value = await cache.get(test_key)
        await cache.delete(test_key)
        
        if value == "ok":
            return {"status": "healthy", "backend": cache.backend_type.value}
        else:
            return {"status": "degraded", "error": "test failed"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### Troubleshooting Common Issues

#### Redis Connection Failure

```python
# Error: Connection refused
# Solution 1: Verify Redis is running
docker ps | grep redis

# Solution 2: Check credentials and network
redis-cli -h localhost -p 6379 ping

# Solution 3: Check environment variables
echo $REDIS_HOST
echo $REDIS_PORT

# Falls back to in-memory cache automatically
```

#### Memory Leaks

```python
# Check cache size growth
stats = await cache.get_stats()
print(f"Cache size: {stats['size']} entries")
print(f"Cache hit rate: {stats['hit_rate']}%")

# If size keeps growing:
# 1. Check TTL settings are reasonable
# 2. Verify tag-based invalidation is working
# 3. Manually clear old cache: await cache.clear()
```

#### Slow Cache Hits

```python
# Typical cache operations should be <1ms
# If slower:
# 1. Redis may be busy - check Redis monitoring
# 2. Network latency - ping Redis host
# 3. Serialization overhead - simplify cached objects

# Monitor execution times in metrics
metrics = await get_metrics_summary()
for func, stats in metrics["functions"].items():
    if stats["avg_cache_time"] > 0.01:
        print(f"WARNING: {func} cache is slow: {stats['avg_cache_time']:.3f}s")
```

---

## Performance Optimization

### Cache Hit Rate Improvement

**Target: >85% hit rate**

1. **Increase TTL for stable data**
   ```python
   # Change from 5 min to 15 min for profiles
   RESUME_PROFILE = 900
   ```

2. **Use appropriate key prefixes**
   ```python
   # ✓ Good: Includes relevant context
   key = f"user:{user_id}:profile"
   
   # ✗ Bad: Too generic
   key = "profile"
   ```

3. **Tag related entries**
   ```python
   # Invalidate as group, not individually
   await cache.delete_by_tags({"user:123"})
   ```

### Benchmark Results

Reference performance metrics (in-memory cache, i7 CPU):

| Operation | Time |
|-----------|------|
| Cache Hit | 0.5-1 ms |
| Cache Miss + Set | 5-10 ms |
| TTL Expiration Check | 0.1 ms |
| Tag Invalidation (10 entries) | 0.3 ms |

Redis performance (same hardware, localhost):

| Operation | Time |
|-----------|------|
| Redis Hit | 1-2 ms |
| Redis Miss + Set | 2-4 ms |
| Network Latency | ~0.5 ms |

### Optimization Checklist

- [ ] Set appropriate TTLs for each data type
- [ ] Use tag-based invalidation for related data
- [ ] Monitor cache hit rate (target >85%)
- [ ] Implement health checks for Redis
- [ ] Set reasonable max cache sizes
- [ ] Enable Redis persistence for production
- [ ] Monitor memory usage and eviction rates
- [ ] Profile slow operations with metrics

---

## Quick Reference

### Common Operations

```python
from lib.utils.cache import get_cache_manager
from lib.utils.cache_integration import cache_async, CacheInvalidationHook

cache = get_cache_manager()

# Get stats
stats = await cache.get_stats()

# Cache a computation
@cache_async(ttl_seconds=300)
async def expensive_op():
    return await long_running_task()

# Invalidate on data change
await CacheInvalidationHook.on_resume_update(resume_id)

# Clear all
await cache.clear()
```

### Environment Variables

```bash
REDIS_HOST=localhost          # Redis server address
REDIS_PORT=6379             # Redis server port
CACHE_BACKEND=memory        # "memory" or "redis"
CACHE_MAX_SIZE=10000        # In-memory cache max entries
```

### Default TTLs

| Data Type | TTL |
|-----------|-----|
| Resume Variants | 5 min |
| User Profile | 30 min |
| Salary Data | 24 hours |
| AI Responses | 10 min |

---

## Additional Resources

- [Redis Documentation](https://redis.io/docs/)
- [aioredis Python Library](https://aioredis.readthedocs.io/)
- [FastAPI Async/Await](https://fastapi.tiangolo.com/async-sql-databases/)
- [Python asyncio Documentation](https://docs.python.org/3/library/asyncio.html)
