"""
PDF Generator for resumes using LaTeX templates.

This module handles the generation of professional PDF resumes
from JSON data using LaTeX templates and xelatex.
"""

import tempfile
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any
import logging

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

    def _validate_templates_dir(self):
        """Ensure the templates directory exists."""
        if not self.templates_dir.exists():
            raise FileNotFoundError(
                f"Templates directory not found: {self.templates_dir}"
            )
        logger.info(f"Templates directory: {self.templates_dir}")

    def generate_pdf(
        self,
        resume_data: Dict[str, Any],
        variant: str = "base"
    ) -> bytes:
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

            # Copy template to temp directory
            tex_file = temp_path / "resume.tex"
            shutil.copy2(template_file, tex_file)

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

    def _compile_latex(self, tex_file: Path):
        """
        Compile a LaTeX file to PDF using xelatex.

        Args:
            tex_file: Path to the .tex file

        Raises:
            subprocess.CalledProcessError: If compilation fails
        """
        output_dir = tex_file.parent

        # Run xelatex (run twice for references)
        for _ in range(2):
            result = subprocess.run(
                ["xelatex", "-interaction=nonstopmode", "-output-directory", str(output_dir), str(tex_file.name)],
                cwd=str(output_dir),
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode != 0:
                raise subprocess.CalledProcessError(
                    result.returncode,
                    result.args,
                    result.stdout,
                    result.stderr
                )

        logger.info(f"Successfully compiled {tex_file.name}")

    def _list_variants(self) -> list:
        """List available template variants."""
        variants = []
        for item in self.templates_dir.iterdir():
            if item.is_dir() and (item / "main.tex").exists():
                variants.append(item.name)
        return variants


# For testing purposes - create a simple mock PDF generator
class MockResumeGenerator:
    """
    Mock generator for testing when PDF generation is not fully implemented.
    Returns a placeholder PDF.
    """

    def __init__(self, templates_dir: str, lib_dir: str):
        self.templates_dir = templates_dir
        self.lib_dir = lib_dir

    def generate_pdf(
        self,
        resume_data: Dict[str, Any],
        variant: str = "base"
    ) -> bytes:
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
