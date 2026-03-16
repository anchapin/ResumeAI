"""
Tests for Writing Assistant Service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from lib.writing_assistant.service import WritingAssistantService, WritingAssistantConfig
from lib.writing_assistant.models import Suggestion


class TestWritingAssistantService:
    """Test WritingAssistantService orchestrator."""

    @pytest.fixture
    def service(self):
        """Create WritingAssistantService instance."""
        config = WritingAssistantConfig(enabled=True)
        return WritingAssistantService(config)

    @pytest.mark.asyncio
    async def test_get_suggestions(self, service):
        """Test getting comprehensive suggestions."""
        # Mock grammar checker
        with patch.object(service.grammar_checker, 'get_suggestions', new_callable=AsyncMock) as mock_grammar:
            mock_grammar.return_value = [
                Suggestion(
                    id="grammar_1",
                    type="grammar",
                    severity="error",
                    message="Grammar error",
                    offset=0,
                    length=2,
                    replacements=["fix"],
                    explanation="Fix this",
                    rule_id="TEST",
                )
            ]
            
            # Mock style analyzer
            with patch.object(service.style_analyzer, 'analyze', return_value=MagicMock(
                suggestions=[
                    Suggestion(
                        id="style_1",
                        type="style",
                        severity="warning",
                        message="Style issue",
                        offset=5,
                        length=5,
                        replacements=["better"],
                        explanation="Better style",
                        rule_id="STYLE",
                    )
                ]
            )):
                # Mock AI enhancer
                with patch.object(service.ai_enhancer, 'get_enhancement_suggestions', new_callable=AsyncMock) as mock_ai:
                    mock_ai.return_value = []
                    
                    result = await service.get_suggestions("He go to school")
                    
                    assert len(result.suggestions) >= 1
                    assert result.processing_time_ms >= 0

    @pytest.mark.asyncio
    async def test_get_suggestions_disabled(self):
        """Test that disabled service returns empty."""
        config = WritingAssistantConfig(enabled=False)
        service = WritingAssistantService(config)
        
        result = await service.get_suggestions("test")
        
        assert len(result.suggestions) == 0

    @pytest.mark.asyncio
    async def test_rank_and_deduplicate(self, service):
        """Test suggestion ranking and deduplication."""
        suggestions = [
            Suggestion(
                id="1",
                type="spelling",
                severity="error",
                message="Error 1",
                offset=0,
                length=1,
                replacements=[],
                explanation="",
                rule_id="R1",
            ),
            Suggestion(
                id="2",
                type="grammar",
                severity="error",
                message="Error 2",
                offset=5,
                length=1,
                replacements=[],
                explanation="",
                rule_id="R2",
            ),
            Suggestion(
                id="3",
                type="enhancement",
                severity="info",
                message="Suggestion",
                offset=10,
                length=1,
                replacements=[],
                explanation="",
                rule_id="R3",
            ),
        ]
        
        # Add duplicate
        suggestions.append(suggestions[0])
        
        ranked = service._rank_and_deduplicate(suggestions)
        
        # Should remove duplicate and rank by priority
        assert len(ranked) == 3
        # Spelling error should be first
        assert ranked[0].type == "spelling"

    @pytest.mark.asyncio
    async def test_calculate_quality_score(self, service):
        """Test quality score calculation."""
        text = "This is a good sentence with proper grammar."
        suggestions = []
        
        score = service._calculate_quality_score(text, suggestions)
        
        assert 0 <= score <= 100

    @pytest.mark.asyncio
    async def test_calculate_quality_score_with_errors(self, service):
        """Test quality score deduction for errors."""
        text = "Bad text"
        suggestions = [
            Suggestion(
                id="1",
                type="grammar",
                severity="error",
                message="Error",
                offset=0,
                length=1,
                replacements=[],
                explanation="",
                rule_id="R1",
            )
        ]
        
        score = service._calculate_quality_score(text, suggestions)
        
        # Should be reduced due to error
        assert score < 100

    @pytest.mark.asyncio
    async def test_score_to_grade(self, service):
        """Test score to grade conversion."""
        assert service._score_to_grade(95) == "A"
        assert service._score_to_grade(85) == "B"
        assert service._score_to_grade(75) == "C"
        assert service._score_to_grade(65) == "D"
        assert service._score_to_grade(50) == "F"

    @pytest.mark.asyncio
    async def test_get_section_quality(self, service):
        """Test section quality assessment."""
        with patch.object(service, 'get_suggestions', new_callable=AsyncMock) as mock_suggest:
            mock_suggest.return_value = MagicMock(
                suggestions=[],
                processing_time_ms=100
            )
            
            result = await service.get_section_quality(
                "Good text here",
                "experience"
            )
            
            assert "quality_score" in result
            assert "grade" in result
            assert "recommendations" in result

    @pytest.mark.asyncio
    async def test_enhance_section(self, service):
        """Test section enhancement."""
        with patch.object(service, 'get_suggestions', new_callable=AsyncMock) as mock_suggest:
            mock_suggest.return_value = MagicMock(
                suggestions=[],
                processing_time_ms=100
            )
            
            with patch.object(service.ai_enhancer, 'enhance_bullet', new_callable=AsyncMock) as mock_enhance:
                mock_enhance.return_value = MagicMock(
                    original="test",
                    enhanced="better",
                    enhancement_type="action_verbs",
                    changes=[],
                    confidence=0.8,
                    explanation="Improved"
                )
                
                result = await service.enhance_section(
                    "Test bullet point",
                    "experience",
                    {"role": "Engineer"}
                )
                
                assert "suggestions" in result
                assert "quality_score" in result

    @pytest.mark.asyncio
    async def test_suggestion_persistence(self, service):
        """Test that suggestions are saved when user_id provided."""
        mock_manager = AsyncMock()
        service.suggestion_manager = mock_manager
        
        with patch.object(service.grammar_checker, 'get_suggestions', new_callable=AsyncMock) as mock_grammar:
            mock_grammar.return_value = [
                Suggestion(
                    id="test_1",
                    type="grammar",
                    severity="error",
                    message="Error",
                    offset=0,
                    length=1,
                    replacements=[],
                    explanation="",
                    rule_id="R1",
                )
            ]
            
            with patch.object(service.style_analyzer, 'analyze', return_value=MagicMock(suggestions=[])):
                with patch.object(service.ai_enhancer, 'get_enhancement_suggestions', new_callable=AsyncMock, return_value=[]):
                    await service.get_suggestions(
                        "test",
                        user_id="user_123",
                        resume_id=1,
                        section="experience"
                    )
                    
                    # Should save suggestion
                    mock_manager.save_suggestion.assert_called()

    @pytest.mark.asyncio
    async def test_error_handling_grammar(self, service):
        """Test graceful handling of grammar checker errors."""
        with patch.object(service.grammar_checker, 'get_suggestions', new_callable=AsyncMock) as mock_grammar:
            mock_grammar.side_effect = Exception("Grammar service down")
            
            with patch.object(service.style_analyzer, 'analyze', return_value=MagicMock(suggestions=[])):
                with patch.object(service.ai_enhancer, 'get_enhancement_suggestions', new_callable=AsyncMock, return_value=[]):
                    # Should not raise, just log error
                    result = await service.get_suggestions("test")
                    
                    assert result is not None

    @pytest.mark.asyncio
    async def test_max_suggestions_limit(self, service):
        """Test that suggestions are limited to max."""
        service.config.max_suggestions = 5
        
        # Create 10 suggestions
        suggestions = [
            Suggestion(
                id=f"s_{i}",
                type="enhancement",
                severity="info",
                message=f"Suggestion {i}",
                offset=i,
                length=1,
                replacements=[],
                explanation="",
                rule_id="R1",
            )
            for i in range(10)
        ]
        
        ranked = service._rank_and_deduplicate(suggestions)
        
        assert len(ranked) <= 5
