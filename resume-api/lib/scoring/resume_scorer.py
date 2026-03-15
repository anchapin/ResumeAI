"""
Resume Scorer Service

Main scoring engine that combines category scores into overall resume score.
"""

import logging
import time
from typing import Any

from .models import ResumeScore, CategoryScore, ScoreRequest, ScoreResponse, Recommendation
from .category_scorers import ContentQualityScorer, SkillsCoverageScorer, ExperienceScorer, FormattingScorer
from .recommender import RecommendationEngine

logger = logging.getLogger(__name__)


# Category weights
CATEGORY_WEIGHTS = {
    "content_quality": 0.35,
    "skills_coverage": 0.30,
    "experience_relevance": 0.20,
    "formatting": 0.15,
}


class ResumeScorer:
    """
    Main resume scoring engine.

    Combines multiple category scorers into overall resume score.

    Example:
        scorer = ResumeScorer()
        score = await scorer.score_resume(resume_data, role="Engineer")
    """

    def __init__(
        self,
        content_scorer: ContentQualityScorer | None = None,
        skills_scorer: SkillsCoverageScorer | None = None,
        experience_scorer: ExperienceScorer | None = None,
        formatting_scorer: FormattingScorer | None = None,
        recommender: RecommendationEngine | None = None,
    ):
        """
        Initialize ResumeScorer.

        Args:
            content_scorer: Content quality scorer
            skills_scorer: Skills coverage scorer
            experience_scorer: Experience scorer
            formatting_scorer: Formatting scorer
            recommender: Recommendation engine
        """
        self.content_scorer = content_scorer or ContentQualityScorer()
        self.skills_scorer = skills_scorer or SkillsCoverageScorer()
        self.experience_scorer = experience_scorer or ExperienceScorer()
        self.formatting_scorer = formatting_scorer or FormattingScorer()
        self.recommender = recommender or RecommendationEngine()

    async def score_resume(
        self,
        resume_data: dict,
        role: str | None = None,
        industry: str | None = None,
        jd_skills: list | None = None,
    ) -> ScoreResponse:
        """
        Score a resume.

        Args:
            resume_data: Resume data dict
            role: Target role
            industry: Target industry
            jd_skills: Skills from job description

        Returns:
            ScoreResponse with overall score and breakdown
        """
        start_time = time.time()

        # Score each category
        categories = {}

        # Content Quality (35%)
        content_score = await self.content_scorer.score(resume_data)
        categories["content_quality"] = content_score

        # Skills Coverage (30%)
        skills_score = await self.skills_scorer.score(resume_data, jd_skills)
        categories["skills_coverage"] = skills_score

        # Experience Relevance (20%)
        experience_score = await self.experience_scorer.score(resume_data, role)
        categories["experience_relevance"] = experience_score

        # Formatting (15%)
        formatting_score = await self.formatting_scorer.score(resume_data)
        categories["formatting"] = formatting_score

        # Calculate overall score (weighted average)
        overall = sum(
            score.score * CATEGORY_WEIGHTS[category]
            for category, score in categories.items()
        )

        # Convert to letter grade
        grade = self._score_to_grade(overall)

        # Create ResumeScore
        resume_score = ResumeScore(
            overall=round(overall, 2),
            grade=grade,
            categories=categories,
            role=role,
            industry=industry,
        )

        # Generate recommendations
        recommendations = self.recommender.generate_recommendations(
            resume_score, role
        )

        processing_time = (time.time() - start_time) * 1000

        return ScoreResponse(
            score=resume_score,
            processing_time_ms=round(processing_time, 2),
            recommendations=recommendations,
        )

    def _score_to_grade(self, score: float) -> Literal["A", "B", "C", "D", "F"]:
        """Convert numeric score to letter grade."""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"

    def get_score_breakdown(self, resume_score: ResumeScore) -> dict[str, Any]:
        """
        Get detailed score breakdown.

        Args:
            resume_score: Resume score object

        Returns:
            Breakdown dict with details
        """
        return {
            "overall": resume_score.overall,
            "grade": resume_score.grade,
            "categories": {
                name: {
                    "score": cat.score,
                    "weight": cat.weight,
                    "weighted_score": cat.score * cat.weight,
                    "metrics": cat.metrics,
                    "feedback": cat.feedback,
                }
                for name, cat in resume_score.categories.items()
            },
            "percentile": resume_score.percentile,
        }

    def compare_scores(
        self,
        score1: ResumeScore,
        score2: ResumeScore,
    ) -> dict[str, Any]:
        """
        Compare two resume scores.

        Args:
            score1: First score
            score2: Second score

        Returns:
            Comparison dict
        """
        return {
            "score1": {
                "overall": score1.overall,
                "grade": score1.grade,
            },
            "score2": {
                "overall": score2.overall,
                "grade": score2.grade,
            },
            "difference": score2.overall - score1.overall,
            "improvement": score2.overall > score1.overall,
        }
