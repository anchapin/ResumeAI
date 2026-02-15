
import unittest
import tempfile
import shutil
import os
import sys
from pathlib import Path

# Add resume-api directory to sys.path to resolve 'lib'
current_dir = os.path.dirname(os.path.abspath(__file__))
resume_api_dir = os.path.abspath(os.path.join(current_dir, ".."))
if resume_api_dir not in sys.path:
    sys.path.insert(0, resume_api_dir)

try:
    from lib.cli.generator import ResumeGenerator
except ImportError:
    # If run from root, maybe we need to be careful
    print(f"Failed to import lib.cli.generator. sys.path: {sys.path}")
    raise

RESUME_DATA = {
    "basics": {
        "name": "Test User",
        "email": "test@example.com"
    }
}

class TestPathTraversal(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory structure
        self.test_dir = tempfile.mkdtemp()
        self.templates_dir = Path(self.test_dir) / "templates"
        self.templates_dir.mkdir()

        # Create a valid variant
        variant_dir = self.templates_dir / "base"
        variant_dir.mkdir()
        (variant_dir / "main.tex").write_text("Valid Template")

        # Create a 'secret' file outside templates
        self.secret_dir = Path(self.test_dir) / "secret"
        self.secret_dir.mkdir()
        (self.secret_dir / "main.tex").write_text("Secret Template")

        self.generator = ResumeGenerator(str(self.templates_dir), str(self.test_dir))

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_path_traversal_blocked(self):
        # Mock _compile_latex to prevent running xelatex
        self.generator._compile_latex = lambda x: None

        # Try to access the secret template using traversal
        traversal_variant = "../secret"

        # We expect ValueError("Invalid variant name...")
        # But BEFORE our fix, it raises RuntimeError("PDF not generated") or TemplateNotFound
        # So until we fix it, this test will FAIL (either with wrong error or no error if traversal worked)

        # This test is designed to PASS only after the fix.
        with self.assertRaises(ValueError) as cm:
            self.generator.generate_pdf(RESUME_DATA, traversal_variant)

        # Assert the error message indicates validation failure
        self.assertIn("Invalid variant name", str(cm.exception))

if __name__ == "__main__":
    unittest.main()
