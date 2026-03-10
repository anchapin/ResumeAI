"""
API Key Rotation Service.

Provides functionality for automated API key rotation with support for:
- Configurable rotation schedules
- Gradual key rollover (dual key period)
- Audit logging
- Notification system for upcoming expirations
"""

import secrets
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import APIKey, APIKeyAuditLog
from lib.security.key_management import hash_api_key
from monitoring import logging_config

# Import email function - may fail if not configured
try:
    from config.email_service import send_api_key_expiration_notification
except ImportError:
    send_api_key_expiration_notification = None

logger = logging_config.get_logger(__name__)


class RotationEventType(str, Enum):
    """Event types for API key rotation audit log."""

    CREATED = "created"
    ROTATED = "rotated"
    REVOKED = "revoked"
    EXPIRED = "expired"
    RENEWED = "renewed"
    ROLLOVER_STARTED = "rollover_started"
    ROLLOVER_COMPLETED = "rollover_completed"
    NOTIFICATION_SENT = "notification_sent"


class KeyRotationService:
    """Service for managing API key rotation."""

    def __init__(self, db: AsyncSession):
        """Initialize the key rotation service.

        Args:
            db: Database session
        """
        self.db = db

    async def create_key_with_rotation(
        self,
        user_id: int,
        name: str,
        description: Optional[str] = None,
        rate_limit: str = "100/minute",
        rate_limit_daily: int = 1000,
        expires_in_days: Optional[int] = None,
        rotation_enabled: bool = False,
        rotation_period_days: Optional[int] = 90,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[APIKey, str]:
        """Create a new API key with optional rotation.

        Args:
            user_id: User ID
            name: Key name
            description: Optional description
            rate_limit: Rate limit string
            rate_limit_daily: Daily request limit
            expires_in_days: Days until expiration (None for no expiration)
            rotation_enabled: Whether to enable automatic rotation
            rotation_period_days: Days between rotations (if rotation enabled)
            ip_address: Client IP for audit logging
            user_agent: Client user agent for audit logging

        Returns:
            Tuple of (APIKey object, plaintext API key)
        """
        # Generate new API key
        api_key = f"rai_{secrets.token_urlsafe(32)}"
        key_hash = hash_api_key(api_key)
        key_prefix = api_key[:12]

        # Calculate expiration date if specified
        expires_at = None
        if expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

        # Calculate next rotation date if rotation enabled
        next_rotation_at = None
        if rotation_enabled and rotation_period_days:
            next_rotation_at = datetime.now(timezone.utc) + timedelta(days=rotation_period_days)

        # Create API key record
        new_key = APIKey(
            user_id=user_id,
            key_hash=key_hash,
            key_prefix=key_prefix,
            name=name,
            description=description,
            rate_limit=rate_limit,
            rate_limit_daily=rate_limit_daily,
            expires_at=expires_at,
            is_active=True,
            is_revoked=False,
            rotation_enabled=rotation_enabled,
            rotation_period_days=rotation_period_days,
            next_rotation_at=next_rotation_at,
        )

        self.db.add(new_key)
        await self.db.commit()
        await self.db.refresh(new_key)

        # Log the creation
        await self._log_event(
            api_key_id=new_key.id,
            user_id=user_id,
            event_type=RotationEventType.CREATED,
            key_prefix=key_prefix,
            ip_address=ip_address,
            user_agent=user_agent,
            event_details={
                "name": name,
                "rotation_enabled": rotation_enabled,
                "rotation_period_days": rotation_period_days,
                "expires_at": expires_at.isoformat() if expires_at else None,
            },
        )

        logger.info(
            "api_key_created_with_rotation",
            user_id=user_id,
            key_id=new_key.id,
            key_prefix=key_prefix,
            rotation_enabled=rotation_enabled,
        )

        return new_key, api_key

    async def rotate_key(
        self,
        key_id: int,
        user_id: int,
        dual_key_period_days: int = 7,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[Optional[APIKey], Optional[str]]:
        """Rotate an API key with optional dual key period.

        During the dual key period, both the old and new keys will work.

        Args:
            key_id: API key ID to rotate
            user_id: User ID for authorization
            dual_key_period_days: Days to keep old key active alongside new key
            ip_address: Client IP for audit logging
            user_agent: Client user agent for audit logging

        Returns:
            Tuple of (new APIKey object, plaintext new API key) or (None, None) if failed
        """
        # Get the existing key
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.user_id == user_id,
            )
        )
        existing_key = result.scalar_one_or_none()

        if not existing_key:
            logger.warning("rotate_key_key_not_found", key_id=key_id, user_id=user_id)
            return None, None

        if not existing_key.is_active or existing_key.is_revoked:
            logger.warning("rotate_key_inactive_key", key_id=key_id)
            await self._log_event(
                api_key_id=key_id,
                user_id=user_id,
                event_type=RotationEventType.ROTATED,
                success=False,
                error_message="Key is inactive or revoked",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return None, None

        # Store current key hash as previous for dual key period
        previous_key_hash = existing_key.key_hash
        previous_key_prefix = existing_key.key_prefix

        # Generate new key
        new_api_key = f"rai_{secrets.token_urlsafe(32)}"
        new_key_hash = hash_api_key(new_api_key)
        new_key_prefix = new_api_key[:12]

        # Calculate next rotation date
        next_rotation_at = None
        if existing_key.rotation_enabled and existing_key.rotation_period_days:
            next_rotation_at = datetime.now(timezone.utc) + timedelta(
                days=existing_key.rotation_period_days
            )

        # Determine if we need dual key period
        use_dual_key = dual_key_period_days > 0

        # Update existing key
        existing_key.previous_key_hash = previous_key_hash if use_dual_key else None
        existing_key.is_rotating = use_dual_key
        existing_key.rotation_enabled = existing_key.rotation_enabled  # Keep rotation setting

        if use_dual_key:
            # Set when dual key period ends
            existing_key.next_rotation_at = datetime.now(timezone.utc) + timedelta(
                days=dual_key_period_days
            )
        else:
            existing_key.next_rotation_at = next_rotation_at

        # Create new key
        new_key = APIKey(
            user_id=user_id,
            key_hash=new_key_hash,
            key_prefix=new_key_prefix,
            name=existing_key.name,
            description=existing_key.description,
            rate_limit=existing_key.rate_limit,
            rate_limit_daily=existing_key.rate_limit_daily,
            expires_at=existing_key.expires_at,
            is_active=True,
            is_revoked=False,
            rotation_enabled=existing_key.rotation_enabled,
            rotation_period_days=existing_key.rotation_period_days,
            next_rotation_at=next_rotation_at,
            previous_key_hash=previous_key_hash if use_dual_key else None,
            is_rotating=False,
        )

        self.db.add(new_key)
        await self.db.commit()
        await self.db.refresh(new_key)
        await self.db.refresh(existing_key)

        # Log events
        if use_dual_key:
            await self._log_event(
                api_key_id=key_id,
                user_id=user_id,
                event_type=RotationEventType.ROLLOVER_STARTED,
                key_prefix=previous_key_prefix,
                new_key_prefix=new_key_prefix,
                ip_address=ip_address,
                user_agent=user_agent,
                event_details={
                    "dual_key_period_days": dual_key_period_days,
                    "previous_key_id": key_id,
                    "new_key_id": new_key.id,
                },
            )

        await self._log_event(
            api_key_id=new_key.id,
            user_id=user_id,
            event_type=RotationEventType.ROTATED,
            key_prefix=new_key_prefix,
            previous_key_prefix=previous_key_prefix,
            ip_address=ip_address,
            user_agent=user_agent,
            event_details={
                "previous_key_id": key_id,
                "new_key_id": new_key.id,
                "dual_key_period": use_dual_key,
            },
        )

        logger.info(
            "api_key_rotated",
            user_id=user_id,
            old_key_id=key_id,
            new_key_id=new_key.id,
            key_prefix=new_key_prefix,
            dual_key_period=use_dual_key,
        )

        return new_key, new_api_key

    async def complete_dual_key_period(
        self,
        key_id: int,
        user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Complete the dual key period by revoking the old key.

        Args:
            key_id: The new API key ID
            user_id: User ID for authorization
            ip_address: Client IP for audit logging
            user_agent: Client user agent for audit logging

        Returns:
            True if successful, False otherwise
        """
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.user_id == user_id,
            )
        )
        key = result.scalar_one_or_none()

        if not key:
            return False

        # Find the old key by looking for keys with same name and previous_key_hash
        if not key.previous_key_hash:
            return True  # No previous key to revoke

        # Find and revoke the old key
        old_result = await self.db.execute(
            select(APIKey).where(
                APIKey.user_id == user_id,
                APIKey.key_hash == key.previous_key_hash,
            )
        )
        old_key = old_result.scalar_one_or_none()

        if old_key:
            old_key.is_revoked = True
            old_key.is_active = False
            old_key.revoked_at = datetime.now(timezone.utc)
            old_key.revoked_reason = "Superseded by key rotation"

            await self._log_event(
                api_key_id=old_key.id,
                user_id=user_id,
                event_type=RotationEventType.ROLLOVER_COMPLETED,
                key_prefix=old_key.key_prefix,
                new_key_prefix=key.key_prefix,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        # Clear dual key period flags on new key
        key.previous_key_hash = None
        key.is_rotating = False

        await self.db.commit()

        logger.info(
            "dual_key_period_completed",
            user_id=user_id,
            old_key_id=old_key.id if old_key else None,
            new_key_id=key_id,
        )

        return True

    async def verify_key_with_rotation(
        self,
        plaintext_key: str,
    ) -> tuple[Optional[APIKey], bool]:
        """Verify an API key, supporting dual key period verification.

        Args:
            plaintext_key: The plaintext API key to verify

        Returns:
            Tuple of (APIKey if valid, whether during dual key period)
        """
        key_hash = hash_api_key(plaintext_key)

        # First try to find the key directly
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.key_hash == key_hash,
                APIKey.is_active.is_(True),
                APIKey.is_revoked.is_(False),
            )
        )
        key = result.scalar_one_or_none()

        if key:
            # Check expiration
            if key.expires_at and key.expires_at < datetime.now(timezone.utc):
                return None, False
            return key, False

        # If not found and key has prefix pattern, try to find by previous key hash
        # This supports the dual key period
        _key_prefix = plaintext_key[:12]

        # Look for keys where this might be a previous key
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.previous_key_hash == key_hash,
                APIKey.is_rotating.is_(True),
                APIKey.is_active.is_(True),
            )
        )
        old_key = result.scalar_one_or_none()

        if old_key:
            # Check expiration on the old key
            if old_key.expires_at and old_key.expires_at < datetime.now(timezone.utc):
                return None, False
            return old_key, True

        return None, False

    async def get_keys_needing_rotation(
        self,
        days_ahead: int = 7,
    ) -> List[APIKey]:
        """Get keys that need rotation soon.

        Args:
            days_ahead: Number of days ahead to look for keys needing rotation

        Returns:
            List of API keys that need rotation
        """
        now = datetime.now(timezone.utc)
        threshold = now + timedelta(days=days_ahead)

        result = await self.db.execute(
            select(APIKey).where(
                APIKey.rotation_enabled.is_(True),
                APIKey.is_active.is_(True),
                APIKey.is_revoked.is_(False),
                APIKey.next_rotation_at <= threshold,
            )
        )

        return list(result.scalars().all())

    async def get_keys_for_notification(
        self,
        days_before_expiry: int = 7,
    ) -> List[APIKey]:
        """Get keys expiring soon for notification.

        Args:
            days_before_expiry: Days before expiration to send notification

        Returns:
            List of API keys expiring soon
        """
        now = datetime.now(timezone.utc)
        threshold = now + timedelta(days=days_before_expiry)

        result = await self.db.execute(
            select(APIKey).where(
                APIKey.is_active.is_(True),
                APIKey.is_revoked.is_(False),
                APIKey.expires_at.isnot(None),
                APIKey.expires_at <= threshold,
                APIKey.expires_at > now,
            )
        )

        return list(result.scalars().all())

    async def _rotate_keys_needing_rotation(self) -> tuple[int, list[str]]:
        """Process keys that need rotation."""
        keys_rotated = 0
        errors = []
        keys_to_rotate = await self.get_keys_needing_rotation(days_ahead=0)

        for key in keys_to_rotate:
            try:
                new_key, _ = await self.rotate_key(
                    key_id=key.id,
                    user_id=key.user_id,
                )
                if new_key:
                    keys_rotated += 1
            except Exception as e:
                logger.error("auto_rotation_failed", key_id=key.id, error=str(e))
                errors.append(f"Key {key.id}: {str(e)}")

        return keys_rotated, errors

    async def _complete_dual_key_periods(self) -> tuple[int, list[str]]:
        """Complete dual key periods that have expired."""
        dual_keys_completed = 0
        errors = []
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.is_rotating.is_(True),
                APIKey.is_active.is_(True),
                APIKey.next_rotation_at <= now,
            )
        )

        dual_keys = list(result.scalars().all())
        for key in dual_keys:
            try:
                success = await self.complete_dual_key_period(key.id, key.user_id)
                if success:
                    dual_keys_completed += 1
            except Exception as e:
                logger.error("dual_key_completion_failed", key_id=key.id, error=str(e))
                errors.append(f"Dual key {key.id}: {str(e)}")

        return dual_keys_completed, errors

    async def _send_expiration_notifications(self) -> tuple[int, list[str]]:
        """Send expiration notifications for keys."""
        notifications_sent = 0
        errors = []
        keys_for_notification = await self.get_keys_for_notification()

        for key in keys_for_notification:
            try:
                await self._send_expiration_notification(key)
                notifications_sent += 1
            except Exception as e:
                logger.error("notification_failed", key_id=key.id, error=str(e))
                errors.append(f"Notification {key.id}: {str(e)}")

        return notifications_sent, errors

    async def process_automatic_rotation(self) -> Dict[str, Any]:
        """Process automatic key rotations.

        This should be called periodically (e.g., daily via cron or scheduler).

        Returns:
            Dictionary with processing results
        """
        results = {
            "keys_rotated": 0,
            "dual_keys_completed": 0,
            "notifications_sent": 0,
            "errors": [],
        }

        # 1. Process keys that need rotation
        results["keys_rotated"], rot_errors = await self._rotate_keys_needing_rotation()
        results["errors"].extend(rot_errors)

        # 2. Complete dual key periods that have expired
        results["dual_keys_completed"], dual_errors = await self._complete_dual_key_periods()
        results["errors"].extend(dual_errors)

        # 3. Send expiration notifications
        results["notifications_sent"], notif_errors = await self._send_expiration_notifications()
        results["errors"].extend(notif_errors)

        logger.info("automatic_rotation_completed", **results)
        return results

    async def enable_rotation(
        self,
        key_id: int,
        user_id: int,
        rotation_period_days: int = 90,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[APIKey]:
        """Enable automatic rotation for an existing key.

        Args:
            key_id: API key ID
            user_id: User ID for authorization
            rotation_period_days: Days between rotations
            ip_address: Client IP for audit logging
            user_agent: Client user agent for audit logging

        Returns:
            Updated APIKey or None if not found
        """
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.user_id == user_id,
            )
        )
        key = result.scalar_one_or_none()

        if not key or not key.is_active or key.is_revoked:
            return None

        key.rotation_enabled = True
        key.rotation_period_days = rotation_period_days
        key.next_rotation_at = datetime.now(timezone.utc) + timedelta(days=rotation_period_days)

        await self.db.commit()
        await self.db.refresh(key)

        await self._log_event(
            api_key_id=key_id,
            user_id=user_id,
            event_type=RotationEventType.RENEWED,
            key_prefix=key.key_prefix,
            ip_address=ip_address,
            user_agent=user_agent,
            event_details={
                "rotation_enabled": True,
                "rotation_period_days": rotation_period_days,
                "next_rotation_at": key.next_rotation_at.isoformat(),
            },
        )

        logger.info(
            "rotation_enabled",
            user_id=user_id,
            key_id=key_id,
            rotation_period_days=rotation_period_days,
        )

        return key

    async def disable_rotation(
        self,
        key_id: int,
        user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[APIKey]:
        """Disable automatic rotation for an existing key.

        Args:
            key_id: API key ID
            user_id: User ID for authorization
            ip_address: Client IP for audit logging
            user_agent: Client user agent for audit logging

        Returns:
            Updated APIKey or None if not found
        """
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.user_id == user_id,
            )
        )
        key = result.scalar_one_or_none()

        if not key:
            return None

        key.rotation_enabled = False
        key.next_rotation_at = None

        await self.db.commit()
        await self.db.refresh(key)

        await self._log_event(
            api_key_id=key_id,
            user_id=user_id,
            event_type=RotationEventType.RENEWED,
            key_prefix=key.key_prefix,
            ip_address=ip_address,
            user_agent=user_agent,
            event_details={
                "rotation_enabled": False,
            },
        )

        logger.info(
            "rotation_disabled",
            user_id=user_id,
            key_id=key_id,
        )

        return key

    async def get_rotation_status(
        self,
        key_id: int,
        user_id: int,
    ) -> Optional[Dict[str, Any]]:
        """Get rotation status for a key.

        Args:
            key_id: API key ID
            user_id: User ID for authorization

        Returns:
            Dictionary with rotation status or None if not found
        """
        result = await self.db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.user_id == user_id,
            )
        )
        key = result.scalar_one_or_none()

        if not key:
            return None

        return {
            "rotation_enabled": key.rotation_enabled,
            "rotation_period_days": key.rotation_period_days,
            "next_rotation_at": key.next_rotation_at.isoformat() if key.next_rotation_at else None,
            "is_rotating": key.is_rotating,
            "has_previous_key": key.previous_key_hash is not None,
            "rotated_at": key.rotated_at.isoformat() if key.rotated_at else None,
        }

    async def _log_event(
        self,
        api_key_id: int,
        user_id: int,
        event_type: RotationEventType,
        key_prefix: Optional[str] = None,
        previous_key_prefix: Optional[str] = None,
        new_key_prefix: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        event_details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log an audit event for API key.

        Args:
            api_key_id: API key ID
            user_id: User ID
            event_type: Type of event
            key_prefix: Key prefix for the event
            previous_key_prefix: Previous key prefix (for rotation)
            new_key_prefix: New key prefix (for rotation)
            success: Whether the operation succeeded
            error_message: Error message if failed
            ip_address: Client IP
            user_agent: Client user agent
            event_details: Additional event details
        """
        audit_log = APIKeyAuditLog(
            api_key_id=api_key_id,
            user_id=user_id,
            event_type=event_type.value,
            key_prefix=key_prefix,
            previous_key_prefix=previous_key_prefix,
            new_key_prefix=new_key_prefix,
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            event_details=json.dumps(event_details) if event_details else None,
        )

        self.db.add(audit_log)
        await self.db.commit()

    async def _send_expiration_notification(self, key: APIKey) -> None:
        """Send expiration notification for a key.

        Args:
            key: APIKey that is expiring
        """
        if not key.user:
            logger.warning("no_user_for_key", key_id=key.id)
            return

        user = key.user
        if not user.email:
            logger.warning("no_email_for_user", user_id=user.id)
            return

        days_until_expiry = (key.expires_at - datetime.now(timezone.utc)).days

        # Try to send email notification
        try:
            if send_api_key_expiration_notification:
                await send_api_key_expiration_notification(
                    to_email=user.email,
                    user_name=user.name or user.email,
                    key_name=key.name,
                    key_prefix=key.key_prefix,
                    expires_at=key.expires_at,
                    days_until_expiry=days_until_expiry,
                )

                await self._log_event(
                    api_key_id=key.id,
                    user_id=user.id,
                    event_type=RotationEventType.NOTIFICATION_SENT,
                    key_prefix=key.key_prefix,
                    event_details={
                        "notification_type": "expiration",
                        "days_until_expiry": days_until_expiry,
                    },
                )
        except Exception as e:
            logger.error(
                "email_notification_failed",
                user_id=user.id,
                key_id=key.id,
                error=str(e),
            )


# Helper function to create service
def create_rotation_service(db: AsyncSession) -> KeyRotationService:
    """Create a KeyRotationService instance.

    Args:
        db: Database session

    Returns:
        KeyRotationService instance
    """
    return KeyRotationService(db)
