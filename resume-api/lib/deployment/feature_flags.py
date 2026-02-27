"""
Feature Flag Management for Safe Deployments.
"""

import logging
from typing import Dict, Any, Optional, Set
from enum import Enum
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class FeatureFlagStatus(str, Enum):
    """Status of a feature flag."""
    DISABLED = "disabled"
    ENABLED = "enabled"
    ROLLOUT = "rollout"
    MAINTENANCE = "maintenance"


class FeatureFlagConfig(BaseModel):
    """Configuration for a feature flag."""
    name: str = Field(..., description="Unique feature flag name")
    status: FeatureFlagStatus = Field(default=FeatureFlagStatus.DISABLED, description="Current status")
    rollout_percentage: int = Field(default=0, ge=0, le=100, description="Percentage of requests to enable (0-100)")
    description: str = Field(default="", description="Feature description")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FeatureFlagManager:
    """Manages feature flags for deployment safety."""

    def __init__(self):
        """Initialize feature flag manager."""
        self.flags: Dict[str, FeatureFlagConfig] = {}
        self._init_default_flags()
        logger.info("Feature flag manager initialized")

    def _init_default_flags(self):
        """Initialize default feature flags."""
        default_flags = [
            FeatureFlagConfig(name="new_pdf_renderer", status=FeatureFlagStatus.DISABLED, description="New PDF rendering engine"),
            FeatureFlagConfig(name="ai_tailoring_v2", status=FeatureFlagStatus.DISABLED, description="Enhanced AI tailoring"),
            FeatureFlagConfig(name="advanced_analytics", status=FeatureFlagStatus.DISABLED, description="Advanced analytics dashboard"),
            FeatureFlagConfig(name="real_time_collaboration", status=FeatureFlagStatus.DISABLED, description="Real-time collaboration"),
        ]
        for flag in default_flags:
            self.flags[flag.name] = flag

    def is_enabled(self, flag_name: str, user_id: Optional[str] = None) -> bool:
        """Check if a feature flag is enabled."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return False

        flag = self.flags[flag_name]

        if flag.status == FeatureFlagStatus.DISABLED:
            return False

        if flag.status == FeatureFlagStatus.MAINTENANCE:
            return False

        if flag.status == FeatureFlagStatus.ENABLED:
            return True

        if flag.status == FeatureFlagStatus.ROLLOUT:
            if flag.rollout_percentage >= 100:
                return True
            if flag.rollout_percentage <= 0:
                return False
            if user_id:
                hash_value = hash(f"{user_id}:{flag_name}") % 100
                return hash_value < flag.rollout_percentage
            return False

        return False

    def enable_flag(self, flag_name: str, rollout_percentage: int = 100):
        """Enable a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Creating new feature flag: {flag_name}")
            self.flags[flag_name] = FeatureFlagConfig(name=flag_name)

        flag = self.flags[flag_name]
        flag.status = FeatureFlagStatus.ENABLED if rollout_percentage == 100 else FeatureFlagStatus.ROLLOUT
        flag.rollout_percentage = rollout_percentage
        flag.updated_at = datetime.utcnow()

        logger.info(f"Enabled feature flag: {flag_name} (rollout: {rollout_percentage}%)")

    def disable_flag(self, flag_name: str):
        """Disable a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return

        flag = self.flags[flag_name]
        flag.status = FeatureFlagStatus.DISABLED
        flag.updated_at = datetime.utcnow()

        logger.info(f"Disabled feature flag: {flag_name}")

    def set_maintenance(self, flag_name: str, duration_minutes: int = 60):
        """Mark a feature flag as under maintenance."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return

        flag = self.flags[flag_name]
        flag.status = FeatureFlagStatus.MAINTENANCE
        flag.metadata["maintenance_end"] = (datetime.utcnow() + timedelta(minutes=duration_minutes)).isoformat()
        flag.updated_at = datetime.utcnow()

        logger.info(f"Set feature flag to maintenance: {flag_name} (duration: {duration_minutes}m)")

    def get_all_flags(self) -> Dict[str, FeatureFlagConfig]:
        """Get all feature flags."""
        return {name: flag for name, flag in self.flags.items()}

    def get_flag(self, flag_name: str) -> Optional[FeatureFlagConfig]:
        """Get a specific feature flag."""
        return self.flags.get(flag_name)

    def get_enabled_flags(self) -> Set[str]:
        """Get all enabled feature flags."""
        return {name for name, flag in self.flags.items() if flag.status in [FeatureFlagStatus.ENABLED, FeatureFlagStatus.ROLLOUT]}


# Global feature flag manager instance
feature_flag_manager = FeatureFlagManager()
