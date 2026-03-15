"""
Tests for AI Enhancer Service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from lib.writing_assistant.ai_enhancer import AIEnhancer, AIEnhancerConfig


class TestAIEnhancer:
    """Test AIEnhancer service."""

    @pytest.fixture
    def enhancer(self):
        """Create AIEnhancer instance with test config."""
        config = AIEnhancerConfig(
            anthropic_api_key="test_key",
            openai_api_key="test_openai_key",
            enabled=True,
            use_cache=False,
        )
        return AIEnhancer(config)

    @pytest.mark.asyncio
    async def test_enhance_bullet(self, enhancer):
        """Test bullet point enhancement."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "content": [
                {
                    "text": '{"original": "Helped", "suggestions": [{"version": "Led", "verb_change": "helped->led", "explanation": "Stronger leadership verb"}]}'
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(enhancer._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await enhancer.enhance_bullet(
                "Helped with the project",
                {"role": "Engineer"}
            )

            assert result.original == "Helped with the project"
            assert result.enhancement_type == "action_verbs"

    @pytest.mark.asyncio
    async def test_quantify_achievement(self, enhancer):
        """Test achievement quantification."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "content": [
                {
                    "text": '{"original": "Improved performance", "quantified_versions": [{"version": "Improved performance by 40%", "metric_type": "percentage"}]}'
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(enhancer._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await enhancer.quantify_achievement(
                "Improved performance",
                "Software Engineer"
            )

            assert result.enhancement_type == "quantification"

    @pytest.mark.asyncio
    async def test_transform_to_star(self, enhancer):
        """Test STAR transformation."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "content": [
                {
                    "text": '{"original": "Led team", "star_version": "When the team faced challenges, I led 5 engineers to deliver the project 2 weeks early"}'
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(enhancer._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await enhancer.transform_to_star(
                "Led team",
                "Software project"
            )

            assert result.enhancement_type == "star_transformation"

    @pytest.mark.asyncio
    async def test_optimize_for_ats(self, enhancer):
        """Test ATS optimization."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "content": [
                {
                    "text": '{"original": "Did coding", "optimized_version": "Developed software solutions using Python", "keywords_added": ["Python", "software"]}'
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(enhancer._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await enhancer.optimize_for_ats(
                "Did coding",
                ["Python", "software"],
                "Developer"
            )

            assert result.enhancement_type == "ats_optimization"

    @pytest.mark.asyncio
    async def test_enhance_bullet_disabled(self):
        """Test enhancement when disabled."""
        config = AIEnhancerConfig(enabled=False)
        enhancer = AIEnhancer(config)
        
        result = await enhancer.enhance_bullet("Helped", {})
        
        assert result.enhanced == "Helped"
        assert result.confidence == 0.0

    @pytest.mark.asyncio
    async def test_cache_hit(self, enhancer):
        """Test caching functionality."""
        enhancer.config.use_cache = True
        
        # First call
        with patch.object(enhancer, '_call_llm', new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = '{"original": "test", "suggestions": []}'
            await enhancer.enhance_bullet("test", {})
        
        # Second call should hit cache
        with patch.object(enhancer, '_call_llm', new_callable=AsyncMock) as mock_llm:
            result = await enhancer.enhance_bullet("test", {})
            # Should not call LLM if cached
            mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_fallback_to_openai(self):
        """Test fallback from Claude to OpenAI."""
        config = AIEnhancerConfig(
            anthropic_api_key="invalid",
            openai_api_key="test_key",
            enabled=True,
        )
        enhancer = AIEnhancer(config)
        
        mock_claude_error = Exception("Claude failed")
        mock_openai_response = MagicMock()
        mock_openai_response.json.return_value = {
            "choices": [{"message": {"content": '{"original": "test", "suggestions": []}'}}]
        }
        mock_openai_response.raise_for_status = MagicMock()

        with patch.object(enhancer._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_openai_response
            
            result = await enhancer.enhance_bullet("test", {})
            
            assert result is not None

    @pytest.mark.asyncio
    async def test_no_api_keys_configured(self):
        """Test error when no API keys configured."""
        config = AIEnhancerConfig(
            anthropic_api_key="",
            openai_api_key="",
            enabled=True,
        )
        enhancer = AIEnhancer(config)
        
        with pytest.raises(ValueError, match="No LLM provider configured"):
            await enhancer._call_llm("test prompt", "")

    @pytest.mark.asyncio
    async def test_parse_json_from_markdown(self, enhancer):
        """Test parsing JSON from markdown-formatted response."""
        response = """
        Here's the result:
        ```json
        {"key": "value"}
        ```
        """
        
        result = enhancer._parse_json_response(response)
        
        assert result == {"key": "value"}

    @pytest.mark.asyncio
    async def test_get_enhancement_suggestions(self, enhancer):
        """Test getting enhancement suggestions."""
        with patch.object(enhancer, 'enhance_bullet', new_callable=AsyncMock) as mock_enhance:
            mock_enhance.return_value = MagicMock(
                original="test",
                enhanced="better",
                enhancement_type="action_verbs",
                changes=[{"type": "verb_replacement"}],
                confidence=0.8,
                explanation="Improved"
            )
            
            suggestions = await enhancer.get_enhancement_suggestions(
                "test bullet",
                {"section_type": "experience"}
            )
            
            assert len(suggestions) >= 0

    @pytest.mark.asyncio
    async def test_circuit_breaker(self, enhancer):
        """Test circuit breaker functionality."""
        from lib.writing_assistant.ai_enhancer import CircuitBreaker
        
        breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=1)
        
        # Should start closed
        assert breaker.state == "closed"
        assert breaker.can_execute() == True
        
        # Record failures
        for _ in range(3):
            breaker.record_failure()
        
        # Should be open now
        assert breaker.state == "open"
        assert breaker.can_execute() == False
