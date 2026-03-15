"""
Data models for the Writing Assistant module.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal


@dataclass
class Suggestion:
    """Represents a writing suggestion."""

    id: str
    type: Literal["spelling", "grammar", "style", "enhancement"]
    severity: Literal["error", "warning", "info"]
    message: str
    offset: int
    length: int
    replacements: list[str]
    explanation: str
    rule_id: str
    confidence: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "message": self.message,
            "offset": self.offset,
            "length": self.length,
            "replacements": self.replacements,
            "explanation": self.explanation,
            "rule_id": self.rule_id,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }


@dataclass
class GrammarMatch:
    """Represents a grammar/rule match from LanguageTool."""

    message: str
    short_message: str
    rule_id: str
    rule_issue_type: str
    category: str
    offset: int
    length: int
    context: str
    context_offset: int
    sentence: str
    replacements: list[str]
    ignore_for_incomplete_sentence: bool

    def to_suggestion(self, suggestion_id: str) -> Suggestion:
        """Convert to Suggestion format."""
        # Map category to suggestion type and severity
        type_map = {
            "TYPOS": ("spelling", "error"),
            "GRAMMAR": ("grammar", "error"),
            "PUNCTUATION": ("grammar", "warning"),
            "STYLE": ("style", "info"),
            "UNCOMMON_PHRASING": ("style", "info"),
        }
        suggestion_type, severity = type_map.get(
            self.category, ("enhancement", "info")
        )

        return Suggestion(
            id=suggestion_id,
            type=suggestion_type,  # type: ignore
            severity=severity,  # type: ignore
            message=self.message,
            offset=self.offset,
            length=self.length,
            replacements=self.replacements,
            explanation=self.short_message or self.message,
            rule_id=self.rule_id,
        )


@dataclass
class StyleAnalysis:
    """Result of style analysis on text."""

    readability_score: float  # 0-100
    passive_voice_count: int
    weak_verb_count: int
    avg_sentence_length: float
    suggestions: list[Suggestion]
    metrics: dict[str, Any] = field(default_factory=dict)


@dataclass
class Enhancement:
    """Result of AI-powered enhancement."""

    original: str
    enhanced: str
    enhancement_type: str
    changes: list[dict[str, Any]]
    confidence: float
    explanation: str


@dataclass
class SuggestionRequest:
    """Request model for getting suggestions."""

    text: str
    context: dict[str, Any] = field(default_factory=dict)


@dataclass
class SuggestionResponse:
    """Response model for suggestions."""

    suggestions: list[Suggestion]
    processing_time_ms: float
    cache_hit: bool = False


@dataclass
class SuggestionHistory:
    """User's suggestion history."""

    user_id: str
    suggestions: list[dict[str, Any]]
    total_count: int
    accepted_count: int
    rejected_count: int
    acceptance_rate: float
