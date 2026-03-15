"""
Tests for Skills Ontology.
"""

import pytest
from lib.skills.ontology import SkillsOntology, get_ontology, SKILLS_DATABASE


class TestSkillsOntology:
    """Test SkillsOntology class."""

    @pytest.fixture
    def ontology(self):
        """Create ontology instance."""
        return SkillsOntology()

    def test_get_skill_found(self, ontology):
        """Test getting a skill by name."""
        skill = ontology.get_skill("Python")
        
        assert skill is not None
        assert skill["name"] == "Python"
        assert skill["category"] == "technical"

    def test_get_skill_not_found(self, ontology):
        """Test getting a non-existent skill."""
        skill = ontology.get_skill("NonExistentSkill123")
        
        assert skill is None

    def test_get_skill_case_insensitive(self, ontology):
        """Test case-insensitive skill lookup."""
        skill1 = ontology.get_skill("Python")
        skill2 = ontology.get_skill("python")
        skill3 = ontology.get_skill("PYTHON")
        
        assert skill1 is not None
        assert skill2 is not None
        assert skill3 is not None
        assert skill1["name"] == skill2["name"]

    def test_get_synonyms(self, ontology):
        """Test getting synonyms for a skill."""
        synonyms = ontology.get_synonyms("AWS")
        
        assert len(synonyms) > 0
        assert "Amazon Web Services" in synonyms
        assert "AWS Cloud" in synonyms

    def test_get_category(self, ontology):
        """Test getting category for a skill."""
        category = ontology.get_category("React")
        
        assert category == "technical"

    def test_lookup_by_name(self, ontology):
        """Test looking up skill by name."""
        result = ontology.lookup("JavaScript")
        
        assert result is not None
        assert result["name"] == "JavaScript"

    def test_lookup_by_synonym(self, ontology):
        """Test looking up skill by synonym."""
        result = ontology.lookup("Amazon Web Services")
        
        assert result is not None
        assert result["name"] == "AWS"

    def test_lookup_not_found(self, ontology):
        """Test lookup for non-existent skill."""
        result = ontology.lookup("FakeSkill123")
        
        assert result is None

    def test_get_all_skills(self, ontology):
        """Test getting all skills."""
        skills = ontology.get_all_skills()
        
        assert len(skills) > 100  # Should have 130+ skills

    def test_get_all_skills_by_category(self, ontology):
        """Test filtering skills by category."""
        technical_skills = ontology.get_all_skills("technical")
        soft_skills = ontology.get_all_skills("soft")
        
        assert len(technical_skills) > 0
        assert len(soft_skills) > 0
        assert all(s in ["Python", "Java", "JavaScript"] for s in technical_skills[:3])

    def test_get_skills_by_subcategory(self, ontology):
        """Test getting skills by subcategory."""
        languages = ontology.get_skills_by_subcategory("technical", "languages")
        
        assert len(languages) > 0
        assert "Python" in languages
        assert "Java" in languages

    def test_get_related_skills(self, ontology):
        """Test getting related skills."""
        related = ontology.get_related_skills("Python", limit=5)
        
        assert len(related) <= 5
        # Related skills should be in same subcategory
        assert len(related) > 0

    def test_get_priority_for_role(self, ontology):
        """Test getting skill priority for a role."""
        priority = ontology.get_priority_for_role("Python", "software_engineer")
        
        assert priority in ["critical", "preferred", "nice_to_have", None]

    def test_search_by_name(self, ontology):
        """Test searching skills by name."""
        results = ontology.search("Python", limit=5)
        
        assert len(results) > 0
        assert any(r["name"] == "Python" for r in results)

    def test_search_by_synonym(self, ontology):
        """Test searching skills by synonym."""
        results = ontology.search("Amazon", limit=5)
        
        assert len(results) > 0
        assert any(r["name"] == "AWS" for r in results)

    def test_search_limit(self, ontology):
        """Test search result limit."""
        results = ontology.search("a", limit=3)
        
        assert len(results) <= 3

    def test_get_statistics(self, ontology):
        """Test getting ontology statistics."""
        stats = ontology.get_statistics()
        
        assert "total_skills" in stats
        assert "total_synonyms" in stats
        assert "by_category" in stats
        assert stats["total_skills"] > 100
        assert stats["total_synonyms"] > 300

    def test_get_singleton(self):
        """Test singleton pattern."""
        ontology1 = get_ontology()
        ontology2 = get_ontology()
        
        assert ontology1 is ontology2

    def test_category_hierarchy(self, ontology):
        """Test category hierarchy structure."""
        # Should have all main categories
        for category in ["technical", "tools", "soft", "domain"]:
            skills = ontology.get_all_skills(category)
            assert len(skills) > 0

    def test_skill_structure(self, ontology):
        """Test skill data structure."""
        skill = ontology.get_skill("Python")
        
        assert "name" in skill
        assert "category" in skill
        assert "subcategory" in skill
        assert "synonyms" in skill
        assert isinstance(skill["synonyms"], list)
