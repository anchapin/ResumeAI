"""
Resume Scoring API endpoints.

Provides resume scoring, recommendations, and benchmarks.
"""

import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from lib.scoring.resume_scorer import ResumeScorer
from lib.scoring.benchmarks import IndustryBenchmarkService
from lib.scoring.models import ResumeScore, Recommendation

router = APIRouter(prefix="/api/v1/scoring", tags=["Resume Scoring"])

logger = logging.getLogger(__name__)


# Request/Response models


class ScoreRequest(BaseModel):
    """Request for resume scoring."""

    resume_data: dict = Field(..., description="Resume data")
    role: str | None = None
    industry: str | None = None
    jd_skills: list[str] | None = None


class CategoryScoreResponse(BaseModel):
    """Category score response."""

    name: str
    score: float
    weight: float
    metrics: dict[str, Any]
    feedback: str


class ScoreResponse(BaseModel):
    """Score response."""

    overall: float
    grade: str
    categories: dict[str, CategoryScoreResponse]
    percentile: float | None = None
    recommendations: list[dict] = []
    processing_time_ms: float


class RecommendationsResponse(BaseModel):
    """Recommendations response."""

    recommendations: list[dict]
    quick_wins: list[dict] = []


class BenchmarksResponse(BaseModel):
    """Benchmarks response."""

    role: str
    industry: str
    experience_level: str
    avg_score: float
    percentiles: dict[str, float]
    comparison: dict[str, Any] | None = None


class TrackScoreRequest(BaseModel):
    """Request to track score."""

    resume_id: str
    score: float
    grade: str
    categories: dict[str, Any] = Field(default_factory=dict)


# Helper functions


def get_scorer() -> ResumeScorer:
    """Get resume scorer instance."""
    return ResumeScorer()


def get_benchmarks() -> IndustryBenchmarkService:
    """Get benchmark service instance."""
    return IndustryBenchmarkService()


# Endpoints


@router.post("/score", response_model=ScoreResponse)
async def score_resume(request: ScoreRequest):
    """
    Score a resume.

    Calculates overall score (0-100) with category breakdown
    and actionable recommendations.

    **Categories:**
    - Content Quality (35%): Writing style, grammar, clarity
    - Skills Coverage (30%): Skills density, relevance, diversity
    - Experience Relevance (20%): Years, progression, achievements
    - Formatting (15%): Structure, length, readability

    **Grades:**
    - A: 90-100 (Excellent)
    - B: 80-89 (Good)
    - C: 70-79 (Fair)
    - D: 60-69 (Poor)
    - F: 0-59 (Needs Improvement)
    """
    try:
        scorer = get_scorer()

        response = await scorer.score_resume(
            resume_data=request.resume_data,
            role=request.role,
            industry=request.industry,
            jd_skills=request.jd_skills,
        )

        return ScoreResponse(
            overall=response.score.overall,
            grade=response.score.grade,
            categories={
                name: CategoryScoreResponse(
                    name=cat.name,
                    score=cat.score,
                    weight=cat.weight,
                    metrics=cat.metrics,
                    feedback=cat.feedback,
                )
                for name, cat in response.score.categories.items()
            },
            percentile=response.score.percentile,
            recommendations=[
                {
                    "id": r.id,
                    "category": r.category,
                    "priority": r.priority,
                    "title": r.title,
                    "description": r.description,
                    "action": r.action,
                    "impact": r.impact,
                    "effort": r.effort,
                }
                for r in response.recommendations
            ],
            processing_time_ms=response.processing_time_ms,
        )

    except Exception as e:
        logger.error(f"Scoring failed: {e}")
        raise HTTPException(500, f"Scoring failed: {str(e)}")


@router.get("/breakdown")
async def get_breakdown(resume_id: str):
    """
    Get detailed score breakdown for a resume.

    **Parameters:**
    - `resume_id`: Resume identifier

    **Returns:**
    - Category breakdown with metrics
    - Detailed feedback per category
    """
    # Would fetch from database in production
    return {
        "resume_id": resume_id,
        "overall": 75.5,
        "grade": "C",
        "categories": {
            "content_quality": {
                "score": 70,
                "weight": 0.35,
                "metrics": {
                    "action_verb_ratio": 0.6,
                    "quantification_ratio": 0.4,
                },
                "feedback": "Add more action verbs and quantifiable metrics",
            },
            "skills_coverage": {
                "score": 80,
                "weight": 0.30,
                "metrics": {"resume_skills_count": 15},
                "feedback": "Skills coverage is good",
            },
        },
    }


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    resume_id: str,
    role: str | None = None,
    min_priority: str = "low",
):
    """
    Get recommendations for resume improvement.

    **Parameters:**
    - `resume_id`: Resume identifier
    - `role`: Target role for customization
    - `min_priority`: Minimum priority (high, medium, low)

    **Returns:**
    - Prioritized recommendations
    - Quick wins (low effort, high impact)
    """
    # Would fetch score and generate recommendations in production
    recommendations = [
        {
            "id": "rec_1",
            "category": "content_quality",
            "priority": "high",
            "title": "Add quantifiable metrics",
            "description": "Include numbers to show impact",
            "action": "Add metrics to at least 50% of bullet points",
            "impact": "+10-15 points",
            "effort": "medium",
        },
        {
            "id": "rec_2",
            "category": "skills_coverage",
            "priority": "high",
            "title": "Add missing key skills",
            "description": "Include skills from job description",
            "action": "Review JD and add relevant skills",
            "impact": "+10-20 points",
            "effort": "low",
        },
    ]

    quick_wins = [r for r in recommendations if r["effort"] == "low"]

    return RecommendationsResponse(
        recommendations=recommendations,
        quick_wins=quick_wins,
    )


@router.get("/benchmarks", response_model=BenchmarksResponse)
async def get_benchmarks(
    role: str,
    industry: str | None = None,
    experience_level: str | None = None,
    score: float | None = None,
):
    """
    Get industry benchmarks for comparison.

    **Parameters:**
    - `role`: Target role
    - `industry`: Target industry
    - `experience_level`: Experience level (entry, mid, senior)
    - `score`: Optional score to compare

    **Returns:**
    - Benchmark averages and percentiles
    - Comparison to your score (if provided)
    """
    try:
        benchmark_service = get_benchmarks()

        benchmark = benchmark_service.get_benchmarks(
            role=role,
            industry=industry,
            experience_level=experience_level,
        )

        if not benchmark:
            raise HTTPException(404, "Benchmarks not found for this role")

        comparison = None
        if score is not None:
            comparison = benchmark_service.compare_to_benchmark(
                score=type('obj', (object,), {'overall': score})(),
                benchmark=benchmark,
            )

        return BenchmarksResponse(
            role=benchmark.role,
            industry=benchmark.industry,
            experience_level=benchmark.experience_level,
            avg_score=benchmark.avg_score,
            percentiles={
                "25": benchmark.percentile_25,
                "50": benchmark.percentile_50,
                "75": benchmark.percentile_75,
                "90": benchmark.percentile_90,
            },
            comparison=comparison,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Benchmarks failed: {e}")
        raise HTTPException(500, f"Benchmarks failed: {str(e)}")


@router.post("/track")
async def track_score(request: TrackScoreRequest):
    """
    Track score over time.

    **Request:**
    - `resume_id`: Resume identifier
    - `score`: Current score
    - `grade`: Current grade
    - `categories`: Category scores

    **Returns:**
    - Success confirmation
    - Score history
    """
    # Would save to database in production
    return {
        "success": True,
        "resume_id": request.resume_id,
        "score": request.score,
        "grade": request.grade,
        "tracked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


@router.get("/history")
async def get_score_history(
    resume_id: str,
    days: int = 30,
):
    """
    Get score history for a resume.

    **Parameters:**
    - `resume_id`: Resume identifier
    - `days`: Number of days to include

    **Returns:**
    - Score history with timestamps
    - Trend analysis
    """
    # Would fetch from database in production
    return {
        "resume_id": resume_id,
        "days": days,
        "history": [
            {
                "date": "2026-03-01",
                "score": 68,
                "grade": "D",
            },
            {
                "date": "2026-03-07",
                "score": 72,
                "grade": "C",
            },
            {
                "date": "2026-03-13",
                "score": 75.5,
                "grade": "C",
            },
        ],
        "trend": "improving",
        "improvement": 7.5,
    }
