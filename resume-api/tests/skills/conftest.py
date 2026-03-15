"""
Pytest configuration and fixtures for skills tests.
"""

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_extractor():
    """Create a mock skills extractor."""
    extractor = MagicMock()
    extractor.extract = MagicMock()
    return extractor


@pytest.fixture
def mock_matcher():
    """Create a mock skills matcher."""
    matcher = MagicMock()
    matcher.match = MagicMock()
    matcher.find_missing = MagicMock()
    return matcher


@pytest.fixture
def sample_jd_text():
    """Sample job description text for testing."""
    return """
    We are looking for a Senior Software Engineer with:
    - 5+ years of Python programming
    - Experience with AWS cloud services
    - Strong knowledge of React and Node.js
    - Docker and Kubernetes experience
    - Excellent communication and leadership skills
    """


@pytest.fixture
def sample_resume_text():
    """Sample resume text for testing."""
    return """
    Software Engineer with 3 years of experience.
    Skills: Python, Java, JavaScript, React
    Experience with Docker and CI/CD pipelines.
    Strong problem-solving and teamwork skills.
    """


@pytest.fixture
def sample_extracted_skills():
    """Sample extracted skills for testing."""
    from lib.skills.models import ExtractedSkill
    
    return [
        ExtractedSkill(
            name="Python",
            original_text="Python",
            category="technical",
            confidence=0.95,
            start_offset=0,
            end_offset=6,
        ),
        ExtractedSkill(
            name="AWS",
            original_text="AWS",
            category="tools",
            confidence=0.9,
            start_offset=0,
            end_offset=3,
        ),
        ExtractedSkill(
            name="Communication",
            original_text="communication",
            category="soft",
            confidence=0.85,
            start_offset=0,
            end_offset=13,
        ),
    ]


@pytest.fixture(autouse=True)
def mock_ontology():
    """Mock ontology to avoid loading full database in tests."""
    with patch('lib.skills.ontology.SkillsOntology') as mock_ontology:
        # Setup mock behavior
        instance = mock_ontology.return_value
        instance.get_skill.return_value = {
            "name": "Python",
            "category": "technical",
            "subcategory": "languages",
            "synonyms": ["Python programming"],
        }
        instance.get_category.return_value = "technical"
        instance.get_synonyms.return_value = ["Python programming"]
        instance.lookup.return_value = {
            "name": "Python",
            "category": "technical",
        }
        instance.get_all_skills.return_value = ["Python", "Java", "JavaScript"]
        instance.get_related_skills.return_value = ["Java", "Go"]
        instance.search.return_value = []
        instance.get_statistics.return_value = {
            "total_skills": 100,
            "total_synonyms": 400,
            "by_category": {"technical": 50, "tools": 30, "soft": 20},
        }
        yield mock_ontology


@pytest.fixture(autouse=True)
def mock_spacy():
    """Mock spaCy to avoid model loading in tests."""
    with patch('lib.skills.extractor.spacy') as mock_spacy:
        mock_nlp = MagicMock()
        mock_spacy.load.return_value = mock_nlp
        yield mock_spacy
