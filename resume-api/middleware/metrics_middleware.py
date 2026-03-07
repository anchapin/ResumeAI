"""
Prometheus metrics middleware for FastAPI.

Auto-instruments all HTTP endpoints with request/response metrics.
Tracks latency, errors, request/response sizes, and per-endpoint metrics.
"""

import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from lib.monitoring.prometheus_exporter import get_exporter


class MetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware to collect HTTP metrics for all endpoints.

    Measures:
    - Request/response duration
    - Request/response sizes
    - HTTP status codes
    - Errors and error types
    - Per-endpoint metrics
    """

    def __init__(self, app: ASGIApp):
        """Initialize the metrics middleware."""
        super().__init__(app)
        self.exporter = get_exporter()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Middleware dispatch that collects metrics for the request/response.
        """
        # Start timing
        start_time = time.time()

        # Extract request information
        method = request.method
        path = request.url.path
        endpoint = self._normalize_endpoint(path)

        # Track in-progress request
        self.exporter.http_in_progress.labels(method=method, endpoint=endpoint).inc()

        # Get request size
        request_size = 0
        try:
            if request.method in ["POST", "PUT", "PATCH"]:
                # Try to get content length
                content_length = request.headers.get("content-length")
                if content_length:
                    request_size = int(content_length)
        except (ValueError, TypeError):
            pass

        # Record request size
        if request_size > 0:
            self.exporter.http_request_size_bytes.labels(method=method, endpoint=endpoint).observe(
                request_size
            )

        # Call the endpoint
        response = None
        status_code = 500
        error_type = None

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # Handle unhandled exceptions
            status_code = 500
            error_type = type(e).__name__
            raise
        finally:
            # Calculate duration
            duration = time.time() - start_time

            # Get response size
            response_size = 0
            if response:
                content_length = response.headers.get("content-length")
                if content_length:
                    try:
                        response_size = int(content_length)
                    except (ValueError, TypeError):
                        pass

            # Record metrics
            self.exporter.record_http_request(
                method=method,
                endpoint=endpoint,
                status_code=status_code,
                duration=duration,
                request_size=request_size,
                response_size=response_size,
                error_type=error_type,
            )

            # Decrement in-progress counter
            self.exporter.http_in_progress.labels(method=method, endpoint=endpoint).dec()

        return response

    def _normalize_endpoint(self, path: str) -> str:
        """
        Normalize the request path to an endpoint pattern.

        This groups similar endpoints together, e.g.:
        - /v1/render/pdf/{resume_id} -> /v1/render/pdf/{resume_id}
        - /api/users/123 -> /api/users/{user_id}
        """
        # Keep the path as-is for now (can be enhanced with path templates)
        # In production, use route patterns from the app
        return path


class RateLimitMetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to track rate limit violations."""

    def __init__(self, app: ASGIApp):
        """Initialize the rate limit metrics middleware."""
        super().__init__(app)
        self.exporter = get_exporter()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Record rate limit metrics."""
        response = await call_next(request)

        # Check for rate limit response
        if response.status_code == 429:  # Too Many Requests
            endpoint = self._normalize_endpoint(request.url.path)
            client_id = request.client.host if request.client else "unknown"

            self.exporter.rate_limit_exceeded_total.labels(
                endpoint=endpoint, client_id=client_id
            ).inc()

            # Add retry-after header if not present
            if "retry-after" not in response.headers:
                response.headers["retry-after"] = "60"

        return response

    def _normalize_endpoint(self, path: str) -> str:
        """Normalize the request path."""
        return path


class CacheMetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to track cache hits/misses for specific endpoints."""

    def __init__(self, app: ASGIApp, cached_endpoints: list = None):
        """
        Initialize cache metrics middleware.

        Args:
            app: ASGI application
            cached_endpoints: List of endpoint paths to track cache metrics for
        """
        super().__init__(app)
        self.exporter = get_exporter()
        self.cached_endpoints = cached_endpoints or []

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Record cache metrics for specific endpoints."""
        path = request.url.path
        should_track = any(path.startswith(ep) for ep in self.cached_endpoints)

        if should_track:
            # Check if response comes from cache
            response = await call_next(request)

            # Check for cache header
            cache_status = response.headers.get("x-cache-status", "unknown")

            if cache_status == "HIT":
                self.exporter.record_cache_hit("http_cache", path)
            elif cache_status == "MISS":
                self.exporter.record_cache_miss("http_cache", path)

            return response
        else:
            return await call_next(request)


class AsyncJobMetricsMiddleware:
    """
    Middleware for tracking async job metrics.

    Should be used with background task/job systems.
    """

    def __init__(self):
        """Initialize async job metrics middleware."""
        self.exporter = get_exporter()

    def record_job_start(self, queue_name: str, job_id: str, job_type: str) -> float:
        """
        Record the start of an async job.

        Returns the start time for use in record_job_end.
        """
        return time.time()

    def record_job_end(
        self,
        queue_name: str,
        job_id: str,
        job_type: str,
        start_time: float,
        status: str = "success",
        failure_reason: str = None,
    ):
        """Record the completion of an async job."""
        duration = time.time() - start_time
        self.exporter.record_async_job(
            queue_name=queue_name,
            job_type=job_type,
            duration=duration,
            status=status,
            failure_reason=failure_reason,
        )


class DatabaseMetricsMiddleware:
    """
    Middleware for tracking database query metrics.

    Should be integrated with SQLAlchemy or database driver.
    """

    def __init__(self):
        """Initialize database metrics middleware."""
        self.exporter = get_exporter()

    def record_query_start(self) -> float:
        """Record the start of a database query."""
        return time.time()

    def record_query_end(
        self, start_time: float, operation: str, table: str, status: str = "success"
    ):
        """Record the completion of a database query."""
        duration = time.time() - start_time
        self.exporter.record_db_query(
            operation=operation, table=table, duration=duration, status=status
        )


class AIMetricsMiddleware:
    """
    Middleware for tracking AI provider request metrics.

    Should be integrated with AI provider clients.
    """

    def __init__(self):
        """Initialize AI metrics middleware."""
        self.exporter = get_exporter()

    def record_ai_request_start(self) -> float:
        """Record the start of an AI request."""
        return time.time()

    def record_ai_request_end(
        self,
        start_time: float,
        provider: str,
        model: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        cost: float = 0.0,
        status: str = "success",
        error_type: str = None,
    ):
        """Record the completion of an AI request."""
        duration = time.time() - start_time
        self.exporter.record_ai_request(
            provider=provider,
            model=model,
            duration=duration,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=cost,
            status=status,
            error_type=error_type,
        )
