"""
Tests for API key rotation functionality.

Tests the key rotation service, including:
- Creating keys with rotation enabled
- Manual key rotation
- Dual key period verification
- Automatic rotation processing
- Audit logging
"""

import pytest
import secrets
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock, patch

from lib.security.key_rotation import (
    KeyRotationService,
    create_rotation_service,
    RotationEventType,
)


class TestKeyRotationService:
    """Tests for the KeyRotationService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        db = MagicMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        return db

    @pytest.fixture
    def rotation_service(self, mock_db):
        """Create a KeyRotationService instance with mock DB."""
        return KeyRotationService(mock_db)

    def test_create_rotation_service(self, mock_db):
        """Test creating a rotation service instance."""
        service = create_rotation_service(mock_db)
        assert isinstance(service, KeyRotationService)
        assert service.db == mock_db

    @pytest.mark.asyncio
    async def test_rotate_key_not_found(self, rotation_service, mock_db):
        """Test rotating a non-existent key returns None."""
        # Mock empty result
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        new_key, new_api_key = await rotation_service.rotate_key(
            key_id=999,
            user_id=1,
        )

        assert new_key is None
        assert new_api_key is None

    @pytest.mark.asyncio
    async def test_rotate_key_inactive_key(self, rotation_service, mock_db):
        """Test rotating an inactive key returns None."""
        # Create mock key that is inactive
        mock_key = MagicMock()
        mock_key.is_active = False
        mock_key.is_revoked = True
        mock_key.id = 1
        mock_key.user_id = 1
        mock_key.name = "Test Key"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_key
        mock_db.execute = AsyncMock(return_value=mock_result)

        new_key, new_api_key = await rotation_service.rotate_key(
            key_id=1,
            user_id=1,
        )

        assert new_key is None
        assert new_api_key is None

    @pytest.mark.asyncio
    async def test_get_keys_needing_rotation(self, rotation_service, mock_db):
        """Test getting keys that need rotation."""
        # Create mock keys
        mock_key1 = MagicMock()
        mock_key1.id = 1
        mock_key1.rotation_enabled = True
        mock_key1.is_active = True
        mock_key1.is_revoked = False
        mock_key1.next_rotation_at = datetime.now(timezone.utc)

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_key1]
        mock_db.execute = AsyncMock(return_value=mock_result)

        keys = await rotation_service.get_keys_needing_rotation(days_ahead=7)

        assert len(keys) == 1
        assert keys[0].id == 1

    @pytest.mark.asyncio
    async def test_get_keys_for_notification(self, rotation_service, mock_db):
        """Test getting keys expiring soon for notification."""
        # Create mock keys
        mock_key = MagicMock()
        mock_key.id = 1
        mock_key.is_active = True
        mock_key.is_revoked = False
        mock_key.expires_at = datetime.now(timezone.utc) + timedelta(days=5)

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_key]
        mock_db.execute = AsyncMock(return_value=mock_result)

        keys = await rotation_service.get_keys_for_notification(days_before_expiry=7)

        assert len(keys) == 1
        assert keys[0].id == 1

    @pytest.mark.asyncio
    async def test_enable_rotation(self, rotation_service, mock_db):
        """Test enabling rotation on a key."""
        # Create mock key
        mock_key = MagicMock()
        mock_key.id = 1
        mock_key.user_id = 1
        mock_key.is_active = True
        mock_key.is_revoked = False
        mock_key.rotation_enabled = False
        mock_key.rotation_period_days = None
        mock_key.next_rotation_at = None
        mock_key.key_prefix = "test_key_pre"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_key
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await rotation_service.enable_rotation(
            key_id=1,
            user_id=1,
            rotation_period_days=90,
        )

        assert result is not None
        assert result.rotation_enabled is True
        assert result.rotation_period_days == 90

    @pytest.mark.asyncio
    async def test_disable_rotation(self, rotation_service, mock_db):
        """Test disabling rotation on a key."""
        # Create mock key
        mock_key = MagicMock()
        mock_key.id = 1
        mock_key.user_id = 1
        mock_key.rotation_enabled = True
        mock_key.next_rotation_at = datetime.now(timezone.utc)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_key
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await rotation_service.disable_rotation(
            key_id=1,
            user_id=1,
        )

        assert result is not None
        assert result.rotation_enabled is False

    @pytest.mark.asyncio
    async def test_get_rotation_status(self, rotation_service, mock_db):
        """Test getting rotation status for a key."""
        # Create mock key
        mock_key = MagicMock()
        mock_key.id = 1
        mock_key.user_id = 1
        mock_key.rotation_enabled = True
        mock_key.rotation_period_days = 90
        mock_key.next_rotation_at = datetime.now(timezone.utc) + timedelta(days=30)
        mock_key.is_rotating = False
        mock_key.previous_key_hash = None
        mock_key.rotated_at = datetime.now(timezone.utc) - timedelta(days=60)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_key
        mock_db.execute = AsyncMock(return_value=mock_result)

        status = await rotation_service.get_rotation_status(
            key_id=1,
            user_id=1,
        )

        assert status is not None
        assert status["rotation_enabled"] is True
        assert status["rotation_period_days"] == 90
        assert status["is_rotating"] is False
        assert status["has_previous_key"] is False

    @pytest.mark.asyncio
    async def test_get_rotation_status_not_found(self, rotation_service, mock_db):
        """Test getting rotation status for non-existent key."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        status = await rotation_service.get_rotation_status(
            key_id=999,
            user_id=1,
        )

        assert status is None


class TestRotationEventType:
    """Tests for the RotationEventType enum."""

    def test_event_types_exist(self):
        """Test that all expected event types exist."""
        assert RotationEventType.CREATED == "created"
        assert RotationEventType.ROTATED == "rotated"
        assert RotationEventType.REVOKED == "revoked"
        assert RotationEventType.EXPIRED == "expired"
        assert RotationEventType.RENEWED == "renewed"
        assert RotationEventType.ROLLOVER_STARTED == "rollover_started"
        assert RotationEventType.ROLLOVER_COMPLETED == "rollover_completed"
        assert RotationEventType.NOTIFICATION_SENT == "notification_sent"

    def test_event_type_values(self):
        """Test event type values are strings."""
        for event_type in RotationEventType:
            assert isinstance(event_type.value, str)
            assert event_type.value == event_type.value.lower()


class TestDualKeyPeriod:
    """Tests for dual key period functionality."""

    @pytest.mark.asyncio
    async def test_verify_key_with_rotation_new_key(self):
        """Test verification with a new key during rotation."""
        mock_db = MagicMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Create mock key
        mock_key = MagicMock()
        mock_key.id = 1
        mock_key.key_hash = "hashed_key"
        mock_key.is_active = True
        mock_key.is_revoked = False
        mock_key.expires_at = None
        mock_key.previous_key_hash = None

        # Mock first query (for new key)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_key

        # Mock second query for old key
        mock_result_old = MagicMock()
        mock_result_old.scalar_one_or_none.return_value = None

        mock_db.execute = AsyncMock(side_effect=[mock_result, mock_result_old])

        service = KeyRotationService(mock_db)
        key, is_dual_key = await service.verify_key_with_rotation("test_key")

        assert key is not None
        assert is_dual_key is False

    @pytest.mark.asyncio
    async def test_verify_key_with_rotation_dual_key(self):
        """Test verification with old key during dual key period."""
        mock_db = MagicMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Create mock old key (during dual key period)
        mock_old_key = MagicMock()
        mock_old_key.id = 1
        mock_old_key.key_hash = "hashed_old_key"
        mock_old_key.is_active = True
        mock_old_key.is_revoked = False
        mock_old_key.expires_at = None
        mock_old_key.is_rotating = True
        mock_old_key.previous_key_hash = "hashed_previous"

        # First query returns None (new key not found)
        mock_result_new = MagicMock()
        mock_result_new.scalar_one_or_none.return_value = None

        # Second query returns old key
        mock_result_old = MagicMock()
        mock_result_old.scalar_one_or_none.return_value = mock_old_key

        mock_db.execute = AsyncMock(side_effect=[mock_result_new, mock_result_old])

        service = KeyRotationService(mock_db)
        key, is_dual_key = await service.verify_key_with_rotation("old_key")

        assert key is not None
        assert is_dual_key is True

    @pytest.mark.asyncio
    async def test_verify_key_not_found(self):
        """Test verification with invalid key."""
        mock_db = MagicMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Both queries return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        service = KeyRotationService(mock_db)
        key, is_dual_key = await service.verify_key_with_rotation("invalid_key")

        assert key is None
        assert is_dual_key is False


class TestAutomaticRotationProcessing:
    """Tests for automatic rotation processing."""

    @pytest.mark.asyncio
    async def test_process_automatic_rotation_empty(self):
        """Test automatic rotation with no keys needing rotation."""
        mock_db = MagicMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Empty results for all queries
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=mock_result)

        service = KeyRotationService(mock_db)
        results = await service.process_automatic_rotation()

        assert results["keys_rotated"] == 0
        assert results["dual_keys_completed"] == 0
        assert results["notifications_sent"] == 0
        assert len(results["errors"]) == 0


class TestRotationAPIKeyPrefix:
    """Tests for API key prefix generation."""

    def test_api_key_prefix_format(self):
        """Test that API key has correct prefix format."""
        key = f"rai_{secrets.token_urlsafe(32)}"
        assert key.startswith("rai_")
        # token_urlsafe(32) gives ~43 characters after encoding, so total is ~47

    def test_key_prefix_extraction(self):
        """Test extracting prefix from API key."""
        key = f"rai_{secrets.token_urlsafe(32)}"
        prefix = key[:12]

        assert prefix.startswith("rai_")
        assert len(prefix) == 12
