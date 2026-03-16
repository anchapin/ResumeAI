"""
Pytest configuration and fixtures for writing assistant tests.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_async_session():
    """Create a mock async database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.scalar_one_or_none = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def mock_http_client():
    """Create a mock HTTP client."""
    client = AsyncMock()
    client.post = AsyncMock()
    client.get = AsyncMock()
    client.aclose = AsyncMock()
    return client


@pytest.fixture
def sample_suggestion():
    """Create a sample suggestion for testing."""
    from lib.writing_assistant.models import Suggestion
    
    return Suggestion(
        id="test_1",
        type="grammar",
        severity="error",
        message="Subject-verb agreement error",
        offset=3,
        length=2,
        replacements=["goes"],
        explanation="The subject 'He' requires 'goes' not 'go'",
        rule_id="MORFOLOGIK_RULE_EN_US",
        confidence=0.95,
    )


@pytest.fixture
def sample_grammar_match():
    """Create a sample grammar match for testing."""
    from lib.writing_assistant.models import GrammarMatch
    
    return GrammarMatch(
        message="Subject-verb agreement error",
        short_message="Agreement error",
        rule_id="MORFOLOGIK_RULE_EN_US",
        rule_issue_type="grammar",
        category="GRAMMAR",
        offset=3,
        length=2,
        context="He go to",
        context_offset=0,
        sentence="He go to school.",
        replacements=["goes"],
        ignore_for_incomplete_sentence=False,
    )


@pytest.fixture
def sample_enhancement():
    """Create a sample enhancement for testing."""
    from lib.writing_assistant.models import Enhancement
    
    return Enhancement(
        original="Helped with project",
        enhanced="Led project initiative",
        enhancement_type="action_verbs",
        changes=[
            {
                "type": "verb_replacement",
                "original": "Helped",
                "suggested": "Led",
                "explanation": "Stronger leadership verb",
            }
        ],
        confidence=0.85,
        explanation="Replaced weak verb with stronger alternative",
    )


@pytest.fixture(autouse=True)
def mock_spacy():
    """Mock spaCy to avoid model loading in tests."""
    with patch('lib.writing_assistant.style_analyzer.spacy') as mock_spacy:
        mock_nlp = MagicMock()
        mock_spacy.load.return_value = mock_nlp
        yield mock_spacy


@pytest.fixture(autouse=True)
def mock_textstat():
    """Mock textstat to avoid heavy computation in tests."""
    with patch('lib.writing_assistant.style_analyzer.textstat') as mock_textstat:
        mock_textstat.flesch_reading_ease.return_value = 60.0
        mock_textstat.syllable_count.return_value = 10
        yield mock_textstat
