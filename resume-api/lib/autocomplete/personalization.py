"""
Personalization Engine

Learns from user's completion history to personalize suggestions.
"""

import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


class PersonalizationEngine:
    """
    Personalize completions based on user history.

    Tracks:
    - Accepted/rejected completions
    - Writing patterns (sentence length, verb usage)
    - Common phrases and terminology

    Example:
        engine = PersonalizationEngine(db_session)
        style = engine.get_user_style(user_id)
        personalized = engine.personalize_suggestions(suggestions, user_id)
    """

    def __init__(self, db_session=None, cache=None):
        """
        Initialize PersonalizationEngine.

        Args:
            db_session: Database session
            cache: Cache for user styles
        """
        self.db = db_session
        self.cache = cache
        self._user_styles: dict[str, dict] = {}

    def get_user_style(self, user_id: str) -> dict[str, Any]:
        """
        Get user's writing style profile.

        Args:
            user_id: User identifier

        Returns:
            Style profile dict
        """
        # Check cache
        if self.cache and user_id in self._user_styles:
            return self._user_styles[user_id]

        # Default style
        default_style = {
            "avg_sentence_length": 80,
            "preferred_verbs": [],
            "formality": "professional",
            "uses_numbers": True,
            "bullet_style": "achievement",
        }

        if not self.db:
            return default_style

        try:
            # Query user's completion history
            from sqlalchemy import text

            result = self.db.execute(
                text("""
                SELECT 
                    AVG(LENGTH(completion_text)) as avg_length,
                    COUNT(*) as total_completions,
                    SUM(CASE WHEN accepted THEN 1 ELSE 0 END) as accepted_count
                FROM completion_feedback
                WHERE user_id = :user_id
                AND created_at > :since
                """),
                {"user_id": user_id, "since": datetime.utcnow() - timedelta(days=30)},
            )
            row = result.first()

            if row and row[0]:
                return {
                    "avg_sentence_length": row[0] or 80,
                    "total_completions": row[1] or 0,
                    "acceptance_rate": (row[2] / row[1]) if row[1] else 0,
                    "formality": "professional",
                    "uses_numbers": True,
                }

        except Exception as e:
            logger.error(f"Error getting user style: {e}")

        return default_style

    async def record_acceptance(
        self,
        user_id: str,
        completion: str,
        context: dict | None = None,
    ):
        """
        Record completion acceptance.

        Args:
            user_id: User identifier
            completion: Accepted completion text
            context: Optional context
        """
        if not self.db:
            return

        try:
            from sqlalchemy import text

            self.db.execute(
                text("""
                INSERT INTO completion_feedback 
                (completion_id, user_id, accepted, completion_text, context, created_at)
                VALUES (:completion_id, :user_id, :accepted, :text, :context, :created_at)
                """),
                {
                    "completion_id": f"user_{user_id}_{datetime.utcnow().timestamp()}",
                    "user_id": user_id,
                    "accepted": True,
                    "text": completion,
                    "context": str(context) if context else None,
                    "created_at": datetime.utcnow(),
                },
            )
            self.db.commit()

            # Invalidate cache
            if user_id in self._user_styles:
                del self._user_styles[user_id]

        except Exception as e:
            logger.error(f"Error recording acceptance: {e}")
            if self.db:
                self.db.rollback()

    async def record_rejection(
        self,
        user_id: str,
        completion_id: str,
        context: dict | None = None,
    ):
        """
        Record completion rejection.

        Args:
            user_id: User identifier
            completion_id: Rejected completion ID
            context: Optional context
        """
        if not self.db:
            return

        try:
            from sqlalchemy import text

            self.db.execute(
                text("""
                INSERT INTO completion_feedback 
                (completion_id, user_id, accepted, context, created_at)
                VALUES (:completion_id, :user_id, :accepted, :context, :created_at)
                """),
                {
                    "completion_id": completion_id,
                    "user_id": user_id,
                    "accepted": False,
                    "context": str(context) if context else None,
                    "created_at": datetime.utcnow(),
                },
            )
            self.db.commit()

        except Exception as e:
            logger.error(f"Error recording rejection: {e}")
            if self.db:
                self.db.rollback()

    def personalize_suggestions(
        self,
        suggestions: list,
        user_id: str,
    ) -> list:
        """
        Personalize suggestions based on user style.

        Args:
            suggestions: List of CompletionSuggestion
            user_id: User identifier

        Returns:
            Personalized suggestions list
        """
        if not suggestions:
            return suggestions

        style = self.get_user_style(user_id)

        # Score and rank suggestions
        scored = []
        for suggestion in suggestions:
            score = self._score_suggestion(suggestion, style)
            scored.append((score, suggestion))

        # Sort by score
        scored.sort(key=lambda x: x[0], reverse=True)

        return [s for _, s in scored]

    def _score_suggestion(self, suggestion, style: dict) -> float:
        """Score a suggestion based on user style."""
        score = suggestion.confidence

        # Bonus for matching user's average length
        text_length = len(suggestion.text)
        avg_length = style.get("avg_sentence_length", 80)
        length_diff = abs(text_length - avg_length)
        if length_diff < 20:
            score += 0.1

        # Bonus for user's preferred patterns
        if style.get("uses_numbers") and any(c.isdigit() for c in suggestion.text):
            score += 0.05

        # Bonus for previously accepted patterns
        # (would check against user's history in production)

        return score

    def get_frequently_used_verbs(self, user_id: str) -> list[str]:
        """
        Get user's frequently used action verbs.

        Args:
            user_id: User identifier

        Returns:
            List of common verbs
        """
        if not self.db:
            return []

        try:
            from sqlalchemy import text

            result = self.db.execute(
                text("""
                SELECT completion_text
                FROM completion_feedback
                WHERE user_id = :user_id
                AND accepted = true
                AND created_at > :since
                """),
                {"user_id": user_id, "since": datetime.utcnow() - timedelta(days=90)},
            )
            rows = result.fetchall()

            # Extract verbs (simplified - would use NLP in production)
            verbs = []
            for (text,) in rows:
                if text and len(text) > 3:
                    first_word = text.split()[0].lower()
                    if first_word.endswith(("ed", "ing")):
                        verbs.append(first_word)

            # Count and return top verbs
            from collections import Counter

            verb_counts = Counter(verbs)
            return [verb for verb, _ in verb_counts.most_common(10)]

        except Exception as e:
            logger.error(f"Error getting verbs: {e}")
            return []

    def clear_user_data(self, user_id: str):
        """
        Clear user's personalization data.

        Args:
            user_id: User identifier
        """
        if user_id in self._user_styles:
            del self._user_styles[user_id]

        if self.cache:
            self.cache.delete(f"user_style:{user_id}")
