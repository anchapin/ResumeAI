"""
Context Analyzer Service

Analyzes text context for intelligent completions.
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


# Section type patterns
SECTION_PATTERNS = {
    "experience": [
        r"(?i)experience",
        r"(?i)work history",
        r"(?i)employment",
        r"(?i)\d{4}\s*-\s*(\d{4}|Present)",
    ],
    "education": [
        r"(?i)education",
        r"(?i)degree",
        r"(?i)university",
        r"(?i)college",
        r"(?i)(Bachelor|Master|PhD|MBA)",
    ],
    "skills": [
        r"(?i)skills",
        r"(?i)technologies",
        r"(?i)programming",
        r"(?i)languages:",
    ],
    "projects": [
        r"(?i)projects",
        r"(?i)portfolio",
        r"(?i)personal projects",
    ],
    "summary": [
        r"(?i)summary",
        r"(?i)objective",
        r"(?i)about",
        r"(?i)profile",
    ],
}

# Role patterns
ROLE_PATTERNS = [
    r"(?i)(Software|Senior|Lead|Principal)\s*(Engineer|Developer|Architect)",
    r"(?i)(Product|Project)\s*Manager",
    r"(?i)(Data)\s*(Scientist|Analyst|Engineer)",
    r"(?i)(Frontend|Backend|Full[- ]?Stack)\s*(Engineer|Developer)",
]

# Seniority indicators
SENIORITY_PATTERNS = {
    "entry": [r"(?i)junior", r"(?i)entry[- ]?level", r"(?i)associate", r"(?i)\d{0,2}\s*years?"],
    "mid": [r"(?i)mid[- ]?level", r"(?i)\d{2,5}\s*years?"],
    "senior": [r"(?i)senior", r"(?i)\d{5,8}\s*years?"],
    "lead": [r"(?i)lead", r"(?i)tech lead", r"(?i)technical lead"],
    "principal": [r"(?i)principal", r"(?i)staff"],
    "executive": [r"(?i)(cto|vp|director|head of)"],
}


class ContextAnalyzer:
    """
    Analyze text context for intelligent completions.

    Detects:
    - Section type (experience, education, skills, etc.)
    - Writing style (formal, casual, technical)
    - Role/seniority from context
    - Current bullet structure

    Example:
        analyzer = ContextAnalyzer()
        context = analyzer.analyze(text, cursor_pos)
    """

    def __init__(self, nlp_model=None):
        """
        Initialize ContextAnalyzer.

        Args:
            nlp_model: Optional NLP model for advanced analysis
        """
        self.nlp_model = nlp_model

    def analyze(self, text: str, cursor_pos: int) -> dict[str, Any]:
        """
        Analyze text context.

        Args:
            text: Full text
            cursor_pos: Cursor position

        Returns:
            Context information dict
        """
        lines = text.split("\n")
        current_line, line_index = self._get_current_line(lines, cursor_pos)
        previous_lines = lines[:line_index]

        return {
            "section_type": self.get_section_type(text),
            "cursor_position": cursor_pos,
            "current_line": current_line,
            "previous_lines": previous_lines[-5:],  # Last 5 lines
            "writing_style": self.get_writing_style(text),
            "detected_role": self.detect_role(text),
            "seniority_level": self.detect_seniority(text),
            "bullet_structure": self.analyze_bullet_structure(current_line),
        }

    def get_section_type(self, text: str) -> str:
        """Detect section type from text."""
        text_lower = text.lower()

        # Check for section headers
        for section_type, patterns in SECTION_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return section_type

        # Default to experience
        return "experience"

    def get_writing_style(self, text: str) -> dict[str, Any]:
        """Analyze writing style."""
        lines = [l.strip() for l in text.split("\n") if l.strip()]

        if not lines:
            return {"formality": "neutral", "tone": "professional"}

        # Analyze formality
        formal_indicators = sum(
            1
            for line in lines
            if line[0].isupper() and line[-1] in ".!?"
        )
        formality_ratio = formal_indicators / len(lines) if lines else 0

        formality = (
            "formal"
            if formality_ratio > 0.8
            else "casual"
            if formality_ratio < 0.3
            else "neutral"
        )

        # Analyze tone
        action_verbs = sum(
            1
            for line in lines
            if line and line[0].isupper() and len(line.split()) > 3
        )
        tone = "achievement" if action_verbs > len(lines) * 0.5 else "descriptive"

        return {
            "formality": formality,
            "tone": tone,
            "avg_line_length": sum(len(l) for l in lines) / len(lines) if lines else 0,
        }

    def detect_role(self, text: str) -> str | None:
        """Detect role/title from text."""
        for pattern in ROLE_PATTERNS:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        return None

    def detect_seniority(self, text: str) -> str | None:
        """Detect seniority level from text."""
        text_lower = text.lower()

        for seniority, patterns in SENIORITY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return seniority

        return None

    def analyze_bullet_structure(self, line: str) -> dict[str, Any]:
        """Analyze current bullet structure."""
        line = line.strip()

        # Check if it's a bullet
        is_bullet = bool(re.match(r"^[-•*]\s*", line))

        # Check if starts with action verb (capital letter)
        starts_with_verb = bool(re.match(r"^[A-Z][a-z]+ed\s+", line)) or bool(
            re.match(r"^[A-Z][a-z]+ing\s+", line)
        )

        # Check for quantification
        has_numbers = bool(re.search(r"\d+%", line)) or bool(
            re.search(r"\$\d+", line)
        )

        return {
            "is_bullet": is_bullet,
            "starts_with_verb": starts_with_verb,
            "has_numbers": has_numbers,
            "length": len(line),
            "incomplete": not line.endswith(".") and len(line) > 10,
        }

    def _get_current_line(
        self, lines: list[str], cursor_pos: int
    ) -> tuple[str, int]:
        """Get current line and line index from cursor position."""
        pos = 0
        for i, line in enumerate(lines):
            line_end = pos + len(line)
            if pos <= cursor_pos <= line_end + 1:  # +1 for newline
                return line, i
            pos = line_end + 1

        # Cursor at end
        return lines[-1] if lines else "", len(lines) - 1

    def get_relevant_context(
        self,
        text: str,
        cursor_pos: int,
        context_lines: int = 3,
    ) -> dict[str, Any]:
        """
        Get relevant context for completions.

        Args:
            text: Full text
            cursor_pos: Cursor position
            context_lines: Number of lines to include

        Returns:
            Relevant context dict
        """
        lines = text.split("\n")
        current_line, line_index = self._get_current_line(lines, cursor_pos)

        # Get surrounding lines
        start = max(0, line_index - context_lines)
        end = min(len(lines), line_index + context_lines + 1)

        return {
            "current_line": current_line,
            "previous_lines": lines[start:line_index],
            "next_lines": lines[line_index + 1 : end],
            "section_type": self.get_section_type(text),
            "writing_style": self.get_writing_style(text),
        }
