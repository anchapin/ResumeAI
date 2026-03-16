"""
Tests for Suggestion Engine.
"""

import pytest
from lib.autocomplete.suggestion_engine import SuggestionEngine
from lib.autocomplete.models import CompletionRequest


class TestSuggestionEngine:
    """Test SuggestionEngine class."""

    @pytest.fixture
    def engine(self):
        """Create engine instance."""
        return SuggestionEngine()

    @pytest.mark.asyncio
    async def test_get_completions_basic(self, engine):
        """Test basic completion generation."""
        request = CompletionRequest(
            text="Led ",
            cursor_position=4,
            section_type="experience",
            limit=3,
        )

        response = await engine.get_completions(request)

        assert response.completions is not None
        assert len(response.completions) > 0
        assert response.processing_time_ms >= 0

    @pytest.mark.asyncio
    async def test_get_completions_empty_text(self, engine):
        """Test completion with empty text."""
        request = CompletionRequest(
            text="",
            cursor_position=0,
            limit=3,
        )

        response = await engine.get_completions(request)

        # Should return template completions
        assert response.completions is not None

    @pytest.mark.asyncio
    async def test_get_bullet_completions(self, engine):
        """Test bullet point completions."""
        bullets = await engine.get_bullet_completions(
            section_type="experience",
            role="Engineer",
            limit=3,
        )

        assert len(bullets) > 0
        assert all(isinstance(b, str) for b in bullets)

    @pytest.mark.asyncio
    async def test_get_bullet_completions_by_section(self, engine):
        """Test bullet completions for different sections."""
        experience_bullets = await engine.get_bullet_completions(
            section_type="experience",
            limit=3,
        )
        projects_bullets = await engine.get_bullet_completions(
            section_type="projects",
            limit=3,
        )

        assert len(experience_bullets) > 0
        assert len(projects_bullets) > 0
        # Should be different for different sections
        assert experience_bullets != projects_bullets

    @pytest.mark.asyncio
    async def test_template_completions(self, engine):
        """Test template-based completions (fallback)."""
        request = CompletionRequest(
            text="Test",
            cursor_position=4,
            section_type="experience",
            limit=3,
        )

        completions = engine._get_template_completions(request)

        assert len(completions) > 0
        assert all(c.source == "template" for c in completions)

    @pytest.mark.asyncio
    async def test_template_bullets(self, engine):
        """Test template bullet points."""
        bullets = engine._get_template_bullets(
            section_type="experience",
            role=None,
            limit=3,
        )

        assert len(bullets) > 0
        assert all(isinstance(b, str) for b in bullets)

    @pytest.mark.asyncio
    async def test_cache_key_generation(self, engine):
        """Test cache key generation."""
        request1 = CompletionRequest(
            text="Led ",
            cursor_position=4,
            section_type="experience",
        )
        request2 = CompletionRequest(
            text="Led ",
            cursor_position=4,
            section_type="experience",
        )

        key1 = engine._get_cache_key(request1)
        key2 = engine._get_cache_key(request2)

        assert key1 == key2

    @pytest.mark.asyncio
    async def test_cache_key_different_for_different_text(self, engine):
        """Test cache key differs for different text."""
        request1 = CompletionRequest(
            text="Led ",
            cursor_position=4,
        )
        request2 = CompletionRequest(
            text="Managed ",
            cursor_position=8,
        )

        key1 = engine._get_cache_key(request1)
        key2 = engine._get_cache_key(request2)

        assert key1 != key2

    @pytest.mark.asyncio
    async def test_section_templates(self, engine):
        """Test section-specific templates."""
        experience_templates = engine._get_section_templates("experience")
        education_templates = engine._get_section_templates("education")
        skills_templates = engine._get_section_templates("skills")

        assert len(experience_templates) > 0
        assert len(education_templates) > 0
        assert len(skills_templates) > 0

        # Should be different for different sections
        assert experience_templates != education_templates

    @pytest.mark.asyncio
    async def test_default_section_template(self, engine):
        """Test default template for unknown section."""
        templates = engine._get_section_templates("unknown_section")

        # Should default to experience templates
        assert len(templates) > 0

    @pytest.mark.asyncio
    async def test_completion_confidence(self, engine):
        """Test that completions have confidence scores."""
        request = CompletionRequest(
            text="Test",
            cursor_position=4,
            limit=3,
        )

        response = await engine.get_completions(request)

        for completion in response.completions:
            assert 0 <= completion.confidence <= 1

    @pytest.mark.asyncio
    async def test_completion_types(self, engine):
        """Test completion type assignment."""
        request = CompletionRequest(
            text="Test",
            cursor_position=4,
            limit=3,
        )

        response = await engine.get_completions(request)

        for completion in response.completions:
            assert completion.type in ["inline", "bullet", "section"]

    @pytest.mark.asyncio
    async def test_completion_limit(self, engine):
        """Test completion limit is respected."""
        request = CompletionRequest(
            text="Test",
            cursor_position=4,
            limit=2,
        )

        response = await engine.get_completions(request)

        assert len(response.completions) <= 2
