"""
Tests for Feature Flag Service
"""

from datetime import datetime, timedelta
from lib.feature_flags import (
    FeatureFlagService,
    FeatureFlag,
    Variant,
    TargetingRule,
    DEFAULT_FLAGS,
)


class TestFeatureFlagService:
    """Tests for the FeatureFlagService class."""

    def test_default_flags_exist(self):
        """Test that default flags are initialized correctly."""
        service = FeatureFlagService()
        flags = service.get_all_flags()

        assert len(flags) > 0
        assert any(f["key"] == "ai_tailoring" for f in flags)
        assert any(f["key"] == "new_resume_editor" for f in flags)

    def test_get_flag(self):
        """Test getting a specific flag."""
        service = FeatureFlagService()
        flag = service.get_flag("ai_tailoring")

        assert flag is not None
        assert flag["key"] == "ai_tailoring"
        assert flag["enabled"] is True

    def test_get_nonexistent_flag(self):
        """Test getting a flag that doesn't exist."""
        service = FeatureFlagService()
        flag = service.get_flag("nonexistent_flag")

        assert flag is None

    def test_is_enabled_global_100_percent(self):
        """Test flag with 100% rollout is always enabled."""
        service = FeatureFlagService()

        # ai_tailoring has 100% rollout
        assert service.is_enabled("ai_tailoring") is True

    def test_is_enabled_global_0_percent(self):
        """Test flag with 0% rollout is always disabled."""
        service = FeatureFlagService()

        # advanced_analytics has 0% rollout
        assert service.is_enabled("advanced_analytics") is False

    def test_is_enabled_disabled_flag(self):
        """Test that disabled flags return False regardless of rollout."""
        service = FeatureFlagService()

        # Create a flag that's disabled
        flag = FeatureFlag(
            key="test_flag",
            description="Test flag",
            enabled=False,
            rollout_percentage=100,
        )
        service.add_flag(flag)

        assert service.is_enabled("test_flag") is False

    def test_is_enabled_consistent_hashing(self):
        """Test that consistent hashing works correctly."""
        service = FeatureFlagService()

        # Create a flag with 50% rollout
        flag = FeatureFlag(
            key="test_rollout",
            description="Test rollout",
            enabled=True,
            rollout_percentage=50,
        )
        service.add_flag(flag)

        # Same user should always get the same result
        result1 = service.is_enabled("test_rollout", user_id="user123")
        result2 = service.is_enabled("test_rollout", user_id="user123")

        assert result1 == result2

    def test_is_enabled_user_targeting(self):
        """Test user-specific targeting."""
        service = FeatureFlagService()

        # Create a flag with user targeting
        targeting = TargetingRule(
            users=["target_user1", "target_user2"],
        )
        flag = FeatureFlag(
            key="user_targeted",
            description="User targeted flag",
            enabled=True,
            rollout_percentage=0,  # 0% general rollout
            targeting=targeting,
        )
        service.add_flag(flag)

        # Targeted users should have access
        assert service.is_enabled("user_targeted", user_id="target_user1") is True
        assert service.is_enabled("user_targeted", user_id="target_user2") is True

        # Non-targeted users should not have access
        assert service.is_enabled("user_targeted", user_id="other_user") is False

    def test_is_enabled_group_targeting(self):
        """Test group-based targeting."""
        service = FeatureFlagService()

        # Create a flag with group targeting
        targeting = TargetingRule(
            groups=["premium", "admin"],
        )
        flag = FeatureFlag(
            key="group_targeted",
            description="Group targeted flag",
            enabled=True,
            rollout_percentage=0,
            targeting=targeting,
        )
        service.add_flag(flag)

        # Users in targeted groups should have access
        assert service.is_enabled("group_targeted", groups=["premium"]) is True
        assert service.is_enabled("group_targeted", groups=["admin"]) is True
        assert service.is_enabled("group_targeted", groups=["premium", "basic"]) is True

        # Users not in targeted groups should not have access
        assert service.is_enabled("group_targeted", groups=["basic"]) is False

    def test_evaluate_flag_simple(self):
        """Test simple flag evaluation."""
        service = FeatureFlagService()

        result = service.evaluate_flag("ai_tailoring")

        assert result["key"] == "ai_tailoring"
        assert result["enabled"] is True
        assert "variant" not in result

    def test_evaluate_flag_with_variants(self):
        """Test flag evaluation with A/B testing variants."""
        service = FeatureFlagService()

        # Create a flag with variants
        variants = [
            Variant(id="control", name="Control", weight=50),
            Variant(id="treatment", name="Treatment", weight=50),
        ]
        flag = FeatureFlag(
            key="ab_test",
            description="A/B test flag",
            enabled=True,
            rollout_percentage=100,
            variants=variants,
            default_variant="control",
        )
        service.add_flag(flag)

        # Evaluate with the same user - should get consistent results
        result1 = service.evaluate_flag("ab_test", user_id="user123")
        result2 = service.evaluate_flag("ab_test", user_id="user123")

        assert result1["enabled"] is True
        assert result1["variant"] in ["control", "treatment"]
        assert result1["variant"] == result2["variant"]  # Consistent hashing

    def test_get_config(self):
        """Test getting full configuration."""
        service = FeatureFlagService()

        config = service.get_config()

        assert "flags" in config
        assert "timestamp" in config
        assert "version" in config
        assert len(config["flags"]) > 0

    def test_update_flag(self):
        """Test updating a flag's configuration."""
        service = FeatureFlagService()

        # Update a flag
        result = service.update_flag(
            "new_resume_editor",
            rollout_percentage=75,
            enabled=True,
        )

        assert result is True
        flag = service.get_flag("new_resume_editor")
        assert flag["rolloutPercentage"] == 75
        assert flag["enabled"] is True

    def test_update_nonexistent_flag(self):
        """Test updating a flag that doesn't exist."""
        service = FeatureFlagService()

        result = service.update_flag("nonexistent", rollout_percentage=50)

        assert result is False

    def test_add_flag(self):
        """Test adding a new flag."""
        service = FeatureFlagService()

        initial_count = len(service.get_all_flags())

        new_flag = FeatureFlag(
            key="brand_new_feature",
            description="A brand new feature",
            enabled=True,
            rollout_percentage=100,
        )
        result = service.add_flag(new_flag)

        assert result is True
        assert len(service.get_all_flags()) == initial_count + 1

        flag = service.get_flag("brand_new_feature")
        assert flag is not None
        assert flag["key"] == "brand_new_feature"

    def test_add_duplicate_flag(self):
        """Test adding a duplicate flag fails."""
        service = FeatureFlagService()

        new_flag = FeatureFlag(
            key="ai_tailoring",  # Already exists in defaults
            description="Duplicate",
            enabled=True,
            rollout_percentage=100,
        )
        result = service.add_flag(new_flag)

        assert result is False

    def test_delete_flag(self):
        """Test deleting a flag."""
        service = FeatureFlagService()

        # Add a flag first
        new_flag = FeatureFlag(
            key="temp_flag",
            description="Temporary flag",
            enabled=True,
            rollout_percentage=100,
        )
        service.add_flag(new_flag)

        initial_count = len(service.get_all_flags())

        # Delete it
        result = service.delete_flag("temp_flag")

        assert result is True
        assert len(service.get_all_flags()) == initial_count - 1
        assert service.get_flag("temp_flag") is None

    def test_delete_nonexistent_flag(self):
        """Test deleting a flag that doesn't exist."""
        service = FeatureFlagService()

        result = service.delete_flag("nonexistent")

        assert result is False

    def test_expired_flag(self):
        """Test that expired flags are disabled."""
        service = FeatureFlagService()

        # Create an expired flag
        flag = FeatureFlag(
            key="expired_flag",
            description="Expired flag",
            enabled=True,
            rollout_percentage=100,
            expires_at=datetime.utcnow() - timedelta(days=1),
        )
        service.add_flag(flag)

        assert service.is_enabled("expired_flag") is False

    def test_flag_with_ip_targeting(self):
        """Test IP-based targeting."""
        service = FeatureFlagService()

        # Create a flag with IP targeting
        targeting = TargetingRule(
            ip_ranges=["192.168.1.*", "10.0.0.1"],
        )
        flag = FeatureFlag(
            key="ip_targeted",
            description="IP targeted flag",
            enabled=True,
            rollout_percentage=0,
            targeting=targeting,
        )
        service.add_flag(flag)

        # Matching IPs should have access
        assert service.is_enabled("ip_targeted", ip="192.168.1.100") is True
        assert service.is_enabled("ip_targeted", ip="10.0.0.1") is True

        # Non-matching IPs should not have access
        assert service.is_enabled("ip_targeted", ip="172.16.0.1") is False


class TestFeatureFlagModel:
    """Tests for the FeatureFlag model."""

    def test_feature_flag_creation(self):
        """Test creating a FeatureFlag instance."""
        flag = FeatureFlag(
            key="test_flag",
            description="A test flag",
            enabled=True,
            rollout_percentage=50,
        )

        assert flag.key == "test_flag"
        assert flag.description == "A test flag"
        assert flag.enabled is True
        assert flag.rollout_percentage == 50

    def test_feature_flag_with_variants(self):
        """Test creating a flag with variants."""
        variants = [
            Variant(id="a", name="Variant A", weight=33.3),
            Variant(id="b", name="Variant B", weight=33.3),
            Variant(id="c", name="Variant C", weight=33.4),
        ]
        flag = FeatureFlag(
            key="multi_variant",
            description="Multi-variant flag",
            enabled=True,
            rollout_percentage=100,
            variants=variants,
            default_variant="a",
        )

        assert len(flag.variants) == 3
        assert flag.default_variant == "a"


class TestDefaultFlags:
    """Tests for default flag configurations."""

    def test_default_flags_have_required_fields(self):
        """Test that all default flags have required fields."""
        for key, flag in DEFAULT_FLAGS.items():
            assert flag.key == key
            assert flag.description
            assert isinstance(flag.enabled, bool)
            assert isinstance(flag.rollout_percentage, (int, float))
            assert 0 <= flag.rollout_percentage <= 100

    def test_default_flags_ai_features(self):
        """Test that AI-related default flags are properly configured."""
        # AI tailoring should be enabled
        assert DEFAULT_FLAGS["ai_tailoring"].enabled is True
        assert DEFAULT_FLAGS["ai_tailoring"].rollout_percentage == 100
