"""
Tests for Skills Categorizer.
"""

import pytest
from lib.skills.categorizer import SkillsCategorizer
from lib.skills.ontology import SkillsOntology


class TestSkillsCategorizer:
    """Test SkillsCategorizer class."""

    @pytest.fixture
    def categorizer(self):
        """Create categorizer instance."""
        return SkillsCategorizer()

    def test_categorize_basic(self, categorizer):
        """Test basic categorization."""
        skills = ["Python", "AWS", "Communication"]
        result = categorizer.categorize(skills)
        
        assert "technical" in result
        assert "tools" in result or "technical" in result
        assert "soft" in result

    def test_categorize_empty_list(self, categorizer):
        """Test categorization of empty list."""
        result = categorizer.categorize([])
        
        assert result == {}

    def test_get_category_technical(self, categorizer):
        """Test categorizing technical skills."""
        category = categorizer.get_category("Python")
        
        assert category == "technical"

    def test_get_category_tools(self, categorizer):
        """Test categorizing tools."""
        category = categorizer.get_category("Docker")
        
        assert category == "tools"

    def test_get_category_soft(self, categorizer):
        """Test categorizing soft skills."""
        category = categorizer.get_category("Communication")
        
        assert category == "soft"

    def test_get_category_unknown(self, categorizer):
        """Test categorizing unknown skill."""
        category = categorizer.get_category("FakeSkill123")
        
        # May return None or use heuristics
        assert category is None or category in ["technical", "tools", "soft", "domain", "unknown"]

    def test_categorize_with_confidence(self, categorizer):
        """Test categorization with confidence scores."""
        skills = ["Python", "FakeSkill123"]
        result = categorizer.categorize_with_confidence(skills)
        
        assert len(result) == 2
        assert any(r["skill"] == "Python" for r in result)
        
        # Python should have high confidence
        python_result = next(r for r in result if r["skill"] == "Python")
        assert python_result["confidence"] >= 0.9

    def test_get_subcategory(self, categorizer):
        """Test getting subcategory."""
        subcategory = categorizer.get_subcategory("Python")
        
        assert subcategory is not None
        assert subcategory in ["languages", "frameworks", "libraries"]

    def test_get_category_statistics(self, categorizer):
        """Test getting category statistics."""
        skills = ["Python", "Java", "AWS", "Docker", "Communication"]
        stats = categorizer.get_category_statistics(skills)
        
        assert "total" in stats
        assert "by_category" in stats
        assert stats["total"] == 5
        
        for category, data in stats["by_category"].items():
            assert "count" in data
            assert "percentage" in data
            assert "skills" in data

    def test_heuristic_categorization(self, categorizer):
        """Test heuristic-based categorization."""
        # Skills with keywords should be categorized
        category = categorizer.get_category("Programming")
        
        assert category in ["technical", "tools", "soft", "domain", None]

    def test_categorize_preserves_all_skills(self, categorizer):
        """Test that all skills are categorized."""
        skills = ["Python", "AWS", "Communication", "Leadership"]
        result = categorizer.categorize(skills)
        
        # All skills should be in some category
        total_categorized = sum(len(s) for s in result.values())
        assert total_categorized == len(skills)

    def test_categorizer_with_custom_ontology(self):
        """Test categorizer with custom ontology."""
        custom_ontology = SkillsOntology()
        categorizer = SkillsCategorizer(ontology=custom_ontology)
        
        result = categorizer.categorize(["Python"])
        assert "technical" in result
