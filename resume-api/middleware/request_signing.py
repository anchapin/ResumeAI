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
    def __init__(self, max_size: int = NONCE_CACHE_SIZE):
        self._cache: Set[str] = set()
        self._max_size = max_size

    def add(self, nonce: str) -> bool:
        if nonce in self._cache:
            return False
        self._cache.add(nonce)
        if len(self._cache) > self._max_size:
            self._cache.clear()
        return True

    def clear(self):
        self._cache.clear()


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
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"apikey:{api_key}"

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        return f"token:{token[:32]}"

    return None


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

        if path.startswith(f"{settings.api_v1_prefix}/auth/") or path.startswith(f"{settings.api_v1_prefix}/billing/"):
            return await self._process_signed_request(request, call_next)

        return await call_next(request)

    async def _process_signed_request(
        self, request: Request, call_next: Callable
    ) -> Response:
        method = request.method

        if method not in SIGNATURE_PROTECTED_METHODS:
            return await call_next(request)

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

        if not nonce_cache.add(nonce):
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

        body = b""
        if method in {"POST", "PUT", "PATCH", "DELETE"}:
            body = await request.body()
            if isinstance(body, str):
                body = body.encode()

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
