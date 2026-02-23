import unittest
from markupsafe import Markup
from lib.cli.generator import _latex_escape


class TestLatexEscape(unittest.TestCase):
    def test_none(self):
        self.assertEqual(_latex_escape(None), Markup(""))

    def test_empty_string(self):
        self.assertEqual(_latex_escape(""), Markup(""))

    def test_normal_string(self):
        text = "Hello World"
        self.assertEqual(_latex_escape(text), Markup(text))

    def test_markup_object(self):
        text = Markup(r"\textbf{Hello}")
        self.assertEqual(_latex_escape(text), text)

    def test_special_characters(self):
        cases = {
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
        for char, expected in cases.items():
            self.assertEqual(_latex_escape(char), Markup(expected))

    def test_mixed_string(self):
        text = "Foo & Bar 100%"
        expected = r"Foo \& Bar 100\%"
        self.assertEqual(_latex_escape(text), Markup(expected))

    def test_complex_string(self):
        text = (
            r"Combined & Complex % String # With _ Special " r"{ Characters } ~ ^ \ < >"
        )
        expected = (
            r"Combined \& Complex \% String \# With \_ Special "
            r"\{ Characters \} \textasciitilde{} \^{} \textbackslash{} "
            r"\textless{} \textgreater{}"
        )
        self.assertEqual(_latex_escape(text), Markup(expected))

    def test_integers(self):
        self.assertEqual(_latex_escape(123), Markup("123"))


if __name__ == "__main__":
    unittest.main()
