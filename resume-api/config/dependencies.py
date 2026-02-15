"""
Configuration dependencies and settings.
"""

import os
import time
from collections import defaultdict
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, Optional

from fastapi import Header, HTTPException, status
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from . import settings

# Secret key for JWT tokens - should be set in environment variables
SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resumeai.db")

# Other configurations
DEBUG = settings.debug

# Application settings
APP_NAME = settings.app_name
APP_VERSION = settings.app_version


# ============================================================
# Per-API-Key Rate Limiting Implementation
# ============================================================

class PerAPIKeyRateLimiter:
    """
    Per-API-key rate limiter that tracks requests for each API key.
    
    This implementation stores request timestamps for each API key and enforces
    rate limits per key based on their configured limits.
    """
    
    def __init__(self):
        """Initialize the rate limiter with empty storage."""
        self._requests: Dict[str, list] = defaultdict(list)
        self._limits: Dict[str, str] = {}  # API key -> rate limit string
        self._lock = Lock()
    
    def set_limit(self, api_key: str, limit: str):
        """Set the rate limit for a specific API key."""
        with self._lock:
            self._limits[api_key] = limit
    
    def get_limit(self, api_key: str) -> str:
        """Get the rate limit for a specific API key."""
        with self._lock:
            return self._limits.get(api_key, "100/minute")  # Default limit
    
    def _parse_limit(self, limit_str: str) -> tuple:
        """
        Parse rate limit string to (max_requests, window_seconds).
        
        Examples:
            "10/minute" -> (10, 60)
            "100/hour" -> (100, 3600)
            "5/second" -> (5, 1)
        """
        parts = limit_str.split("/")
        if len(parts) != 2:
            return (100, 60)  # Default
        
        try:
            count = int(parts[0])
            window = parts[1].strip().lower()
            
            if window == "second":
                return (count, 1)
            elif window == "minute":
                return (count, 60)
            elif window == "hour":
                return (count, 3600)
            elif window == "day":
                return (count, 86400)
            else:
                return (100, 60)  # Default
        except (ValueError, IndexError):
            return (100, 60)  # Default
    
    def check_rate_limit(self, api_key: str) -> tuple:
        """
        Check if the API key has exceeded its rate limit.
        
        Returns:
            tuple: (allowed: bool, current_count: int, limit: int, reset_time: int)
        """
        with self._lock:
            now = time.time()
            limit_str = self._limits.get(api_key, "100/minute")
            max_requests, window_seconds = self._parse_limit(limit_str)
            
            # Get existing requests for this key
            requests = self._requests[api_key]
            
            # Filter out old requests outside the window
            cutoff = now - window_seconds
            requests = [req_time for req_time in requests if req_time > cutoff]
            self._requests[api_key] = requests
            
            current_count = len(requests)
            
            if current_count >= max_requests:
                # Rate limit exceeded
                oldest_in_window = min(requests) if requests else now
                reset_time = int(oldest_in_window + window_seconds - now)
                return (False, current_count, max_requests, max(1, reset_time))
            
            # Add current request
            requests.append(now)
            self._requests[api_key] = requests
            
            return (True, current_count, max_requests, window_seconds)
    
    def get_remaining(self, api_key: str) -> int:
        """Get remaining requests for the API key."""
        allowed, current, max_requests, _ = self.check_rate_limit(api_key)
        if allowed:
            return max(0, max_requests - current)
        return 0
    
    def reset(self, api_key: str):
        """Reset the rate limit for an API key."""
        with self._lock:
            if api_key in self._requests:
                del self._requests[api_key]
            if api_key in self._limits:
                del self._limits[api_key]


# Global rate limiter instance
per_api_key_limiter = PerAPIKeyRateLimiter()


def get_request_identifier(request):
    """Get the request identifier for rate limiting (API key or IP)."""
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        return api_key
    return get_remote_address(request)


limiter = Limiter(key_func=get_request_identifier)


async def get_api_key(x_api_key: str = Header(None)) -> str:
    """Validate and return the API key."""
    if not settings.require_api_key:
        return "anonymous"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="API key is required"
        )
    if settings.master_api_key and x_api_key == settings.master_api_key:
        return x_api_key
    if settings.api_keys and x_api_key in settings.api_keys:
        return x_api_key
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")


async def check_api_key_rate_limit(api_key: str) -> None:
    """
    Check if the API key has exceeded its rate limit.
    
    Raises:
        HTTPException: If rate limit is exceeded
    """
    if not settings.enable_rate_limiting:
        return  # Rate limiting disabled
    
    if not api_key or api_key == "anonymous":
        return  # No rate limiting for anonymous requests
    
    # Check if it's the master key - use default higher limit
    if api_key == settings.master_api_key:
        limit = "1000/minute"  # Higher limit for master key
        per_api_key_limiter.set_limit(api_key, limit)
    
    allowed, current, max_requests, reset_time = per_api_key_limiter.check_rate_limit(api_key)
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. You have made {current} requests. "
                   f"Limit is {max_requests} requests per minute. "
                   f"Retry after {reset_time} seconds."
        )


async def get_rate_limit_info(api_key: str) -> dict:
    """Get rate limit information for an API key."""
    if not api_key or api_key == "anonymous":
        return {"remaining": -1, "limit": -1, "reset": -1}
    
    allowed, current, max_requests, reset_time = per_api_key_limiter.check_rate_limit(api_key)
    remaining = max(0, max_requests - current) if allowed else 0
    
    return {
        "remaining": remaining,
        "limit": max_requests,
        "reset": reset_time
    }


AuthorizedAPIKey = str


async def rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """Handle rate limit exceeded errors."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Rate limit exceeded",
            "detail": str(exc.detail),
            "retry_after": 60,
        },
    )
