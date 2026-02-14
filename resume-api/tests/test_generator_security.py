
import unittest
import tempfile
import shutil
from pathlib import Path
from markupsafe import Markup
from jinja2 import Environment

# Import the code to test (assuming the module path is correct)
# Since we are in resume-api/tests, we might need to adjust sys.path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from lib.cli.generator import ResumeGenerator, _latex_escape

class TestGeneratorSecurity(unittest.TestCase):
    def test_latex_escape_correctness(self):
        """Test that _latex_escape produces correct LaTeX output for special characters."""
        cases = [
            ("~", r"\textasciitilde{}"),
            ("^", r"\^{}"),
            ("&", r"\&"),
            ("%", r"\%"),
            ("$", r"\$"),
            ("#", r"\#"),
            ("_", r"\_"),
            ("{", r"\{"),
            ("}", r"\}"),
            ("\\", r"\textbackslash{}"),
            ("<", r"\textless{}"),
            (">", r"\textgreater{}"),
            # Combinations
            ("A & B", r"A \& B"),
            (r"\input{x}", r"\textbackslash{}input\{x\}"),
            ("~^", r"\textasciitilde{}\^{}"),
        ]

        for inp, expected in cases:
            with self.subTest(inp=inp):
                # We expect Markup object, so compare string representation
                result = _latex_escape(inp)
                self.assertIsInstance(result, Markup)
                self.assertEqual(str(result), expected)

    def test_latex_escape_idempotence(self):
        """Test that _latex_escape returns Markup as-is."""
        inp = Markup(r"Already \safe")
        result = _latex_escape(inp)
        self.assertEqual(result, inp)
        self.assertIs(result, inp)

    def test_jinja_integration(self):
        """Test that ResumeGenerator's Jinja environment correctly escapes variables."""
        # Create a temporary template directory
        with tempfile.TemporaryDirectory() as temp_dir:
            templates_dir = Path(temp_dir)

            # Create a dummy generator (we only care about jinja_env)
            # We need lib_dir too, just pass dummy
            generator = ResumeGenerator(templates_dir=str(templates_dir), lib_dir=".")

            # 1. Test filtered variable (backward compatibility)
            # Create a template that uses |latex_escape
            tmpl_filtered = generator.jinja_env.from_string(r"\VAR{data|latex_escape}")
            data = "A & B"
            res = tmpl_filtered.render(data=data)
            # Should be "A \& B", NOT "A \&amp; B" (double escape) or "A \textbackslash{}& B"
            self.assertEqual(res, r"A \& B")

            # 2. Test unfiltered variable (autoescape via finalize)
            tmpl_unfiltered = generator.jinja_env.from_string(r"\VAR{data}")
            data = r"\input{/etc/passwd}"
            res = tmpl_unfiltered.render(data=data)
            # Should be escaped!
            expected = r"\textbackslash{}input\{/etc/passwd\}"
            self.assertEqual(res, expected)

            # 3. Test list join
            tmpl_list = generator.jinja_env.from_string(r"\VAR{items|join(', ')}")
            items = ["foo", "bar & baz"]
            res = tmpl_list.render(items=items)
            # "foo, bar \& baz"
            self.assertEqual(res, r"foo, bar \& baz")

if __name__ == "__main__":
    unittest.main()
