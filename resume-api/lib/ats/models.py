"""ATS Analysis Models"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class IssueSeverity(str, Enum):
    """Severity levels for ATS issues"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class IssueType(str, Enum):
    """Types of ATS compatibility issues"""
    IMAGES = "images"
    TABLES = "tables"
    TEXT_IN_HEADER_FOOTER = "text_in_header_footer"
    SPECIAL_CHARACTERS = "special_characters"
    COMPLEX_FORMATTING = "complex_formatting"
    CUSTOM_COLUMNS = "custom_columns"
    TWO_COLUMN_LAYOUT = "two_column_layout"
    FOOTNOTES = "footnotes"
    TEXTBOXES = "textboxes"
    UNSUPPORTED_FONTS = "unsupported_fonts"


@dataclass
class ATSIssue:
    """Represents a single ATS compatibility issue"""
    issue_type: IssueType
    severity: IssueSeverity
    element: str
    description: str
    page: Optional[int] = None
    fix: str = ""
    
    def to_dict(self) -> dict:
        return {
            "type": self.issue_type.value,
            "severity": self.severity.value,
            "element": self.element,
            "description": self.description,
            "page": self.page,
            "fix": self.fix
        }


@dataclass
class ATSCheckResult:
    """Result of ATS compatibility check"""
    file_type: str
    ats_score: int
    is_parseable: bool
    word_count: int
    issues: list[ATSIssue] = field(default_factory=list)
    parsed_text: str = ""
    calculation_time_ms: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "file_type": self.file_type,
            "ats_score": self.ats_score,
            "is_parseable": self.is_parseable,
            "word_count": self.word_count,
            "issues": [issue.to_dict() for issue in self.issues],
            "parsed_text": self.parsed_text,
            "calculation_time_ms": self.calculation_time_ms
        }
