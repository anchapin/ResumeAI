"""
Request Signing Middleware for ResumeAI API

Implements HMAC-SHA256 request signing to protect against:
- Request tampering
- Man-in-the-middle attacks
- Replay attacks (via timestamp and nonce validation)

All sensitive endpoints (auth, billing) require signed requests.
"""

import hashlib
import hmac
import secrets
import time
from typing import Callable, Optional, Set
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from monitoring import logging_config
from lib.utils.cache import get_cache_manager, CacheBackend

logger = logging_config.get_logger(__name__)

SIGNATURE_HEADER = "X-Signature"
TIMESTAMP_HEADER = "X-Timestamp"
NONCE_HEADER = "X-Nonce"
SIGNED_HEADER = "X-Signed"

REQUEST_SIGNATURE_EXPIRY_SECONDS = 300
NONCE_CACHE_SIZE = 10000

SIGNATURE_PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

SIGNATURE_REQUIRED_PATHS = {
    f"{settings.api_v1_prefix}/auth/login",
    f"{settings.api_v1_prefix}/auth/register",
    f"{settings.api_v1_prefix}/auth/refresh",
    f"{settings.api_v1_prefix}/auth/logout",
    f"{settings.api_v1_prefix}/auth/change-password",
    f"{settings.api_v1_prefix}/billing/checkout",
    f"{settings.api_v1_prefix}/billing/portal",
    f"{settings.api_v1_prefix}/billing/cancel",
    f"{settings.api_v1_prefix}/billing/resume",
    f"{settings.api_v1_prefix}/billing/upgrade",
    f"{settings.api_v1_prefix}/billing/payment-methods",
}

SIGNATURE_EXEMPT_PATHS = {
    f"{settings.api_v1_prefix}/health",
    f"{settings.api_v1_prefix}/health/detailed",
    f"{settings.api_v1_prefix}/health/oauth",
    f"{settings.api_v1_prefix}/health/ready",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/metrics",
}


class NonceCache:
    """
    Cache for nonces to prevent replay attacks.
    Uses Redis if available, otherwise falls back to in-memory set.
    """

    def __init__(self, max_size: int = NONCE_CACHE_SIZE):
        self._local_cache: Set[str] = set()
        self._max_size = max_size

    async def add(self, nonce: str) -> bool:
        """
        Add nonce to cache. Returns True if added (new), False if exists.
        """
        cache_mgr = get_cache_manager()

        if cache_mgr.backend_type == CacheBackend.REDIS:
            try:
                key = f"nonce:{nonce}"
                redis = cache_mgr.backend.redis
                # Set with NX=True (set if not exists) and EX (expiry)
                result = await redis.set(
                    key, "1", ex=REQUEST_SIGNATURE_EXPIRY_SECONDS, nx=True
                )
                return result is True or result == "OK"
            except Exception as e:
                logger.warning(f"Redis nonce cache error: {e}. Falling back to memory.")

        # In-memory fallback
        if nonce in self._local_cache:
            return False

        self._local_cache.add(nonce)
        if len(self._local_cache) > self._max_size:
            # Simple eviction: clear everything if max size exceeded
            self._local_cache.clear()
        return True

    def clear(self):
        """Clear the local cache."""
        self._local_cache.clear()


nonce_cache = NonceCache()


def compute_signature(
    secret_key: str,
    method: str,
    path: str,
    timestamp: str,
    nonce: str,
    body: bytes = b"",
) -> str:
    message = f"{method}\n{path}\n{timestamp}\n{nonce}\n".encode() + body
    signature = hmac.new(
        secret_key.encode(),
        message,
        hashlib.sha256,
    ).hexdigest()
    return signature


def get_client_secret(request: Request) -> Optional[str]:
    """
    Get the secret key for a client.
    Currently uses a global secret, but could be extended for per-client secrets.
    """
    # Extended per-client secret logic could go here
    return settings.request_signing_secret


class RequestSigningMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        secret_key: Optional[str] = None,
        require_signatures: bool = True,
    ):
        super().__init__(app)
        self._secret_key = (
            secret_key or settings.request_signing_secret or secrets.token_hex(32)
        )
        self._require_signatures = (
            require_signatures and settings.enable_request_signing
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not self._require_signatures or not settings.enable_request_signing:
            return await call_next(request)

        path = request.url.path

        if path in SIGNATURE_EXEMPT_PATHS:
            return await call_next(request)

        # Apply to state-changing methods or specifically listed paths
        is_protected_method = request.method in SIGNATURE_PROTECTED_METHODS
        is_required_path = path in SIGNATURE_REQUIRED_PATHS
        is_auth_billing_path = path.startswith(
            f"{settings.api_v1_prefix}/auth/"
        ) or path.startswith(f"{settings.api_v1_prefix}/billing/")

        if is_required_path or (is_protected_method and is_auth_billing_path):
            return await self._process_signed_request(request, call_next)

        return await call_next(request)

    async def _process_signed_request(
        self, request: Request, call_next: Callable
    ) -> Response:
        method = request.method

        timestamp = request.headers.get(TIMESTAMP_HEADER)
        nonce = request.headers.get(NONCE_HEADER)
        signature = request.headers.get(SIGNATURE_HEADER)

        if not timestamp or not nonce or not signature:
            logger.warning(
                "request_signing_failed",
                path=request.url.path,
                reason="missing_headers",
                method=method,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Request signing headers required: X-Timestamp, X-Nonce, X-Signature",
            )

        try:
            request_time = int(timestamp)
        except ValueError:
            logger.warning(
                "request_signing_failed",
                path=request.url.path,
                reason="invalid_timestamp",
                method=method,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid timestamp format",
            )

        current_time = int(time.time())
        time_diff = abs(current_time - request_time)
        if time_diff > REQUEST_SIGNATURE_EXPIRY_SECONDS:
            logger.warning(
                "request_signing_failed",
                path=request.url.path,
                reason="timestamp_expired",
                method=method,
                time_diff=time_diff,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Request timestamp expired. Please generate a new signature.",
            )

        # Check nonce (Replay attack protection)
        if not await nonce_cache.add(nonce):
            logger.warning(
                "request_signing_failed",
                path=request.url.path,
                reason="nonce_replay",
                method=method,
                nonce=nonce[:16] + "...",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Nonce has already been used",
            )

        # Get request body for signature verification
        body = b""
        if method in {"POST", "PUT", "PATCH", "DELETE"}:
            # Be careful with request.body() as it consumes the stream
            # BaseHTTPMiddleware handles this by making request.body() repeatable
            body = await request.body()

        computed_signature = compute_signature(
            secret_key=self._secret_key,
            method=method,
            path=request.url.path,
            timestamp=timestamp,
            nonce=nonce,
            body=body,
        )

        if not hmac.compare_digest(signature, computed_signature):
            logger.warning(
                "request_signing_failed",
                path=request.url.path,
                reason="invalid_signature",
                method=method,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid request signature",
            )

        response = await call_next(request)
        response.headers[SIGNED_HEADER] = "true"
        return response
