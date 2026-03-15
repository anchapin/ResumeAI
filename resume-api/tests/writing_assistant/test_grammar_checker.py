"""
Tests for Grammar Checker Service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from lib.writing_assistant.grammar_checker import GrammarChecker, GrammarCheckerConfig


class TestGrammarChecker:
    """Test GrammarChecker service."""

    @pytest.fixture
    def checker(self):
        """Create GrammarChecker instance."""
        config = GrammarCheckerConfig(
            api_url="http://localhost:8081",
            enabled=True,
        )
        return GrammarChecker(config)

    @pytest.mark.asyncio
    async def test_check_grammar_error(self, checker):
        """Test detection of grammar errors."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "matches": [
                {
                    "message": "Subject-verb agreement error",
                    "shortMessage": "Agreement error",
                    "rule": {"id": "MORFOLOGIK_RULE_EN_US"},
                    "category": {"id": "GRAMMAR"},
                    "offset": 3,
                    "length": 2,
                    "replacements": [{"value": "goes"}],
                    "sentence": "He go to school.",
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(checker._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await checker.check("He go to school")

            assert len(result) == 1
            assert result[0].rule_id == "MORFOLOGIK_RULE_EN_US"
            assert result[0].category == "GRAMMAR"
            assert result[0].offset == 3

    @pytest.mark.asyncio
    async def test_check_spelling_error(self, checker):
        """Test detection of spelling errors."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "matches": [
                {
                    "message": "Possible spelling mistake",
                    "shortMessage": "Spelling",
                    "rule": {"id": "MORFOLOGIK_RULE_EN_US"},
                    "category": {"id": "TYPOS"},
                    "offset": 0,
                    "length": 4,
                    "replacements": [{"value": "Their"}],
                    "sentence": "Their is a cat.",
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(checker._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await checker.check("Their is a cat")

            assert len(result) == 1
            assert result[0].type == "spelling"
            assert result[0].severity == "error"

    @pytest.mark.asyncio
    async def test_check_no_errors(self, checker):
        """Test text with no errors."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"matches": []}
        mock_response.raise_for_status = MagicMock()

        with patch.object(checker._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await checker.check("This is correct.")

            assert len(result) == 0

    @pytest.mark.asyncio
    async def test_check_disabled(self):
        """Test that disabled checker returns empty list."""
        config = GrammarCheckerConfig(enabled=False)
        checker = GrammarChecker(config)
        
        result = await checker.check("He go to school")
        assert result == []

    @pytest.mark.asyncio
    async def test_check_empty_text(self, checker):
        """Test that empty text returns empty list."""
        result = await checker.check("")
        assert result == []

    @pytest.mark.asyncio
    async def test_check_timeout(self, checker):
        """Test handling of API timeout."""
        import httpx
        
        with patch.object(checker._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Timeout")
            
            result = await checker.check("He go to school")
            
            assert result == []

    @pytest.mark.asyncio
    async def test_get_suggestions(self, checker):
        """Test getting formatted suggestions."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "matches": [
                {
                    "message": "Error",
                    "shortMessage": "Err",
                    "rule": {"id": "TEST_RULE"},
                    "category": {"id": "GRAMMAR"},
                    "offset": 0,
                    "length": 2,
                    "replacements": [{"value": "fix"}],
                    "sentence": "He go",
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(checker._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            suggestions = await checker.get_suggestions("He go")

            assert len(suggestions) == 1
            assert suggestions[0].type == "grammar"
            assert suggestions[0].replacements == ["fix"]
            assert "category" in suggestions[0].metadata

    @pytest.mark.asyncio
    async def test_api_error_handling(self, checker):
        """Test handling of API errors."""
        import httpx
        
        with patch.object(checker._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.HTTPStatusError(
                "Server Error",
                request=MagicMock(),
                response=MagicMock(status_code=500)
            )
            
            result = await checker.check("He go to school")
            
            assert result == []

    @pytest.mark.asyncio
    async def test_check_with_context(self, checker):
        """Test context-aware checking."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"matches": []}
        mock_response.raise_for_status = MagicMock()

        with patch.object(checker._client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            
            result = await checker.check_text_with_context(
                "He go to school",
                {"section_type": "experience"}
            )
            
            # Should return suggestions (empty in this case)
            assert isinstance(result, list)
