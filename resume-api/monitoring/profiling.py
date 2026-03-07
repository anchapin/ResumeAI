"""Profiling instrumentation for performance analysis.

This module provides profiling utilities to measure execution time and memory usage
of various components in the Resume API. It integrates with the existing metrics
system and supports both synchronous and asynchronous functions.

Usage:
    # As a decorator
    @profile("generate_pdf")
    async def generate_pdf(...):
        ...

    # As a context manager
    with profile_context("database_query"):
        await db.fetch_all(query)

Configuration:
    Set ENABLE_PROFILING=true in environment to enable profiling.
    Set PROFILING_MEMORY_TRACKING=true to track memory usage.
    Set PROFILING_LOG_RESULTS=true to log profiling results.
"""

import asyncio
import functools
import time
import tracemalloc
from contextlib import asynccontextmanager, contextmanager
from typing import Any, Callable, Optional

from prometheus_client import Counter, Histogram

from config import settings
from monitoring.logging_config import get_logger

logger = get_logger(__name__)

# Profiling metrics
profile_execution_seconds = Histogram(
    "profile_execution_seconds",
    "Function/profile execution time in seconds",
    ["name", "type"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

profile_memory_usage_bytes = Histogram(
    "profile_memory_usage_bytes",
    "Memory usage during profiling in bytes",
    ["name", "type"],
    buckets=(1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216),
)

profile_calls_total = Counter(
    "profile_calls_total",
    "Total number of profiling calls",
    ["name", "type", "status"],
)


def _is_profiling_enabled() -> bool:
    """Check if profiling is enabled."""
    return getattr(settings, "enable_profiling", False)


def _should_track_memory() -> bool:
    """Check if memory tracking is enabled."""
    return getattr(settings, "profiling_memory_tracking", True)


def _should_log_results() -> bool:
    """Check if logging profiling results is enabled."""
    return getattr(settings, "profiling_log_results", True)


def _get_metric_type(obj: Any) -> str:
    """Get the type name for metrics."""
    if asyncio.iscoroutinefunction(obj):
        return "async"
    return "sync"


def _record_profile(name: str, duration: float, memory_delta: Optional[int] = None):
    """Record profiling metrics."""
    if not _is_profiling_enabled():
        return

    profile_execution_seconds.labels(name=name, type="function").observe(duration)
    if memory_delta is not None and _should_track_memory():
        profile_memory_usage_bytes.labels(name=name, type="function").observe(
            abs(memory_delta)
        )


def profile(name: Optional[str] = None):
    """Decorator to profile function execution time.

    Args:
        name: Optional profile name. Defaults to function name.

    Example:
        @profile("my_function")
        async def my_function():
            ...
    """

    def decorator(func: Callable) -> Callable:
        profile_name = name or func.__name__

        if asyncio.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                # Skip profiling if not enabled
                if not _is_profiling_enabled():
                    return await func(*args, **kwargs)

                start_time = time.perf_counter()
                start_memory = tracemalloc.get_traced_memory()[0] if _should_track_memory() else 0
                success = "success"

                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = "error"
                    raise
                finally:
                    duration = time.perf_counter() - start_time
                    memory_delta = 0
                    if _should_track_memory():
                        end_memory = tracemalloc.get_traced_memory()[0]
                        memory_delta = end_memory - start_memory

                    _record_profile(profile_name, duration, memory_delta if _should_track_memory() else None)
                    profile_calls_total.labels(
                        name=profile_name, type="async", status=success
                    ).inc()

                    if _should_log_results():
                        logger.debug(
                            "profile_complete",
                            profile_name=profile_name,
                            duration_ms=round(duration * 1000, 2),
                            memory_delta_kb=round(memory_delta / 1024, 2) if memory_delta else 0,
                        )

            return async_wrapper
        else:

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                # Skip profiling if not enabled
                if not _is_profiling_enabled():
                    return func(*args, **kwargs)

                start_time = time.perf_counter()
                start_memory = tracemalloc.get_traced_memory()[0] if _should_track_memory() else 0
                success = "success"

                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = "error"
                    raise
                finally:
                    duration = time.perf_counter() - start_time
                    memory_delta = 0
                    if _should_track_memory():
                        end_memory = tracemalloc.get_traced_memory()[0]
                        memory_delta = end_memory - start_memory

                    _record_profile(profile_name, duration, memory_delta if _should_track_memory() else None)
                    profile_calls_total.labels(
                        name=profile_name, type="sync", status=success
                    ).inc()

                    if _should_log_results():
                        logger.debug(
                            "profile_complete",
                            profile_name=profile_name,
                            duration_ms=round(duration * 1000, 2),
                            memory_delta_kb=round(memory_delta / 1024, 2) if memory_delta else 0,
                        )

            return sync_wrapper

    return decorator


@contextmanager
def profile_context(name: str):
    """Context manager for profiling code blocks synchronously.

    Args:
        name: Name of the profile context.

    Example:
        with profile_context("database_query"):
            db.fetch_all(query)
    """
    # Skip profiling if not enabled
    if not _is_profiling_enabled():
        yield
        return

    start_time = time.perf_counter()
    start_memory = tracemalloc.get_traced_memory()[0] if _should_track_memory() else 0
    success = "success"

    try:
        yield
    except Exception as e:
        success = "error"
        raise
    finally:
        duration = time.perf_counter() - start_time
        memory_delta = 0
        if _should_track_memory():
            end_memory = tracemalloc.get_traced_memory()[0]
            memory_delta = end_memory - start_memory

        if _is_profiling_enabled():
            profile_execution_seconds.labels(name=name, type="context").observe(
                duration
            )
            if memory_delta > 0 and _should_track_memory():
                profile_memory_usage_bytes.labels(name=name, type="context").observe(
                    memory_delta
                )
            profile_calls_total.labels(name=name, type="context", status=success).inc()

        if _should_log_results():
            logger.debug(
                "profile_context_complete",
                profile_name=name,
                duration_ms=round(duration * 1000, 2),
                memory_delta_kb=round(memory_delta / 1024, 2) if memory_delta else 0,
            )


@asynccontextmanager
async def async_profile_context(name: str):
    """Context manager for profiling code blocks asynchronously.

    Args:
        name: Name of the profile context.

    Example:
        async with async_profile_context("pdf_generation"):
            await generate_pdf(resume)
    """
    # Skip profiling if not enabled
    if not _is_profiling_enabled():
        yield
        return

    start_time = time.perf_counter()
    start_memory = tracemalloc.get_traced_memory()[0] if _should_track_memory() else 0
    success = "success"

    try:
        yield
    except Exception as e:
        success = "error"
        raise
    finally:
        duration = time.perf_counter() - start_time
        memory_delta = 0
        if _should_track_memory():
            end_memory = tracemalloc.get_traced_memory()[0]
            memory_delta = end_memory - start_memory

        if _is_profiling_enabled():
            profile_execution_seconds.labels(name=name, type="async_context").observe(
                duration
            )
            if memory_delta > 0 and _should_track_memory():
                profile_memory_usage_bytes.labels(
                    name=name, type="async_context"
                ).observe(memory_delta)
            profile_calls_total.labels(
                name=name, type="async_context", status=success
            ).inc()

        if _should_log_results():
            logger.debug(
                "async_profile_context_complete",
                profile_name=name,
                duration_ms=round(duration * 1000, 2),
                memory_delta_kb=round(memory_delta / 1024, 2) if memory_delta else 0,
            )


class Profiler:
    """Class-based profiler for more complex profiling scenarios.

    Example:
        profiler = Profiler("my_operation")

        # Start profiling
        profiler.start()

        # Do some work
        result = await do_work()

        # Stop and record
        profiler.stop()
    """

    def __init__(self, name: str):
        """Initialize profiler.

        Args:
            name: Name of the profiling session.
        """
        self.name = name
        self.start_time: Optional[float] = None
        self.start_memory: Optional[int] = None
        self._is_running = False

    def start(self):
        """Start profiling."""
        if not _is_profiling_enabled():
            return

        if self._is_running:
            logger.warning("profiler_already_running", profile_name=self.name)
            return

        self.start_time = time.perf_counter()
        self.start_memory = tracemalloc.get_traced_memory()[0] if _should_track_memory() else 0
        self._is_running = True

        if _should_log_results():
            logger.debug("profiler_started", profile_name=self.name)

    def stop(self):
        """Stop profiling and record metrics."""
        if not self._is_running:
            logger.warning("profiler_not_running", profile_name=self.name)
            return

        duration = time.perf_counter() - self.start_time
        memory_delta = 0
        if _should_track_memory():
            end_memory = tracemalloc.get_traced_memory()[0]
            memory_delta = end_memory - (self.start_memory or 0)

        if _is_profiling_enabled():
            profile_execution_seconds.labels(name=self.name, type="profiler").observe(
                duration
            )
            if memory_delta > 0 and _should_track_memory():
                profile_memory_usage_bytes.labels(name=self.name, type="profiler").observe(
                    memory_delta
                )
            profile_calls_total.labels(
                name=self.name, type="profiler", status="success"
            ).inc()

        if _should_log_results():
            logger.debug(
                "profiler_stopped",
                profile_name=self.name,
                duration_ms=round(duration * 1000, 2),
                memory_delta_kb=round(memory_delta / 1024, 2) if memory_delta else 0,
            )

        self._is_running = False

    async def async_stop(self):
        """Async version of stop."""
        self.stop()

    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()
        return False

    async def __aenter__(self):
        """Async context manager entry."""
        self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.async_stop()
        return False


def get_memory_usage() -> dict:
    """Get current memory usage statistics.

    Returns:
        Dictionary with memory usage information.
    """
    if tracemalloc.is_tracing():
        current, peak = tracemalloc.get_traced_memory()
        return {
            "current_bytes": current,
            "peak_bytes": peak,
            "current_mb": round(current / (1024 * 1024), 2),
            "peak_mb": round(peak / (1024 * 1024), 2),
        }
    return {}


def start_memory_tracing():
    """Start memory tracing."""
    if not _is_profiling_enabled():
        return

    if not tracemalloc.is_tracing():
        tracemalloc.start()
        logger.info("memory_tracing_started")


def stop_memory_tracing() -> dict:
    """Stop memory tracing and return statistics.

    Returns:
        Dictionary with memory statistics.
    """
    if tracemalloc.is_tracing():
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        logger.info(
            "memory_tracing_stopped",
            current_mb=round(current / (1024 * 1024), 2),
            peak_mb=round(peak / (1024 * 1024), 2),
        )
        return {
            "current_bytes": current,
            "peak_bytes": peak,
            "current_mb": round(current / (1024 * 1024), 2),
            "peak_mb": round(peak / (1024 * 1024), 2),
        }
    return {}
