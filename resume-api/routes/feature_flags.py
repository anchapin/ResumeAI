"""
Feature Flag API Routes

Provides endpoints for feature flag management and evaluation.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Header, HTTPException
from pydantic import BaseModel

from lib.feature_flags import (
    FeatureFlagService,
    get_feature_flag_service,
)
from monitoring.logging_config import get_logger

logger = get_logger("routes.feature_flags")

router = APIRouter(prefix="/api/v1/feature-flags", tags=["feature-flags"])


class FeatureFlagEvaluationRequest(BaseModel):
    """Request model for evaluating feature flags."""

    user_id: Optional[str] = None
    email: Optional[str] = None
    groups: Optional[list[str]] = None
    session_id: Optional[str] = None
    attributes: Optional[dict] = None


class FeatureFlagResponse(BaseModel):
    """Response model for a feature flag."""

    key: str
    description: str
    enabled: bool
    rolloutPercentage: float
    tags: list[str] = []


class FeatureFlagConfigResponse(BaseModel):
    """Response model for feature flag configuration."""

    flags: list[dict]
    timestamp: int
    version: str


class FeatureFlagEvaluationResponse(BaseModel):
    """Response model for feature flag evaluation."""

    key: str
    enabled: bool
    variant: Optional[str] = None
    config: Optional[dict] = None


@router.get("", response_model=FeatureFlagConfigResponse)
async def get_feature_flags(
    service: FeatureFlagService = Depends(get_feature_flag_service),
) -> FeatureFlagConfigResponse:
    """
    Get all feature flags configuration.

    Returns the complete feature flag configuration including all flags,
    their current status, and targeting rules.
    """
    config = service.get_config()
    return FeatureFlagConfigResponse(**config)


@router.get("/{flag_key}", response_model=FeatureFlagResponse)
async def get_feature_flag(
    flag_key: str,
    service: FeatureFlagService = Depends(get_feature_flag_service),
) -> FeatureFlagResponse:
    """
    Get a specific feature flag by key.

    Args:
        flag_key: The feature flag key

    Returns:
        The feature flag configuration
    """
    flag = service.get_flag(flag_key)
    if not flag:
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_key}' not found")

    return FeatureFlagResponse(**flag)


@router.post("/evaluate", response_model=list[FeatureFlagEvaluationResponse])
async def evaluate_feature_flags(
    request: FeatureFlagEvaluationRequest,
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    service: FeatureFlagService = Depends(get_feature_flag_service),
) -> list[FeatureFlagEvaluationResponse]:
    """
    Evaluate feature flags for a user.

    Provide user context to get personalized feature flag evaluations
    with A/B testing variants if configured.

    Args:
        request: User context for evaluation
        x_forwarded_for: Client IP address from headers

    Returns:
        List of feature flag evaluations
    """
    # Extract IP from X-Forwarded-For header
    ip = None
    if x_forwarded_for:
        # Take the first IP if there are multiple
        ip = x_forwarded_for.split(",")[0].strip()

    # Get all flags and evaluate each one
    all_flags = service.get_all_flags()
    results = []

    for flag in all_flags:
        evaluation = service.evaluate_flag(
            key=flag["key"],
            user_id=request.user_id,
            email=request.email,
            groups=request.groups,
            ip=ip,
            session_id=request.session_id,
            attributes=request.attributes,
        )
        results.append(FeatureFlagEvaluationResponse(**evaluation))

    return results


@router.get("/{flag_key}/evaluate", response_model=FeatureFlagEvaluationResponse)
async def evaluate_single_flag(
    flag_key: str,
    user_id: Optional[str] = Query(None, description="User ID"),
    email: Optional[str] = Query(None, description="User email"),
    groups: Optional[str] = Query(None, description="Comma-separated user groups"),
    session_id: Optional[str] = Query(None, description="Session ID"),
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    service: FeatureFlagService = Depends(get_feature_flag_service),
) -> FeatureFlagEvaluationResponse:
    """
    Evaluate a single feature flag for a user.

    Args:
        flag_key: The feature flag key
        user_id: User ID
        email: User email
        groups: Comma-separated list of user groups
        session_id: Session ID
        x_forwarded_for: Client IP address

    Returns:
        Feature flag evaluation result
    """
    # Parse groups from comma-separated string
    groups_list = groups.split(",") if groups else None

    # Extract IP from X-Forwarded-For header
    ip = None
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()

    evaluation = service.evaluate_flag(
        key=flag_key,
        user_id=user_id,
        email=email,
        groups=groups_list,
        ip=ip,
        session_id=session_id,
    )

    if "error" in evaluation and not evaluation["enabled"]:
        # Check if it's a "not found" error
        if service.get_flag(flag_key) is None:
            raise HTTPException(status_code=404, detail=f"Feature flag '{flag_key}' not found")

    return FeatureFlagEvaluationResponse(**evaluation)
