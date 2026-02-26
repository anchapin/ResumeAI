# ResumeAI Troubleshooting Guide

Common issues you might encounter while using ResumeAI and their solutions.

## PDF Generation Timeout

### Root Causes
1. **PDF rendering engine overloaded** - System load high, limited resources
2. **Large resume content** - Excessive images, formatted text, or custom styling
3. **AI-powered formatting** - AI provider latency increased
4. **File system issues** - Slow disk I/O, insufficient temp space
5. **Network problems** - Slow connection to AI providers
6. **Memory constraints** - Insufficient heap space for PDF library

### Solutions

#### Immediate Fixes
```bash
# Check system resources
free -h
df -h /tmp

# Increase Node.js heap (if using Node backend)
export NODE_OPTIONS="--max-old-space-size=4096"

# Restart application with fresh state
systemctl restart resumeai-api
```

#### Long-term Strategies
1. **Enable PDF caching** - Cache frequently generated PDFs
2. **Optimize resume content** - Reduce image sizes, simplify formatting
3. **Implement async processing** - Queue PDF generation jobs
4. **Scale resources** - Add more memory, faster disk storage
5. **Monitor AI provider** - Check provider status page if using external AI

### Prevention
- Keep resume content under 500KB
- Compress images before upload (< 100KB each)
- Monitor `pdf_generation_duration_seconds` Prometheus metric
- Set up alerts when p95 latency > 3 seconds
- Implement request timeout of 30 seconds max

---

## GitHub OAuth 401

### Root Causes
1. **Expired access token** - Token expired, needs refresh
2. **Revoked application** - User removed app from GitHub
3. **Invalid client credentials** - Mismatched client ID/secret
4. **Network issues** - GitHub API unreachable
5. **Rate limiting** - GitHub API rate limit exceeded
6. **Token refresh failed** - Refresh token expired
7. **Scope changes** - App requested new permissions

### Solutions

#### Immediate Fixes
```bash
# Check GitHub API connectivity
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/user | jq .

# Verify client credentials in environment
env | grep GITHUB_CLIENT
```

#### Token Refresh Implementation
```python
from datetime import datetime, timedelta

async def refresh_github_token(refresh_token: str) -> str:
    """Refresh GitHub OAuth token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            headers={"Accept": "application/json"},
        )
        if response.status_code == 200:
            data = response.json()
            return data["access_token"]
        raise HTTPException(status_code=401, detail="Token refresh failed")
```

#### PKCE Implementation (for public clients)
```python
import secrets
import hashlib
import base64
from urllib.parse import urlencode

def create_pkce_pair():
    """Generate PKCE challenge and verifier."""
    code_verifier = base64.urlsafe_b64encode(
        secrets.token_bytes(32)
    ).decode('utf-8').rstrip('=')
    
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode('utf-8').rstrip('=')
    
    return code_verifier, code_challenge
```

### Prevention
- Implement token refresh 5 minutes before expiration
- Store refresh tokens securely (encrypted at rest)
- Monitor `github_oauth_failures_total` metric
- Implement exponential backoff for token refresh failures
- Document required OAuth scopes in README
- Test OAuth flow in staging before production changes

---

## API Rate Limit Exceeded

### Root Causes
1. **Burst traffic** - Sudden spike in requests
2. **Misconfigured client** - Not implementing backoff/retry
3. **DoS attack** - Malicious traffic overwhelming API
4. **Crawler/bot** - Automated requests without throttling
5. **Third-party integration** - Partner app making excessive requests
6. **Production incident** - Bug causing request loop
7. **Load test not controlled** - Testing without rate limiting

### Solutions

#### Exponential Backoff Implementation
```python
import asyncio
from typing import Callable, TypeVar, Any

T = TypeVar('T')

async def exponential_backoff_retry(
    func: Callable[..., Any],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
):
    """Retry with exponential backoff and jitter."""
    for attempt in range(max_retries):
        try:
            return await func()
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            
            delay = min(
                base_delay * (2 ** attempt),
                max_delay
            )
            # Add jitter: ± 20%
            jitter = delay * 0.2 * (random.random() - 0.5)
            wait_time = delay + jitter
            
            logger.warning(f"Rate limited, retrying in {wait_time:.1f}s")
            await asyncio.sleep(wait_time)
```

#### Client-side Rate Limiting
```python
from time import time
from collections import deque

class RateLimiter:
    """Implement token bucket rate limiter."""
    
    def __init__(self, rate: int, per_seconds: int = 1):
        self.rate = rate
        self.per_seconds = per_seconds
        self.tokens = rate
        self.last_update = time()
    
    async def acquire(self):
        """Wait until token available."""
        while True:
            now = time()
            elapsed = now - self.last_update
            
            # Refill tokens
            self.tokens = min(
                self.rate,
                self.tokens + elapsed * (self.rate / self.per_seconds)
            )
            self.last_update = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return
            
            await asyncio.sleep(0.01)

# Usage
limiter = RateLimiter(rate=100, per_seconds=60)  # 100 req/min
await limiter.acquire()
response = await make_api_call()
```

### Prevention
- Implement client-side rate limiting (token bucket)
- Cache responses to reduce repeat requests
- Monitor `http_requests_total` by endpoint
- Set up alerts when request rate > threshold
- Document API rate limits in API docs
- Use connection pooling to reduce overhead
- Implement request deduplication for idempotent operations

---

## Storage Quota Exceeded

### Root Causes
1. **Large resume versions** - Keeping old versions, accumulating data
2. **Unoptimized images** - High-resolution images stored as-is
3. **Cache not cleaned** - Temporary files not removed
4. **Duplicates** - Accidental uploads of same content
5. **Media library** - Accumulated profile photos, examples
6. **AI generation artifacts** - Generated content stored incorrectly
7. **No retention policy** - Old data never cleaned up

### Solutions

#### Immediate Fixes
```bash
# Find largest files
du -sh /data/storage/* | sort -rh | head -20

# Clean old drafts
find /data/storage -name "*.draft" -mtime +30 -delete

# Compress large files
find /data/storage -name "*.json" -size +1M -exec gzip {} \;
```

#### Database Cleanup
```python
async def cleanup_old_drafts(days_old: int = 30):
    """Delete drafts not modified in N days."""
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    await db.execute(
        """
        DELETE FROM resumes 
        WHERE status = 'draft' 
        AND updated_at < $1
        """,
        cutoff_date
    )
```

#### Automatic Storage Cleanup
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

async def setup_storage_cleanup():
    scheduler = AsyncIOScheduler()
    
    # Clean daily at 2 AM
    scheduler.add_job(
        cleanup_old_drafts,
        "cron",
        hour=2,
        minute=0,
        kwargs={"days_old": 30}
    )
    
    # Clean images older than 90 days
    scheduler.add_job(
        cleanup_old_images,
        "cron",
        hour=3,
        minute=0,
        kwargs={"days_old": 90}
    )
    
    scheduler.start()
```

#### Version Management
```python
async def keep_last_n_versions(resume_id: str, keep_count: int = 5):
    """Keep only N most recent versions."""
    old_versions = await db.fetch(
        """
        SELECT id FROM resume_versions
        WHERE resume_id = $1
        ORDER BY created_at DESC
        OFFSET $2
        """,
        resume_id, keep_count
    )
    
    for version in old_versions:
        await delete_version(version["id"])
```

### Prevention
- Set storage warning threshold at 80% quota
- Implement per-user quota limits
- Monitor `storage_usage_bytes` Prometheus metric
- Alert when approaching quota (daily digest)
- Implement automated cleanup of 90+ day old drafts
- Compress images to < 500KB
- Document retention policy to users
- Set hard quota limits to prevent disk full

---

## AI Provider Down

### Root Causes
1. **AI provider service outage** - External API unavailable
2. **Authentication failure** - Invalid API key, rate limit
3. **Network connectivity** - Can't reach provider (firewall, DNS)
4. **Regional endpoint issue** - Wrong region/zone selected
5. **API version mismatch** - Client outdated, API changed
6. **Account issues** - Suspended account, payment failed
7. **Quota exceeded** - Monthly token limit reached

### Solutions

#### Fallback Provider Strategy
```python
from enum import Enum
from typing import Optional

class AIProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"

async def generate_resume_content(
    content: str,
    primary_provider: AIProvider = AIProvider.OPENAI,
) -> str:
    """Try primary, fall back to alternatives."""
    
    providers = [primary_provider]
    
    # Add fallbacks in order
    if primary_provider != AIProvider.ANTHROPIC:
        providers.append(AIProvider.ANTHROPIC)
    if len(providers) < 2:
        providers.append(AIProvider.LOCAL)
    
    last_error = None
    
    for provider in providers:
        try:
            logger.info(f"Trying {provider.value}")
            result = await call_ai_provider(provider, content)
            
            # Log successful provider for metrics
            ai_provider_success.labels(provider=provider.value).inc()
            return result
            
        except Exception as e:
            logger.warning(f"{provider.value} failed: {e}")
            last_error = e
            continue
    
    # All providers failed
    logger.error(f"All AI providers failed")
    ai_provider_failures.labels().inc()
    raise last_error
```

#### Circuit Breaker Pattern
```python
from datetime import datetime, timedelta
from enum import Enum

class CircuitState(str, Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Provider failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered

class CircuitBreaker:
    """Prevent cascading failures."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        
        if self.state == CircuitState.OPEN:
            if self._should_attempt_recovery():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpen(
                    f"Circuit open, retry in "
                    f"{self._time_until_retry():.0f}s"
                )
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        self.failures = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failures += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
    
    def _should_attempt_recovery(self) -> bool:
        elapsed = (
            datetime.utcnow() - self.last_failure_time
        ).total_seconds()
        return elapsed >= self.recovery_timeout
    
    def _time_until_retry(self) -> float:
        elapsed = (
            datetime.utcnow() - self.last_failure_time
        ).total_seconds()
        return max(0, self.recovery_timeout - elapsed)
```

#### Multi-Provider Caching
```python
from functools import lru_cache

class AICache:
    """Cache AI responses to handle provider outages."""
    
    def __init__(self, ttl_seconds: int = 86400):  # 24 hours
        self.cache = {}
        self.ttl = ttl_seconds
    
    def _cache_key(self, prompt: str, provider: str) -> str:
        import hashlib
        h = hashlib.sha256(prompt.encode()).hexdigest()
        return f"{provider}:{h}"
    
    async def get_or_generate(
        self,
        prompt: str,
        provider: AIProvider,
        force_refresh: bool = False,
    ) -> str:
        """Get cached result or generate new."""
        
        key = self._cache_key(prompt, provider.value)
        
        if not force_refresh:
            cached = self.cache.get(key)
            if cached and not self._is_expired(cached):
                logger.info("Cache hit")
                return cached["result"]
        
        try:
            result = await generate_resume_content(prompt, provider)
            self.cache[key] = {
                "result": result,
                "timestamp": datetime.utcnow(),
            }
            return result
        except Exception as e:
            # Fall back to stale cache
            cached = self.cache.get(key)
            if cached:
                logger.warning(
                    f"Provider failed, using cached result "
                    f"({self._age(cached):.0f}s old)"
                )
                return cached["result"]
            raise
    
    def _is_expired(self, cached: dict) -> bool:
        age = (datetime.utcnow() - cached["timestamp"]).total_seconds()
        return age > self.ttl
    
    def _age(self, cached: dict) -> float:
        return (datetime.utcnow() - cached["timestamp"]).total_seconds()
```

#### Degraded Mode
```python
async def generate_content_with_degradation(
    content: str,
    required_quality: str = "full",
) -> dict:
    """Generate with graceful degradation."""
    
    try:
        # Try full AI enhancement
        return {
            "content": await generate_resume_content(content),
            "quality": "full",
        }
    except AIProviderError:
        logger.warning("AI provider down, using degraded mode")
        
        if required_quality == "full":
            # Still try fallback, but mark as degraded
            return {
                "content": await generate_with_fallback(content),
                "quality": "degraded",
                "notice": "Using cached/local generation"
            }
        else:
            # Just return original content
            return {
                "content": content,
                "quality": "none",
                "notice": "AI enhancements unavailable"
            }
```

### Prevention
- Monitor provider status pages continuously
- Implement multi-provider support from start
- Cache AI responses for common queries
- Set up alerts for provider failures (Prometheus)
- Test fallback paths regularly (game days)
- Implement circuit breakers to prevent cascades
- Document provider SLAs and incident procedures
- Keep local model option as backup (cheaper, slower)
- Monitor tokens used vs quota in provider

---

## General Troubleshooting Tips

### Debug Logging Setup
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# View structured logs in real-time
tail -f logs/app.log | jq '.'

# Filter by component
tail -f logs/app.log | jq 'select(.component=="pdf")'

# Find errors
cat logs/app.log | jq 'select(.level=="ERROR")'
```

### Environment Variable Verification
```bash
# Check all required vars are set
required_vars=(
    "DATABASE_URL"
    "GITHUB_CLIENT_ID"
    "GITHUB_CLIENT_SECRET"
    "OPENAI_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var not set"
        exit 1
    fi
done
```

### Database Health Checks
```bash
# Connect to database
psql $DATABASE_URL -c "SELECT version();"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# View active queries
psql $DATABASE_URL -c "
    SELECT pid, query, state
    FROM pg_stat_activity
    WHERE state != 'idle';"
```

### Key Metrics to Monitor
- `http_requests_total` - API request volume
- `http_request_duration_seconds` - API latency (p50, p95, p99)
- `pdf_generation_duration_seconds` - PDF generation performance
- `database_connection_errors_total` - DB connectivity
- `ai_provider_failures_total` - AI provider issues
- `storage_usage_bytes` - Storage consumption
- `github_oauth_failures_total` - OAuth issues

### Useful Bash Commands
```bash
# View recent errors
grep ERROR logs/app.log | tail -20

# Count errors by type
grep ERROR logs/app.log | jq -r '.error_type' | sort | uniq -c

# Check API response times
grep "http_request" logs/app.log | jq '.duration_ms' | sort -n | tail -20

# Monitor in real-time
watch -n 1 'ps aux | grep resumeai'

# Check disk space
df -h
du -sh /data/storage

# Restart services
systemctl restart resumeai-api resumeai-workers
```

---

## Support and Escalation

### Diagnostic Information Checklist
Before contacting support, gather:
- [ ] Error message and stack trace
- [ ] Request/User ID from logs
- [ ] Recent changes to deployment/config
- [ ] Screenshots of issue (if UI-related)
- [ ] Prometheus metrics graph (timerange of issue)
- [ ] Related log excerpts (last 30 minutes)
- [ ] Reproduction steps

### Severity Levels

| Level | Impact | Response Time | Example |
|-------|--------|---------------|---------|
| **P1** | Prod down, users blocked | 15 minutes | API completely offline |
| **P2** | Major feature broken | 1 hour | PDF generation broken |
| **P3** | Minor feature issues | 4 hours | Slow performance |
| **P4** | Enhancement requests | 1 week | UI improvements |

### Escalation Path
1. Check this troubleshooting guide
2. Check status page: https://status.resumeai.io
3. Check GitHub issues for known problems
4. Contact support via dashboard
5. Page on-call engineer (P1 only)

---

**Last Updated**: February 26, 2026  
**Version**: 2.1
