"""
Industry Benchmark Service

Provides industry benchmarks for resume score comparison.
"""

import logging
from typing import Any

from .models import IndustryBenchmark, ResumeScore

logger = logging.getLogger(__name__)


# Benchmark data (would come from database in production)
BENCHMARK_DATA = {
    "software_engineer": {
        "entry": {
            "avg_score": 65,
            "percentile_25": 55,
            "percentile_50": 65,
            "percentile_75": 75,
            "percentile_90": 85,
        },
        "mid": {
            "avg_score": 72,
            "percentile_25": 65,
            "percentile_50": 72,
            "percentile_75": 80,
            "percentile_90": 88,
        },
        "senior": {
            "avg_score": 78,
            "percentile_25": 70,
            "percentile_50": 78,
            "percentile_75": 85,
            "percentile_90": 92,
        },
    },
    "data_scientist": {
        "entry": {
            "avg_score": 68,
            "percentile_25": 58,
            "percentile_50": 68,
            "percentile_75": 78,
            "percentile_90": 87,
        },
        "mid": {
            "avg_score": 75,
            "percentile_25": 68,
            "percentile_50": 75,
            "percentile_75": 82,
            "percentile_90": 90,
        },
        "senior": {
            "avg_score": 80,
            "percentile_25": 72,
            "percentile_50": 80,
            "percentile_75": 87,
            "percentile_90": 93,
        },
    },
    "product_manager": {
        "entry": {
            "avg_score": 63,
            "percentile_25": 53,
            "percentile_50": 63,
            "percentile_75": 73,
            "percentile_90": 83,
        },
        "mid": {
            "avg_score": 70,
            "percentile_25": 62,
            "percentile_50": 70,
            "percentile_75": 78,
            "percentile_90": 86,
        },
        "senior": {
            "avg_score": 76,
            "percentile_25": 68,
            "percentile_50": 76,
            "percentile_75": 84,
            "percentile_90": 91,
        },
    },
}


class IndustryBenchmarkService:
    """
    Industry benchmark service.

    Provides benchmarks for comparing resume scores.

    Example:
        service = IndustryBenchmarkService()
        benchmark = service.get_benchmarks("software_engineer", "senior")
    """

    def __init__(self, db_session=None):
        """
        Initialize IndustryBenchmarkService.

        Args:
            db_session: Optional database session
        """
        self.db = db_session

    def get_benchmarks(
        self,
        role: str,
        industry: str | None = None,
        experience_level: str | None = None,
    ) -> IndustryBenchmark | None:
        """
        Get benchmarks for role/industry.

        Args:
            role: Target role
            industry: Target industry
            experience_level: Experience level (entry, mid, senior)

        Returns:
            IndustryBenchmark or None
        """
        # Normalize role
        role_key = self._normalize_role(role)

        # Get experience level
        level = experience_level or self._infer_experience_level(role)

        # Get benchmark data
        role_data = BENCHMARK_DATA.get(role_key, {})
        level_data = role_data.get(level, {})

        if not level_data:
            # Fallback to mid-level
            level_data = role_data.get("mid", {})

        if not level_data:
            return None

        return IndustryBenchmark(
            role=role_key,
            industry=industry or "technology",
            experience_level=level,
            avg_score=level_data.get("avg_score", 70),
            percentile_25=level_data.get("percentile_25", 55),
            percentile_50=level_data.get("percentile_50", 65),
            percentile_75=level_data.get("percentile_75", 75),
            percentile_90=level_data.get("percentile_90", 85),
            sample_size=1000,  # Would be real data
        )

    def compare_to_benchmark(
        self,
        score: ResumeScore,
        benchmark: IndustryBenchmark,
    ) -> dict[str, Any]:
        """
        Compare resume score to benchmark.

        Args:
            score: Resume score
            benchmark: Industry benchmark

        Returns:
            Comparison dict
        """
        percentile = self._calculate_percentile(score.overall, benchmark)

        return {
            "score": score.overall,
            "benchmark_avg": benchmark.avg_score,
            "difference": score.overall - benchmark.avg_score,
            "percentile": percentile,
            "above_average": score.overall > benchmark.avg_score,
            "thresholds": {
                "25th": benchmark.percentile_25,
                "50th": benchmark.percentile_50,
                "75th": benchmark.percentile_75,
                "90th": benchmark.percentile_90,
            },
        }

    def get_percentile(self, score: float, role: str, level: str) -> float:
        """
        Get percentile for a score.

        Args:
            score: Resume score
            role: Target role
            level: Experience level

        Returns:
            Percentile (0-100)
        """
        benchmark = self.get_benchmarks(role, experience_level=level)
        if not benchmark:
            return 50.0  # Default

        return self._calculate_percentile(score, benchmark)

    def _normalize_role(self, role: str) -> str:
        """Normalize role name."""
        role_lower = role.lower()

        if any(term in role_lower for term in ["software", "engineer", "developer"]):
            return "software_engineer"
        elif any(term in role_lower for term in ["data", "scientist", "analyst"]):
            return "data_scientist"
        elif any(term in role_lower for term in ["product", "manager"]):
            return "product_manager"
        else:
            return "software_engineer"  # Default

    def _infer_experience_level(self, role: str) -> str:
        """Infer experience level from role title."""
        role_lower = role.lower()

        if any(term in role_lower for term in ["junior", "entry", "associate"]):
            return "entry"
        elif any(term in role_lower for term in ["senior", "lead"]):
            return "senior"
        else:
            return "mid"

    def _calculate_percentile(
        self,
        score: float,
        benchmark: IndustryBenchmark,
    ) -> float:
        """Calculate percentile for score."""
        if score >= benchmark.percentile_90:
            return 90.0
        elif score >= benchmark.percentile_75:
            return 75.0 + (score - benchmark.percentile_75) / (benchmark.percentile_90 - benchmark.percentile_75) * 15
        elif score >= benchmark.percentile_50:
            return 50.0 + (score - benchmark.percentile_50) / (benchmark.percentile_75 - benchmark.percentile_50) * 25
        elif score >= benchmark.percentile_25:
            return 25.0 + (score - benchmark.percentile_25) / (benchmark.percentile_50 - benchmark.percentile_25) * 25
        else:
            return max(0, score / benchmark.percentile_25 * 25)

    def get_category_benchmarks(
        self,
        role: str,
        category: str,
    ) -> dict[str, float]:
        """
        Get benchmarks for specific category.

        Args:
            role: Target role
            category: Score category

        Returns:
            Category benchmarks dict
        """
        # Category-specific benchmarks (would be more detailed in production)
        base = self.get_benchmarks(role)
        if not base:
            return {"avg": 70, "good": 80, "excellent": 90}

        # Adjust based on category importance for role
        category_weights = {
            "software_engineer": {
                "skills_coverage": 1.2,
                "content_quality": 1.0,
                "experience_relevance": 1.0,
                "formatting": 0.8,
            },
            "data_scientist": {
                "skills_coverage": 1.3,
                "content_quality": 1.0,
                "experience_relevance": 0.9,
                "formatting": 0.8,
            },
            "product_manager": {
                "skills_coverage": 1.0,
                "content_quality": 1.2,
                "experience_relevance": 1.1,
                "formatting": 0.9,
            },
        }

        role_key = self._normalize_role(role)
        weights = category_weights.get(role_key, {})
        weight = weights.get(category, 1.0)

        return {
            "avg": base.avg_score * weight,
            "good": 80 * weight,
            "excellent": 90 * weight,
        }
