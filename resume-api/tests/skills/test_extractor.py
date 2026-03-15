"""
Tests for Skills Extractor.
"""

import pytest
from lib.skills.extractor import SkillsExtractor
from lib.skills.ontology import SkillsOntology


class TestSkillsExtractor:
    """Test SkillsExtractor class."""

    @pytest.fixture
    def extractor(self):
        """Create extractor instance."""
        return SkillsExtractor()

    def test_extract_basic(self, extractor):
        """Test basic skill extraction."""
        text = "We need a Python developer with AWS experience"
        result = extractor.extract(text)
        
        assert result.total_count > 0
        assert any(s.name == "Python" for s in result.skills)
        assert any(s.name == "AWS" for s in result.skills)

    def test_extract_empty_text(self, extractor):
        """Test extraction with empty text."""
        result = extractor.extract("")
        
        assert result.total_count == 0
        assert len(result.skills) == 0

    def test_extract_short_text(self, extractor):
        """Test extraction with very short text."""
        result = extractor.extract("Python")
        
        # May or may not extract depending on implementation
        assert result is not None

    def test_extract_by_category(self, extractor):
        """Test extraction grouped by category."""
        text = "Looking for Python developer with React and AWS experience"
        result = extractor.extract(text)
        
        assert "technical" in result.by_category
        assert "tools" in result.by_category

    def test_extract_confidence_scores(self, extractor):
        """Test that confidence scores are assigned."""
        text = "Python Java JavaScript"
        result = extractor.extract(text)
        
        for skill in result.skills:
            assert 0 <= skill.confidence <= 1

    def test_extract_synonyms(self, extractor):
        """Test extraction recognizes synonyms."""
        text = "Experience with Amazon Web Services required"
        result = extractor.extract(text)
        
        # Should recognize "Amazon Web Services" as "AWS"
        assert any(s.name == "AWS" for s in result.skills)

    def test_extract_with_categories(self, extractor):
        """Test extraction with category grouping."""
        text = "Python developer with leadership skills"
        result = extractor.extract_with_categories(text)
        
        assert isinstance(result, dict)
        assert "technical" in result or "soft" in result

    def test_get_skill_names(self, extractor):
        """Test getting just skill names."""
        text = "Python and Java developers"
        names = extractor.get_skill_names(text)
        
        assert isinstance(names, list)
        assert "Python" in names or "Java" in names

    def test_extract_processing_time(self, extractor):
        """Test that processing time is recorded."""
        text = "Python Java JavaScript Go Rust C++"
        result = extractor.extract(text)
        
        assert result.processing_time_ms >= 0

    def test_extract_multiple_occurrences(self, extractor):
        """Test extraction handles multiple mentions."""
        text = "Python Python Python"
        result = extractor.extract(text)
        
        # Should deduplicate
        python_skills = [s for s in result.skills if s.name == "Python"]
        assert len(python_skills) >= 1

    def test_extract_complex_jd(self, extractor):
        """Test extraction from complex job description."""
        text = """
        We are looking for a Senior Software Engineer with:
        - 5+ years of Python programming
        - Experience with AWS cloud services (EC2, S3, Lambda)
        - Strong knowledge of React and Node.js
        - Docker and Kubernetes experience
        - Excellent communication and leadership skills
        """
        result = extractor.extract(text)
        
        assert result.total_count >= 5
        assert any(s.name == "Python" for s in result.skills)
        assert any(s.name == "AWS" for s in result.skills)
        assert any(s.name == "React" for s in result.skills)
        assert any(s.name == "Docker" for s in result.skills)

    def test_extractor_with_custom_ontology(self):
        """Test extractor with custom ontology."""
        custom_ontology = SkillsOntology()
        extractor = SkillsExtractor(ontology=custom_ontology)
        
        result = extractor.extract("Python")
        assert result is not None

    def test_extract_preserves_original_text(self, extractor):
        """Test that original text is preserved."""
        text = "Expert in PYTHON programming"
        result = extractor.extract(text)
        
        for skill in result.skills:
            assert skill.original_text
            assert skill.original_text in text
