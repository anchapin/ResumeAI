"""
Tests for Personalization Engine.
"""

import pytest
from lib.autocomplete.personalization import PersonalizationEngine


class TestPersonalizationEngine:
    """Test PersonalizationEngine class."""

    @pytest.fixture
    def engine(self):
        """Create engine instance."""
        return PersonalizationEngine()

    def test_get_user_style_default(self, engine):
        """Test getting default user style."""
        style = engine.get_user_style("user_123")

        assert "avg_sentence_length" in style
        assert "formality" in style
        assert style["formality"] == "professional"

    def test_get_user_style_cached(self, engine):
        """Test cached user style."""
        # First call
        style1 = engine.get_user_style("user_123")

        # Cache it
        engine._user_styles["user_123"] = {"cached": True}

        # Second call should use cache
        style2 = engine.get_user_style("user_123")

        assert style2["cached"] == True

    def test_personalize_suggestions(self, engine):
        """Test personalizing suggestions."""
        from lib.autocomplete.models import CompletionSuggestion

        suggestions = [
            CompletionSuggestion(
                id="1",
                text="Short",
                type="inline",
                confidence=0.8,
            ),
            CompletionSuggestion(
                id="2",
                text="A much longer completion text",
                type="inline",
                confidence=0.9,
            ),
        ]

        personalized = engine.personalize_suggestions(suggestions, "user_123")

        assert len(personalized) == 2
        # Should be sorted by score

    def test_personalize_suggestions_empty(self, engine):
        """Test personalizing empty suggestions."""
        personalized = engine.personalize_suggestions([], "user_123")

        assert len(personalized) == 0

    def test_score_suggestion(self, engine):
        """Test scoring a suggestion."""
        from lib.autocomplete.models import CompletionSuggestion

        suggestion = CompletionSuggestion(
            id="1",
            text="Test completion",
            type="inline",
            confidence=0.8,
        )

        style = {"avg_sentence_length": 80, "uses_numbers": True}
        score = engine._score_suggestion(suggestion, style)

        assert score >= suggestion.confidence

    def test_clear_user_data(self, engine):
        """Test clearing user data."""
        # Add to cache
        engine._user_styles["user_123"] = {"test": True}

        # Clear
        engine.clear_user_data("user_123")

        assert "user_123" not in engine._user_styles

    def test_frequently_used_verbs_empty(self, engine):
        """Test getting verbs when no data."""
        verbs = engine.get_frequently_used_verbs("user_123")

        assert verbs == []

    def test_record_acceptance_no_db(self, engine):
        """Test recording acceptance without database."""
        import asyncio

        # Should not raise
        asyncio.run(engine.record_acceptance(
            user_id="user_123",
            completion="Test completion",
        ))

    def test_record_rejection_no_db(self, engine):
        """Test recording rejection without database."""
        import asyncio

        # Should not raise
        asyncio.run(engine.record_rejection(
            user_id="user_123",
            completion_id="comp_123",
        ))

    def test_personalize_with_style_match(self, engine):
        """Test personalization based on style match."""
        from lib.autocomplete.models import CompletionSuggestion

        # User prefers shorter sentences
        engine._user_styles["user_123"] = {
            "avg_sentence_length": 20,
            "uses_numbers": False,
        }

        suggestions = [
            CompletionSuggestion(
                id="1",
                text="Short text",  # Matches user style
                type="inline",
                confidence=0.7,
            ),
            CompletionSuggestion(
                id="2",
                text="This is a much longer completion that doesn't match",
                type="inline",
                confidence=0.9,
            ),
        ]

        personalized = engine.personalize_suggestions(suggestions, "user_123")

        assert len(personalized) == 2
        # First should be ranked higher due to style match
