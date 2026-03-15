"""
Data models for Skills module.
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class Skill:
    """Represents a skill."""

    name: str
    category: str  # technical, soft, tools, domain
    synonyms: list[str] = field(default_factory=list)
    parent: str | None = None  # Parent skill (for hierarchy)
    children: list[str] = field(default_factory=list)  # Child skills
    metadata: dict = field(default_factory=dict)


@dataclass
class ExtractedSkill:
    """A skill extracted from text."""

    name: str
    original_text: str  # How it appeared in text
    category: str
    confidence: float  # 0-1
    start_offset: int
    end_offset: int
    synonyms: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class SkillMatch:
    """A matched skill between JD and resume."""

    skill: str
    category: str
    match_type: Literal["exact", "semantic", "synonym"]
    confidence: float
    jd_context: str  # How it appeared in JD
    resume_context: str  # How it appeared in resume


@dataclass
class MissingSkill:
    """A skill in JD but not in resume."""

    name: str
    category: str
    priority: Literal["critical", "preferred", "nice_to_have"]
    frequency: int  # How often mentioned in JD
    suggestions: list[str] = field(default_factory=list)  # Where to add


@dataclass
class PartialMatch:
    """A partially matched skill (related but not exact)."""

    jd_skill: str
    resume_skill: str
    similarity: float  # 0-1
    relationship: str  # e.g., "related", "subset", "superset"


@dataclass
class SkillsExtractResult:
    """Result of skills extraction."""

    skills: list[ExtractedSkill]
    by_category: dict[str, list[ExtractedSkill]]
    total_count: int
    processing_time_ms: float


@dataclass
class SkillsMatchResult:
    """Result of skills matching."""

    matched_skills: list[SkillMatch]
    missing_skills: list[MissingSkill]
    partial_matches: list[PartialMatch]
    coverage_score: float  # 0-100
    jd_skills_count: int
    resume_skills_count: int


@dataclass
class SkillsGapResult:
    """Result of skills gap analysis."""

    gap_score: float  # 0-100 (higher = better match)
    matched_skills: list[SkillMatch]
    missing_critical: list[MissingSkill]
    missing_preferred: list[MissingSkill]
    recommendations: list[dict]
    category_breakdown: dict[str, dict]  # category -> {matched, missing, coverage}
