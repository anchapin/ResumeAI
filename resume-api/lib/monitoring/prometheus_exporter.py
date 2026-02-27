"""
Enhanced Prometheus metrics exporter for Resume API.

Provides comprehensive metrics collection for:
- Resume operations (generation, tailoring, variants)
- HTTP request metrics
- AI provider metrics
- Database connection metrics
- Cache performance metrics
- Queue depth metrics
"""

from prometheus_client import Counter, Histogram, Gauge, Info, CollectorRegistry
from prometheus_client.multiprocess import MultiProcessCollector
from prometheus_client.generate_latest import generate_latest
import os
from typing import Optional, Dict, List
from dataclasses import dataclass
from enum import Enum


class MetricScope(str, Enum):
    """Metric scope/category."""

    HTTP = "http"
    BUSINESS = "business"
    AI = "ai"
    DATABASE = "database"
    CACHE = "cache"
    QUEUE = "queue"
    RESOURCE = "resource"
    OAUTH = "oauth"


@dataclass
class MetricConfig:
    """Configuration for metric collection."""

    enable_multiprocess: bool = False
    multiprocess_dir: Optional[str] = None
    include_exemplars: bool = True
    bucket_size_bytes: int = 1000000  # 1MB


class PrometheusExporter:
    """
    Central Prometheus metrics exporter.

    Manages all custom metrics for the Resume API and provides
    a unified interface for metric collection and export.
    """

    def __init__(self, config: Optional[MetricConfig] = None):
        """Initialize the Prometheus exporter."""
        self.config = config or MetricConfig()

        # Create registry
        if self.config.enable_multiprocess and self.config.multiprocess_dir:
            self.registry = CollectorRegistry()
            MultiProcessCollector(self.registry)
        else:
            self.registry = CollectorRegistry()

        # Initialize all metrics
        self._init_http_metrics()
        self._init_business_metrics()
        self._init_ai_metrics()
        self._init_database_metrics()
        self._init_cache_metrics()
        self._init_queue_metrics()
        self._init_resource_metrics()
        self._init_oauth_metrics()
        self._init_info_metrics()

    # ============================================================================
    # HTTP Metrics
    # ============================================================================

    def _init_http_metrics(self):
        """Initialize HTTP request metrics."""
        self.http_requests_total = Counter(
            "http_requests_total",
            "Total HTTP requests by method, endpoint, and status code",
            ["method", "endpoint", "status_code"],
            registry=self.registry,
        )

        self.http_request_duration_seconds = Histogram(
            "http_request_duration_seconds",
            "HTTP request latency in seconds",
            ["method", "endpoint"],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
            registry=self.registry,
        )

        self.http_request_size_bytes = Histogram(
            "http_request_size_bytes",
            "HTTP request body size in bytes",
            ["method", "endpoint"],
            buckets=(
                100,
                500,
                1000,
                5000,
                10000,
                50000,
                100000,
                self.config.bucket_size_bytes,
            ),
            registry=self.registry,
        )

        self.http_response_size_bytes = Histogram(
            "http_response_size_bytes",
            "HTTP response body size in bytes",
            ["method", "endpoint", "status_code"],
            buckets=(
                100,
                500,
                1000,
                5000,
                10000,
                50000,
                100000,
                self.config.bucket_size_bytes,
            ),
            registry=self.registry,
        )

        self.http_errors_total = Counter(
            "http_errors_total",
            "Total HTTP errors by method, endpoint, and status code",
            ["method", "endpoint", "status_code", "error_type"],
            registry=self.registry,
        )

        self.http_in_progress = Gauge(
            "http_requests_in_progress",
            "HTTP requests currently in progress",
            ["method", "endpoint"],
            registry=self.registry,
        )

        self.rate_limit_exceeded_total = Counter(
            "rate_limit_exceeded_total",
            "Total rate limit violations by endpoint",
            ["endpoint", "client_id"],
            registry=self.registry,
        )

    def record_http_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        duration: float,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None,
        error_type: Optional[str] = None,
    ):
        """Record HTTP request metrics."""
        self.http_requests_total.labels(
            method=method, endpoint=endpoint, status_code=status_code
        ).inc()

        self.http_request_duration_seconds.labels(
            method=method, endpoint=endpoint
        ).observe(duration)

        if request_size:
            self.http_request_size_bytes.labels(
                method=method, endpoint=endpoint
            ).observe(request_size)

        if response_size:
            self.http_response_size_bytes.labels(
                method=method, endpoint=endpoint, status_code=status_code
            ).observe(response_size)

        if status_code >= 400:
            error_type = error_type or "unknown"
            self.http_errors_total.labels(
                method=method,
                endpoint=endpoint,
                status_code=status_code,
                error_type=error_type,
            ).inc()

    # ============================================================================
    # Business Metrics
    # ============================================================================

    def _init_business_metrics(self):
        """Initialize business operation metrics."""
        self.pdfs_generated_total = Counter(
            "pdfs_generated_total",
            "Total PDFs generated by variant",
            ["variant", "template", "status"],
            registry=self.registry,
        )

        self.pdf_generation_duration_seconds = Histogram(
            "pdf_generation_duration_seconds",
            "PDF generation latency in seconds",
            ["variant", "template"],
            buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0),
            registry=self.registry,
        )

        self.resumes_tailored_total = Counter(
            "resumes_tailored_total",
            "Total resumes tailored by AI provider",
            ["ai_provider", "model", "status"],
            registry=self.registry,
        )

        self.resume_tailor_duration_seconds = Histogram(
            "resume_tailor_duration_seconds",
            "Resume tailoring latency in seconds",
            ["ai_provider", "model"],
            buckets=(1.0, 2.0, 5.0, 10.0, 30.0, 60.0),
            registry=self.registry,
        )

        self.variants_listed_total = Counter(
            "variants_listed_total",
            "Total variant list operations",
            ["status"],
            registry=self.registry,
        )

        self.active_resumes = Gauge(
            "active_resumes",
            "Number of active resumes in the system",
            registry=self.registry,
        )

        self.total_users = Gauge(
            "total_users",
            "Total number of registered users",
            registry=self.registry,
        )

    def record_pdf_generation(
        self, variant: str, template: str, duration: float, status: str = "success"
    ):
        """Record PDF generation metrics."""
        self.pdfs_generated_total.labels(
            variant=variant, template=template, status=status
        ).inc()
        self.pdf_generation_duration_seconds.labels(
            variant=variant, template=template
        ).observe(duration)

    def record_resume_tailor(
        self, ai_provider: str, model: str, duration: float, status: str = "success"
    ):
        """Record resume tailoring metrics."""
        self.resumes_tailored_total.labels(
            ai_provider=ai_provider, model=model, status=status
        ).inc()
        self.resume_tailor_duration_seconds.labels(
            ai_provider=ai_provider, model=model
        ).observe(duration)

    # ============================================================================
    # AI Provider Metrics
    # ============================================================================

    def _init_ai_metrics(self):
        """Initialize AI provider metrics."""
        self.ai_requests_total = Counter(
            "ai_requests_total",
            "Total AI API requests by provider and model",
            ["provider", "model", "status"],
            registry=self.registry,
        )

        self.ai_request_duration_seconds = Histogram(
            "ai_request_duration_seconds",
            "AI API request latency in seconds",
            ["provider", "model"],
            buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0),
            registry=self.registry,
        )

        self.ai_request_tokens_total = Counter(
            "ai_request_tokens_total",
            "Total tokens used in AI requests",
            ["provider", "model", "token_type"],  # token_type: input, output, total
            registry=self.registry,
        )

        self.ai_request_cost_usd = Counter(
            "ai_request_cost_usd",
            "Total cost of AI requests in USD",
            ["provider", "model"],
            registry=self.registry,
        )

        self.ai_rate_limit_hits_total = Counter(
            "ai_rate_limit_hits_total",
            "Total rate limit hits from AI providers",
            ["provider", "model"],
            registry=self.registry,
        )

        self.ai_provider_errors_total = Counter(
            "ai_provider_errors_total",
            "Total errors from AI providers",
            ["provider", "error_type"],
            registry=self.registry,
        )

    def record_ai_request(
        self,
        provider: str,
        model: str,
        duration: float,
        input_tokens: int = 0,
        output_tokens: int = 0,
        cost: float = 0.0,
        status: str = "success",
        error_type: Optional[str] = None,
    ):
        """Record AI request metrics."""
        self.ai_requests_total.labels(
            provider=provider, model=model, status=status
        ).inc()
        self.ai_request_duration_seconds.labels(provider=provider, model=model).observe(
            duration
        )

        if input_tokens:
            self.ai_request_tokens_total.labels(
                provider=provider, model=model, token_type="input"
            ).inc(input_tokens)
        if output_tokens:
            self.ai_request_tokens_total.labels(
                provider=provider, model=model, token_type="output"
            ).inc(output_tokens)

        if cost > 0:
            self.ai_request_cost_usd.labels(provider=provider, model=model).inc(cost)

        if error_type:
            self.ai_provider_errors_total.labels(
                provider=provider, error_type=error_type
            ).inc()

    # ============================================================================
    # Database Metrics
    # ============================================================================

    def _init_database_metrics(self):
        """Initialize database metrics."""
        self.db_connections_active = Gauge(
            "db_connections_active",
            "Number of active database connections",
            ["pool_name"],
            registry=self.registry,
        )

        self.db_connections_waiting = Gauge(
            "db_connections_waiting",
            "Number of connections waiting for available pool slot",
            ["pool_name"],
            registry=self.registry,
        )

        self.db_query_duration_seconds = Histogram(
            "db_query_duration_seconds",
            "Database query latency in seconds",
            ["operation", "table"],
            buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0),
            registry=self.registry,
        )

        self.db_queries_total = Counter(
            "db_queries_total",
            "Total database queries by operation and table",
            ["operation", "table", "status"],
            registry=self.registry,
        )

        self.db_transaction_duration_seconds = Histogram(
            "db_transaction_duration_seconds",
            "Database transaction latency in seconds",
            registry=self.registry,
            buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0),
        )

        self.db_slow_queries_total = Counter(
            "db_slow_queries_total",
            "Total slow database queries (>1s)",
            ["operation", "table"],
            registry=self.registry,
        )

    def record_db_query(
        self, operation: str, table: str, duration: float, status: str = "success"
    ):
        """Record database query metrics."""
        self.db_queries_total.labels(
            operation=operation, table=table, status=status
        ).inc()
        self.db_query_duration_seconds.labels(operation=operation, table=table).observe(
            duration
        )

        if duration > 1.0:
            self.db_slow_queries_total.labels(operation=operation, table=table).inc()

    # ============================================================================
    # Cache Metrics
    # ============================================================================

    def _init_cache_metrics(self):
        """Initialize cache metrics."""
        self.cache_hits_total = Counter(
            "cache_hits_total",
            "Total cache hits by cache type",
            ["cache_type", "key_pattern"],
            registry=self.registry,
        )

        self.cache_misses_total = Counter(
            "cache_misses_total",
            "Total cache misses by cache type",
            ["cache_type", "key_pattern"],
            registry=self.registry,
        )

        self.cache_evictions_total = Counter(
            "cache_evictions_total",
            "Total cache evictions by cache type",
            ["cache_type", "reason"],
            registry=self.registry,
        )

        self.cache_size_bytes = Gauge(
            "cache_size_bytes",
            "Current cache size in bytes",
            ["cache_type"],
            registry=self.registry,
        )

        self.cache_entries = Gauge(
            "cache_entries",
            "Number of entries in cache",
            ["cache_type"],
            registry=self.registry,
        )

    def record_cache_hit(self, cache_type: str, key_pattern: str = "default"):
        """Record cache hit."""
        self.cache_hits_total.labels(
            cache_type=cache_type, key_pattern=key_pattern
        ).inc()

    def record_cache_miss(self, cache_type: str, key_pattern: str = "default"):
        """Record cache miss."""
        self.cache_misses_total.labels(
            cache_type=cache_type, key_pattern=key_pattern
        ).inc()

    # ============================================================================
    # Queue Metrics
    # ============================================================================

    def _init_queue_metrics(self):
        """Initialize async queue metrics."""
        self.async_queue_depth = Gauge(
            "async_queue_depth",
            "Current depth of async job queue",
            ["queue_name"],
            registry=self.registry,
        )

        self.async_jobs_total = Counter(
            "async_jobs_total",
            "Total async jobs processed",
            ["queue_name", "status"],
            registry=self.registry,
        )

        self.async_job_duration_seconds = Histogram(
            "async_job_duration_seconds",
            "Async job processing time in seconds",
            ["queue_name", "job_type"],
            buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 300.0),
            registry=self.registry,
        )

        self.async_job_failures_total = Counter(
            "async_job_failures_total",
            "Total failed async jobs",
            ["queue_name", "job_type", "failure_reason"],
            registry=self.registry,
        )

        self.async_job_retries_total = Counter(
            "async_job_retries_total",
            "Total async job retries",
            ["queue_name", "job_type"],
            registry=self.registry,
        )

    def record_async_job(
        self,
        queue_name: str,
        job_type: str,
        duration: float,
        status: str = "success",
        failure_reason: Optional[str] = None,
    ):
        """Record async job metrics."""
        self.async_jobs_total.labels(queue_name=queue_name, status=status).inc()
        self.async_job_duration_seconds.labels(
            queue_name=queue_name, job_type=job_type
        ).observe(duration)

        if failure_reason:
            self.async_job_failures_total.labels(
                queue_name=queue_name, job_type=job_type, failure_reason=failure_reason
            ).inc()

    # ============================================================================
    # Resource Metrics
    # ============================================================================

    def _init_resource_metrics(self):
        """Initialize resource metrics."""
        self.process_cpu_seconds_total = Counter(
            "process_cpu_seconds_total",
            "Total user and system CPU time spent in seconds",
            registry=self.registry,
        )

        self.process_resident_memory_bytes = Gauge(
            "process_resident_memory_bytes",
            "Resident memory used by the process in bytes",
            registry=self.registry,
        )

        self.process_virtual_memory_bytes = Gauge(
            "process_virtual_memory_bytes",
            "Virtual memory used by the process in bytes",
            registry=self.registry,
        )

        self.process_open_fds = Gauge(
            "process_open_fds",
            "Number of open file descriptors",
            registry=self.registry,
        )

        self.process_max_fds = Gauge(
            "process_max_fds",
            "Maximum number of open file descriptors",
            registry=self.registry,
        )

    # ============================================================================
    # OAuth Metrics
    # ============================================================================

    def _init_oauth_metrics(self):
        """Initialize OAuth metrics."""
        self.oauth_connection_success_total = Counter(
            "oauth_connection_success_total",
            "Total successful OAuth connections",
            ["provider"],
            registry=self.registry,
        )

        self.oauth_connection_failure_total = Counter(
            "oauth_connection_failure_total",
            "Total failed OAuth connections",
            ["provider", "error_type"],
            registry=self.registry,
        )

        self.oauth_token_refresh_total = Counter(
            "oauth_token_refresh_total",
            "Total OAuth token refreshes",
            ["provider", "status"],
            registry=self.registry,
        )

        self.oauth_active_connections = Gauge(
            "oauth_active_connections",
            "Currently active OAuth connections",
            ["provider"],
            registry=self.registry,
        )

    # ============================================================================
    # Info Metrics
    # ============================================================================

    def _init_info_metrics(self):
        """Initialize info metrics."""
        self.api_info = Info(
            "resumeai_api",
            "Resume API information",
            registry=self.registry,
        )

    def set_api_info(self, version: str, environment: str, debug: bool = False):
        """Set API information."""
        self.api_info.info(
            {
                "version": version,
                "environment": environment,
                "debug": str(debug).lower(),
            }
        )

    # ============================================================================
    # Export Methods
    # ============================================================================

    def export_openmetrics(self) -> bytes:
        """Export metrics in OpenMetrics format."""
        return generate_latest(self.registry)

    def export_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        return generate_latest(self.registry).decode("utf-8")

    def get_registry(self):
        """Get the Prometheus registry."""
        return self.registry


# Global exporter instance
_exporter: Optional[PrometheusExporter] = None


def init_exporter(config: Optional[MetricConfig] = None) -> PrometheusExporter:
    """Initialize the global Prometheus exporter."""
    global _exporter
    _exporter = PrometheusExporter(config)
    return _exporter


def get_exporter() -> PrometheusExporter:
    """Get the global Prometheus exporter."""
    global _exporter
    if _exporter is None:
        _exporter = PrometheusExporter()
    return _exporter
