"""
Feature Flag API routes.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from api.feature_flags import (
    FeatureFlag,
    FeatureFlagCreate,
    FeatureFlagUpdate,
    FeatureFlagResponse,
    is_flag_active,
    get_all_flags,
    get_flag,
    create_flag,
    update_flag,
    delete_flag,
)

router = APIRouter(prefix="/feature-flags", tags=["feature-flags"])


@router.get("", response_model=List[FeatureFlagResponse])
async def list_flags():
    """
    List all feature flags.
    """
    return get_all_flags()


@router.get("/{flag_name}", response_model=FeatureFlagResponse)
async def get_flag_details(flag_name: str):
    """
    Get details of a specific feature flag.
    """
    flag = get_flag(flag_name)
    if not flag:
        raise HTTPException(status_code=404, detail=f"Flag '{flag_name}' not found")
    
    return FeatureFlagResponse(
        id=0,
        name=flag.name,
        description=flag.description,
        flag_type=flag.flag_type,
        status=flag.status,
        default_value=flag.default_value,
        rollout_percentage=flag.rollout_percentage,
        targeting_rules=flag.targeting_rules,
        created_at=flag.created_at,
        updated_at=flag.updated_at,
        created_by=flag.created_by,
    )


@router.post("", response_model=FeatureFlagResponse, status_code=201)
async def create_new_flag(flag_data: FeatureFlagCreate):
    """
    Create a new feature flag.
    """
    existing = get_flag(flag_data.name)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Flag '{flag_data.name}' already exists"
        )
    
    flag = create_flag(flag_data)
    return FeatureFlagResponse(
        id=0,
        name=flag.name,
        description=flag.description,
        flag_type=flag.flag_type,
        status=flag.status,
        default_value=flag.default_value,
        rollout_percentage=flag.rollout_percentage,
        targeting_rules=flag.targeting_rules,
        created_at=flag.created_at or flag.updated_at,
        updated_at=flag.updated_at,
        created_by=flag.created_by,
    )


@router.patch("/{flag_name}", response_model=FeatureFlagResponse)
async def update_existing_flag(flag_name: str, update_data: FeatureFlagUpdate):
    """
    Update an existing feature flag.
    """
    flag = update_flag(flag_name, update_data)
    if not flag:
        raise HTTPException(status_code=404, detail=f"Flag '{flag_name}' not found")
    
    return FeatureFlagResponse(
        id=0,
        name=flag.name,
        description=flag.description,
        flag_type=flag.flag_type,
        status=flag.status,
        default_value=flag.default_value,
        rollout_percentage=flag.rollout_percentage,
        targeting_rules=flag.targeting_rules,
        created_at=flag.created_at,
        updated_at=flag.updated_at,
        created_by=flag.created_by,
    )


@router.delete("/{flag_name}", status_code=204)
async def remove_flag(flag_name: str):
    """
    Delete a feature flag.
    """
    success = delete_flag(flag_name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Flag '{flag_name}' not found")
    return None


@router.get("/{flag_name}/evaluate")
async def evaluate_flag(
    flag_name: str,
    user_id: Optional[str] = Query(None, description="User ID for targeting"),
    environment: Optional[str] = Query(None, description="Environment (production, staging, etc.)"),
):
    """
    Evaluate a feature flag for a specific user.
    """
    # Extract user attributes from query params
    user_attributes = {}
    return JSONResponse({
        "flag_name": flag_name,
        "active": is_flag_active(
            flag_name,
            user_id=user_id,
            user_attributes=user_attributes if user_attributes else None,
            environment=environment,
        ),
        "user_id": user_id,
        "environment": environment,
    })


@router.post("/{flag_name}/evaluate")
async def evaluate_flag_with_attributes(
    flag_name: str,
    user_id: Optional[str] = None,
    environment: Optional[str] = None,
    user_attributes: Optional[Dict[str, Any]] = None,
):
    """
    Evaluate a feature flag with user attributes.
    """
    return JSONResponse({
        "flag_name": flag_name,
        "active": is_flag_active(
            flag_name,
            user_id=user_id,
            user_attributes=user_attributes,
            environment=environment,
        ),
        "user_id": user_id,
        "environment": environment,
        "user_attributes": user_attributes,
    })


@router.post("/batch-evaluate")
async def batch_evaluate_flags(
    flags: Dict[str, Any],
    user_id: Optional[str] = None,
    environment: Optional[str] = None,
    user_attributes: Optional[Dict[str, Any]] = None,
):
    """
    Evaluate multiple feature flags at once.
    """
    results = {}
    for flag_name in flags.get("flags", []):
        results[flag_name] = is_flag_active(
            flag_name,
            user_id=user_id,
            user_attributes=user_attributes,
            environment=environment,
        )
    
    return JSONResponse({
        "results": results,
        "user_id": user_id,
        "environment": environment,
    })
