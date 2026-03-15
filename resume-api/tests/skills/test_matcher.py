"""
Tests for Skills Matcher.
"""

import pytest
from lib.skills.matcher import SkillsMatcher
from lib.skills.extractor import SkillsExtractor
from lib.skills.models import ExtractedSkill


class TestSkillsMatcher:
    """Test SkillsMatcher class."""

    @pytest.fixture
    def matcher(self):
        """Create matcher instance."""
        return SkillsMatcher()

    @pytest.fixture
    def extractor(self):
        """Create extractor for test data."""
        return SkillsExtractor()

    def test_match_exact(self, matcher):
        """Test exact skill matching."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            )
        ]
        resume_skills = ["Python", "Java"]
        
        result = matcher.match(jd_skills, resume_skills)
        
        assert len(result.matched_skills) > 0
        assert result.matched_skills[0].skill == "Python"
        assert result.matched_skills[0].match_type == "exact"

    def test_match_missing(self, matcher):
        """Test missing skill detection."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            )
        ]
        resume_skills = ["Java", "Go"]
        
        result = matcher.match(jd_skills, resume_skills)
        
        assert len(result.missing_skills) > 0
        assert result.missing_skills[0].name == "Python"

    def test_match_synonym(self, matcher):
        """Test synonym matching."""
        jd_skills = [
            ExtractedSkill(
                name="AWS",
                original_text="AWS",
                category="tools",
                confidence=1.0,
                start_offset=0,
                end_offset=3,
            )
        ]
        # Resume has synonym
        resume_skills = ["Amazon Web Services"]
        
        result = matcher.match(jd_skills, resume_skills)
        
        # Should match via synonym
        assert len(result.matched_skills) > 0

    def test_match_coverage_score(self, matcher):
        """Test coverage score calculation."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            ),
            ExtractedSkill(
                name="Java",
                original_text="Java",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=4,
            ),
        ]
        resume_skills = ["Python"]  # Only has one
        
        result = matcher.match(jd_skills, resume_skills)
        
        # Should be around 50%
        assert 40 <= result.coverage_score <= 60

    def test_match_priority_assignment(self, matcher):
        """Test priority assignment for missing skills."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            ),
            ExtractedSkill(
                name="Communication",
                original_text="Communication",
                category="soft",
                confidence=1.0,
                start_offset=0,
                end_offset=13,
            ),
        ]
        resume_skills = []
        
        result = matcher.match(jd_skills, resume_skills)
        
        # Technical should be critical
        python_missing = next((m for m in result.missing_skills if m.name == "Python"), None)
        assert python_missing is not None
        assert python_missing.priority == "critical"

    def test_match_suggestions(self, matcher):
        """Test that suggestions are provided for missing skills."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            )
        ]
        resume_skills = []
        
        result = matcher.match(jd_skills, resume_skills)
        
        if result.missing_skills:
            assert len(result.missing_skills[0].suggestions) > 0

    def test_find_missing(self, matcher):
        """Test finding missing skills."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            ),
            ExtractedSkill(
                name="Java",
                original_text="Java",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=4,
            ),
        ]
        resume_skills = ["Python"]
        
        missing = matcher.find_missing(jd_skills, resume_skills)
        
        assert len(missing) > 0
        assert any(m.name == "Java" for m in missing)

    def test_get_match_summary(self, matcher):
        """Test getting match summary."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            )
        ]
        resume_skills = ["Python"]
        
        summary = matcher.get_match_summary(jd_skills, resume_skills)
        
        assert "coverage_score" in summary
        assert "matched_count" in summary
        assert "missing_count" in summary
        assert "by_category" in summary

    def test_match_partial(self, matcher):
        """Test partial matching (substring)."""
        jd_skills = [
            ExtractedSkill(
                name="JavaScript",
                original_text="JavaScript",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=10,
            )
        ]
        resume_skills = ["TypeScript"]  # Related but not exact
        
        result = matcher.match(jd_skills, resume_skills)
        
        # May find partial or semantic match
        assert result is not None

    def test_match_empty_jd(self, matcher):
        """Test matching with empty JD skills."""
        result = matcher.match([], ["Python", "Java"])
        
        assert len(result.matched_skills) == 0
        assert result.coverage_score == 100.0  # No JD skills = 100% match

    def test_match_empty_resume(self, matcher):
        """Test matching with empty resume skills."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            )
        ]
        
        result = matcher.match(jd_skills, [])
        
        assert len(result.missing_skills) > 0
        assert result.coverage_score == 0

    def test_match_counts(self, matcher):
        """Test that counts are correct."""
        jd_skills = [
            ExtractedSkill(
                name="Python",
                original_text="Python",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=6,
            ),
            ExtractedSkill(
                name="Java",
                original_text="Java",
                category="technical",
                confidence=1.0,
                start_offset=0,
                end_offset=4,
            ),
        ]
        resume_skills = ["Python", "Java", "Go"]
        
        result = matcher.match(jd_skills, resume_skills)
        
        assert result.jd_skills_count == 2
        assert result.resume_skills_count == 3
