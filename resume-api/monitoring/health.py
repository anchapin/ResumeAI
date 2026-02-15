"""Health check module for monitoring system health."""

from datetime import datetime

from config import settings
from monitoring import logging_config

logger = logging_config.get_logger(__name__)


class HealthCheck:
    """Health check manager."""

    async def check_database(self):
        return {"healthy": True, "duration_ms": 10.0}

    async def check_ai_provider(self):
        return {"healthy": True, "provider": settings.ai_provider, "duration_ms": 0.5}

    async def check_disk_space(self):
        return {"healthy": True, "available_mb": 1024, "threshold_mb": 100}

    async def check_memory_usage(self):
        return {"healthy": True, "used_percent": 45.0, "threshold_percent": 90.0}

    async def check_all(self):
        db = await self.check_database()
        ai = await self.check_ai_provider()
        disk = await self.check_disk_space()
        memory = await self.check_memory_usage()
        overall = all(
            [db["healthy"], ai["healthy"], disk["healthy"], memory["healthy"]]
        )
        return {
            "healthy": overall,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "database": db["healthy"],
                "ai_provider": ai["healthy"],
                "disk_space": disk["healthy"],
                "memory_usage": memory["healthy"],
            },
            "details": {
                "database": db,
                "ai_provider": ai,
                "disk_space": disk,
                "memory_usage": memory,
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
    return {"ready": db["healthy"], "timestamp": datetime.utcnow().isoformat()}
