"""
Comprehensive tests for the ResumeGenerator class in lib/cli/generator.py

Tests cover:
- Initialization
- PDF generation
- Variant validation
- Resume data validation
- Error handling
- LaTeX escaping
- Path traversal prevention
"""

import unittest
import tempfile
import shutil
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, mock_open
from io import BytesIO

# Add resume-api to path
current_dir = os.path.dirname(os.path.abspath(__file__))
resume_api_dir = os.path.abspath(os.path.join(current_dir, ".."))
if resume_api_dir not in sys.path:
    sys.path.insert(0, resume_api_dir)

from lib.cli.generator import ResumeGenerator, _latex_escape, MockResumeGenerator


class TestLaTeXEscape(unittest.TestCase):
    """Tests for the _latex_escape function."""

    def test_latex_escape_ampersand(self):
        """Test escaping ampersand."""
        result = _latex_escape("A & B")
        self.assertEqual(str(result), r"A \& B")

    def test_latex_escape_percent(self):
        """Test escaping percent sign."""
        result = _latex_escape("100%")
        self.assertEqual(str(result), r"100\%")

    def test_latex_escape_dollar(self):
        """Test escaping dollar sign."""
        result = _latex_escape("$50")
        self.assertEqual(str(result), r"\$50")

    def test_latex_escape_hash(self):
        """Test escaping hash."""
        result = _latex_escape("#1")
        self.assertEqual(str(result), r"\#1")

    def test_latex_escape_underscore(self):
        """Test escaping underscore."""
        result = _latex_escape("var_name")
        self.assertEqual(str(result), r"var\_name")

    def test_latex_escape_braces(self):
        """Test escaping curly braces."""
        result = _latex_escape("{test}")
        self.assertEqual(str(result), r"\{test\}")

    def test_latex_escape_tilde(self):
        """Test escaping tilde."""
        result = _latex_escape("~")
        self.assertEqual(str(result), r"\textasciitilde{}")

    def test_latex_escape_caret(self):
        """Test escaping caret."""
        result = _latex_escape("^")
        self.assertEqual(str(result), r"\^{}")

    def test_latex_escape_angle_brackets(self):
        """Test escaping angle brackets."""
        result = _latex_escape("<html>")
        self.assertEqual(str(result), r"\textless{}html\textgreater{}")

    def test_latex_escape_backslash(self):
        """Test escaping backslash."""
        result = _latex_escape("\\")
        self.assertEqual(str(result), r"\textbackslash{}")

    def test_latex_escape_combined(self):
        """Test escaping combined special characters."""
        result = _latex_escape("Test & 100% $50 #var_name")
        self.assertEqual(str(result), r"Test \& 100\% \$50 \#var\_name")

    def test_latex_escape_none(self):
        """Test handling None input."""
        result = _latex_escape(None)
        self.assertEqual(str(result), "")

    def test_latex_escape_empty_string(self):
        """Test handling empty string."""
        result = _latex_escape("")
        self.assertEqual(str(result), "")

    def test_latex_escape_integer(self):
        """Test handling integer input."""
        result = _latex_escape(42)
        self.assertEqual(str(result), "42")

    def test_latex_escape_already_escaped(self):
        """Test handling already escaped content."""
        from markupsafe import Markup
        result = _latex_escape(Markup(r"Already \safe"))
        self.assertEqual(str(result), r"Already \safe")


class TestResumeGeneratorInitialization(unittest.TestCase):
    """Tests for ResumeGenerator initialization."""

    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.templates_dir = Path(self.test_dir) / "templates"
        self.templates_dir.mkdir()

    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.test_dir)

    def test_initialization_valid_directory(self):
        """Test initialization with valid templates directory."""
        generator = ResumeGenerator(
            templates_dir=str(self.templates_dir),
            lib_dir=str(self.test_dir)
        )
        self.assertEqual(generator.templates_dir, self.templates_dir)
        self.assertEqual(generator.lib_dir, Path(self.test_dir))

    def test_initialization_invalid_directory(self):
        """Test initialization with invalid directory."""
        with self.assertRaises(FileNotFoundError):
            ResumeGenerator(
                templates_dir="/nonexistent/path",
                lib_dir=str(self.test_dir)
            )

    def test_jinja_environment_setup(self):
        """Test that Jinja2 environment is properly configured."""
        generator = ResumeGenerator(
            templates_dir=str(self.templates_dir),
            lib_dir=str(self.test_dir)
        )
        self.assertIsNotNone(generator.jinja_env)
        # Verify custom delimiters are set
        self.assertEqual(generator.jinja_env.block_start_string, '\\BLOCK{')
        self.assertEqual(generator.jinja_env.variable_start_string, '\\VAR{')


class TestResumeGeneratorPDFGeneration(unittest.TestCase):
    """Tests for PDF generation functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.templates_dir = Path(self.test_dir) / "templates"
        self.templates_dir.mkdir()

        # Create a valid variant with template
        variant_dir = self.templates_dir / "base"
        variant_dir.mkdir()
        (variant_dir / "main.tex").write_text(
            r"\documentclass{article}"
            r"\begin{document}"
            r"\VAR{resume.basics.name}"
            r"\end{document}"
        )

        self.generator = ResumeGenerator(
            templates_dir=str(self.templates_dir),
            lib_dir=str(self.test_dir)
        )

    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.test_dir)

    def test_generate_pdf_basic(self):
        """Test basic PDF generation."""
        resume_data = {
            "basics": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "555-1234",
                "label": "Engineer"
            },
            "work": [],
            "education": [],
            "skills": []
        }

        # Mock the _compile_latex to avoid actually running xelatex
        with patch.object(self.generator, '_compile_latex', return_value=None):
            pdf_bytes = self.generator.generate_pdf(resume_data, "base")
            self.assertIsInstance(pdf_bytes, bytes)

    def test_generate_pdf_with_experience(self):
        """Test PDF generation with work experience."""
        resume_data = {
            "basics": {"name": "Jane Smith", "email": "jane@example.com"},
            "work": [
                {
                    "company": "Tech Corp",
                    "position": "Software Engineer",
                    "startDate": "2020-01",
                    "endDate": "2022-12",
                    "highlights": ["Built features"]
                }
            ],
            "education": [],
            "skills": []
        }

        with patch.object(self.generator, '_compile_latex', return_value=None):
            pdf_bytes = self.generator.generate_pdf(resume_data, "base")
            self.assertIsInstance(pdf_bytes, bytes)

    def test_generate_pdf_default_variant(self):
        """Test PDF generation with default variant."""
        resume_data = {
            "basics": {"name": "Test User"},
            "work": [],
            "education": [],
            "skills": []
        }

        with patch.object(self.generator, '_compile_latex', return_value=None):
            # Should use default "base" variant
            pdf_bytes = self.generator.generate_pdf(resume_data)
            self.assertIsInstance(pdf_bytes, bytes)

    def test_generate_pdf_invalid_variant(self):
        """Test PDF generation with invalid variant."""
        resume_data = {"basics": {"name": "Test"}}

        with self.assertRaises(ValueError) as cm:
            self.generator.generate_pdf(resume_data, "nonexistent")

        self.assertIn("not found", str(cm.exception).lower())

    def test_generate_pdf_path_traversal_attempt(self):
        """Test that path traversal is blocked."""
        resume_data = {"basics": {"name": "Test"}}

        with self.assertRaises(ValueError) as cm:
            self.generator.generate_pdf(resume_data, "../etc/passwd")

        self.assertIn("Invalid variant name", str(cm.exception))

    def test_generate_pdf_invalid_variant_chars(self):
        """Test that invalid characters in variant name are blocked."""
        resume_data = {"basics": {"name": "Test"}}

        with self.assertRaises(ValueError) as cm:
            self.generator.generate_pdf(resume_data, "base;rm -rf")

        self.assertIn("Invalid variant name", str(cm.exception))


class TestResumeDataValidation(unittest.TestCase):
    """Tests for resume data validation."""

    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.templates_dir = Path(self.test_dir) / "templates"
        self.templates_dir.mkdir()

        variant_dir = self.templates_dir / "base"
        variant_dir.mkdir()
        (variant_dir / "main.tex").write_text(r"\begin{document}\end{document}")

        self.generator = ResumeGenerator(
            templates_dir=str(self.templates_dir),
            lib_dir=str(self.test_dir)
        )

    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.test_dir)

    def test_validate_empty_resume_data(self):
        """Test validation with empty resume data."""
        resume_data = {}
        with patch.object(self.generator, '_compile_latex', return_value=None):
            pdf_bytes = self.generator.generate_pdf(resume_data, "base")
            # Should still work with defaults
            self.assertIsInstance(pdf_bytes, bytes)

    def test_validate_missing_but_provides_defaults(self):
        """Test that defaults are provided for missing fields."""
        resume_data = {"basics": {}}
        with patch.object(self.generator, '_compile_latex', return_value=None):
            pdf_bytes = self.generator.generate_pdf(resume_data, "base")
            self.assertIsInstance(pdf_bytes, bytes)

    def test_validate_with_all_sections(self):
        """Test validation with all resume sections."""
        resume_data = {
            "basics": {"name": "Test", "email": "test@test.com", "phone": "123"},
            "work": [{"company": "Corp", "position": "Dev"}],
            "education": [{"institution": "University"}],
            "skills": [{"name": "Python"}],
            "projects": [{"name": "Project"}],
            "awards": [{"title": "Award"}],
            "certificates": [{"name": "Cert"}],
            "publications": [{"name": "Pub"}]
        }
        with patch.object(self.generator, '_compile_latex', return_value=None):
            pdf_bytes = self.generator.generate_pdf(resume_data, "base")
            self.assertIsInstance(pdf_bytes, bytes)


class TestListVariants(unittest.TestCase):
    """Tests for listing variants."""

    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.templates_dir = Path(self.test_dir) / "templates"
        self.templates_dir.mkdir()

    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.test_dir)

    def test_list_variants_multiple(self):
        """Test listing multiple variants."""
        # Create variants
        for name in ["base", "professional", "creative"]:
            variant_dir = self.templates_dir / name
            variant_dir.mkdir()
            (variant_dir / "main.tex").write_text("Template")

        generator = ResumeGenerator(
            templates_dir=str(self.templates_dir),
            lib_dir=str(self.test_dir)
        )

        variants = generator._list_variants()
        self.assertEqual(len(variants), 3)
        self.assertIn("base", variants)

    def test_list_variants_empty(self):
        """Test listing with no variants."""
        generator = ResumeGenerator(
            templates_dir=str(self.templates_dir),
            lib_dir=str(self.test_dir)
        )

        variants = generator._list_variants()
        self.assertEqual(len(variants), 0)


class TestMockResumeGenerator(unittest.TestCase):
    """Tests for MockResumeGenerator."""

    def test_mock_generator_initialization(self):
        """Test mock generator initialization."""
        mock_gen = MockResumeGenerator("/fake/path", "/fake/lib")
        self.assertEqual(mock_gen.templates_dir, "/fake/path")

    def test_mock_generate_pdf(self):
        """Test mock PDF generation."""
        mock_gen = MockResumeGenerator("/fake/path", "/fake/lib")
        resume_data = {"basics": {"name": "Test"}}

        pdf_bytes = mock_gen.generate_pdf(resume_data, "base")
        self.assertIsInstance(pdf_bytes, bytes)
        # Verify it's a valid PDF header
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))


class TestGeneratorErrorHandling(unittest.TestCase):
    """Tests for error handling in generator."""

    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.templates_dir = Path(self.test_dir) / "templates"
        self.templates_dir.mkdir()

    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.test_dir)

    def test_compile_latex_error(self):
        """Test handling of LaTeX compilation error."""
        variant_dir = self.templates_dir / "base"
        variant_dir.mkdir()
        (variant_dir / "main.tex").write_text(r"\begin{document}\end{document}")

        generator = ResumeGenerator(
            templates_dir=str(self.templates_dir),
            lib_dir=str(self.test_dir)
        )

        resume_data = {"basics": {"name": "Test"}}

        # Mock _compile_latex to raise an error
        with patch.object(generator, '_compile_latex', side_effect=RuntimeError("LaTeX error")):
            with self.assertRaises(RuntimeError):
                generator.generate_pdf(resume_data, "base")


if __name__ == "__main__":
    unittest.main()
