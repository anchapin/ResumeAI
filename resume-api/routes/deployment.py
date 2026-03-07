"""
Deployment Safeguard Routes

Provides endpoints for:
- Health checks and readiness probes
- Feature flag management
- Database migration validation
- Deployment verification
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime

from config import settings
from config.dependencies import verify_api_key
from lib.deployment import (
    feature_flag_manager,
    schema_validator,
)
from monitoring import logging_config

logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/deployment", tags=["deployment"])


# ==============================================================
# Health Check Endpoints
# ==============================================================


@router.get("/health", tags=["health"])
async def get_health_status(
    detailed: bool = Query(False, description="Return detailed health info"),
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


# ==============================================================
# Feature Flag Endpoints
# ==============================================================


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
            raise HTTPException(status_code=404, detail=f"Feature flag not found: {feature_name}")

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
async def enable_feature(feature_name: str, rollout_percentage: int = Query(100, ge=0, le=100)):
    """
    Enable a feature flag (optionally with gradual rollout).

    Requires: API Key authentication

    Args:
        feature_name: Name of the feature flag
        rollout_percentage: Percentage of traffic to enable (0-100)
    """
    try:
        feature_flag_manager.enable_flag(feature_name, rollout_percentage)

        logger.info("feature_flag_enabled", feature=feature_name, rollout=rollout_percentage)

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


# ==============================================================
# Database Migration Validation Endpoints
# ==============================================================


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


# ==============================================================
# Deployment Verification Endpoints
# ==============================================================


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


# ==============================================================
# Deployment Event Tracking Endpoints
# ==============================================================


@router.post(
    "/events/start",
    tags=["deployment-events"],
    dependencies=[Depends(verify_api_key)],
)
async def start_deployment_event(
    deployment_id: str = Query(..., description="Unique deployment identifier"),
    version: str = Query(..., description="Version being deployed"),
    deployment_type: str = Query("rolling", description="Type of deployment"),
    environment: Optional[str] = Query(None, description="Target environment"),
):
    """
    Record the start of a deployment.

    Requires: API Key authentication

    Use this endpoint to mark when a deployment begins.
    """
    try:
        from monitoring.deployment_events import (
            DeploymentType as DepType,
            deployment_event_tracker,
        )

        env = environment or settings.environment
        dep_type = DepType(deployment_type.lower())

        deployment = deployment_event_tracker.start_deployment(
            deployment_id=deployment_id,
            version=version,
            environment=env,
            deployment_type=dep_type,
        )

        return {
            "success": True,
            "deployment_id": deployment_id,
            "version": version,
            "environment": env,
            "status": deployment.status.value,
            "started_at": deployment.started_at.isoformat(),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("deployment_start_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record deployment start")


@router.post(
    "/events/complete",
    tags=["deployment-events"],
    dependencies=[Depends(verify_api_key)],
)
async def complete_deployment_event(
    deployment_id: str = Query(..., description="Unique deployment identifier"),
    status: str = Query(..., description="Final deployment status"),
    error_message: Optional[str] = Query(None, description="Error message if failed"),
):
    """
    Record the completion of a deployment.

    Requires: API Key authentication

    Use this endpoint to mark when a deployment finishes (success or failure).
    """
    try:
        from monitoring.deployment_events import (
            DeploymentStatus as DepStatus,
            deployment_event_tracker,
        )

        dep_status = DepStatus(status.lower())

        deployment = deployment_event_tracker.complete_deployment(
            deployment_id=deployment_id,
            status=dep_status,
            error_message=error_message,
        )

        if not deployment:
            raise HTTPException(
                status_code=404,
                detail=f"Deployment not found: {deployment_id}",
            )

        return {
            "success": True,
            "deployment_id": deployment_id,
            "status": deployment.status.value,
            "completed_at": (
                deployment.completed_at.isoformat() if deployment.completed_at else None
            ),
            "duration_seconds": deployment.duration_seconds,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("deployment_complete_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record deployment completion")


@router.get(
    "/events",
    tags=["deployment-events"],
    dependencies=[Depends(verify_api_key)],
)
async def get_deployment_events(
    deployment_id: Optional[str] = Query(None, description="Filter by deployment ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of events"),
):
    """
    Get deployment events.

    Requires: API Key authentication

    Returns a list of deployment events, optionally filtered by deployment ID or event type.
    """
    try:
        from monitoring.deployment_events import (
            EventType,
            deployment_event_tracker,
        )

        # Convert string to EventType if provided
        evt_type = None
        if event_type:
            evt_type = EventType(event_type.lower())

        events = deployment_event_tracker.get_events(
            deployment_id=deployment_id,
            event_type=evt_type,
            limit=limit,
        )

        return {
            "events": [
                {
                    "event_type": e.event_type.value,
                    "deployment_id": e.deployment_id,
                    "timestamp": e.timestamp.isoformat(),
                    "environment": e.environment,
                    "metadata": e.metadata,
                }
                for e in events
            ],
            "count": len(events),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("get_events_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get deployment events")


@router.get(
    "/deployments",
    tags=["deployment-events"],
    dependencies=[Depends(verify_api_key)],
)
async def get_deployments(
    environment: Optional[str] = Query(None, description="Filter by environment"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of deployments"),
):
    """
    Get deployment history.

    Requires: API Key authentication

    Returns a list of deployments, optionally filtered by environment or status.
    """
    try:
        from monitoring.deployment_events import (
            DeploymentStatus as DepStatus,
            deployment_event_tracker,
        )

        # Convert string to DeploymentStatus if provided
        dep_status = None
        if status:
            dep_status = DepStatus(status.lower())

        deployments = deployment_event_tracker.get_deployments(
            environment=environment,
            status=dep_status,
            limit=limit,
        )

        return {
            "deployments": [
                {
                    "deployment_id": d.deployment_id,
                    "version": d.version,
                    "environment": d.environment,
                    "deployment_type": d.deployment_type.value,
                    "status": d.status.value,
                    "started_at": d.started_at.isoformat(),
                    "completed_at": d.completed_at.isoformat() if d.completed_at else None,
                    "duration_seconds": d.duration_seconds,
                    "error_message": d.error_message,
                }
                for d in deployments
            ],
            "count": len(deployments),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("get_deployments_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get deployments")


@router.get(
    "/stats",
    tags=["deployment-events"],
    dependencies=[Depends(verify_api_key)],
)
async def get_deployment_stats(
    environment: Optional[str] = Query(None, description="Filter by environment"),
):
    """
    Get deployment statistics.

    Requires: API Key authentication

    Returns deployment statistics including success rate, average duration, etc.
    """
    try:
        from monitoring.deployment_events import deployment_event_tracker

        stats = deployment_event_tracker.get_stats(environment=environment)

        return {
            **stats,
            "environment": environment or settings.environment,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("get_stats_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get deployment stats")


@router.post(
    "/events/health-transition",
    tags=["deployment-events"],
    dependencies=[Depends(verify_api_key)],
)
async def record_health_transition(
    from_state: str = Query(..., description="Previous health state"),
    to_state: str = Query(..., description="New health state"),
    deployment_id: Optional[str] = Query(None, description="Associated deployment ID"),
    environment: Optional[str] = Query(None, description="Environment"),
):
    """
    Record a health state transition.

    Requires: API Key authentication

    Use this to track health state changes (e.g., healthy -> degraded -> unhealthy).
    """
    try:
        from monitoring.deployment_events import deployment_event_tracker

        env = environment or settings.environment

        deployment_event_tracker.record_health_transition(
            from_state=from_state,
            to_state=to_state,
            deployment_id=deployment_id,
            environment=env,
        )

        return {
            "success": True,
            "from_state": from_state,
            "to_state": to_state,
            "deployment_id": deployment_id,
            "environment": env,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("health_transition_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record health transition")


@router.post(
    "/events/feature-flag",
    tags=["deployment-events"],
    dependencies=[Depends(verify_api_key)],
)
async def record_feature_flag_event(
    flag_name: str = Query(..., description="Name of the feature flag"),
    action: str = Query(..., description="Action performed (enabled, disabled, updated)"),
    deployment_id: Optional[str] = Query(None, description="Associated deployment ID"),
    environment: Optional[str] = Query(None, description="Environment"),
):
    """
    Record a feature flag change event.

    Requires: API Key authentication

    Use this to track feature flag changes during deployments.
    """
    try:
        from monitoring.deployment_events import deployment_event_tracker

        env = environment or settings.environment

        deployment_event_tracker.record_feature_flag_change(
            flag_name=flag_name,
            action=action,
            deployment_id=deployment_id,
            environment=env,
        )

        return {
            "success": True,
            "flag_name": flag_name,
            "action": action,
            "deployment_id": deployment_id,
            "environment": env,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("feature_flag_event_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record feature flag event")
