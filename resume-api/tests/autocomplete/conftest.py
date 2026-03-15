"""
Pytest configuration and fixtures for autocomplete tests.
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock


@pytest.fixture
def mock_llm_client():
    """Create a mock LLM client."""
    client = MagicMock()
    client.generate = AsyncMock(return_value='["completion 1", "completion 2"]')
    client.stream = AsyncMock()
    return client


@pytest.fixture
def mock_cache():
    """Create a mock cache."""
    cache = MagicMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()
    cache.delete = AsyncMock()
    return cache


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = MagicMock()
    session.execute = MagicMock()
    session.commit = MagicMock()
    session.rollback = MagicMock()
    return session


@pytest.fixture
def sample_completion_request():
    """Sample completion request for testing."""
    from lib.autocomplete.models import CompletionRequest
    
    return CompletionRequest(
        text="Led development",
        cursor_position=15,
        section_type="experience",
        role="Engineer",
        limit=3,
    )


@pytest.fixture
def sample_completions():
    """Sample completions for testing."""
    from lib.autocomplete.models import CompletionSuggestion
    
    return [
        CompletionSuggestion(
            id="comp_1",
            text="Led development of new features",
            type="inline",
            confidence=0.9,
            source="llm",
        ),
        CompletionSuggestion(
            id="comp_2",
            text="Led cross-functional initiatives",
            type="inline",
            confidence=0.8,
            source="llm",
        ),
    ]


@pytest.fixture(autouse=True)
def mock_ontology():
    """Mock any ontology dependencies."""
    with patch('lib.skills.ontology.get_ontology') as mock_get:
        mock_ontology = MagicMock()
        mock_get.return_value = mock_ontology
        yield mock_get


@pytest.fixture(autouse=True)
def mock_spacy():
    """Mock spaCy to avoid model loading in tests."""
    with patch('lib.autocomplete.context_analyzer.spacy') as mock_spacy:
        mock_nlp = MagicMock()
        mock_spacy.load.return_value = mock_nlp
        yield mock_spacy
