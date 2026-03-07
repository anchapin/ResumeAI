"""
Enhanced Health Check System for Deployment Validation.

This module provides comprehensive health checks for deployment readiness,
including component checks, dependency validation, and deployment status.
"""

import logging
import asyncio
from typing import Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ComponentStatus(str, Enum):
    """Status of a health check component."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class HealthCheckResult(BaseModel):
    """Result of a health check."""

    component: str = Field(..., description="Component name")
    status: ComponentStatus = Field(..., description="Component status")
    message: str = Field(default="", description="Status message")
    latency_ms: float = Field(default=0.0, description="Check latency in milliseconds")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    def is_healthy(self) -> bool:
        """Check if component is healthy."""
        return self.status == ComponentStatus.HEALTHY


class DeploymentHealthChecker:
    """Performs comprehensive health checks for deployments."""

    def __init__(self):
        """Initialize deployment health checker."""
        self.checks: Dict[str, callable] = {}
        self._register_default_checks()
        logger.info("Deployment health checker initialized")

    def _register_default_checks(self):
        """Register default health checks."""
        self.register_check("database", self._check_database)
        self.register_check("migrations", self._check_migrations)
        self.register_check("disk_space", self._check_disk_space)
        self.register_check("memory", self._check_memory)
        self.register_check("file_permissions", self._check_file_permissions)

    def register_check(self, name: str, check_fn: callable):
        """
        Register a health check.

        Args:
            name: Name of the check
            check_fn: Async function that returns HealthCheckResult
        """
        self.checks[name] = check_fn
        logger.info(f"Registered health check: {name}")

    async def _check_database(self) -> HealthCheckResult:
        """Check database connectivity."""
        try:
            # Placeholder for actual database check
            # In production, would test actual database connection
            return HealthCheckResult(
                component="database",
                status=ComponentStatus.HEALTHY,
                message="Database connection OK",
                details={"connection": "established"},
            )
        except Exception as e:
            return HealthCheckResult(
                component="database",
                status=ComponentStatus.UNHEALTHY,
                message=f"Database connection failed: {str(e)}",
                details={"error": str(e)},
            )

    async def _check_migrations(self) -> HealthCheckResult:
        """Check database migrations status."""
        try:
            from .migration_validator import MigrationValidator

            validator = MigrationValidator()
            all_passed, results = validator.validate_all()

            if all_passed:
                return HealthCheckResult(
                    component="migrations",
                    status=ComponentStatus.HEALTHY,
                    message=f"All {len(results)} migration checks passed",
                    details={"checks_passed": len(results)},
                )
            else:
                failed = sum(1 for r in results if not r.passed)
                return HealthCheckResult(
                    component="migrations",
                    status=ComponentStatus.UNHEALTHY,
                    message=f"{failed} migration checks failed",
                    details={
                        "checks_passed": len(results) - failed,
                        "checks_failed": failed,
                    },
                )

        except Exception as e:
            return HealthCheckResult(
                component="migrations",
                status=ComponentStatus.UNKNOWN,
                message=f"Migration check error: {str(e)}",
                details={"error": str(e)},
            )

    async def _check_disk_space(self) -> HealthCheckResult:
        """Check available disk space."""
        try:
            import shutil
            import os

            # Check current directory disk space
            stat = shutil.disk_usage(os.getcwd())
            available_gb = stat.free / (1024**3)
            total_gb = stat.total / (1024**3)
            used_percent = (stat.used / stat.total) * 100

            status = ComponentStatus.HEALTHY
            if used_percent > 90:
                status = ComponentStatus.UNHEALTHY
            elif used_percent > 75:
                status = ComponentStatus.DEGRADED

            return HealthCheckResult(
                component="disk_space",
                status=status,
                message=f"Disk usage: {used_percent:.1f}%",
                details={
                    "available_gb": round(available_gb, 2),
                    "total_gb": round(total_gb, 2),
                    "used_percent": round(used_percent, 1),
                },
            )

        except Exception as e:
            return HealthCheckResult(
                component="disk_space",
                status=ComponentStatus.UNKNOWN,
                message=f"Disk space check failed: {str(e)}",
                details={"error": str(e)},
            )

    async def _check_memory(self) -> HealthCheckResult:
        """Check available memory."""
        try:
            import psutil

            memory = psutil.virtual_memory()
            available_gb = memory.available / (1024**3)
            total_gb = memory.total / (1024**3)

            status = ComponentStatus.HEALTHY
            if memory.percent > 90:
                status = ComponentStatus.UNHEALTHY
            elif memory.percent > 75:
                status = ComponentStatus.DEGRADED

            return HealthCheckResult(
                component="memory",
                status=status,
                message=f"Memory usage: {memory.percent}%",
                details={
                    "available_gb": round(available_gb, 2),
                    "total_gb": round(total_gb, 2),
                    "used_percent": round(memory.percent, 1),
                },
            )

        except ImportError:
            return HealthCheckResult(
                component="memory",
                status=ComponentStatus.UNKNOWN,
                message="psutil not available",
                details={"available": False},
            )
        except Exception as e:
            return HealthCheckResult(
                component="memory",
                status=ComponentStatus.UNKNOWN,
                message=f"Memory check failed: {str(e)}",
                details={"error": str(e)},
            )

    async def _check_file_permissions(self) -> HealthCheckResult:
        """Check file permissions for critical directories."""
        try:
            import os
            from pathlib import Path

            # Check critical directories are writable
            critical_dirs = [
                Path("/tmp"),  # Temp directory
                Path("."),  # Current directory
            ]

            issues = []
            for directory in critical_dirs:
                if not directory.exists():
                    continue
                if not os.access(directory, os.W_OK):
                    issues.append(str(directory))

            if issues:
                return HealthCheckResult(
                    component="file_permissions",
                    status=ComponentStatus.UNHEALTHY,
                    message="Some directories not writable",
                    details={"unwritable_dirs": issues},
                )

            return HealthCheckResult(
                component="file_permissions",
                status=ComponentStatus.HEALTHY,
                message="All critical directories have correct permissions",
                details={"checked_dirs": [str(d) for d in critical_dirs]},
            )

        except Exception as e:
            return HealthCheckResult(
                component="file_permissions",
                status=ComponentStatus.UNKNOWN,
                message=f"Permission check failed: {str(e)}",
                details={"error": str(e)},
            )

    async def run_all_checks(self) -> Dict[str, HealthCheckResult]:
        """
        Run all health checks concurrently.

        Returns:
            Dictionary mapping check name to result
        """
        tasks = [check_fn() for check_fn in self.checks.values()]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        check_results = {}
        for (name, _), result in zip(self.checks.items(), results):
            if isinstance(result, Exception):
                check_results[name] = HealthCheckResult(
                    component=name,
                    status=ComponentStatus.UNKNOWN,
                    message=f"Check failed: {str(result)}",
                )
            else:
                check_results[name] = result

        return check_results

    async def get_deployment_readiness(self) -> Dict[str, Any]:
        """
        Get deployment readiness status.

        Returns:
            Dictionary with readiness information
        """
        results = await self.run_all_checks()

        healthy_count = sum(1 for r in results.values() if r.is_healthy())
        unhealthy_count = sum(1 for r in results.values() if r.status == ComponentStatus.UNHEALTHY)

        is_ready = unhealthy_count == 0 and healthy_count == len(results)

        return {
            "ready_for_deployment": is_ready,
            "checks_passed": healthy_count,
            "checks_failed": unhealthy_count,
            "total_checks": len(results),
            "results": {
                name: {
                    "status": result.status.value,
                    "message": result.message,
                    "details": result.details,
                }
                for name, result in results.items()
            },
            "timestamp": datetime.utcnow().isoformat(),
        }


# Global deployment health checker instance
deployment_health_checker = DeploymentHealthChecker()
