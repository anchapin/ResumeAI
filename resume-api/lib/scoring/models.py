"""
Data models for Scoring module.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal


@dataclass
class CategoryScore:
    """Score for a single category."""

    name: str
    score: float  # 0-100
    weight: float  # Category weight in overall score
    metrics: dict = field(default_factory=dict)
    feedback: str = ""


@dataclass
class ResumeScore:
    """Overall resume score with breakdown."""

    overall: float  # 0-100
    grade: Literal["A", "B", "C", "D", "F"]
    categories: dict[str, CategoryScore]
    percentile: float | None = None
    role: str | None = None
    industry: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Recommendation:
    """Actionable recommendation for improvement."""

    id: str
    category: str
    priority: Literal["high", "medium", "low"]
    title: str
    description: str
    action: str  # Specific action to take
    impact: str  # Expected impact on score
    effort: Literal["low", "medium", "high"]
    metadata: dict = field(default_factory=dict)


@dataclass
class ScoreHistory:
    """Score tracking over time."""

    resume_id: str
    score: float
    grade: str
    created_at: datetime
    changes: dict = field(default_factory=dict)


@dataclass
class IndustryBenchmark:
    """Industry benchmark data."""

    role: str
    industry: str
    experience_level: str
    avg_score: float
    percentile_25: float
    percentile_50: float
    percentile_75: float
    percentile_90: float
    sample_size: int = 0


@dataclass
class ScoreRequest:
    """Request for resume scoring."""

    resume_data: dict
    role: str | None = None
    industry: str | None = None
    jd_skills: list | None = None


@dataclass
class ScoreResponse:
    """Response with resume score."""

    score: ResumeScore
    processing_time_ms: float
    recommendations: list[Recommendation] = field(default_factory=list)


@dataclass
class TrackScoreRequest:
    """Request to track score over time."""

    resume_id: str
    user_id: str
    score: float
    grade: str
    categories: dict = field(default_factory=dict)
