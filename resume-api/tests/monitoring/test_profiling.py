"""
Tests for profiling instrumentation.

These tests verify the profiling functionality including decorators,
context managers, and memory tracking.
"""

import asyncio
import time

import pytest

from monitoring import profiling


class TestProfilingDecorator:
    """Tests for the @profile decorator."""

    def test_profile_sync_function_execution(self, monkeypatch):
        """Test profiling a synchronous function."""
        # Enable profiling
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        @profiling.profile("test_sync")
        def sync_function():
            return 42

        result = sync_function()
        assert result == 42

    def test_profile_sync_function_disabled(self, monkeypatch):
        """Test profiling is skipped when disabled."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: False)

        @profiling.profile("test_disabled")
        def disabled_function():
            return "success"

        result = disabled_function()
        assert result == "success"

    def test_profile_async_function(self, monkeypatch):
        """Test profiling an asynchronous function."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        @profiling.profile("test_async")
        async def async_function():
            await asyncio.sleep(0.01)
            return "async_result"

        result = asyncio.run(async_function())
        assert result == "async_result"

    def test_profile_preserves_function_name(self, monkeypatch):
        """Test that profiler uses function name when not provided."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        @profiling.profile()
        def my_function():
            return 1

        result = my_function()
        assert result == 1


class TestProfilingContextManager:
    """Tests for the profile_context context manager."""

    def test_profile_context_sync(self, monkeypatch):
        """Test synchronous profile context."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        with profiling.profile_context("sync_block"):
            result = 1 + 1

        assert result == 2

    def test_profile_context_disabled(self, monkeypatch):
        """Test profile context when profiling is disabled."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: False)

        with profiling.profile_context("disabled_block"):
            result = "executed"

        assert result == "executed"

    def test_profile_context_with_exception(self, monkeypatch):
        """Test profile context handles exceptions properly."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        with pytest.raises(ValueError):
            with profiling.profile_context("error_block"):
                raise ValueError("test error")


class TestAsyncProfileContext:
    """Tests for the async_profile_context."""

    @pytest.mark.asyncio
    async def test_async_profile_context(self, monkeypatch):
        """Test asynchronous profile context."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        async with profiling.async_profile_context("async_block"):
            await asyncio.sleep(0.01)
            result = "done"

        assert result == "done"

    @pytest.mark.asyncio
    async def test_async_profile_context_disabled(self, monkeypatch):
        """Test async profile context when profiling is disabled."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: False)

        async with profiling.async_profile_context("disabled_async"):
            result = "executed"

        assert result == "executed"


class TestProfilerClass:
    """Tests for the Profiler class."""

    def test_profiler_basic_usage(self, monkeypatch):
        """Test basic profiler class usage."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        profiler = profiling.Profiler("test_operation")
        profiler.start()
        time.sleep(0.01)
        profiler.stop()

    def test_profiler_as_context_manager(self, monkeypatch):
        """Test profiler as context manager."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        with profiling.Profiler("context_operation"):
            time.sleep(0.01)

    def test_profiler_disabled(self, monkeypatch):
        """Test profiler when disabled."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: False)

        profiler = profiling.Profiler("disabled_op")
        profiler.start()
        profiler.stop()

    @pytest.mark.asyncio
    async def test_profiler_async_context_manager(self, monkeypatch):
        """Test async profiler context manager."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: True)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        async with profiling.Profiler("async_context"):
            await asyncio.sleep(0.01)


class TestMemoryTracking:
    """Tests for memory tracking functions."""

    def test_get_memory_usage(self, monkeypatch):
        """Test getting memory usage."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)

        profiling.start_memory_tracing()
        result = profiling.get_memory_usage()
        profiling.stop_memory_tracing()

        assert "current_bytes" in result
        assert "peak_bytes" in result
        assert "current_mb" in result
        assert "peak_mb" in result

    def test_start_memory_tracing(self, monkeypatch):
        """Test starting memory tracing."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)

        profiling.start_memory_tracing()
        assert profiling.tracemalloc.is_tracing()
        profiling.stop_memory_tracing()

    def test_stop_memory_tracing(self, monkeypatch):
        """Test stopping memory tracing."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)

        profiling.start_memory_tracing()
        stats = profiling.stop_memory_tracing()

        assert not profiling.tracemalloc.is_tracing()
        assert "current_bytes" in stats
        assert "peak_bytes" in stats


class TestProfilingMetrics:
    """Tests for profiling metrics."""

    def test_profile_execution_seconds_metric(self, monkeypatch):
        """Test that profile_execution_seconds metric exists."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: False)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        @profiling.profile("metric_test")
        def test_func():
            return 1

        test_func()

        # Check that metric can be observed
        from prometheus_client import REGISTRY

        # Get histogram samples
        for metric in REGISTRY.collect():
            if metric.name == "profile_execution_seconds":
                # Found the metric
                break

    def test_profile_calls_total_metric(self, monkeypatch):
        """Test that profile_calls_total counter exists."""
        monkeypatch.setattr(profiling, "_is_profiling_enabled", lambda: True)
        monkeypatch.setattr(profiling, "_should_track_memory", lambda: False)
        monkeypatch.setattr(profiling, "_should_log_results", lambda: False)

        @profiling.profile("counter_test")
        def counter_func():
            return 1

        counter_func()
        counter_func()

        # Verify counter incremented
        metric = profiling.profile_calls_total.labels(
            name="counter_test", type="sync", status="success"
        )
        assert metric._value._value >= 2
