"""Usage analytics collection and storage."""

from config import settings
from monitoring import logging_config

logger = logging_config.get_logger(__name__)


async def record_request(
    endpoint,
    method,
    status_code,
    user_id=None,
    request_id=None,
    client_ip=None,
    duration_ms=0,
    additional_data=None,
):
    if settings.enable_analytics:
        pass


async def record_endpoint_usage(endpoint, user_id=None, success=True):
    if settings.enable_analytics:
        pass


async def record_user_engagement(user_id, action, endpoint=None, metadata=None):
    if settings.enable_analytics:
        pass


async def record_error(
    endpoint, error_type, error_message, user_id=None, request_id=None, stack_trace=None
):
    if settings.enable_analytics:
        pass


async def get_analytics_summary(hours=24):
    if not settings.enable_analytics:
        return {}
    return {
        "total_requests": 0,
        "success_requests": 0,
        "failed_requests": 0,
        "success_rate": 100,
        "avg_duration_ms": 0,
        "unique_users": 0,
        "period_hours": hours,
    }


async def get_endpoint_popularity(hours=24, limit=10):
    if not settings.enable_analytics:
        return []
    return []


async def cleanup_old_analytics():
    if not settings.enable_analytics:
        return 0
    return 0
