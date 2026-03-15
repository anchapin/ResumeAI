"""
Comprehensive tests for JSON and HTML Exporters.

Tests the JsonExporter and HtmlExporter classes in lib/exporters/
"""

import pytest
import json
from pathlib import Path
from datetime import datetime

# Import exporters
from lib.exporters import JsonExporter, HtmlExporter
from api.models import (
    ResumeData,
    BasicInfo,
    Location,
    WorkItem,
    EducationItem,
    Skill,
    ProjectItem,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_resume_data():
    """Create sample resume data for testing."""
    return ResumeData(
        basics=BasicInfo(
            name="Jane Doe",
            label="Software Engineer",
            email="jane.doe@example.com",
            phone="+1 (555) 123-4567",
            url="https://janedoe.dev",
            summary="Passionate software engineer with 5+ years of experience building scalable web applications.",
        ),
        location=Location(
            address="123 Main St",
            city="San Francisco",
            region="CA",
            postalCode="94105",
            countryCode="US",
        ),
        work=[
            WorkItem(
                company="Tech Corp",
                position="Senior Software Engineer",
                startDate="2022-01",
                endDate="",
                summary="Leading development of microservices architecture.",
                highlights=[
                    "Reduced API response time by 40%",
                    "Mentored team of 4 junior developers",
                    "Implemented CI/CD pipeline",
                ],
            ),
            WorkItem(
                company="Startup Inc",
                position="Software Engineer",
                startDate="2019-06",
                endDate="2021-12",
                summary="Full-stack development for SaaS platform.",
                highlights=[
                    "Built customer-facing dashboard",
                    "Reduced page load time by 60%",
                ],
            ),
        ],
        education=[
            EducationItem(
                institution="University of California, Berkeley",
                area="Computer Science",
                studyType="Bachelor of Science",
                startDate="2015-09",
                endDate="2019-05",
                courses=["Data Structures", "Algorithms", "Operating Systems"],
            )
        ],
        skills=[
            Skill(name="Programming Languages", keywords=["Python", "JavaScript", "TypeScript"]),
            Skill(name="Frameworks", keywords=["React", "FastAPI", "Node.js"]),
            Skill(name="Tools", keywords=["Git", "Docker", "AWS"]),
        ],
        projects=[
            ProjectItem(
                name="Open Source Project",
                description="A popular open-source library with 5k+ stars",
                url="https://github.com/janedoe/project",
                highlights=["5000+ stars", "100+ contributors"],
                startDate="2020-01",
                endDate="",
            )
        ],
    )


@pytest.fixture
def json_exporter():
    """Create JSON exporter instance."""
    return JsonExporter(include_metadata=True)


@pytest.fixture
def html_exporter():
    """Create HTML exporter instance."""
    return HtmlExporter()


# ============================================================================
# JSON Exporter Tests
# ============================================================================


class TestJsonExporter:
    """Tests for JsonExporter class."""

    def test_json_exporter_initialization(self, json_exporter):
        """Test JSON exporter initializes correctly."""
        assert json_exporter.include_metadata is True
        assert json_exporter.SCHEMA_VERSION == "1.0.0"
        assert json_exporter.METADATA_VERSION == "1.0.0"

    def test_json_export_basic_structure(self, json_exporter, sample_resume_data):
        """Test JSON export produces correct basic structure."""
        result = json_exporter.export(sample_resume_data)
        
        assert result is not None
        assert isinstance(result.json_data, dict)
        
        # Check JSON Resume structure
        assert "basics" in result.json_data
        assert "work" in result.json_data
        assert "education" in result.json_data
        assert "skills" in result.json_data
        assert "projects" in result.json_data

    def test_json_export_includes_metadata(self, json_exporter, sample_resume_data):
        """Test JSON export includes ResumeAI metadata."""
        result = json_exporter.export(
            sample_resume_data,
            metadata={"title": "My Resume", "tags": ["software-engineer", "frontend"]},
        )
        
        # Check ResumeAI metadata
        assert "$resumeai" in result.json_data
        metadata = result.json_data["$resumeai"]
        
        assert "version" in metadata
        assert "exportedAt" in metadata
        assert "schemaVersion" in metadata
        assert "generator" in metadata
        assert metadata["generator"] == "ResumeAI"
        
        # Check user metadata
        assert "user" in metadata
        assert metadata["user"]["title"] == "My Resume"
        assert "software-engineer" in metadata["user"]["tags"]

    def test_json_export_handles_empty_fields(self, json_exporter):
        """Test JSON export handles empty/null fields gracefully."""
        minimal_resume = ResumeData(
            basics=BasicInfo(name="Test User", email="test@example.com"),
            work=[],
            education=[],
            skills=[],
            projects=[],
        )
        
        result = json_exporter.export(minimal_resume)
        
        assert result is not None
        assert "basics" in result.json_data
        assert result.json_data["basics"]["name"] == "Test User"

    def test_json_export_special_characters(self, json_exporter, sample_resume_data):
        """Test JSON export handles special characters correctly."""
        # Add special characters to resume
        sample_resume_data.basics.summary = "Engineer with experience in C++ & Python\nWorking with <tags> and \"quotes\""
        
        result = json_exporter.export(sample_resume_data)
        json_str = result.to_json()
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["basics"]["summary"] == sample_resume_data.basics.summary

    def test_json_export_tailoring_changes(self, json_exporter, sample_resume_data):
        """Test JSON export includes tailoring changes when provided."""
        tailoring_changes = [
            {"field": "work[0].highlights", "action": "added", "value": "New highlight"},
            {"field": "skills", "action": "modified", "value": "Updated skills"},
        ]
        
        result = json_exporter.export(
            sample_resume_data,
            tailoring_changes=tailoring_changes,
        )
        
        assert "$resumeai" in result.json_data
        metadata = result.json_data["$resumeai"]
        
        assert "tailoring" in metadata
        assert metadata["tailoring"]["changeCount"] == 2
        assert len(metadata["tailoring"]["changes"]) == 2

    def test_json_export_without_metadata(self, sample_resume_data):
        """Test JSON export can exclude metadata."""
        exporter = JsonExporter(include_metadata=False)
        result = exporter.export(sample_resume_data)
        
        # Should not have ResumeAI metadata
        assert "$resumeai" not in result.json_data
        
        # Should still have resume data
        assert "basics" in result.json_data

    def test_json_export_to_json_string(self, json_exporter, sample_resume_data):
        """Test converting export result to JSON string."""
        result = json_exporter.export(sample_resume_data)
        json_str = result.to_json(indent=2)
        
        assert isinstance(json_str, str)
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert "basics" in parsed

    def test_json_export_maps_location(self, json_exporter, sample_resume_data):
        """Test location is mapped correctly to JSON Resume format."""
        result = json_exporter.export(sample_resume_data)
        
        # Location should be in basics.location
        assert "basics" in result.json_data
        assert "location" in result.json_data["basics"]
        
        location = result.json_data["basics"]["location"]
        assert location["city"] == "San Francisco"
        assert location["region"] == "CA"
        assert location["countryCode"] == "US"

    def test_json_export_maps_work_experience(self, json_exporter, sample_resume_data):
        """Test work experience is mapped correctly."""
        result = json_exporter.export(sample_resume_data)
        
        assert "work" in result.json_data
        assert len(result.json_data["work"]) == 2
        
        first_job = result.json_data["work"][0]
        assert first_job["company"] == "Tech Corp"
        assert first_job["position"] == "Senior Software Engineer"
        assert "highlights" in first_job
        assert len(first_job["highlights"]) == 3

    def test_json_export_maps_skills(self, json_exporter, sample_resume_data):
        """Test skills are mapped correctly."""
        result = json_exporter.export(sample_resume_data)
        
        assert "skills" in result.json_data
        assert len(result.json_data["skills"]) == 3
        
        first_skill = result.json_data["skills"][0]
        assert first_skill["name"] == "Programming Languages"
        assert "Python" in first_skill["keywords"]

    def test_json_export_schema_version(self, json_exporter, sample_resume_data):
        """Test JSON export includes correct schema version."""
        result = json_exporter.export(sample_resume_data)
        
        if "$resumeai" in result.json_data:
            metadata = result.json_data["$resumeai"]
            assert metadata["schemaVersion"] == "1.0.0"


# ============================================================================
# HTML Exporter Tests
# ============================================================================


class TestHtmlExporter:
    """Tests for HtmlExporter class."""

    def test_html_exporter_initialization(self, html_exporter):
        """Test HTML exporter initializes correctly."""
        assert html_exporter.AVAILABLE_TEMPLATES == ["modern", "classic", "minimal"]

    def test_html_export_basic_structure(self, html_exporter, sample_resume_data):
        """Test HTML export produces valid HTML structure."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert result is not None
        assert isinstance(result.html_content, str)
        
        # Check HTML structure
        assert "<!DOCTYPE html>" in result.html_content
        assert "<html" in result.html_content
        assert "<head>" in result.html_content
        assert "<body>" in result.html_content
        assert "</html>" in result.html_content

    def test_html_export_embedded_css(self, html_exporter, sample_resume_data):
        """Test HTML export includes embedded CSS."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert "<style>" in result.html_content
        assert "</style>" in result.html_content
        assert ":root" in result.html_content  # CSS variables

    def test_html_export_all_templates(self, html_exporter, sample_resume_data):
        """Test HTML export works with all templates."""
        templates = ["modern", "classic", "minimal"]
        
        for template in templates:
            result = html_exporter.export(sample_resume_data, template=template)
            assert result is not None
            assert result.template == template
            assert isinstance(result.html_content, str)

    def test_html_export_invalid_template(self, html_exporter, sample_resume_data):
        """Test HTML export raises error for invalid template."""
        with pytest.raises(ValueError, match="Invalid template"):
            html_exporter.export(sample_resume_data, template="invalid")

    def test_html_export_dark_mode(self, html_exporter, sample_resume_data):
        """Test HTML export includes dark mode support."""
        result = html_exporter.export(sample_resume_data, template="modern", dark_mode=True)
        
        # Should include dark mode media query
        assert "@media (prefers-color-scheme: dark)" in result.html_content

    def test_html_export_without_dark_mode(self, html_exporter, sample_resume_data):
        """Test HTML export works without dark mode."""
        result = html_exporter.export(sample_resume_data, template="modern", dark_mode=False)
        
        # Should not include dark mode styles
        assert "@media (prefers-color-scheme: dark)" not in result.html_content

    def test_html_export_responsive_meta(self, html_exporter, sample_resume_data):
        """Test HTML export includes responsive viewport meta tag."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert '<meta name="viewport" content="width=device-width, initial-scale=1.0">' in result.html_content

    def test_html_export_meta_tags(self, html_exporter, sample_resume_data):
        """Test HTML export includes SEO meta tags."""
        result = html_exporter.export(sample_resume_data, template="modern", metadata={"title": "Jane Doe Resume"})
        
        assert '<meta charset="UTF-8">' in result.html_content
        assert '<meta name="description"' in result.html_content
        assert '<meta name="generator" content="ResumeAI">' in result.html_content
        assert "<title>" in result.html_content

    def test_html_export_escape_html_characters(self, html_exporter, sample_resume_data):
        """Test HTML export escapes special characters."""
        # Add HTML special characters
        sample_resume_data.basics.summary = "Engineer with <5> years experience & counting"
        
        result = html_exporter.export(sample_resume_data, template="modern")
        
        # Should escape HTML
        assert "&lt;5&gt;" in result.html_content
        assert "&amp;" in result.html_content

    def test_html_export_render_header(self, html_exporter, sample_resume_data):
        """Test HTML export renders header section."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert '<header class="header">' in result.html_content
        assert "Jane Doe" in result.html_content
        assert "Software Engineer" in result.html_content
        assert "jane.doe@example.com" in result.html_content

    def test_html_export_render_experience(self, html_exporter, sample_resume_data):
        """Test HTML export renders experience section."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert 'class="section experience"' in result.html_content
        assert "Tech Corp" in result.html_content
        assert "Senior Software Engineer" in result.html_content

    def test_html_export_render_education(self, html_exporter, sample_resume_data):
        """Test HTML export renders education section."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert 'class="section education"' in result.html_content
        assert "University of California, Berkeley" in result.html_content

    def test_html_export_render_skills(self, html_exporter, sample_resume_data):
        """Test HTML export renders skills section."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert 'class="section skills"' in result.html_content
        assert "Programming Languages" in result.html_content
        assert "Python" in result.html_content

    def test_html_export_render_projects(self, html_exporter, sample_resume_data):
        """Test HTML export renders projects section."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert 'class="section projects"' in result.html_content
        assert "Open Source Project" in result.html_content

    def test_html_export_print_styles(self, html_exporter, sample_resume_data):
        """Test HTML export includes print media queries."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        assert "@media print" in result.html_content

    def test_html_export_template_preview(self, html_exporter):
        """Test getting template preview."""
        for template in ["modern", "classic", "minimal"]:
            preview = html_exporter.get_template_preview(template)
            
            assert isinstance(preview, str)
            assert "<!DOCTYPE html>" in preview
            assert template in preview.lower() or template.replace("minimal", "minimal") in preview.lower()

    def test_html_export_accessibility(self, html_exporter, sample_resume_data):
        """Test HTML export includes accessibility features."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        # Should have ARIA labels
        assert 'aria-label="Resume"' in result.html_content
        assert 'aria-labelledby=' in result.html_content
        
        # Should have semantic HTML
        assert "<main" in result.html_content
        assert "<section" in result.html_content
        assert "<h1" in result.html_content or "<h2" in result.html_content

    def test_html_export_links(self, html_exporter, sample_resume_data):
        """Test HTML export handles links correctly."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        # Should have proper link attributes
        assert 'target="_blank"' in result.html_content
        assert 'rel="noopener noreferrer"' in result.html_content


# ============================================================================
# Integration Tests
# ============================================================================


class TestExportersIntegration:
    """Integration tests for exporters."""

    def test_json_export_import_roundtrip(self, json_exporter, sample_resume_data):
        """Test JSON export can be imported back (structure preservation)."""
        result = json_exporter.export(sample_resume_data)
        json_str = result.to_json()
        
        # Parse JSON
        parsed = json.loads(json_str)
        
        # Verify structure is preserved
        assert parsed["basics"]["name"] == sample_resume_data.basics.name
        assert parsed["basics"]["email"] == sample_resume_data.basics.email
        assert len(parsed["work"]) == len(sample_resume_data.work)
        assert len(parsed["skills"]) == len(sample_resume_data.skills)

    def test_html_export_file_size(self, html_exporter, sample_resume_data):
        """Test HTML export produces reasonable file size."""
        result = html_exporter.export(sample_resume_data, template="modern")
        
        # Should be under 100KB for typical resume
        size_bytes = len(result.html_content.encode("utf-8"))
        assert size_bytes < 100 * 1024  # 100KB
        assert size_bytes > 1024  # At least 1KB

    def test_html_export_load_time(self, html_exporter, sample_resume_data):
        """Test HTML export generates quickly."""
        import time
        
        start = time.time()
        result = html_exporter.export(sample_resume_data, template="modern")
        elapsed = time.time() - start
        
        # Should generate in under 1 second
        assert elapsed < 1.0
        assert result is not None


# ============================================================================
# Edge Cases
# ============================================================================


class TestExporterEdgeCases:
    """Test edge cases for exporters."""

    def test_json_export_empty_resume(self, json_exporter):
        """Test JSON export with minimal/empty resume."""
        empty_resume = ResumeData(
            basics=BasicInfo(name="Test"),
            work=[],
            education=[],
            skills=[],
            projects=[],
        )
        
        result = json_exporter.export(empty_resume)
        assert result is not None
        assert "basics" in result.json_data

    def test_html_export_empty_resume(self, html_exporter):
        """Test HTML export with minimal/empty resume."""
        empty_resume = ResumeData(
            basics=BasicInfo(name="Test User"),
            work=[],
            education=[],
            skills=[],
            projects=[],
        )
        
        result = html_exporter.export(empty_resume, template="modern")
        assert result is not None
        assert "Test User" in result.html_content

    def test_json_export_very_long_content(self, json_exporter):
        """Test JSON export handles very long content."""
        long_summary = "A" * 10000  # 10k characters
        
        resume = ResumeData(
            basics=BasicInfo(name="Test", summary=long_summary),
            work=[],
            education=[],
            skills=[],
            projects=[],
        )
        
        result = json_exporter.export(resume)
        json_str = result.to_json()
        
        # Should handle without error
        parsed = json.loads(json_str)
        assert len(parsed["basics"]["summary"]) == 10000

    def test_html_export_unicode_characters(self, html_exporter):
        """Test HTML export handles Unicode characters."""
        resume = ResumeData(
            basics=BasicInfo(
                name="José García",
                summary="Engineer with experience in 日本語と中文",
                email="jose@example.com",
            ),
            work=[],
            education=[],
            skills=[],
            projects=[],
        )
        
        result = html_exporter.export(resume, template="modern")
        
        # Should preserve Unicode
        assert "José García" in result.html_content
        assert "日本語と中文" in result.html_content
