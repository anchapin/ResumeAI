"""
Feature Flag Service

Provides feature flag infrastructure for gradual rollouts and A/B testing.
"""

import hashlib
from datetime import datetime
from typing import Any, Optional
from dataclasses import dataclass, field

from monitoring.logging_config import get_logger

logger = get_logger("lib.feature_flags")


@dataclass
class TargetingRule:
    """Feature flag targeting rules."""

    percentage: float = 0.0
    groups: list[str] = field(default_factory=list)
    users: list[str] = field(default_factory=list)
    ip_ranges: list[str] = field(default_factory=list)


@dataclass
class Variant:
    """Feature flag variant for A/B testing."""

    id: str
    name: str
    weight: float = 0.0
    config: dict[str, Any] = field(default_factory=dict)


@dataclass
class FeatureFlag:
    """Feature flag definition."""

    key: str
    description: str
    enabled: bool = False
    rollout_percentage: float = 0.0
    targeting: Optional[TargetingRule] = None
    variants: list[Variant] = field(default_factory=list)
    default_variant: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None


# Default feature flags for the application
DEFAULT_FLAGS: dict[str, FeatureFlag] = {
    "new_resume_editor": FeatureFlag(
        key="new_resume_editor",
        description="New resume editor UI with improved UX",
        enabled=True,
        rollout_percentage=50,
    ),
    "ai_tailoring": FeatureFlag(
        key="ai_tailoring",
        description="AI-powered resume tailoring feature",
        enabled=True,
        rollout_percentage=100,
    ),
    "advanced_analytics": FeatureFlag(
        key="advanced_analytics",
        description="Advanced analytics dashboard",
        enabled=False,
        rollout_percentage=0,
    ),
    "linkedin_import": FeatureFlag(
        key="linkedin_import",
        description="LinkedIn profile import feature",
        enabled=True,
        rollout_percentage=100,
    ),
    "pdf_export_optimization": FeatureFlag(
        key="pdf_export_optimization",
        description="Optimized PDF export with better formatting",
        enabled=True,
        rollout_percentage=75,
    ),
    "new_pricing_page": FeatureFlag(
        key="new_pricing_page",
        description="Redesigned pricing page",
        enabled=False,
        rollout_percentage=0,
    ),
    "dark_mode": FeatureFlag(
        key="dark_mode",
        description="Dark mode theme support",
        enabled=False,
        rollout_percentage=0,
    ),
    "realtime_collaboration": FeatureFlag(
        key="realtime_collaboration",
        description="Real-time collaboration on resumes",
        enabled=False,
        rollout_percentage=0,
    ),
}


class FeatureFlagService:
    """
    Feature flag service for gradual rollouts and A/B testing.

    Supports:
    - Simple on/off flags
    - Percentage-based rollouts
    - User/group targeting
    - A/B testing with variants
    """

    def __init__(self, flags: Optional[dict[str, FeatureFlag]] = None):
        """
        Initialize the feature flag service.

        Args:
            flags: Optional dictionary of feature flags. Uses defaults if not provided.
        """
        self._flags = flags or DEFAULT_FLAGS.copy()
        self._config_version = "1.0.0"

    def get_all_flags(self) -> list[dict[str, Any]]:
        """Get all feature flags as dictionaries."""
        return [self._flag_to_dict(flag) for flag in self._flags.values()]

    def get_flag(self, key: str) -> Optional[dict[str, Any]]:
        """Get a specific feature flag by key."""
        flag = self._flags.get(key)
        return self._flag_to_dict(flag) if flag else None

    def is_enabled(
        self,
        key: str,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        groups: Optional[list[str]] = None,
        ip: Optional[str] = None,
        session_id: Optional[str] = None,
        attributes: Optional[dict[str, Any]] = None,
    ) -> bool:
        """
        Check if a feature flag is enabled for a user.

        Args:
            key: Feature flag key
            user_id: User ID if authenticated
            email: User email
            groups: User groups/roles
            ip: User IP address
            session_id: Session ID
            attributes: Additional custom attributes

        Returns:
            True if the feature is enabled for the user
        """
        flag = self._flags.get(key)
        if not flag:
            logger.warning("feature_flag_not_found", flag_key=key)
            return False

        # Check if flag is globally disabled
        if not flag.enabled:
            return False

        # Check if flag has expired
        if flag.expires_at and flag.expires_at < datetime.utcnow():
            logger.info("feature_flag_expired", flag_key=key)
            return False

        # If rollout is 100%, enable for everyone
        if flag.rollout_percentage >= 100:
            return True

        # If rollout is 0%, disable for everyone
        if flag.rollout_percentage <= 0:
            return False

        # Check targeting rules
        if flag.targeting:
            # Check user-specific targeting
            if flag.targeting.users and user_id and user_id in flag.targeting.users:
                return True

            # Check group targeting
            if flag.targeting.groups and groups:
                if any(group in flag.targeting.groups for group in groups):
                    return True

            # Check IP range targeting (simple implementation)
            if flag.targeting.ip_ranges and ip:
                if self._check_ip_in_ranges(ip, flag.targeting.ip_ranges):
                    return True

        # Check percentage-based rollout using consistent hashing
        if self._is_in_rollout(
            key=key,
            user_id=user_id,
            email=email,
            session_id=session_id,
            percentage=flag.rollout_percentage,
        ):
            return True

        return False

    def evaluate_flag(
        self,
        key: str,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        groups: Optional[list[str]] = None,
        ip: Optional[str] = None,
        session_id: Optional[str] = None,
        attributes: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Evaluate a feature flag and return detailed information.

        Args:
            key: Feature flag key
            user_id: User ID if authenticated
            email: User email
            groups: User groups/roles
            ip: User IP address
            session_id: Session ID
            attributes: Additional custom attributes

        Returns:
            Dictionary with flag evaluation results
        """
        flag = self._flags.get(key)
        if not flag:
            return {
                "key": key,
                "enabled": False,
                "error": "Flag not found",
            }

        enabled = self.is_enabled(
            key=key,
            user_id=user_id,
            email=email,
            groups=groups,
            ip=ip,
            session_id=session_id,
            attributes=attributes,
        )

        result: dict[str, Any] = {
            "key": key,
            "enabled": enabled,
        }

        # Add variant information if A/B testing is configured
        if enabled and flag.variants:
            variant = self._get_variant(
                key=key,
                user_id=user_id,
                email=email,
                session_id=session_id,
                variants=flag.variants,
                default_variant=flag.default_variant,
            )
            result["variant"] = variant["id"]
            result["config"] = variant.get("config")

        return result

    def get_config(self) -> dict[str, Any]:
        """Get the complete feature flag configuration."""
        return {
            "flags": self.get_all_flags(),
            "timestamp": int(datetime.utcnow().timestamp()),
            "version": self._config_version,
        }

    def update_flag(self, key: str, **kwargs: Any) -> bool:
        """Update a feature flag's configuration."""
        flag = self._flags.get(key)
        if not flag:
            logger.warning("feature_flag_not_found", flag_key=key)
            return False

        for attr, value in kwargs.items():
            if hasattr(flag, attr):
                setattr(flag, attr, value)

        flag.updated_at = datetime.utcnow()
        logger.info("feature_flag_updated", flag_key=key)
        return True

    def add_flag(self, flag: FeatureFlag) -> bool:
        """Add a new feature flag."""
        if flag.key in self._flags:
            logger.warning("feature_flag_already_exists", flag_key=flag.key)
            return False

        self._flags[flag.key] = flag
        logger.info("feature_flag_added", flag_key=flag.key)
        return True

    def delete_flag(self, key: str) -> bool:
        """Delete a feature flag."""
        if key not in self._flags:
            logger.warning("feature_flag_not_found", flag_key=key)
            return False

        del self._flags[key]
        logger.info("feature_flag_deleted", flag_key=key)
        return True

    def _is_in_rollout(
        self,
        key: str,
        user_id: Optional[str],
        email: Optional[str],
        session_id: Optional[str],
        percentage: float,
    ) -> bool:
        """Determine if a user is in the rollout percentage using consistent hashing."""
        # Use a combination of flag key, user ID, email, or session ID for hashing
        # This ensures consistent behavior for the same user
        hash_input = key
        if user_id:
            hash_input += f":{user_id}"
        elif email:
            hash_input += f":{email}"
        elif session_id:
            hash_input += f":{session_id}"

        # Generate a hash and map to 0-100 range
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16) % 100
        return hash_value < percentage

    def _get_variant(
        self,
        key: str,
        user_id: Optional[str],
        email: Optional[str],
        session_id: Optional[str],
        variants: list[Variant],
        default_variant: Optional[str],
    ) -> dict[str, Any]:
        """Get the variant for a user using weighted random selection."""
        if not variants:
            return {"id": default_variant or ""}

        # Use consistent hashing to assign user to variant
        hash_input = key
        if user_id:
            hash_input += f":{user_id}"
        elif email:
            hash_input += f":{email}"
        elif session_id:
            hash_input += f":{session_id}"

        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16) % 100

        # Calculate cumulative weights
        cumulative = 0
        for variant in variants:
            cumulative += variant.weight
            if hash_value < cumulative:
                return {
                    "id": variant.id,
                    "name": variant.name,
                    "config": variant.config,
                }

        # Return default variant if no match
        return {"id": default_variant or variants[0].id if variants else ""}

    def _check_ip_in_ranges(self, ip: str, ranges: list[str]) -> bool:
        """Check if an IP address is in any of the specified ranges."""
        # Simple implementation - can be extended for CIDR notation
        for range_str in ranges:
            if ip == range_str:
                return True
            # Check for wildcard matching (e.g., "192.168.*.*")
            if "*" in range_str:
                prefix = range_str.split("*")[0]
                if ip.startswith(prefix):
                    return True
        return False

    def _flag_to_dict(self, flag: Optional[FeatureFlag]) -> Optional[dict[str, Any]]:
        """Convert a FeatureFlag to a dictionary."""
        if not flag:
            return None

        return {
            "key": flag.key,
            "description": flag.description,
            "enabled": flag.enabled,
            "rolloutPercentage": flag.rollout_percentage,
            "targeting": (
                {
                    "percentage": flag.targeting.percentage if flag.targeting else 0,
                    "groups": flag.targeting.groups if flag.targeting else [],
                    "users": flag.targeting.users if flag.targeting else [],
                    "ipRanges": flag.targeting.ip_ranges if flag.targeting else [],
                }
                if flag.targeting
                else None
            ),
            "variants": (
                [
                    {
                        "id": v.id,
                        "name": v.name,
                        "weight": v.weight,
                        "config": v.config,
                    }
                    for v in flag.variants
                ]
                if flag.variants
                else None
            ),
            "defaultVariant": flag.default_variant,
            "tags": flag.tags,
            "createdAt": flag.created_at.isoformat() if flag.created_at else None,
            "updatedAt": flag.updated_at.isoformat() if flag.updated_at else None,
            "expiresAt": flag.expires_at.isoformat() if flag.expires_at else None,
        }


# Global instance
_feature_flag_service: Optional[FeatureFlagService] = None


def get_feature_flag_service() -> FeatureFlagService:
    """Get the global feature flag service instance."""
    global _feature_flag_service
    if _feature_flag_service is None:
        _feature_flag_service = FeatureFlagService()
    return _feature_flag_service
