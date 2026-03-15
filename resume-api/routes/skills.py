"""
Skills API endpoints.

Provides skills extraction, matching, and gap analysis.
"""

import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from lib.skills.extractor import SkillsExtractor
from lib.skills.matcher import SkillsMatcher
from lib.skills.ontology import get_ontology

router = APIRouter(prefix="/api/v1/skills", tags=["Skills"])

logger = logging.getLogger(__name__)


# Request/Response models


class SkillsExtractRequest(BaseModel):
    """Request for skills extraction."""

    text: str = Field(..., min_length=10, max_length=50000, description="Job description text")
    include_metadata: bool = Field(default=False, description="Include additional metadata")


class SkillsExtractResponse(BaseModel):
    """Response for skills extraction."""

    skills: list[dict[str, Any]]
    by_category: dict[str, list[dict[str, Any]]]
    total_count: int
    processing_time_ms: float


class SkillsMatchRequest(BaseModel):
    """Request for skills matching."""

    jd_text: str = Field(..., min_length=10, max_length=50000, description="Job description text")
    resume_text: str = Field(..., min_length=10, max_length=50000, description="Resume text")
    resume_skills: list[str] = Field(default_factory=list, description="Extracted resume skills")


class SkillsMatchResponse(BaseModel):
    """Response for skills matching."""

    matched_skills: list[dict[str, Any]]
    missing_skills: list[dict[str, Any]]
    partial_matches: list[dict[str, Any]]
    coverage_score: float
    jd_skills_count: int
    resume_skills_count: int


class SkillsGapRequest(BaseModel):
    """Request for skills gap analysis."""

    jd_text: str = Field(..., min_length=10, max_length=50000)
    resume_text: str = Field(..., min_length=10, max_length=50000)


class SkillsGapResponse(BaseModel):
    """Response for skills gap analysis."""

    gap_score: float
    matched_skills: list[dict[str, Any]]
    missing_critical: list[dict[str, Any]]
    missing_preferred: list[dict[str, Any]]
    recommendations: list[dict[str, str]]
    category_breakdown: dict[str, dict[str, Any]]


class CategoriesResponse(BaseModel):
    """Response for skill categories."""

    categories: dict[str, list[str]]
    statistics: dict[str, Any]


# Helper functions


def get_extractor() -> SkillsExtractor:
    """Get skills extractor instance."""
    return SkillsExtractor()


def get_matcher() -> SkillsMatcher:
    """Get skills matcher instance."""
    return SkillsMatcher()


# Endpoints


@router.post("/extract", response_model=SkillsExtractResponse)
async def extract_skills(request: SkillsExtractRequest):
    """
    Extract skills from job description text.

    Identifies technical skills, tools, soft skills, and domain knowledge
    mentioned in the job description.

    **Response:**
    - `skills`: List of extracted skills with categories
    - `by_category`: Skills grouped by category
    - `total_count`: Total number of skills found
    - `processing_time_ms`: Time taken to process
    """
    start_time = time.time()

    try:
        extractor = get_extractor()
        result = extractor.extract(request.text, use_llm=True)

        processing_time = (time.time() - start_time) * 1000

        return SkillsExtractResponse(
            skills=[
                {
                    "name": s.name,
                    "category": s.category,
                    "original_text": s.original_text,
                    "confidence": s.confidence,
                    "synonyms": s.synonyms,
                }
                for s in result.skills
            ],
            by_category={
                cat: [
                    {
                        "name": s.name,
                        "original_text": s.original_text,
                        "confidence": s.confidence,
                    }
                    for s in skills
                ]
                for cat, skills in result.by_category.items()
            },
            total_count=result.total_count,
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Skills extraction failed: {e}")
        raise HTTPException(500, f"Skills extraction failed: {str(e)}")


@router.post("/match", response_model=SkillsMatchResponse)
async def match_skills(request: SkillsMatchRequest):
    """
    Match skills between job description and resume.

    Compares JD skills against resume skills using:
    - Exact matching
    - Semantic matching
    - Synonym matching

    **Response:**
    - `matched_skills`: Skills found in both JD and resume
    - `missing_skills`: Skills in JD but not in resume
    - `partial_matches`: Related but not exact matches
    - `coverage_score`: Percentage of JD skills matched (0-100)
    """
    try:
        extractor = get_extractor()
        matcher = get_matcher()

        # Extract skills from JD
        jd_result = extractor.extract(request.jd_text)

        # Extract skills from resume if not provided
        resume_skills = request.resume_skills
        if not resume_skills and request.resume_text:
            resume_result = extractor.extract(request.resume_text)
            resume_skills = [s.name for s in resume_result.skills]

        # Match skills
        match_result = matcher.match(jd_result.skills, resume_skills, request.resume_text)

        return SkillsMatchResponse(
            matched_skills=[
                {
                    "skill": m.skill,
                    "category": m.category,
                    "match_type": m.match_type,
                    "confidence": m.confidence,
                    "jd_context": m.jd_context,
                    "resume_context": m.resume_context,
                }
                for m in match_result.matched_skills
            ],
            missing_skills=[
                {
                    "name": m.name,
                    "category": m.category,
                    "priority": m.priority,
                    "suggestions": m.suggestions,
                }
                for m in match_result.missing_skills
            ],
            partial_matches=[
                {
                    "jd_skill": p.jd_skill,
                    "resume_skill": p.resume_skill,
                    "similarity": p.similarity,
                    "relationship": p.relationship,
                }
                for p in match_result.partial_matches
            ],
            coverage_score=round(match_result.coverage_score, 2),
            jd_skills_count=match_result.jd_skills_count,
            resume_skills_count=match_result.resume_skills_count,
        )

    except Exception as e:
        logger.error(f"Skills matching failed: {e}")
        raise HTTPException(500, f"Skills matching failed: {str(e)}")


@router.get("/gap", response_model=SkillsGapResponse)
async def get_skills_gap(
    jd_text: str,
    resume_text: str,
):
    """
    Analyze skills gap between job description and resume.

    Provides detailed gap analysis with:
    - Overall gap score
    - Critical vs preferred missing skills
    - Actionable recommendations

    **Query Parameters:**
    - `jd_text`: Job description text
    - `resume_text`: Resume text
    """
    try:
        extractor = get_extractor()
        matcher = get_matcher()

        # Extract skills
        jd_result = extractor.extract(jd_text)
        resume_result = extractor.extract(resume_text)
        resume_skills = [s.name for s in resume_result.skills]

        # Match skills
        match_result = matcher.match(jd_result.skills, resume_skills, resume_text)

        # Categorize missing skills
        missing_critical = [
            {"name": m.name, "category": m.category, "suggestions": m.suggestions}
            for m in match_result.missing_skills
            if m.priority == "critical"
        ]
        missing_preferred = [
            {"name": m.name, "category": m.category, "suggestions": m.suggestions}
            for m in match_result.missing_skills
            if m.priority == "preferred"
        ]

        # Generate recommendations
        recommendations = []
        for m in match_result.missing_skills[:5]:  # Top 5
            recommendations.append(
                {
                    "skill": m.name,
                    "priority": m.priority,
                    "action": m.suggestions[0] if m.suggestions else "Add to resume",
                }
            )

        # Category breakdown
        category_breakdown = matcher.get_match_summary(jd_result.skills, resume_skills)

        return SkillsGapResponse(
            gap_score=round(match_result.coverage_score, 2),
            matched_skills=[
                {
                    "skill": m.skill,
                    "category": m.category,
                    "match_type": m.match_type,
                }
                for m in match_result.matched_skills
            ],
            missing_critical=missing_critical,
            missing_preferred=missing_preferred,
            recommendations=recommendations,
            category_breakdown=category_breakdown["by_category"],
        )

    except Exception as e:
        logger.error(f"Skills gap analysis failed: {e}")
        raise HTTPException(500, f"Skills gap analysis failed: {str(e)}")


@router.get("/categories", response_model=CategoriesResponse)
async def get_categories():
    """
    Get all skill categories and available skills.

    Returns the complete skills ontology organized by category.
    """
    try:
        ontology = get_ontology()

        categories = {}
        for category in ["technical", "tools", "soft", "domain"]:
            categories[category] = ontology.get_all_skills(category)

        return CategoriesResponse(
            categories=categories,
            statistics=ontology.get_statistics(),
        )

    except Exception as e:
        logger.error(f"Failed to get categories: {e}")
        raise HTTPException(500, f"Failed to get categories: {str(e)}")


@router.get("/search")
async def search_skills(q: str, limit: int = 10):
    """
    Search for skills by name or synonym.

    **Query Parameters:**
    - `q`: Search query
    - `limit`: Maximum results (default: 10)
    """
    try:
        ontology = get_ontology()
        results = ontology.search(q, limit)

        return {
            "query": q,
            "results": [
                {
                    "name": r["name"],
                    "category": r["category"],
                    "subcategory": r.get("subcategory"),
                    "synonyms": r.get("synonyms", []),
                }
                for r in results
            ],
            "count": len(results),
        }

    except Exception as e:
        logger.error(f"Skills search failed: {e}")
        raise HTTPException(500, f"Skills search failed: {str(e)}")
