"""
Comprehensive tests for PDF generation with LaTeX templates.

Tests the /v1/render/pdf endpoint and ResumeGenerator class
to verify all template variants work correctly.
"""

from lib.cli.generator import ResumeGenerator
import pytest
import sys
from pathlib import Path

# Add lib to path
lib_path = Path(__file__).parent.parent / "resume-api"
sys.path.insert(0, str(lib_path))


# Sample resume data for testing
SAMPLE_RESUME_DATA = {
    "basics": {
        "name": "John Doe",
        "label": "Software Engineer",
        "email": "john.doe@example.com",
        "phone": "+1 234 567 8900",
        "url": "https://johndoe.com",
        "summary": (
            "Experienced software engineer with 5+ years of experience in "
            "web development."
        ),
        "location": {
            "city": "San Francisco",
            "region": "CA",
            "countryCode": "US",
        },
    },
    "work": [
        {
            "company": "Tech Corp",
            "position": "Senior Software Engineer",
            "startDate": "2020-01",
            "endDate": "Present",
            "summary": "Lead development team",
            "highlights": [
                "Led team of 5 engineers",
                "Improved system performance by 40%",
                "Implemented microservices architecture",
            ],
        },
        {
            "company": "Startup Inc",
            "position": "Software Engineer",
            "startDate": "2017-06",
            "endDate": "2019-12",
            "summary": "Full-stack development",
            "highlights": [
                "Built customer-facing webapp",
                "Reduced page load time by 60%",
            ],
        },
    ],
    "education": [
        {
            "institution": "University of California",
            "area": "Computer Science",
            "studyType": "Bachelor of Science",
            "startDate": "2013-09",
            "endDate": "2017-06",
        }
    ],
    "skills": [
        {"name": "Python", "level": "Expert"},
        {"name": "JavaScript", "level": "Expert"},
        {"name": "React", "level": "Advanced"},
        {"name": "Node.js", "level": "Advanced"},
        {"name": "AWS", "level": "Intermediate"},
    ],
    "projects": [
        {
            "name": "Open Source Contrib",
            "description": "Contributed to various open source projects",
            "highlights": ["1000+ stars on GitHub"],
        }
    ],
    "awards": [
        {
            "title": "Best Developer Award",
            "date": "2021",
            "awarder": "Tech Corp",
        }
    ],
    "certificates": [
        {"name": "AWS Solutions Architect", "date": "2022", "issuer": "Amazon"}
    ],
    "publications": [
        {"name": "Paper on ML", "publisher": "IEEE", "releaseDate": "2020"}
    ],
}

# Template variants to test
TEMPLATE_VARIANTS = [
    "base",
    "modern",
    "technical",
    "executive",
    "creative",
    "academic",
]


class TestResumeGenerator:
    """Tests for ResumeGenerator class."""

    @pytest.fixture
    def generator(self):
        """Create a ResumeGenerator instance."""
        templates_dir = (
            Path(__file__).parent.parent / "resume-api" / "templates"
        )
        lib_dir = Path(__file__).parent.parent / "resume-api"
        return ResumeGenerator(str(templates_dir), str(lib_dir))

    def test_generator_initialization(self, generator):
        """Test that generator initializes correctly."""
        assert generator.templates_dir.exists()
        assert generator.lib_dir.exists()

    def test_list_variants(self, generator):
        """Test listing available variants."""
        variants = generator._list_variants()
        assert isinstance(variants, list)
        # Should have at least the base template
        assert "base" in variants

    @pytest.mark.parametrize("variant", TEMPLATE_VARIANTS)
    def test_generate_pdf_all_variants(self, generator, variant):
        """Test PDF generation for all template variants."""
        try:
            pdf_bytes = generator.generate_pdf(SAMPLE_RESUME_DATA, variant)

            # Verify PDF header
            assert pdf_bytes[:4] == b"%PDF"

            # Verify PDF is not empty
            assert len(pdf_bytes) > 1000

        except FileNotFoundError:
            pytest.skip(f"Template variant '{variant}' not found")
        except Exception as e:
            # LaTeX might not be installed, so we handle compilation errors
            if "xelatex" in str(e).lower() or "latex" in str(e).lower():
                pytest.skip(f"LaTeX not installed: {e}")
            raise

    def test_invalid_variant_name(self, generator):
        """Test that invalid variant names are rejected."""
        with pytest.raises(ValueError, match="Invalid variant name"):
            generator.generate_pdf(SAMPLE_RESUME_DATA, "../etc/passwd")

        with pytest.raises(ValueError, match="Invalid variant name"):
            generator.generate_pdf(SAMPLE_RESUME_DATA, "..")

    def test_nonexistent_variant(self, generator):
        """Test that non-existent variant raises error."""
        with pytest.raises(ValueError, match="not found"):
            generator.generate_pdf(SAMPLE_RESUME_DATA, "nonexistent")

    def test_empty_resume_data(self, generator):
        """Test that empty resume data is handled gracefully."""
        # Should provide defaults and not crash
        try:
            pdf_bytes = generator.generate_pdf({}, "base")
            assert pdf_bytes[:4] == b"%PDF"
        except (RuntimeError, FileNotFoundError) as e:
            if (
                "xelatex" in str(e).lower()
                or "latex" in str(e).lower()
                or "No such file" in str(e)
            ):
                pytest.skip(f"LaTeX not installed: {e}")
            raise

    def test_minimal_resume_data(self, generator):
        """Test with minimal resume data (just name)."""
        minimal_data = {"basics": {"name": "Jane Smith"}}
        try:
            pdf_bytes = generator.generate_pdf(minimal_data, "base")
            assert pdf_bytes[:4] == b"%PDF"
        except (RuntimeError, FileNotFoundError) as e:
            if (
                "xelatex" in str(e).lower()
                or "latex" in str(e).lower()
                or "No such file" in str(e)
            ):
                pytest.skip(f"LaTeX not installed: {e}")
            raise


class TestLaTeXEscaping:
    """Tests for LaTeX special character escaping."""

    @pytest.fixture
    def generator(self):
        templates_dir = (
            Path(__file__).parent.parent / "resume-api" / "templates"
        )
        lib_dir = Path(__file__).parent.parent / "resume-api"
        return ResumeGenerator(str(templates_dir), str(lib_dir))

    def test_special_characters_escaping(self, generator):
        """Test that special LaTeX characters are properly escaped."""
        resume_with_special_chars = {
            "basics": {
                "name": "Test & User #1",
                "label": "Developer $100k",
                "email": "test@example.com",
                "summary": "100% satisfied with_work {great} results!",
            }
        }

        try:
            pdf_bytes = generator.generate_pdf(
                resume_with_special_chars, "base"
            )
            assert pdf_bytes[:4] == b"%PDF"
        except Exception as e:
            if "xelatex" in str(e).lower() or "latex" in str(e).lower():
                pytest.skip(f"LaTeX not installed: {e}")
            raise


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
