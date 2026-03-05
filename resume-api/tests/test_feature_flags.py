"""
Tests for Feature Flag System
"""

import pytest
from api.feature_flags import (
    FeatureFlag,
    FeatureFlagCreate,
    FeatureFlagUpdate,
    FlagType,
    FlagStatus,
    TargetingRule,
    is_flag_active,
    get_all_flags,
    get_flag,
    create_flag,
    update_flag,
    delete_flag,
    _flag_store,
    _init_default_flags,
)


@pytest.fixture(autouse=True)
def reset_flag_store():
    """Reset the flag store before each test."""
    _flag_store.clear()
    _init_default_flags()
    yield
    _flag_store.clear()


class TestFlagCreation:
    """Tests for creating feature flags."""

    def test_create_boolean_flag(self):
        """Test creating a boolean feature flag."""
        flag_data = FeatureFlagCreate(
            name="test_flag",
            description="Test flag",
            flag_type=FlagType.BOOLEAN,
            default_value=True,
        )
        flag = create_flag(flag_data)
        
        assert flag.name == "test_flag"
        assert flag.description == "Test flag"
        assert flag.flag_type == FlagType.BOOLEAN
        assert flag.default_value is True
        assert flag.status == FlagStatus.DRAFT

    def test_create_rollout_flag(self):
        """Test creating a rollout feature flag."""
        flag_data = FeatureFlagCreate(
            name="rollout_flag",
            flag_type=FlagType.ROLLOUT,
            rollout_percentage=50,
        )
        flag = create_flag(flag_data)
        
        assert flag.name == "rollout_flag"
        assert flag.flag_type == FlagType.ROLLOUT
        assert flag.rollout_percentage == 50


class TestFlagEvaluation:
    """Tests for evaluating feature flags."""

    def test_inactive_flag_returns_default(self):
        """Test that inactive flags return default value."""
        # Default flag "new_dashboard" is INACTIVE
        result = is_flag_active("new_dashboard")
        assert result is False

    def test_active_boolean_flag(self):
        """Test active boolean flag returns default value."""
        # "ai_resume_tailoring" is ACTIVE with default_value=True
        result = is_flag_active("ai_resume_tailoring")
        assert result is True

    def test_nonexistent_flag(self):
        """Test nonexistent flag returns False."""
        result = is_flag_active("nonexistent_flag")
        assert result is False

    def test_rollout_flag_percentage(self):
        """Test rollout flag respects percentage."""
        # Create a rollout flag at 100%
        flag_data = FeatureFlagCreate(
            name="full_rollout",
            flag_type=FlagType.ROLLOUT,
            rollout_percentage=100,
        )
        create_flag(flag_data)
        update_flag("full_rollout", FeatureFlagUpdate(status=FlagStatus.ACTIVE))
        
        # Should return True for any user
        result = is_flag_active("full_rollout", user_id="user123")
        assert result is True

    def test_rollout_flag_zero_percentage(self):
        """Test rollout flag at 0% returns False."""
        # Create a rollout flag at 0%
        flag_data = FeatureFlagCreate(
            name="no_rollout",
            flag_type=FlagType.ROLLOUT,
            rollout_percentage=0,
        )
        create_flag(flag_data)
        update_flag("no_rollout", FeatureFlagUpdate(status=FlagStatus.ACTIVE))
        
        result = is_flag_active("no_rollout", user_id="user123")
        assert result is False

    def test_rollout_consistency(self):
        """Test rollout is consistent for same user."""
        flag_data = FeatureFlagCreate(
            name="consistent_rollout",
            flag_type=FlagType.ROLLOUT,
            rollout_percentage=50,
        )
        create_flag(flag_data)
        update_flag("consistent_rollout", FeatureFlagUpdate(status=FlagStatus.ACTIVE))
        
        # Same user should always get same result
        result1 = is_flag_active("consistent_rollout", user_id="user123")
        result2 = is_flag_active("consistent_rollout", user_id="user123")
        assert result1 == result2


class TestFlagTargeting:
    """Tests for targeting rules."""

    def test_targeting_rule_in_operator(self):
        """Test targeting rule with 'in' operator."""
        flag_data = FeatureFlagCreate(
            name="targeted_flag",
            flag_type=FlagType.TARGETING,
            targeting_rules=[
                TargetingRule(
                    attribute="country",
                    operator="in",
                    values=["US", "CA"],
                )
            ],
        )
        create_flag(flag_data)
        update_flag("targeted_flag", FeatureFlagUpdate(status=FlagStatus.ACTIVE))
        
        # User in US should get True
        result = is_flag_active(
            "targeted_flag",
            user_attributes={"country": "US"}
        )
        assert result is True
        
        # User in UK should get False
        result = is_flag_active(
            "targeted_flag",
            user_attributes={"country": "UK"}
        )
        assert result is False


class TestFlagUpdate:
    """Tests for updating feature flags."""

    def test_update_flag_status(self):
        """Test updating flag status."""
        result = update_flag("new_dashboard", FeatureFlagUpdate(status=FlagStatus.ACTIVE))
        assert result is not None
        assert result.status == FlagStatus.ACTIVE
        
        # Now should return True
        assert is_flag_active("new_dashboard") is True

    def test_update_rollout_percentage(self):
        """Test updating rollout percentage."""
        result = update_flag(
            "beta_features",
            FeatureFlagUpdate(rollout_percentage=100)
        )
        assert result is not None
        assert result.rollout_percentage == 100


class TestFlagDeletion:
    """Tests for deleting feature flags."""

    def test_delete_flag(self):
        """Test deleting a flag."""
        success = delete_flag("new_dashboard")
        assert success is True
        
        # Should return False after deletion
        assert is_flag_active("new_dashboard") is False

    def test_delete_nonexistent_flag(self):
        """Test deleting nonexistent flag returns False."""
        success = delete_flag("nonexistent")
        assert success is False


class TestGetAllFlags:
    """Tests for listing all flags."""

    def test_get_all_flags_returns_list(self):
        """Test get_all_flags returns a list."""
        flags = get_all_flags()
        assert isinstance(flags, list)
        assert len(flags) > 0

    def test_flags_have_required_fields(self):
        """Test flags have all required fields."""
        flags = get_all_flags()
        for flag in flags:
            assert flag.name is not None
            assert flag.flag_type is not None
            assert flag.status is not None
