"""
Tests for analytics module.
"""

import pytest
from monitoring.analytics import (
    record_request,
    record_endpoint_usage,
    record_user_engagement,
    record_error,
    get_analytics_summary,
    get_endpoint_popularity,
    cleanup_old_analytics,
)


@pytest.mark.asyncio
async def test_record_request():
    """Test recording a request."""
    # This should not raise an error
    await record_request(
        endpoint="/v1/render/pdf",
        method="POST",
        status_code=200,
        user_id="test-user",
        request_id="req-123",
        client_ip="127.0.0.1",
        duration_ms=500,
    )


@pytest.mark.asyncio
async def test_record_endpoint_usage():
    """Test recording endpoint usage."""
    # This should not raise an error
    await record_endpoint_usage(
        endpoint="/v1/tailor",
        user_id="test-user",
        success=True,
    )


@pytest.mark.asyncio
async def test_record_user_engagement():
    """Test recording user engagement."""
    # This should not raise an error
    await record_user_engagement(
        user_id="test-user",
        action="pdf_generated",
        endpoint="/v1/render/pdf",
        metadata={"variant": "modern"},
    )


@pytest.mark.asyncio
async def test_record_error():
    """Test recording an error."""
    # This should not raise an error
    await record_error(
        endpoint="/v1/render/pdf",
        error_type="ValueError",
        error_message="Invalid resume data",
        user_id="test-user",
        request_id="req-123",
        stack_trace="Traceback...",
    )


@pytest.mark.asyncio
async def test_get_analytics_summary():
    """Test getting analytics summary."""
    result = await get_analytics_summary(hours=24)

    assert "total_requests" in result
    assert "success_requests" in result
    assert "failed_requests" in result
    assert "success_rate" in result
    assert "avg_duration_ms" in result
    assert "unique_users" in result
    assert "period_hours" in result
    assert result["period_hours"] == 24


@pytest.mark.asyncio
async def test_get_analytics_summary_custom_hours():
    """Test getting analytics summary with custom hours."""
    result = await get_analytics_summary(hours=48)

    assert result["period_hours"] == 48


@pytest.mark.asyncio
async def test_get_endpoint_popularity():
    """Test getting endpoint popularity."""
    result = await get_endpoint_popularity(hours=24, limit=10)

    assert isinstance(result, list)
    # The result should be a list, empty or not


@pytest.mark.asyncio
async def test_get_endpoint_popularity_custom_limit():
    """Test getting endpoint popularity with custom limit."""
    result = await get_endpoint_popularity(hours=24, limit=5)

    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_cleanup_old_analytics():
    """Test cleaning up old analytics."""
    result = await cleanup_old_analytics()

    assert isinstance(result, int)
    # Should return number of records deleted
