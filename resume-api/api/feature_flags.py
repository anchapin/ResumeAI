"""
Feature Flag models and API.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import json
import os


class FlagType(str, Enum):
    """Types of feature flags."""
    BOOLEAN = "boolean"
    ROLLout = "rollout"  # Percentage-based rollout
    TARGETING = "targeting"  # User targeting


class FlagStatus(str, Enum):
    """Feature flag status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"


class TargetingRule(BaseModel):
    """Targeting rule for feature flags."""
    attribute: str  # e.g., "user_id", "email", "country"
    operator: str  # e.g., "in", "not_in", "equals"
    values: List[str] = Field(default_factory=list)


class FeatureFlag(BaseModel):
    """Feature flag model."""
    id: Optional[int] = None
    name: str = Field(..., description="Unique flag identifier")
    description: Optional[str] = None
    flag_type: FlagType = FlagType.BOOLEAN
    status: FlagStatus = FlagStatus.DRAFT
    default_value: bool = False
    
    # Rollout percentage (0-100)
    rollout_percentage: int = Field(default=0, ge=0, le=100)
    
    # Targeting rules
    targeting_rules: List[TargetingRule] = Field(default_factory=list)
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    
    # Environment-specific overrides
    environments: Dict[str, bool] = Field(default_factory=dict)


class FeatureFlagCreate(BaseModel):
    """Request model for creating a feature flag."""
    name: str
    description: Optional[str] = None
    flag_type: FlagType = FlagType.BOOLEAN
    default_value: bool = False
    rollout_percentage: int = 0
    targeting_rules: List[TargetingRule] = Field(default_factory=list)


class FeatureFlagUpdate(BaseModel):
    """Request model for updating a feature flag."""
    description: Optional[str] = None
    status: Optional[FlagStatus] = None
    default_value: Optional[bool] = None
    rollout_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    targeting_rules: Optional[List[TargetingRule]] = None
    environments: Optional[Dict[str, bool]] = None


class FeatureFlagResponse(BaseModel):
    """Response model for feature flag."""
    id: int
    name: str
    description: Optional[str]
    flag_type: FlagType
    status: FlagStatus
    default_value: bool
    rollout_percentage: int
    targeting_rules: List[TargetingRule]
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str]


# In-memory store for MVP (can be replaced with database)
# In production, this would be stored in a database
_flag_store: Dict[str, FeatureFlag] = {}


def _get_flag_store() -> Dict[str, FeatureFlag]:
    """Get the feature flag store."""
    return _flag_store


def _init_default_flags():
    """Initialize default feature flags."""
    default_flags = [
        FeatureFlag(
            name="new_dashboard",
            description="Enable new dashboard design",
            flag_type=FlagType.ROLLOUT,
            status=FlagStatus.ACTIVE,
            default_value=False,
            rollout_percentage=0,
        ),
        FeatureFlag(
            name="ai_resume_tailoring",
            description="AI-powered resume tailoring feature",
            flag_type=FlagType.BOOLEAN,
            status=FlagStatus.ACTIVE,
            default_value=True,
        ),
        FeatureFlag(
            name="dark_mode",
            description="Dark mode support",
            flag_type=FlagType.BOOLEAN,
            status=FlagStatus.DRAFT,
            default_value=False,
        ),
        FeatureFlag(
            name="beta_features",
            description="Beta features for early adopters",
            flag_type=FlagType.ROLLOUT,
            status=FlagStatus.ACTIVE,
            default_value=False,
            rollout_percentage=10,
        ),
    ]
    
    for flag in default_flags:
        _flag_store[flag.name] = flag


# Initialize default flags on module load
_init_default_flags()


def is_flag_active(
    flag_name: str,
    user_id: Optional[str] = None,
    user_attributes: Optional[Dict[str, Any]] = None,
    environment: Optional[str] = None,
) -> bool:
    """
    Check if a feature flag is active.
    
    Args:
        flag_name: Name of the feature flag
        user_id: Optional user ID for targeting
        user_attributes: Optional user attributes for targeting
        environment: Optional environment (e.g., "production", "staging")
    
    Returns:
        True if the flag is active, False otherwise
    """
    flag = _flag_store.get(flag_name)
    
    if not flag:
        return False
    
    if flag.status != FlagStatus.ACTIVE:
        return False
    
    # Check environment override first
    if environment and flag.environments.get(environment) is not None:
        return flag.environments[environment]
    
    # Check targeting rules
    if user_attributes and flag.targeting_rules:
        for rule in flag.targeting_rules:
            attr_value = user_attributes.get(rule.attribute)
            if attr_value:
                if rule.operator == "in":
                    if str(attr_value) in rule.values:
                        return True
                elif rule.operator == "equals":
                    if str(attr_value) == rule.values[0] if rule.values else False:
                        return True
    
    # Check user ID for rollout (consistent hashing)
    if flag.flag_type == FlagType.ROLLOUT and user_id:
        # Simple hash-based rollout for consistency
        hash_value = hash(f"{flag_name}:{user_id}") % 100
        return hash_value < flag.rollout_percentage
    
    return flag.default_value


def get_all_flags() -> List[FeatureFlagResponse]:
    """Get all feature flags."""
    return [
        FeatureFlagResponse(
            id=idx,
            name=flag.name,
            description=flag.description,
            flag_type=flag.flag_type,
            status=flag.status,
            default_value=flag.default_value,
            rollout_percentage=flag.rollout_percentage,
            targeting_rules=flag.targeting_rules,
            created_at=flag.created_at or datetime.now(),
            updated_at=flag.updated_at,
            created_by=flag.created_by,
        )
        for idx, flag in enumerate(_flag_store.values())
    ]


def get_flag(name: str) -> Optional[FeatureFlag]:
    """Get a specific feature flag."""
    return _flag_store.get(name)


def create_flag(flag_data: FeatureFlagCreate, created_by: Optional[str] = None) -> FeatureFlag:
    """Create a new feature flag."""
    flag = FeatureFlag(
        name=flag_data.name,
        description=flag_data.description,
        flag_type=flag_data.flag_type,
        default_value=flag_data.default_value,
        rollout_percentage=flag_data.rollout_percentage,
        targeting_rules=flag_data.targeting_rules,
        created_by=created_by,
        created_at=datetime.now(),
    )
    _flag_store[flag.name] = flag
    return flag


def update_flag(name: str, update_data: FeatureFlagUpdate) -> Optional[FeatureFlag]:
    """Update an existing feature flag."""
    flag = _flag_store.get(name)
    if not flag:
        return None
    
    if update_data.description is not None:
        flag.description = update_data.description
    if update_data.status is not None:
        flag.status = update_data.status
    if update_data.default_value is not None:
        flag.default_value = update_data.default_value
    if update_data.rollout_percentage is not None:
        flag.rollout_percentage = update_data.rollout_percentage
    if update_data.targeting_rules is not None:
        flag.targeting_rules = update_data.targeting_rules
    if update_data.environments is not None:
        flag.environments = update_data.environments
    
    flag.updated_at = datetime.now()
    return flag


def delete_flag(name: str) -> bool:
    """Delete a feature flag."""
    if name in _flag_store:
        del _flag_store[name]
        return True
    return False
