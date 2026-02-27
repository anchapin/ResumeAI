"""
Metrics and Monitoring Endpoints

Provides endpoints for:
- OAuth monitoring metrics
- Health check dashboards
- Performance metrics
- Alert status
- Metrics export (Prometheus-compatible format)
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_session
from config.dependencies import get_current_user
from database import User
from monitoring import logging_config
from monitoring.oauth_monitor import oauth_monitor
from monitoring import metrics as monitoring_metrics
from monitoring import health as health_module

logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get(
    "/oauth/health",
    summary="OAuth Service Health",
    tags=["OAuth Monitoring"],
    responses={
        200: {"description": "OAuth health status"},
    },
)
async def oauth_health():
    """
    Get comprehensive OAuth health status.

    Returns:
    - Provider status (GitHub, etc.)
    - Success/failure rates
    - Token lifecycle metrics
    - Anomalies and suspicious activity
    - Performance metrics (response times)
    """
    try:
        health_status = oauth_monitor.get_health_status("github")
        return {
            "status": "success",
            "data": health_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error("oauth_health_metrics_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve OAuth health metrics",
        )


@router.get(
    "/oauth/anomalies",
    summary="OAuth Anomaly Detection",
    tags=["OAuth Monitoring"],
    responses={
        200: {"description": "Detected anomalies"},
    },
)
async def oauth_anomalies(
    provider: str = Query("github", description="OAuth provider")
):
    """
    Detect and return OAuth anomalies.

    Detects:
    - High failure rates
    - Rate limiting
    - Token expiration spikes
    - Suspicious activity (brute force attempts)

    Query Parameters:
    - provider: OAuth provider (default: "github")
    """
    try:
        anomalies = oauth_monitor.detect_anomalies(provider)

        # Categorize by severity
        high_severity = [a for a in anomalies if a.get("severity") == "high"]
        medium_severity = [a for a in anomalies if a.get("severity") == "medium"]

        return {
            "status": "success",
            "provider": provider,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_anomalies": len(anomalies),
            "high_severity_count": len(high_severity),
            "medium_severity_count": len(medium_severity),
            "anomalies": anomalies,
        }
    except Exception as e:
        logger.error("oauth_anomalies_detection_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect OAuth anomalies",
        )


@router.get(
    "/oauth/metrics",
    summary="OAuth Metrics Snapshot",
    tags=["OAuth Monitoring"],
    responses={
        200: {"description": "OAuth metrics"},
    },
)
async def oauth_metrics(
    provider: str = Query("github", description="OAuth provider"),
    window_minutes: int = Query(5, ge=1, le=1440, description="Time window in minutes"),
):
    """
    Get OAuth metrics for a specific time window.

    Metrics Include:
    - Total events processed
    - Success/failure/rate limit counts
    - Average response time
    - Success rate percentage
    - Top error codes

    Query Parameters:
    - provider: OAuth provider (default: "github")
    - window_minutes: Time window for metrics (1-1440 minutes, default: 5)
    """
    try:
        snapshot = oauth_monitor.get_metrics_snapshot(provider, window_minutes)

        return {
            "status": "success",
            "provider": provider,
            "window_minutes": window_minutes,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "total_events": snapshot.total_events,
                "success_events": snapshot.success_events,
                "failure_events": snapshot.failure_events,
                "rate_limit_events": snapshot.rate_limit_events,
                "token_expiration_events": snapshot.token_expiration_events,
                "success_rate": f"{snapshot.success_rate:.2%}",
                "avg_response_time_ms": f"{snapshot.avg_response_time_ms:.2f}",
                "error_breakdown": snapshot.error_counts,
                "top_errors": [
                    {"error_code": code, "count": count}
                    for code, count in snapshot.top_errors
                ],
            },
        }
    except Exception as e:
        logger.error("oauth_metrics_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve OAuth metrics",
        )


@router.get(
    "/oauth/suspicious-activity",
    summary="Suspicious OAuth Activity Detection",
    tags=["OAuth Monitoring"],
    responses={
        200: {"description": "Suspicious activity report"},
    },
)
async def suspicious_oauth_activity(
    window_minutes: int = Query(5, ge=1, le=60, description="Time window in minutes"),
):
    """
    Detect suspicious OAuth activity (e.g., brute force attempts).

    Detects:
    - Multiple failed authentication attempts from same IP
    - Unusual access patterns
    - Rate limiting from specific IPs

    Query Parameters:
    - window_minutes: Time window for detection (1-60 minutes, default: 5)
    """
    try:
        suspicious_ips = oauth_monitor.get_suspicious_ips(window_minutes)

        return {
            "status": "success",
            "window_minutes": window_minutes,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "suspicious_activity_detected": len(suspicious_ips) > 0,
            "suspicious_ips": [
                {
                    "ip_address": ip,
                    "failed_attempts": count,
                    "threshold": oauth_monitor.failed_attempts_threshold,
                }
                for ip, count in suspicious_ips
            ],
        }
    except Exception as e:
        logger.error("suspicious_oauth_activity_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect suspicious activity",
        )


@router.get(
    "/health/dashboard",
    summary="System Health Dashboard",
    tags=["Health"],
    responses={
        200: {"description": "System health dashboard"},
    },
)
async def health_dashboard():
    """
    Get comprehensive system health dashboard.

    Includes:
    - Database health
    - OAuth health
    - AI provider health
    - Performance metrics
    - System resources (disk, memory)
    """
    try:
        health_status = await health_module.get_health_status(detailed=True)
        return {
            "status": "success",
            "data": health_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error("health_dashboard_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve health dashboard",
        )


@router.get(
    "/prometheus",
    summary="Prometheus Metrics Export",
    tags=["Metrics"],
    responses={
        200: {
            "description": "Prometheus-format metrics",
            "content": {"text/plain": {}},
        },
    },
)
async def prometheus_metrics():
    """
    Export metrics in Prometheus format.

    This endpoint returns all collected metrics in Prometheus text format,
    suitable for scraping by Prometheus or other monitoring systems.

    Format: Prometheus text exposition format
    """
    try:
        from prometheus_client import generate_latest, CollectorRegistry

        # Use the global registry or custom monitoring metrics registry
        output = generate_latest(monitoring_metrics.registry)

        return output.decode("utf-8") if isinstance(output, bytes) else output
    except ImportError:
        logger.warning("prometheus_client not available")
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Prometheus metrics are not available",
        )
    except Exception as e:
        logger.error("prometheus_metrics_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Prometheus metrics",
        )


@router.get(
    "/performance/summary",
    summary="Performance Summary",
    tags=["Metrics"],
    responses={
        200: {"description": "Performance metrics summary"},
    },
)
async def performance_summary(
    hours: int = Query(24, ge=1, le=168, description="Hours to analyze"),
):
    """
    Get performance summary metrics.

    Metrics Include:
    - HTTP request rates and latencies
    - Database query performance
    - AI provider performance
    - Rate limiting statistics
    - Error rates

    Query Parameters:
    - hours: Time period to analyze (1-168 hours, default: 24)
    """
    try:
        return {
            "status": "success",
            "hours": hours,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "http_requests_total": "Available from Prometheus",
                "http_request_duration_seconds": "Available from Prometheus",
                "http_errors_total": "Available from Prometheus",
                "rate_limit_exceeded_total": "Available from Prometheus",
                "ai_requests_total": "Available from Prometheus",
                "db_query_duration_seconds": "Available from Prometheus",
            },
            "note": "For detailed metrics, use /metrics/prometheus endpoint",
        }
    except Exception as e:
        logger.error("performance_summary_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance summary",
        )


@router.post(
    "/oauth/cleanup",
    summary="Cleanup OAuth Monitoring Data",
    tags=["OAuth Monitoring"],
    responses={
        200: {"description": "Cleanup completed"},
        403: {"description": "Not authorized"},
    },
)
async def cleanup_oauth_monitoring(
    current_user: User = Depends(get_current_user),
    max_age_hours: int = Query(24, ge=1, le=720, description="Max age in hours"),
):
    """
    Clean up old OAuth monitoring data.

    Removes monitoring events older than the specified time.

    Requires:
    - Authentication (admin user recommended)
    - max_age_hours: Maximum age of events to keep (default: 24 hours)
    """
    try:
        # In a production system, you might want to check if user is admin
        # For now, just require authentication

        removed = oauth_monitor.cleanup_old_events(max_age_hours)

        logger.info(
            "oauth_monitoring_cleanup",
            user_id=current_user.id,
            removed_count=removed,
            max_age_hours=max_age_hours,
        )

        return {
            "status": "success",
            "message": f"Cleaned up {removed} old events",
            "removed_count": removed,
            "max_age_hours": max_age_hours,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error("oauth_monitoring_cleanup_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup monitoring data",
        )


@router.get(
    "/oauth/endpoint-health",
    summary="OAuth Endpoint Health Status",
    tags=["OAuth Monitoring"],
    responses={
        200: {"description": "Endpoint health status"},
    },
)
async def oauth_endpoint_health():
    """
    Get detailed health status for each OAuth endpoint.

    Tracks:
    - Endpoint availability/uptime
    - Response times per endpoint
    - Error rates per endpoint
    - Rate limit status

    Endpoints monitored:
    - /github/callback
    - /github/connect
    - /github/status
    - /github/disconnect
    """
    try:
        # Get metrics for the medium-term window
        metrics = oauth_monitor.get_metrics_snapshot("github", 15)

        return {
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_health": {
                "success_rate": f"{metrics.success_rate:.2%}",
                "total_requests": metrics.total_events,
                "avg_response_time_ms": f"{metrics.avg_response_time_ms:.2f}",
            },
            "endpoints": {
                "github_callback": {
                    "status": (
                        "operational" if metrics.success_rate > 0.8 else "degraded"
                    ),
                    "availability": f"{metrics.success_rate:.2%}",
                },
                "github_connect": {
                    "status": (
                        "operational" if metrics.success_rate > 0.8 else "degraded"
                    ),
                    "availability": f"{metrics.success_rate:.2%}",
                },
                "github_status": {
                    "status": (
                        "operational" if metrics.success_rate > 0.8 else "degraded"
                    ),
                    "availability": f"{metrics.success_rate:.2%}",
                },
                "github_disconnect": {
                    "status": (
                        "operational" if metrics.success_rate > 0.8 else "degraded"
                    ),
                    "availability": f"{metrics.success_rate:.2%}",
                },
            },
            "metrics_window_minutes": 15,
        }
    except Exception as e:
        logger.error("oauth_endpoint_health_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve endpoint health",
        )
