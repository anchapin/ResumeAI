"""
Tests for Context Analyzer.
"""

import pytest
from lib.autocomplete.context_analyzer import ContextAnalyzer


class TestContextAnalyzer:
    """Test ContextAnalyzer class."""

    @pytest.fixture
    def analyzer(self):
        """Create analyzer instance."""
        return ContextAnalyzer()

    def test_analyze_basic(self, analyzer):
        """Test basic context analysis."""
        text = """Experience

Software Engineer at Tech Corp
- Led development of new features
"""
        context = analyzer.analyze(text, len(text))

        assert "section_type" in context
        assert "cursor_position" in context
        assert "current_line" in context
        assert "previous_lines" in context
        assert "writing_style" in context

    def test_get_section_type_experience(self, analyzer):
        """Test detecting experience section."""
        text = """Experience
Software Engineer at Company
"""
        section_type = analyzer.get_section_type(text)
        assert section_type == "experience"

    def test_get_section_type_education(self, analyzer):
        """Test detecting education section."""
        text = """Education
Bachelor of Science in Computer Science
"""
        section_type = analyzer.get_section_type(text)
        assert section_type == "education"

    def test_get_section_type_skills(self, analyzer):
        """Test detecting skills section."""
        text = """Skills
Programming Languages: Python, Java
"""
        section_type = analyzer.get_section_type(text)
        assert section_type == "skills"

    def test_get_section_type_projects(self, analyzer):
        """Test detecting projects section."""
        text = """Projects
Built a web application
"""
        section_type = analyzer.get_section_type(text)
        assert section_type == "projects"

    def test_get_section_type_default(self, analyzer):
        """Test default section type."""
        text = """Some random text"""
        section_type = analyzer.get_section_type(text)
        # Should default to experience
        assert section_type == "experience"

    def test_get_writing_style(self, analyzer):
        """Test writing style analysis."""
        text = """Led development of new features.
Collaborated with cross-functional teams.
Optimized system performance.
"""
        style = analyzer.get_writing_style(text)

        assert "formality" in style
        assert "tone" in style
        assert "avg_line_length" in style

    def test_get_writing_style_empty(self, analyzer):
        """Test writing style with empty text."""
        style = analyzer.get_writing_style("")

        assert style["formality"] == "neutral"
        assert style["tone"] == "professional"

    def test_detect_role(self, analyzer):
        """Test role detection."""
        text = """Senior Software Engineer with 5+ years of experience"""
        role = analyzer.detect_role(text)

        assert role is not None
        assert "Senior" in role or "Engineer" in role

    def test_detect_role_not_found(self, analyzer):
        """Test role detection when not found."""
        text = """Some random text without a role"""
        role = analyzer.detect_role(text)

        assert role is None

    def test_detect_seniority_senior(self, analyzer):
        """Test seniority detection - senior."""
        text = """Senior Software Engineer"""
        seniority = analyzer.detect_seniority(text)

        assert seniority == "senior"

    def test_detect_seniority_entry(self, analyzer):
        """Test seniority detection - entry level."""
        text = """Entry-level developer position"""
        seniority = analyzer.detect_seniority(text)

        assert seniority == "entry"

    def test_detect_seniority_not_found(self, analyzer):
        """Test seniority detection when not found."""
        text = """Software Engineer"""
        seniority = analyzer.detect_seniority(text)

        assert seniority is None

    def test_analyze_bullet_structure(self, analyzer):
        """Test bullet structure analysis."""
        line = "- Led development of new features"
        structure = analyzer.analyze_bullet_structure(line)

        assert structure["is_bullet"] == True
        assert structure["starts_with_verb"] == True

    def test_analyze_bullet_structure_not_bullet(self, analyzer):
        """Test bullet structure for non-bullet."""
        line = "This is just text"
        structure = analyzer.analyze_bullet_structure(line)

        assert structure["is_bullet"] == False

    def test_analyze_bullet_structure_with_numbers(self, analyzer):
        """Test bullet structure with numbers."""
        line = "- Improved performance by 40%"
        structure = analyzer.analyze_bullet_structure(line)

        assert structure["has_numbers"] == True

    def test_get_current_line(self, analyzer):
        """Test getting current line."""
        lines = ["Line 1", "Line 2", "Line 3"]
        cursor_pos = 10  # In "Line 2"

        current_line, line_index = analyzer._get_current_line(lines, cursor_pos)

        assert current_line == "Line 2"
        assert line_index == 1

    def test_get_current_line_at_end(self, analyzer):
        """Test getting current line at end."""
        lines = ["Line 1", "Line 2"]
        cursor_pos = 100  # Beyond end

        current_line, line_index = analyzer._get_current_line(lines, cursor_pos)

        assert current_line == "Line 2"

    def test_get_relevant_context(self, analyzer):
        """Test getting relevant context."""
        text = """Line 1
Line 2
Line 3
Current Line
Line 5
"""
        cursor_pos = len(text) - 10

        context = analyzer.get_relevant_context(text, cursor_pos)

        assert "current_line" in context
        assert "previous_lines" in context
        assert "next_lines" in context

    def test_seniority_patterns(self, analyzer):
        """Test various seniority patterns."""
        test_cases = [
            ("Junior Developer", "entry"),
            ("Mid-level Engineer", "mid"),
            ("Senior Manager", "senior"),
            ("Lead Engineer", "lead"),
            ("Principal Architect", "principal"),
            ("VP of Engineering", "executive"),
        ]

        for text, expected in test_cases:
            seniority = analyzer.detect_seniority(text)
            assert seniority == expected, f"Failed for {text}"
