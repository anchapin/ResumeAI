"""
Tests for health check module.
"""

import pytest
from monitoring.health import (
    HealthCheck,
    get_health_status,
    get_readiness_status,
    health_checker,
)


@pytest.mark.asyncio
async def test_check_database():
    """Test database health check."""
    health = HealthCheck()
    result = await health.check_database()

    assert "healthy" in result
    assert "duration_ms" in result


@pytest.mark.asyncio
async def test_check_ai_provider():
    """Test AI provider health check."""
    health = HealthCheck()
    result = await health.check_ai_provider()

    assert "healthy" in result
    assert "provider" in result
    assert "duration_ms" in result


@pytest.mark.asyncio
async def test_check_disk_space():
    """Test disk space health check."""
    health = HealthCheck()
    result = await health.check_disk_space()

    assert "healthy" in result
    assert "available_mb" in result
    assert "threshold_mb" in result


@pytest.mark.asyncio
async def test_check_memory_usage():
    """Test memory usage health check."""
    health = HealthCheck()
    result = await health.check_memory_usage()

    assert "healthy" in result
    assert "used_percent" in result
    assert "threshold_percent" in result


@pytest.mark.asyncio
async def test_check_all():
    """Test checking all health components."""
    result = await health_checker.check_all()

    assert "healthy" in result
    assert "timestamp" in result
    assert "checks" in result
    assert "details" in result

    # Check individual checks
    assert "database" in result["checks"]
    assert "ai_provider" in result["checks"]
    assert "disk_space" in result["checks"]
    assert "memory_usage" in result["checks"]

    # Check details
    assert "database" in result["details"]
    assert "ai_provider" in result["details"]
    assert "disk_space" in result["details"]
    assert "memory_usage" in result["details"]


@pytest.mark.asyncio
async def test_get_health_status_not_detailed():
    """Test getting health status without details."""
    result = await get_health_status(detailed=False)

    assert "healthy" in result
    assert "timestamp" in result
    assert "version" in result
    # Details should not be included
    assert "checks" not in result
    assert "details" not in result


@pytest.mark.asyncio
async def test_get_health_status_detailed():
    """Test getting health status with details."""
    result = await get_health_status(detailed=True)

    assert "healthy" in result
    assert "timestamp" in result
    # Details should be included
    assert "checks" in result
    assert "details" in result


@pytest.mark.asyncio
async def test_get_readiness_status():
    """Test getting readiness status."""
    result = await get_readiness_status()

    assert "ready" in result
    assert "timestamp" in result
