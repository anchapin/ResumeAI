"""
Monitoring middleware for request tracking, logging, and metrics collection.
"""

import time
import uuid
from contextlib import asynccontextmanager
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config import settings
from monitoring import logging_config, metrics, analytics

logger = logging_config.get_logger(__name__)


class MonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to track requests, log them, and record metrics."""

    async def dispatch(self, request: Request, call_next):
        """Process request and track metrics."""
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Extract client IP
        client_ip = self._get_client_ip(request)
        request.state.client_ip = client_ip

        # Add request context to logs
        with logging_config.RequestContext(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
        ):
            # Extract API key for user tracking (if present)
            api_key = request.headers.get("X-API-KEY", None)
            user_id = self._get_user_id(api_key) if api_key else None

            # Bind user_id to context for all subsequent logs in this request
            if user_id:
                structlog.contextvars.bind_contextvars(user_id=user_id)

            # Log request start
            logger.info(
                "request_started",
                method=request.method,
                path=request.url.path,
                query_params=self._sanitize_query_params(request.query_params),
                user_agent=request.headers.get("user-agent", ""),
                user_id=user_id,
            )

            # Start timer
            start_time = time.time()

            try:
                # Process request
                response: Response = await call_next(request)

                # Calculate duration
                duration_ms = (time.time() - start_time) * 1000
                request.state.duration_ms = duration_ms

                # Record metrics
                if settings.enable_metrics:
                    metrics.increment_http_requests(
                        method=request.method,
                        endpoint=request.url.path,
                        status_code=response.status_code,
                    )
                    metrics.observe_http_request_duration(
                        method=request.method,
                        endpoint=request.url.path,
                        duration_seconds=duration_ms / 1000.0,
                    )

                    # Record errors
                    if response.status_code >= 400:
                        metrics.increment_http_errors(
                            method=request.method,
                            endpoint=request.url.path,
                            status_code=response.status_code,
                        )

                # Log request completion
                logging_config.log_request(
                    logger=logger,
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    user_id=user_id,
                )

                # Record analytics
                if settings.enable_analytics:
                    await analytics.record_request(
                        endpoint=request.url.path,
                        method=request.method,
                        status_code=response.status_code,
                        user_id=user_id,
                        request_id=request_id,
                        client_ip=client_ip,
                        duration_ms=duration_ms,
                    )

                # Add request ID to response headers
                response.headers["X-Request-ID"] = request_id

                return response

            except Exception as exc:
                # Calculate duration even for errors
                duration_ms = (time.time() - start_time) * 1000

                # Log exception
                logging_config.log_exception(
                    logger=logger,
                    exc=exc,
                    method=request.method,
                    path=request.url.path,
                    duration_ms=duration_ms,
                    user_id=user_id,
                )

                # Record error metrics
                if settings.enable_metrics:
                    metrics.increment_http_errors(
                        method=request.method,
                        endpoint=request.url.path,
                        status_code=500,
                    )

                # Record analytics
                if settings.enable_analytics:
                    await analytics.record_error(
                        endpoint=request.url.path,
                        error_type=type(exc).__name__,
                        error_message=str(exc),
                        user_id=user_id,
                        request_id=request_id,
                    )

                # Re-raise to let FastAPI handle it
                raise

    def _sanitize_query_params(self, params) -> str:
        """Sanitize query parameters for logging."""
        if not params:
            return ""

        # List of sensitive keys to redact (exact match)
        sensitive_exact = {
            "token",
            "code",
            "state",
            "key",
            "authorization",
            "password",
            "secret",
        }

        # Suffixes that indicate sensitivity
        sensitive_suffixes = (
            "_token",
            "_key",
            "_secret",
            "_password",
            "_hash",
            "_signature",
        )

        try:
            # params is a Starlette QueryParams object which behaves like a dict
            sanitized = []
            for key, value in params.items():
                key_lower = key.lower()

                is_sensitive = (
                    key_lower in sensitive_exact
                    or key_lower.endswith(sensitive_suffixes)
                    or "password" in key_lower
                    or "secret" in key_lower
                )

                if is_sensitive:
                    sanitized.append(f"{key}=[REDACTED]")
                else:
                    sanitized.append(f"{key}={value}")

            return "&".join(sanitized)
        except Exception:
            # Fallback for unexpected types
            return str(params)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check forwarded headers first (for reverse proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        x_real_ip = request.headers.get("X-Real-IP")
        if x_real_ip:
            return x_real_ip

        # Fall back to direct connection
        if request.client:
            return request.client.host

        return "unknown"

    def _get_user_id(self, api_key: str) -> str | None:
        """Extract user ID from API key."""
        # This is a simple implementation - in production you would
        # validate the API key against a database to get the real user ID
        if api_key and api_key.startswith("rai_"):
            # Return a hash of the API key as a user ID
            import hashlib

            return hashlib.sha256(api_key.encode()).hexdigest()[:16]
        return None


@asynccontextmanager
async def track_business_metric(metric_name: str, **labels):
    """
    Context manager for tracking business metrics in async code.

    Usage:
        async with track_business_metric("pdf_generation", variant="modern"):
            pdf_bytes = generate_pdf(...)
    """
    start_time = time.time()
    try:
        yield
        duration = time.time() - start_time
        logger.info(
            "business_metric",
            metric_name=metric_name,
            duration_ms=duration * 1000,
            **labels,
        )
    except Exception as exc:
        duration = time.time() - start_time
        logger.error(
            "business_metric_failed",
            metric_name=metric_name,
            duration_ms=duration * 1000,
            error=str(exc),
            **labels,
        )
        raise
