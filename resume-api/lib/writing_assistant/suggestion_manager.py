"""
Suggestion Manager Service.

Manages writing suggestion history, persistence, and analytics.
Handles save/reject/undo operations and tracks user engagement.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import Base, WritingSuggestion
from .models import Suggestion

logger = logging.getLogger(__name__)


class SuggestionManager:
    """
    Manages writing suggestion lifecycle.

    Features:
    - Persist suggestions to database
    - Track acceptance/rejection
    - Undo functionality
    - Analytics and metrics
    - History retrieval

    Example:
        manager = SuggestionManager(db_session)
        await manager.save_suggestion(user_id, suggestion)
        await manager.mark_accepted(suggestion_id)
    """

    def __init__(self, db_session: AsyncSession):
        """
        Initialize SuggestionManager.

        Args:
            db_session: SQLAlchemy async session
        """
        self.db = db_session

    async def save_suggestion(
        self,
        user_id: str,
        suggestion: Suggestion,
        resume_id: int | None = None,
        section: str | None = None,
        context: str | None = None,
    ) -> str:
        """
        Save a suggestion to the database.

        Args:
            user_id: User identifier
            suggestion: Suggestion object
            resume_id: Optional resume ID
            section: Section where suggestion occurred
            context: Surrounding text context

        Returns:
            Suggestion ID
        """
        try:
            db_suggestion = WritingSuggestion.from_suggestion(
                suggestion, user_id, resume_id, section, context
            )

            self.db.add(db_suggestion)
            await self.db.commit()
            await self.db.refresh(db_suggestion)

            logger.debug(
                f"Saved suggestion {db_suggestion.id[:8]}... for user {user_id}"
            )
            return db_suggestion.id

        except Exception as e:
            logger.error(f"Error saving suggestion: {e}")
            await self.db.rollback()
            # Return in-memory ID even if save fails
            return suggestion.id

    async def save_suggestions_batch(
        self,
        user_id: str,
        suggestions: list[Suggestion],
        resume_id: int | None = None,
        section: str | None = None,
        context: str | None = None,
    ) -> list[str]:
        """
        Save multiple suggestions in a batch.

        Args:
            user_id: User identifier
            suggestions: List of suggestions
            resume_id: Optional resume ID
            section: Section where suggestions occurred
            context: Surrounding text context

        Returns:
            List of suggestion IDs
        """
        ids = []
        for suggestion in suggestions:
            suggestion_id = await self.save_suggestion(
                user_id, suggestion, resume_id, section, context
            )
            ids.append(suggestion_id)
        return ids

    async def mark_accepted(self, suggestion_id: str) -> bool:
        """
        Mark a suggestion as accepted.

        Args:
            suggestion_id: Suggestion identifier

        Returns:
            True if successful, False otherwise
        """
        return await self._update_status(suggestion_id, "accepted")

    async def mark_rejected(self, suggestion_id: str) -> bool:
        """
        Mark a suggestion as rejected.

        Args:
            suggestion_id: Suggestion identifier

        Returns:
            True if successful, False otherwise
        """
        return await self._update_status(suggestion_id, "rejected")

    async def mark_ignored(self, suggestion_id: str) -> bool:
        """
        Mark a suggestion as ignored (dismissed by user).

        Args:
            suggestion_id: Suggestion identifier

        Returns:
            True if successful, False otherwise
        """
        return await self._update_status(suggestion_id, "ignored")

    async def _update_status(
        self, suggestion_id: str, status: str
    ) -> bool:
        """Update suggestion status."""
        try:
            result = await self.db.execute(
                select(WritingSuggestion).where(
                    WritingSuggestion.id == suggestion_id
                )
            )
            suggestion = result.scalar_one_or_none()

            if not suggestion:
                logger.warning(
                    f"Suggestion {suggestion_id} not found for status update"
                )
                return False

            suggestion.status = status
            suggestion.updated_at = datetime.utcnow()
            await self.db.commit()

            logger.debug(
                f"Marked suggestion {suggestion_id[:8]}... as {status}"
            )
            return True

        except Exception as e:
            logger.error(f"Error updating suggestion status: {e}")
            await self.db.rollback()
            return False

    async def undo(self, suggestion_id: str) -> bool:
        """
        Undo an accepted suggestion (restore original).

        Args:
            suggestion_id: Suggestion identifier

        Returns:
            True if successful, False otherwise
        """
        try:
            result = await self.db.execute(
                select(WritingSuggestion).where(
                    WritingSuggestion.id == suggestion_id
                )
            )
            suggestion = result.scalar_one_or_none()

            if not suggestion:
                return False

            # Can only undo accepted suggestions
            if suggestion.status != "accepted":
                return False

            suggestion.status = "pending"
            suggestion.updated_at = datetime.utcnow()
            await self.db.commit()

            logger.debug(f"Undone suggestion {suggestion_id[:8]}...")
            return True

        except Exception as e:
            logger.error(f"Error undoing suggestion: {e}")
            await self.db.rollback()
            return False

    async def get_history(
        self, user_id: str, limit: int = 50, status: str | None = None
    ) -> list[WritingSuggestion]:
        """
        Get user's suggestion history.

        Args:
            user_id: User identifier
            limit: Maximum number of results
            status: Optional status filter

        Returns:
            List of WritingSuggestion objects
        """
        try:
            query = select(WritingSuggestion).where(
                WritingSuggestion.user_id == user_id
            )

            if status:
                query = query.where(WritingSuggestion.status == status)

            query = query.order_by(
                WritingSuggestion.created_at.desc()
            ).limit(limit)

            result = await self.db.execute(query)
            suggestions = result.scalars().all()

            return list(suggestions)

        except Exception as e:
            logger.error(f"Error getting suggestion history: {e}")
            return []

    async def get_stats(self, user_id: str) -> dict[str, Any]:
        """
        Get suggestion statistics for a user.

        Args:
            user_id: User identifier

        Returns:
            Dictionary with statistics
        """
        try:
            # Get counts by status
            result = await self.db.execute(
                select(
                    WritingSuggestion.status,
                    func.count(WritingSuggestion.id),
                )
                .where(WritingSuggestion.user_id == user_id)
                .group_by(WritingSuggestion.status)
            )
            status_counts = dict(result.all())

            total = sum(status_counts.values())
            accepted = status_counts.get("accepted", 0)
            rejected = status_counts.get("rejected", 0)
            ignored = status_counts.get("ignored", 0)

            acceptance_rate = (
                accepted / total if total > 0 else 0.0
            )

            return {
                "total_suggestions": total,
                "accepted": accepted,
                "rejected": rejected,
                "ignored": ignored,
                "pending": status_counts.get("pending", 0),
                "acceptance_rate": acceptance_rate,
            }

        except Exception as e:
            logger.error(f"Error getting suggestion stats: {e}")
            return {
                "total_suggestions": 0,
                "accepted": 0,
                "rejected": 0,
                "ignored": 0,
                "pending": 0,
                "acceptance_rate": 0.0,
            }

    async def cleanup_expired(self) -> int:
        """
        Clean up expired suggestions.

        Returns:
            Number of suggestions deleted
        """
        try:
            from sqlalchemy import delete

            query = delete(WritingSuggestion).where(
                WritingSuggestion.expires_at < datetime.utcnow()
            )

            result = await self.db.execute(query)
            await self.db.commit()

            deleted = result.rowcount or 0
            logger.info(f"Cleaned up {deleted} expired suggestions")
            return deleted

        except Exception as e:
            logger.error(f"Error cleaning up suggestions: {e}")
            await self.db.rollback()
            return 0

