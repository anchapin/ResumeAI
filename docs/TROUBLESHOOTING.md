# ResumeAI Troubleshooting Guide

A comprehensive guide to diagnose and resolve common issues in the ResumeAI FastAPI backend.

---

## PDF Generation Timeout

### Overview

PDF generation timeouts occur when the PDF rendering service takes too long to process a resume document.

### Root Causes

- **Large File Size**: Resume contains high-resolution images or complex formatting
- **System Resource Constraints**: Insufficient CPU or memory on the server
- **Network Issues**: Slow connection to external PDF rendering service
- **Complex HTML/CSS**: Intricate styling that requires more processing time
- **Misconfigured Timeout Value**: Timeout threshold set too low for your workload
- **Browser Engine Overload**: Multiple concurrent PDF generation requests overwhelming the system

### Solutions

#### Immediate Fixes

1. **Increase Timeout Value**

   ```python
   # In config.py or environment variables
   PDF_GENERATION_TIMEOUT = 60  # Increase from default 30 seconds
   ```

2. **Reduce Image Resolution**
   - Compress images in the resume before upload
   - Recommendation: Keep images under 2MB total
   - Use JPEG format instead of PNG where possible

3. **Simplify HTML/CSS**
   - Remove unnecessary styling
   - Avoid complex gradients or filters
   - Use standard fonts instead of custom web fonts

4. **Retry with Exponential Backoff**

   ```python
   import asyncio
   from tenacity import retry, stop_after_attempt, wait_exponential

   @retry(
       stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1, min=2, max=10)
   )
   async def generate_pdf_with_retry(resume_data):
       # Your PDF generation code
       pass
   ```

#### Long-term Solutions

1. **Implement Async PDF Generation**
   - Process PDFs in background queue (e.g., Celery, RQ)
   - Return job ID immediately to client
   - Use polling or WebSocket to check status

2. **Add Caching Layer**

   ```python
   from redis import Redis

   redis_client = Redis(host='localhost', port=6379)

   def get_cached_pdf(user_id, resume_id):
       cache_key = f"pdf:{user_id}:{resume_id}"
       return redis_client.get(cache_key)
   ```

3. **Enable Horizontal Scaling**
   - Deploy multiple instances of PDF service
   - Use load balancer (nginx, HAProxy)
   - Monitor queue depth and auto-scale

4. **Monitor with Metrics**

   ```python
   from prometheus_client import Histogram

   pdf_generation_time = Histogram(
       'pdf_generation_seconds',
       'Time spent generating PDF'
   )
   ```

### Prevention

- Set reasonable timeout based on benchmarks (typically 45-60 seconds)
- Implement request size limits to prevent oversized uploads
- Add monitoring alerts for timeout rates > 5%
- Regular performance testing with real-world resume samples
- Document timeout expectations in API response headers

---

## GitHub OAuth 401

### Overview

GitHub OAuth authentication returns a 401 Unauthorized error, preventing user login.

### Root Causes

- **Invalid OAuth Credentials**: Client ID or Client Secret is wrong or expired
- **Token Revoked**: User revoked app access in GitHub settings
- **Invalid Grant**: Authorization code is expired (typically 10 minutes)
- **Mismatched Redirect URI**: Registered URI doesn't match request URI
- **Network Connectivity**: Cannot reach GitHub OAuth endpoint
- **Token Expiration**: Access token expired and refresh token missing
- **Scope Mismatch**: Requested scopes don't match configured scopes

### Solutions

#### Immediate Fixes

1. **Verify OAuth Credentials**

   ```bash
   # Check environment variables
   echo $GITHUB_CLIENT_ID
   echo $GITHUB_CLIENT_SECRET

   # Verify credentials at https://github.com/settings/developers
   ```

2. **Check Authorization Code**

   ```python
   # In your OAuth callback handler
   import time
   from urllib.parse import parse_qs, urlparse

   def handle_oauth_callback(request):
       code = request.query_params.get('code')
       # Code is valid for 10 minutes only
       if code:
           # Exchange immediately
           exchange_auth_code(code)
   ```

3. **Verify Redirect URI**

   ```python
   # Must match exactly in GitHub OAuth app settings
   GITHUB_REDIRECT_URI = "https://yourdomain.com/api/auth/github/callback"
   # Not:
   # - http://yourdomain.com/api/auth/github/callback (different protocol)
   # - https://yourdomain.com/api/auth/github/callback/ (trailing slash)
   ```

4. **Check Token Expiration**

   ```python
   import jwt
   from datetime import datetime

   def validate_token(token):
       try:
           decoded = jwt.decode(token, options={"verify_signature": False})
           exp = decoded.get('exp')
           if exp < datetime.utcnow().timestamp():
               return False, "Token expired"
           return True, "Token valid"
       except Exception as e:
           return False, str(e)
   ```

#### Long-term Solutions

1. **Implement Token Refresh Logic**

   ```python
   async def refresh_oauth_token(refresh_token):
       async with httpx.AsyncClient() as client:
           response = await client.post(
               "https://github.com/login/oauth/access_token",
               json={
                   "client_id": GITHUB_CLIENT_ID,
                   "client_secret": GITHUB_CLIENT_SECRET,
                   "grant_type": "refresh_token",
                   "refresh_token": refresh_token
               },
               headers={"Accept": "application/json"}
           )
           return response.json()
   ```

2. **Add PKCE Flow for Extra Security**

   ```python
   import secrets
   import hashlib
   import base64

   def create_pkce_pair():
       code_verifier = base64.urlsafe_b64encode(
           secrets.token_bytes(32)
       ).decode('utf-8').rstrip('=')
       code_challenge = base64.urlsafe_b64encode(
           hashlib.sha256(code_verifier.encode()).digest()
       ).decode('utf-8').rstrip('=')
       return code_verifier, code_challenge
   ```

3. **Implement Token Storage with Encryption**

   ```python
   from cryptography.fernet import Fernet

   cipher = Fernet(ENCRYPTION_KEY)

   def store_oauth_token(user_id, token):
       encrypted = cipher.encrypt(token.encode())
       db.store(user_id, encrypted)
   ```

### Prevention

- Rotate OAuth credentials every 90 days
- Monitor 401 error rates on auth endpoints
- Implement automatic retry with exponential backoff
- Add detailed logging for OAuth flow steps
- Set up alerts when OAuth failure rate exceeds 2%
- Document all required OAuth scopes clearly
- Test OAuth flow in staging after any credential rotation

---

## API Rate Limit Exceeded

### Overview

Too many requests to the API result in 429 Too Many Requests responses.

### Root Causes

- **Aggressive Client Polling**: Client making requests too frequently
- **Missing Cache Implementation**: Requesting same data repeatedly
- **Denial of Service**: Intentional or unintentional attack
- **Inefficient Client Logic**: Loop making repeated calls without backoff
- **Multiple Concurrent Users**: Shared rate limit across all users exhausted
- **Background Job Errors**: Retry loops causing cascade of requests
- **Endpoint Not Optimized**: Single endpoint handling too many requests

### Solutions

#### Immediate Fixes

1. **Implement Exponential Backoff**

   ```python
   import asyncio
   import random

   async def call_api_with_backoff(endpoint, max_retries=5):
       for attempt in range(max_retries):
           try:
               response = await client.get(endpoint)
               if response.status_code == 429:
                   # Get retry-after header
                   retry_after = int(
                       response.headers.get('Retry-After', 2 ** attempt)
                   )
                   await asyncio.sleep(retry_after)
                   continue
               return response
           except Exception as e:
               if attempt == max_retries - 1:
                   raise
               wait_time = (2 ** attempt) + random.uniform(0, 1)
               await asyncio.sleep(wait_time)
   ```

2. **Add Client-Side Rate Limiting**

   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address

   limiter = Limiter(key_func=get_remote_address)

   @app.get("/api/resumes")
   @limiter.limit("10/minute")
   async def get_resumes(request: Request):
       # Implementation
       pass
   ```

3. **Implement Request Caching**

   ```python
   from functools import lru_cache
   import aiocache

   cache = aiocache.cached(
       ttl=300,  # 5 minutes
       namespace="resumes"
   )

   @cache
   async def get_user_resumes(user_id):
       # This will be cached for 5 minutes
       pass
   ```

4. **Check Rate Limit Headers**

   ```python
   response = await client.get(endpoint)
   remaining = response.headers.get('X-RateLimit-Remaining')
   reset = response.headers.get('X-RateLimit-Reset')

   if int(remaining) < 10:
       logger.warning(f"Rate limit approaching: {remaining} requests left")
   ```

#### Long-term Solutions

1. **Implement Tiered Rate Limiting**

   ```python
   RATE_LIMITS = {
       "free": "10/minute",
       "pro": "100/minute",
       "enterprise": "1000/minute"
   }

   @app.get("/api/resumes")
   async def get_resumes(current_user: User):
       tier = current_user.subscription_tier
       limit = RATE_LIMITS.get(tier, RATE_LIMITS["free"])
       # Apply limit
   ```

2. **Create Rate Limit Queue**

   ```python
   from aioredis import Redis

   async def check_rate_limit(user_id, endpoint):
       key = f"ratelimit:{user_id}:{endpoint}"
       count = await redis.incr(key)
       if count == 1:
           await redis.expire(key, 60)  # Reset after 60 seconds
       return count <= LIMIT
   ```

3. **Optimize High-Traffic Endpoints**

   ```python
   # Bad: Fetches all resumes
   @app.get("/api/resumes")
   async def get_resumes(user_id: int):
       return db.query(Resume).filter_by(user_id=user_id).all()

   # Good: Paginated with indices
   @app.get("/api/resumes")
   async def get_resumes(user_id: int, page: int = 1, limit: int = 20):
       skip = (page - 1) * limit
       return db.query(Resume).filter_by(user_id=user_id).offset(skip).limit(limit).all()
   ```

4. **Monitor and Alert**

   ```python
   from prometheus_client import Counter

   rate_limit_errors = Counter(
       'api_rate_limit_errors_total',
       'Total rate limit errors',
       ['endpoint', 'user_tier']
   )

   rate_limit_errors.labels(
       endpoint="/api/resumes",
       user_tier="free"
   ).inc()
   ```

### Prevention

- Document rate limits clearly in API documentation
- Provide rate limit headers in all responses
- Implement quota management dashboard for users
- Set up monitoring alerts for rate limit spikes
- Regular load testing to identify bottlenecks
- Educate clients on best practices (batching, caching)
- Implement circuit breaker pattern for dependent services

---

## Storage Quota Exceeded

### Overview

User has exceeded their allowed storage limit for resumes and associated files.

### Root Causes

- **Large PDF Files**: Generated PDFs consuming quota
- **Media Assets**: High-resolution images or videos
- **Undeleted Drafts**: Old resume versions not cleaned up
- **Version History**: Multiple versions of resumes stored
- **Temporary Files**: Cache or temporary files not cleaned up
- **Inadequate Quota**: Initial quota too low for user needs
- **No Cleanup Policy**: No automatic cleanup of old data

### Solutions

#### Immediate Fixes

1. **Check Storage Usage**

   ```python
   from sqlalchemy import func

   def get_user_storage_usage(user_id):
       total_size = db.query(func.sum(Resume.file_size)).filter_by(
           user_id=user_id
       ).scalar() or 0
       return total_size

   def get_user_quota(user_id):
       user = db.query(User).get(user_id)
       return user.storage_quota
   ```

2. **List Large Files**

   ```python
   def get_user_large_files(user_id, min_size_mb=5):
       large_files = db.query(Resume).filter(
           Resume.user_id == user_id,
           Resume.file_size > min_size_mb * 1024 * 1024
       ).order_by(Resume.file_size.desc()).all()
       return large_files
   ```

3. **Delete Old Drafts**

   ```python
   from datetime import datetime, timedelta

   def cleanup_old_drafts(user_id, days_old=30):
       cutoff_date = datetime.utcnow() - timedelta(days=days_old)
       old_drafts = db.query(Resume).filter(
           Resume.user_id == user_id,
           Resume.status == 'draft',
           Resume.created_at < cutoff_date
       ).all()

       for draft in old_drafts:
           db.delete(draft)
       db.commit()
   ```

4. **Compress Existing Files**

   ```python
   import zlib

   def compress_resume(resume_id):
       resume = db.query(Resume).get(resume_id)
       if resume.content:
           compressed = zlib.compress(resume.content.encode())
           resume.content_compressed = compressed
           original_size = len(resume.content.encode())
           compressed_size = len(compressed)
           resume.compression_ratio = compressed_size / original_size
           db.commit()
   ```

#### Long-term Solutions

1. **Implement Automatic Cleanup**

   ```python
   from celery import shared_task
   from datetime import datetime, timedelta

   @shared_task
   def cleanup_expired_drafts():
       cutoff_date = datetime.utcnow() - timedelta(days=30)
       expired = db.query(Resume).filter(
           Resume.status == 'draft',
           Resume.created_at < cutoff_date
       ).delete()
       logger.info(f"Cleaned up {expired} expired drafts")

   # Schedule in Celery Beat
   # celery beat: cleanup_expired_drafts every day at 2 AM
   ```

2. **Tiered Storage Quotas**

   ```python
   STORAGE_QUOTAS = {
       "free": 50 * 1024 * 1024,          # 50 MB
       "pro": 500 * 1024 * 1024,          # 500 MB
       "enterprise": 5 * 1024 * 1024 * 1024  # 5 GB
   }

   def get_user_quota(user_id):
       user = db.query(User).get(user_id)
       return STORAGE_QUOTAS.get(user.tier, STORAGE_QUOTAS["free"])
   ```

3. **Implement Storage Warnings**

   ```python
   def check_storage_quota(user_id):
       usage = get_user_storage_usage(user_id)
       quota = get_user_quota(user_id)
       usage_percent = (usage / quota) * 100

       if usage_percent >= 90:
           send_storage_warning_email(user_id, usage_percent)
           return "warning"
       elif usage_percent >= 100:
           return "exceeded"
       return "ok"
   ```

4. **Version Management**

   ```python
   class Resume(Base):
       __tablename__ = "resumes"

       id = Column(Integer, primary_key=True)
       user_id = Column(Integer, ForeignKey("users.id"))
       content = Column(Text)
       version = Column(Integer, default=1)
       created_at = Column(DateTime, default=datetime.utcnow)
       is_latest = Column(Boolean, default=True)

   def cleanup_old_versions(user_id, resume_id, keep_versions=5):
       old_versions = db.query(Resume).filter(
           Resume.user_id == user_id,
           Resume.resume_id == resume_id,
           Resume.is_latest == False
       ).order_by(Resume.created_at.desc()).offset(keep_versions).all()

       for version in old_versions:
           db.delete(version)
       db.commit()
   ```

### Prevention

- Set appropriate default quotas based on tier
- Display storage usage in user dashboard
- Implement storage warnings at 75%, 90%, 100%
- Auto-delete old drafts (> 30 days) weekly
- Keep only last 5 resume versions
- Compress PDF content using gzip
- Monitor storage growth trends
- Offer upgrade path when quota reached

---

## AI Provider Down

### Overview

AI provider (OpenAI, Anthropic, etc.) is unavailable, preventing AI-powered features.

### Root Causes

- **Service Outage**: Provider's servers are down
- **API Key Expired**: Key needs rotation or subscription needs renewal
- **Rate Limit**: Provider's rate limit exceeded
- **Network Issue**: Cannot reach provider's endpoint
- **Misconfigured Endpoint**: Wrong API endpoint URL
- **Invalid Request**: Request doesn't match provider's expected format
- **Authentication Failure**: API key invalid or insufficient permissions

### Solutions

#### Immediate Fixes

1. **Check Provider Status**

   ```python
   import httpx

   async def check_provider_health(provider: str):
       status_endpoints = {
           "openai": "https://status.openai.com/api/v2/status.json",
           "anthropic": "https://status.anthropic.com/api/v2/status.json"
       }

       if provider in status_endpoints:
           async with httpx.AsyncClient() as client:
               response = await client.get(status_endpoints[provider])
               return response.json()
   ```

2. **Verify API Credentials**

   ```python
   import os

   def verify_api_credentials(provider: str):
       if provider == "openai":
           api_key = os.getenv("OPENAI_API_KEY")
           if not api_key:
               return False, "OPENAI_API_KEY not set"
           if not api_key.startswith("sk-"):
               return False, "Invalid OpenAI API key format"
       return True, "Credentials valid"
   ```

3. **Implement Fallback Provider**

   ```python
   async def generate_resume_content(user_id, resume_data):
       providers = ["openai", "anthropic", "cohere"]  # Priority order

       for provider in providers:
           try:
               result = await call_ai_provider(provider, resume_data)
               return result
           except ProviderError as e:
               logger.warning(f"{provider} failed: {e}")
               continue

       # All providers failed
       return generate_default_content(resume_data)
   ```

4. **Test Connectivity**

   ```python
   import httpx

   async def test_provider_connection(provider: str):
       endpoints = {
           "openai": "https://api.openai.com/v1/models",
           "anthropic": "https://api.anthropic.com/status"
       }

       async with httpx.AsyncClient() as client:
           try:
               response = await client.get(
                   endpoints[provider],
                   headers={"Authorization": f"Bearer {API_KEY}"},
                   timeout=10.0
               )
               return response.status_code == 200
           except Exception as e:
               logger.error(f"Connection test failed: {e}")
               return False
   ```

#### Long-term Solutions

1. **Multi-Provider Strategy**

   ```python
   class AIProvider(ABC):
       @abstractmethod
       async def generate(self, prompt: str) -> str:
           pass

   class OpenAIProvider(AIProvider):
       async def generate(self, prompt: str) -> str:
           # Implementation
           pass

   class AnthropicProvider(AIProvider):
       async def generate(self, prompt: str) -> str:
           # Implementation
           pass

   @app.get("/api/generate")
   async def generate_resume(data: ResumeData):
       providers = [
           OpenAIProvider(),
           AnthropicProvider()
       ]
       for provider in providers:
           try:
               return await provider.generate(data.prompt)
           except ProviderError:
               continue
   ```

2. **Circuit Breaker Pattern**

   ```python
   from pybreaker import CircuitBreaker

   openai_breaker = CircuitBreaker(
       fail_max=5,
       reset_timeout=60,
       listeners=[on_circuit_opened, on_circuit_closed]
   )

   @openai_breaker
   async def call_openai(prompt: str):
       # Will automatically open circuit after 5 failures
       async with httpx.AsyncClient() as client:
           response = await client.post(
               "https://api.openai.com/v1/chat/completions",
               json={"messages": [{"role": "user", "content": prompt}]}
           )
           return response.json()
   ```

3. **Cache AI Responses**

   ```python
   from functools import lru_cache
   import hashlib

   def get_cache_key(prompt: str, model: str) -> str:
       return hashlib.md5(f"{model}:{prompt}".encode()).hexdigest()

   async def generate_with_cache(prompt: str, model: str = "gpt-4"):
       cache_key = get_cache_key(prompt, model)
       cached = redis.get(cache_key)

       if cached:
           logger.info(f"Cache hit for {cache_key}")
           return cached.decode()

       result = await call_ai_provider(prompt, model)
       redis.setex(cache_key, 86400, result)  # Cache for 24 hours
       return result
   ```

4. **Local/Degraded Mode**

   ```python
   def generate_default_content(resume_data):
       """Generate basic content when AI provider is unavailable"""
       template = """
       **Professional Summary**
       Experienced professional with expertise in {skills}.

       **Experience**
       {experience_text}

       **Education**
       {education_text}
       """
       return template.format(**resume_data.dict())
   ```

5. **Monitoring and Alerts**

   ```python
   from prometheus_client import Counter, Gauge

   ai_provider_errors = Counter(
       'ai_provider_errors_total',
       'Total AI provider errors',
       ['provider', 'error_type']
   )

   ai_provider_latency = Gauge(
       'ai_provider_latency_ms',
       'AI provider response latency',
       ['provider']
   )

   # Usage
   try:
       start = time.time()
       result = await openai_provider.generate(prompt)
       latency = (time.time() - start) * 1000
       ai_provider_latency.labels(provider="openai").set(latency)
   except Exception as e:
       ai_provider_errors.labels(
           provider="openai",
           error_type=type(e).__name__
       ).inc()
   ```

### Prevention

- Monitor provider health dashboards continuously
- Implement health check endpoints for each provider
- Rotate API keys every 90 days
- Set up alerts for provider error rates > 1%
- Maintain backup provider relationship
- Cache responses aggressively (24+ hours)
- Document provider rate limits and quotas
- Test failover procedures monthly
- Keep audit log of all provider calls
- Use Circuit Breaker to prevent cascading failures

---

## General Troubleshooting Tips

### Enable Debug Logging

```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.debug("Detailed debugging information")
```

### Check Environment Variables

```bash
# List all environment variables related to config
env | grep -E "(API|OAUTH|STORAGE|TIMEOUT|RATE)" | sort
```

### Database Health Check

```python
async def check_database_health():
    try:
        result = await db.execute("SELECT 1")
        return {"status": "healthy", "response_time": result.duration}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### Monitor Key Metrics

```python
# Track these in production
- API response times (p50, p95, p99)
- Error rates by status code (5xx, 4xx)
- Database query times
- Cache hit rate
- External service health (OAuth, AI providers)
- Queue depths and processing times
- Memory usage and disk space
```

### Useful Commands

```bash
# Check logs
tail -f /var/log/resumeai/app.log

# Monitor process
ps aux | grep python

# Check disk space
df -h

# Check memory usage
free -h

# Test connectivity to external service
curl -v https://api.openai.com/v1/models

# Check network ports
netstat -tuln | grep LISTEN
```

---

## Support and Escalation

If none of these solutions resolve your issue:

1. **Collect Diagnostic Information**
   - Full error message and stack trace
   - Request ID (from logs)
   - Timestamp of the issue
   - Steps to reproduce
   - Environment (staging/production)
   - Browser/client information

2. **Check Recent Changes**
   - Review deployment logs
   - Check for config changes
   - Look at recent commits

3. **Contact Support**
   - Include diagnostic info above
   - Provide access to relevant logs
   - Describe impact (number of users affected)

4. **Escalate if Critical**
   - Severity 1: System down, all users affected
   - Severity 2: Feature broken for subset of users
   - Severity 3: Workaround available
   - Severity 4: Documentation/enhancement

---

**Last Updated**: February 26, 2026

**Maintainer**: Engineering Team

**Related Documentation**:

- [ERROR_HANDLING_QUICK_REFERENCE.md](../ERROR_HANDLING_QUICK_REFERENCE.md)
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
