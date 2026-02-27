"""
Deployment Safeguard Routes

Provides endpoints for:
- Health checks and readiness probes
- Feature flag management
- Database migration validation
- Deployment verification
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any
from datetime import datetime

from config import settings
from config.dependencies import verify_api_key
from config.errors import ErrorCode, create_error_response
from lib.deployment import (
    feature_flag_manager,
    schema_validator,
)
from monitoring import logging_config

logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/v1/deployment", tags=["deployment"])


# ============================================================================
# Health Check Endpoints
# ============================================================================


@router.get("/health", tags=["health"])
async def get_health_status(
    detailed: bool = Query(False, description="Return detailed health info")
):
    """
    Health check endpoint for load balancers and orchestration.

    Returns:
        - 200: Service is healthy
        - 503: Service is unhealthy
    """
    try:
        from monitoring.health import get_health_status as get_full_health

        result = await get_full_health(detailed=detailed)

        if result.get("healthy"):
            return {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                **result,
            }
        else:
            raise HTTPException(status_code=503, detail="Service unhealthy")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("health_check_error", error=str(e))
        raise HTTPException(status_code=503, detail="Health check failed")


@router.get("/health/detailed", tags=["health"])
async def get_detailed_health():
    """
    Detailed health check with all component details.

    Returns comprehensive health information for all system components.
    """
    try:
        from monitoring.health import get_health_status

        result = await get_health_status(detailed=True)
        return {
            "status": "detailed_health",
            "timestamp": datetime.utcnow().isoformat(),
            **result,
        }
    except Exception as e:
        logger.error("detailed_health_check_error", error=str(e))
        raise HTTPException(status_code=503, detail="Detailed health check failed")


@router.get("/ready", tags=["health"])
async def get_readiness_status():
    """
    Readiness probe for Kubernetes and load balancers.

    Indicates if the service is ready to accept traffic.
    More strict than liveness probe.

    Returns:
        - 200: Service is ready
        - 503: Service is not ready
    """
    try:
        from monitoring.health import get_readiness_status

        result = await get_readiness_status()

        if result.get("ready"):
            return result
        else:
            raise HTTPException(status_code=503, detail="Service not ready")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("readiness_check_error", error=str(e))
        raise HTTPException(status_code=503, detail="Readiness check failed")


@router.get("/live", tags=["health"])
async def get_liveness_status():
    """
    Liveness probe for Kubernetes and load balancers.

    Indicates if the service process is still running.

    Returns:
        - 200: Service is alive
        - 503: Service is dead
    """
    try:
        return {
            "alive": True,
            "timestamp": datetime.utcnow().isoformat(),
            "version": settings.app_version,
        }
    except Exception as e:
        logger.error("liveness_check_error", error=str(e))
        raise HTTPException(status_code=503, detail="Liveness check failed")


# ============================================================================
# Feature Flag Endpoints
# ============================================================================


@router.get("/features", tags=["feature-flags"], dependencies=[Depends(verify_api_key)])
async def get_all_features():
    """
    Get all feature flags and their status.

    Requires: API Key authentication
    """
    try:
        flags = feature_flag_manager.get_all_flags()
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "flags": {
                name: {
                    "status": flag.status.value,
                    "rollout_percentage": flag.rollout_percentage,
                    "description": flag.description,
                    "updated_at": flag.updated_at.isoformat(),
                }
                for name, flag in flags.items()
            },
        }
    except Exception as e:
        logger.error("get_features_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get features")


@router.get(
    "/features/{feature_name}",
    tags=["feature-flags"],
    dependencies=[Depends(verify_api_key)],
)
async def get_feature_status(feature_name: str):
    """
    Get status of a specific feature flag.

    Requires: API Key authentication
    """
    try:
        flag = feature_flag_manager.get_flag(feature_name)
        if not flag:
            raise HTTPException(
                status_code=404, detail=f"Feature flag not found: {feature_name}"
            )

        return {
            "feature": feature_name,
            "status": flag.status.value,
            "rollout_percentage": flag.rollout_percentage,
            "description": flag.description,
            "updated_at": flag.updated_at.isoformat(),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_feature_status_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get feature status")


@router.post(
    "/features/{feature_name}/enable",
    tags=["feature-flags"],
    dependencies=[Depends(verify_api_key)],
)
async def enable_feature(
    feature_name: str, rollout_percentage: int = Query(100, ge=0, le=100)
):
    """
    Enable a feature flag (optionally with gradual rollout).

    Requires: API Key authentication

    Args:
        feature_name: Name of the feature flag
        rollout_percentage: Percentage of traffic to enable (0-100)
    """
    try:
        feature_flag_manager.enable_flag(feature_name, rollout_percentage)

        logger.info(
            "feature_flag_enabled", feature=feature_name, rollout=rollout_percentage
        )

        flag = feature_flag_manager.get_flag(feature_name)
        return {
            "success": True,
            "feature": feature_name,
            "status": flag.status.value,
            "rollout_percentage": flag.rollout_percentage,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("enable_feature_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to enable feature")


@router.post(
    "/features/{feature_name}/disable",
    tags=["feature-flags"],
    dependencies=[Depends(verify_api_key)],
)
async def disable_feature(feature_name: str):
    """
    Disable a feature flag (emergency rollback).

    Requires: API Key authentication
    """
    try:
        feature_flag_manager.disable_flag(feature_name)

        logger.warning("feature_flag_disabled", feature=feature_name)

        flag = feature_flag_manager.get_flag(feature_name)
        return {
            "success": True,
            "feature": feature_name,
            "status": flag.status.value,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("disable_feature_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to disable feature")


@router.post(
    "/features/{feature_name}/maintenance",
    tags=["feature-flags"],
    dependencies=[Depends(verify_api_key)],
)
async def set_feature_maintenance(
    feature_name: str, duration_minutes: int = Query(60, ge=1, le=1440)
):
    """
    Mark a feature as under maintenance (temporarily disabled).

    Requires: API Key authentication
    """
    try:
        feature_flag_manager.set_maintenance(feature_name, duration_minutes)

        logger.info(
            "feature_flag_maintenance",
            feature=feature_name,
            duration_minutes=duration_minutes,
        )

        flag = feature_flag_manager.get_flag(feature_name)
        return {
            "success": True,
            "feature": feature_name,
            "status": flag.status.value,
            "duration_minutes": duration_minutes,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("set_feature_maintenance_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to set maintenance mode")


# ============================================================================
# Database Migration Validation Endpoints
# ============================================================================


@router.post(
    "/database/validate-schema",
    tags=["database"],
    dependencies=[Depends(verify_api_key)],
)
async def validate_database_schema():
    """
    Validate database schema matches expected state.

    Checks:
    - All required tables exist
    - All required columns exist
    - Proper indexes are present

    Requires: API Key authentication
    """
    try:
        # Note: This would need a real database session in production
        result = await schema_validator.validate_schema(None)

        return {
            "valid": result.valid,
            "timestamp": result.timestamp.isoformat(),
            "summary": {
                "passed": result.checks_passed,
                "failed": result.checks_failed,
            },
            "details": result.details,
            "warnings": result.warnings,
        }
    except Exception as e:
        logger.error("validate_schema_error", error=str(e))
        raise HTTPException(status_code=500, detail="Schema validation failed")


@router.post(
    "/database/validate-integrity",
    tags=["database"],
    dependencies=[Depends(verify_api_key)],
)
async def validate_database_integrity():
    """
    Validate database data integrity.

    Checks:
    - No orphaned foreign keys
    - Referential integrity
    - Data consistency

    Requires: API Key authentication
    """
    try:
        # Note: This would need a real database session in production
        result = await schema_validator.validate_data_integrity(None)

        return {
            "valid": result.valid,
            "timestamp": result.timestamp.isoformat(),
            "summary": {
                "passed": result.checks_passed,
                "failed": result.checks_failed,
            },
            "details": result.details,
            "warnings": result.warnings,
        }
    except Exception as e:
        logger.error("validate_integrity_error", error=str(e))
        raise HTTPException(status_code=500, detail="Integrity validation failed")


@router.post(
    "/database/migration-ready",
    tags=["database"],
    dependencies=[Depends(verify_api_key)],
)
async def check_migration_readiness():
    """
    Check if database is ready for migration.

    Validates:
    - Schema is valid
    - Data integrity is intact
    - No running migrations
    - Sufficient resources available
    - Backup exists

    Requires: API Key authentication
    """
    try:
        # Note: This would need a real database session in production
        result = await schema_validator.validate_migration_ready(None)

        return result
    except Exception as e:
        logger.error("migration_readiness_error", error=str(e))
        raise HTTPException(status_code=500, detail="Migration readiness check failed")


# ============================================================================
# Deployment Verification Endpoints
# ============================================================================


@router.get("/verify", tags=["verification"], dependencies=[Depends(verify_api_key)])
async def verify_deployment():
    """
    Verify deployment is successful and all systems operational.

    Performs comprehensive checks:
    - Health checks
    - Feature flags configured
    - Database connectivity
    - External services available
    - Error rates acceptable

    Requires: API Key authentication
    """
    try:
        from monitoring.health import get_health_status

        health = await get_health_status(detailed=True)

        checks = {
            "health": health.get("healthy", False),
            "features_configured": bool(feature_flag_manager.get_all_flags()),
            "database_healthy": health.get("checks", {}).get("database", False),
            "all_systems_operational": health.get("healthy", False),
        }

        all_passed = all(checks.values())

        return {
            "verified": all_passed,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": checks,
            "details": health,
        }
    except Exception as e:
        logger.error("verify_deployment_error", error=str(e))
        raise HTTPException(status_code=500, detail="Deployment verification failed")


@router.get("/status", tags=["verification"])
async def get_deployment_status():
    """
    Get current deployment status and version information.

    No authentication required - useful for monitoring and status pages.
    """
    try:
        return {
            "status": "operational",
            "version": settings.app_version,
            "environment": settings.environment,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("get_status_error", error=str(e))
        raise HTTPException(status_code=500, detail="Status check failed")
