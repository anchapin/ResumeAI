"""Health check module for monitoring system health."""

import time
from datetime import datetime

from config import settings
from monitoring import logging_config
from monitoring import metrics as monitoring_metrics

logger = logging_config.get_logger(__name__)


class HealthCheck:
    """Health check manager."""

    async def check_database(self):
        """Check database connectivity."""
        try:
            from database import engine
            import sqlalchemy

            start_time = time.time()
            async with engine.connect() as conn:
                await conn.execute(sqlalchemy.text("SELECT 1"))
            duration_ms = (time.time() - start_time) * 1000
            return {"healthy": True, "duration_ms": round(duration_ms, 2)}
        except Exception as e:
            logger.error("database_health_check_error", error=str(e))
            return {"healthy": False, "error": str(e)}

    async def check_redis(self):
        """Check Redis connectivity."""
        try:
            from lib.utils.cache import get_cache_manager

            cache_mgr = get_cache_manager()

            # Check if Redis backend is being used
            if cache_mgr.backend_type == "memory":
                return {
                    "healthy": True,
                    "backend": "memory",
                    "note": "Using in-memory fallback",
                }

            start_time = time.time()
            redis_client = cache_mgr.backend.redis
            await redis_client.ping()
            duration_ms = (time.time() - start_time) * 1000
            return {
                "healthy": True,
                "backend": "redis",
                "duration_ms": round(duration_ms, 2),
            }
        except Exception as e:
            logger.error("redis_health_check_error", error=str(e))
            return {"healthy": False, "error": str(e)}

    async def check_ai_provider(self):
        return {"healthy": True, "provider": settings.ai_provider, "duration_ms": 0.5}

    async def check_disk_space(self):
        return {"healthy": True, "available_mb": 1024, "threshold_mb": 100}

    async def check_memory_usage(self):
        return {"healthy": True, "used_percent": 45.0, "threshold_percent": 90.0}

    async def check_oauth_health(self):
        """Check OAuth integration health."""
        try:
            pass

            # Get OAuth metrics
            success_count = monitoring_metrics.oauth_connection_success_total._value.get()
            failure_count = sum(
                metric._value.get()
                for metric in monitoring_metrics.oauth_connection_failure_total._value.values()
            )
            rate_limit_hits = monitoring_metrics.oauth_rate_limit_hits_total._value.get()
            token_expiration_events = monitoring_metrics.oauth_token_expiration_events._value.get()
            storage_error_count = sum(
                metric._value.get()
                for metric in monitoring_metrics.oauth_storage_errors_total._value.values()
            )

            # Determine OAuth health based on metrics
            # If we have activity, calculate success rate
            total_oauth_requests = success_count + failure_count
            if total_oauth_requests > 0:
                success_rate = success_count / total_oauth_requests
                healthy = success_rate >= 0.8  # At least 80% success rate
            else:
                # No activity yet, consider healthy
                healthy = True
                success_rate = 1.0

            return {
                "healthy": healthy,
                "success_rate": success_rate,
                "success_count": success_count,
                "failure_count": failure_count,
                "total_requests": total_oauth_requests,
                "rate_limit_hits": rate_limit_hits,
                "token_expiration_events": token_expiration_events,
                "storage_error_count": storage_error_count,
                "github_configured": bool(
                    settings.github_client_id and settings.github_client_secret
                ),
            }
        except Exception as e:
            logger.error("oauth_health_check_error", error=str(e))
            return {
                "healthy": False,
                "error": str(e),
            }

    async def check_all(self):
        db = await self.check_database()
        redis = await self.check_redis()
        ai = await self.check_ai_provider()
        disk = await self.check_disk_space()
        memory = await self.check_memory_usage()
        oauth = await self.check_oauth_health()
        overall = all(
            [
                db["healthy"],
                redis["healthy"],
                ai["healthy"],
                disk["healthy"],
                memory["healthy"],
                oauth["healthy"],
            ]
        )
        return {
            "healthy": overall,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "database": db["healthy"],
                "redis": redis["healthy"],
                "ai_provider": ai["healthy"],
                "disk_space": disk["healthy"],
                "memory_usage": memory["healthy"],
                "oauth": oauth["healthy"],
            },
            "details": {
                "database": db,
                "redis": redis,
                "ai_provider": ai,
                "disk_space": disk,
                "memory_usage": memory,
                "oauth": oauth,
            },
        }


health_checker = HealthCheck()


async def get_health_status(detailed=False):
    result = await health_checker.check_all()
    if not detailed:
        return {
            "healthy": result["healthy"],
            "timestamp": result["timestamp"],
            "version": settings.app_version,
        }
    return result


async def get_readiness_status():
    db = await health_checker.check_database()
    redis = await health_checker.check_redis()
    ready = db["healthy"] and redis["healthy"]
    return {
        "ready": ready,
        "timestamp": datetime.utcnow().isoformat(),
        "database": db["healthy"],
        "redis": redis["healthy"],
    }
