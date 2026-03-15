"""
Job Matching API endpoints.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from lib.matchers.job_matcher import get_matcher

router = APIRouter(prefix="/api/v1/match", tags=["Job Matching"])


class MatchRequest(BaseModel):
    """Request model for job matching."""

    resume_text: str = Field(..., min_length=50, max_length=50000)
    job_description: str = Field(..., min_length=50, max_length=50000)
    include_comparison: bool = Field(default=False)


class MatchResponse(BaseModel):
    """Response model for job matching."""

    match_score: float
    semantic_score: float
    skills_score: float
    experience_score: float
    education_score: float
    missing_skills: list[str]
    semantic_matches: dict[str, str]
    suggestions: list[str]
    calculation_time_ms: float


@router.post("", response_model=MatchResponse)
async def calculate_match(request: MatchRequest):
    """
    Calculate match score between resume and job description.

    Returns a score from 0-100% with component breakdown and gap analysis.

    **Scores:**
    - `match_score`: Overall weighted score (0-100%)
    - `semantic_score`: Semantic similarity component (40% weight)
    - `skills_score`: Skills match component (35% weight)
    - `experience_score`: Experience years match (15% weight)
    - `education_score`: Education level match (10% weight)

    **Gap Analysis:**
    - `missing_skills`: Skills in JD but not in resume
    - `semantic_matches`: Skills that may be covered by similar experience
    - `suggestions`: Actionable improvement recommendations
    """
    start_time = time.time()

    try:
        matcher = get_matcher()
        result = matcher.calculate_match_score(
            resume_text=request.resume_text,
            job_description=request.job_description,
        )

        calculation_time = (time.time() - start_time) * 1000

        return MatchResponse(
            match_score=result["match_score"],
            semantic_score=result["semantic_score"],
            skills_score=result["skills_score"],
            experience_score=result["experience_score"],
            education_score=result["education_score"],
            missing_skills=result["missing_skills"],
            semantic_matches=result["semantic_matches"],
            suggestions=result["suggestions"],
            calculation_time_ms=round(calculation_time, 2),
        )

    except Exception as e:
        raise HTTPException(500, f"Matching failed: {str(e)}")


@router.post("/comparison")
async def get_comparison(request: MatchRequest):
    """
    Get side-by-side comparison of resume vs JD requirements.

    Returns matched and unmatched requirements with resume references.
    """
    # For now, reuse the main match endpoint
    # Can be extended to return detailed comparison data
    return await calculate_match(request)
