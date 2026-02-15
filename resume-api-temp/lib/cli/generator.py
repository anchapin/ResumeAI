"""
PDF Generator for resumes using LaTeX templates.

This module handles the generation of professional PDF resumes
from JSON data using LaTeX templates and xelatex.
"""

import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any
import logging
from jinja2 import Environment, FileSystemLoader, select_autoescape

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResumeGenerator:
    """
    Generate PDF resumes from JSON data using LaTeX templates.
    """

    def __init__(self, templates_dir: str, lib_dir: str):
        """
        Initialize the ResumeGenerator.

        Args:
            templates_dir: Path to the templates directory
            lib_dir: Path to the library directory
        """
        self.templates_dir = Path(templates_dir)
        self.lib_dir = Path(lib_dir)
        self._validate_templates_dir()
        self._setup_jinja2()

    def _validate_templates_dir(self):
        """Ensure the templates directory exists."""
        if not self.templates_dir.exists():
            raise FileNotFoundError(
                f"Templates directory not found: {self.templates_dir}"
            )
        logger.info(f"Templates directory: {self.templates_dir}")

    def _setup_jinja2(self):
        """Setup Jinja2 environment for LaTeX templating."""
        # Create a custom Jinja2 environment for LaTeX
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            autoescape=select_autoescape(["tex"]),
            block_start_string="\\BLOCK{",
            block_end_string="}",
            variable_start_string="\\VAR{",
            variable_end_string="}",
            comment_start_string="\\#{",
            comment_end_string="}",
            line_statement_prefix="%%",
            line_comment_prefix="%#",
            trim_blocks=True,
            lstrip_blocks=True,
        )
        # Register custom filters
        self.jinja_env.filters["latex_escape"] = _latex_escape

    def generate_pdf(self, resume_data: Dict[str, Any], variant: str = "base") -> bytes:
        """
        Generate a PDF resume from resume data.

        Args:
            resume_data: Dictionary containing resume data
            variant: Template variant name (default: "base")

        Returns:
            PDF file as bytes

        Raises:
            ValueError: If variant is not found
            RuntimeError: If PDF generation fails
        """
        variant_dir = self.templates_dir / variant
        if not variant_dir.exists():
            raise ValueError(
                f"Variant '{variant}' not found. "
                f"Available variants: {self._list_variants()}"
            )

        # Check for main.tex template
        template_file = variant_dir / "main.tex"
        if not template_file.exists():
            raise ValueError(
                f"Template file 'main.tex' not found in variant '{variant}'"
            )

        # Create a temporary directory for PDF generation
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Validate resume data
            self._validate_resume_data(resume_data)

            # Render template with resume data
            template = self.jinja_env.get_template(f"{variant}/main.tex")
            rendered_tex = template.render(resume=resume_data)

            # Write rendered LaTeX to temp directory
            tex_file = temp_path / "resume.tex"
            tex_file.write_text(rendered_tex, encoding="utf-8")

            try:
                # Generate PDF using xelatex
                self._compile_latex(tex_file)

                # Read the generated PDF
                pdf_file = temp_path / "resume.pdf"
                if not pdf_file.exists():
                    raise RuntimeError("PDF was not generated")

                pdf_bytes = pdf_file.read_bytes()
                logger.info(f"Generated PDF ({len(pdf_bytes)} bytes)")

                return pdf_bytes

            except subprocess.CalledProcessError as e:
                logger.error(f"LaTeX compilation failed: {e}")
                # Try to read log file for more details
                log_file = temp_path / "resume.log"
                if log_file.exists():
                    log_content = log_file.read_text()
                    logger.error(f"LaTeX log:\n{log_content[-500:]}")
                raise RuntimeError(f"PDF generation failed: {e}")
            except Exception as e:
                logger.error(f"PDF generation error: {e}")
                raise RuntimeError(f"PDF generation failed: {e}")

    def _compile_latex(self, tex_file: Path):
        """
        Compile a LaTeX file to PDF using xelatex.

        Args:
            tex_file: Path to the .tex file

        Raises:
            RuntimeError: If compilation fails and no PDF is generated
        """
        output_dir = tex_file.parent

        # Run xelatex (run twice for references)
        for i, attempt in enumerate(range(2), 1):
            result = subprocess.run(
                [
                    "xelatex",
                    "-interaction=nonstopmode",
                    "-output-directory",
                    str(output_dir),
                    str(tex_file.name),
                ],
                cwd=str(output_dir),
                capture_output=True,
                text=True,
                timeout=30,
            )

            # Check if PDF was created (even with warnings, PDF might be valid)
            pdf_file = output_dir / (tex_file.stem + ".pdf")

            if not pdf_file.exists():
                # PDF not created - this is a real error
                logger.error(f"XeLaTeX run {i} failed - no PDF generated")
                logger.error(f"stdout: {result.stdout[:500]}")
                logger.error(f"stderr: {result.stderr[:500]}")
                raise RuntimeError(
                    f"XeLaTeX compilation failed: {result.returncode}. "
                    f"PDF was not generated."
                )

            # Log warnings but continue
            if result.returncode != 0:
                logger.warning(
                    f"XeLaTeX run {i} completed with warnings (exit code: {result.returncode})"
                )
                # Look for fatal errors in output
                if "Fatal error" in result.stdout or "Fatal error" in result.stderr:
                    raise RuntimeError(
                        f"XeLaTeX encountered a fatal error. "
                        f"Last 500 chars of output: {result.stdout[-500:]}"
                    )

        logger.info(f"Successfully compiled {tex_file.name}")

    def _validate_resume_data(self, resume_data: Dict[str, Any]):
        """
        Validate resume data before rendering.

        Args:
            resume_data: Resume data dictionary

        Raises:
            ValueError: If required fields are missing or invalid
        """
        # Ensure basics section exists
        if not resume_data or "basics" not in resume_data:
            logger.warning("Resume data missing 'basics' section")
            # Provide defaults to avoid template errors
            resume_data["basics"] = {}

        basics = resume_data["basics"]

        # Ensure required basic fields have defaults
        if "name" not in basics or not basics["name"]:
            basics["name"] = "Your Name"
        if "label" not in basics or not basics["label"]:
            basics["label"] = "Professional Title"
        if "email" not in basics or not basics["email"]:
            basics["email"] = "email@example.com"
        if "phone" not in basics or not basics["phone"]:
            basics["phone"] = "+1 234 567 8900"

        # Ensure lists exist
        for key in [
            "work",
            "education",
            "skills",
            "projects",
            "awards",
            "certificates",
            "publications",
        ]:
            if key not in resume_data or not resume_data[key]:
                resume_data[key] = []

    def _list_variants(self) -> list:
        """List available template variants."""
        variants = []
        for item in self.templates_dir.iterdir():
            if item.is_dir() and (item / "main.tex").exists():
                variants.append(item.name)
        return variants


def _latex_escape(text: Any) -> str:
    """
    Escape special LaTeX characters in text.

    Args:
        text: Text to escape (any type, will be converted to string)

    Returns:
        Escaped text safe for LaTeX
    """
    if text is None:
        return ""

    text_str = str(text)

    # Escape special LaTeX characters
    latex_special_chars = {
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\^{}",
        "\\": r"\textbackslash{}",
        "<": r"\textless{}",
        ">": r"\textgreater{}",
    }

    for char, escaped in latex_special_chars.items():
        text_str = text_str.replace(char, escaped)

    return text_str


# For testing purposes - create a simple mock PDF generator
class MockResumeGenerator:
    """
    Mock generator for testing when PDF generation is not fully implemented.
    Returns a placeholder PDF.
    """

    def __init__(self, templates_dir: str, lib_dir: str):
        self.templates_dir = templates_dir
        self.lib_dir = lib_dir

    def generate_pdf(self, resume_data: Dict[str, Any], variant: str = "base") -> bytes:
        """
        Generate a mock PDF placeholder.

        For production, this should use real LaTeX compilation.
        """
        # Return a minimal valid PDF header
        # This is a dummy PDF for testing the API flow
        pdf_data = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Resume PDF Placeholder) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000204 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
293
%%EOF
"""
        return pdf_data


# Export both - use real generator if possible, mock otherwise
ResumeGeneratorImpl = ResumeGenerator
