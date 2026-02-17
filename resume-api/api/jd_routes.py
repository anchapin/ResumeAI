"""
Job Description Parsing API Routes.

Endpoints for parsing job descriptions, matching skills, and checking ATS compatibility.
"""

from fastapi import APIRouter, HTTPException, Request, status
from typing import Any, Dict, List

from .models import (
    JDAnalysisRequest,
    JDAnalysisResponse,
    SkillsMatchRequest,
    SkillsMatchResponse,
    ATSCheckRequest,
    ATSCheckResponse,
    ATSIssue,
    JDInsightsRequest,
    JDInsightsResponse,
    SalaryInfo,
    ErrorResponse,
)

from config.dependencies import AuthorizedAPIKey, limiter  # noqa: E402
from config import settings  # noqa: E402
from monitoring import logging_config  # noqa: E402

# Import parsing utilities
from lib.utils import (
    JobDescriptionParser,
    parse_job_description,
)

logger = logging_config.get_logger(__name__)

router = APIRouter()


def rate_limit(limit_value: str):
    """Apply rate limiting only when enabled."""
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    else:
        return lambda f: f


@router.post(
    "/v1/jd/analyze",
    response_model=JDAnalysisResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Job Description"],
)
@rate_limit("30/minute")
async def analyze_job_description(
    request: Request,
    body: JDAnalysisRequest,
    auth: AuthorizedAPIKey,
):
    """
    Analyze a job description and extract structured information.

    Extracts job title, company, location, salary, requirements,
    qualifications, responsibilities, skills, and more.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.

    Args:
        request: FastAPI Request object
        body: JDAnalysisRequest with job description text
        auth: API key authentication info

    Returns:
        JDAnalysisResponse with parsed job description data
    """
    try:
        # Parse the job description
        parsed = parse_job_description(body.job_description)

        # Build response
        salary_info = None
        if parsed.get("salary"):
            salary_info = SalaryInfo(
                min=parsed["salary"].get("min"),
                max=parsed["salary"].get("max"),
                currency=parsed["salary"].get("currency", "USD"),
                period=parsed["salary"].get("period", "yearly"),
            )

        return JDAnalysisResponse(
            title=parsed.get("title"),
            company=parsed.get("company"),
            location=parsed.get("location"),
            remote_type=parsed.get("remote_type"),
            salary=salary_info,
            requirements=parsed.get("requirements", []),
            qualifications=parsed.get("qualifications", []),
            responsibilities=parsed.get("responsibilities", []),
            skills=parsed.get("skills", []),
            experience_level=parsed.get("experience_level"),
            experience_years=parsed.get("experience_years"),
            education_requirements=parsed.get("education_requirements", []),
            benefits=parsed.get("benefits", []),
            keywords=parsed.get("keywords", []),
        )

    except Exception as e:
        logger.error(f"JD analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job description analysis failed: {str(e)}",
        )


@router.post(
    "/v1/jd/skills-match",
    response_model=SkillsMatchResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Job Description"],
)
@rate_limit("30/minute")
async def match_skills(
    request: Request,
    body: SkillsMatchRequest,
    auth: AuthorizedAPIKey,
):
    """
    Match resume skills against job description requirements.

    Compares skills extracted from the resume with those required
    in the job description and provides a match score.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.

    Args:
        request: FastAPI Request object
        body: SkillsMatchRequest with resume data and job description
        auth: API key authentication info

    Returns:
        SkillsMatchResponse with matching results
    """
    try:
        # Convert resume data to dict
        resume_dict = body.resume_data.model_dump(exclude_none=True)

        # Parse job description to extract skills
        jd_parser = JobDescriptionParser()
        parsed_jd = jd_parser.parse(body.job_description)
        jd_skills = set(parsed_jd.skills)

        # Extract skills from resume
        resume_skills = _extract_resume_skills(resume_dict)
        resume_skills_set = set(resume_skills)

        # Calculate matches
        matched = list(jd_skills & resume_skills_set)
        missing = list(jd_skills - resume_skills_set)
        additional = list(resume_skills_set - jd_skills)

        # Calculate match rate
        match_rate = len(matched) / len(jd_skills) if jd_skills else 0.0
        match_score = int(match_rate * 100)

        return SkillsMatchResponse(
            matched_skills=matched,
            missing_skills=missing,
            additional_skills=additional,
            match_rate=match_rate,
            match_score=match_score,
            jd_skills=list(jd_skills),
            resume_skills=resume_skills,
        )

    except Exception as e:
        logger.error(f"Skills matching failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skills matching failed: {str(e)}",
        )


@router.post(
    "/v1/jd/ats-check",
    response_model=ATSCheckResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Job Description"],
)
@rate_limit("30/minute")
async def check_ats_compatibility(
    request: Request,
    body: ATSCheckRequest,
    auth: AuthorizedAPIKey,
):
    """
    Check resume ATS (Applicant Tracking System) compatibility.

    Analyzes resume formatting, content, and keyword matching
    to determine ATS compatibility and provides recommendations.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.

    Args:
        request: FastAPI Request object
        body: ATSCheckRequest with resume data and optional job description
        auth: API key authentication info

    Returns:
        ATSCheckResponse with compatibility results
    """
    try:
        # Convert resume data to dict
        resume_dict = body.resume_data.model_dump(exclude_none=True)

        # Check ATS compatibility
        result = check_ats_compatibility(
            resume_data=resume_dict,
            job_description=body.job_description,
        )

        # Convert issues to model format
        issues = [
            ATSIssue(
                type=issue.get("type", "unknown"),
                severity=issue.get("severity", "medium"),
                message=issue.get("message", ""),
            )
            for issue in result.get("issues", [])
        ]

        return ATSCheckResponse(
            overall_score=result.get("overall_score", 0),
            passed=result.get("passed", False),
            issues=issues,
            recommendations=result.get("recommendations", []),
            keyword_match_rate=result.get("keyword_match_rate", 0.0),
            formatting_score=result.get("formatting_score", 0),
            content_score=result.get("content_score", 0),
            sections_found=result.get("sections_found", []),
            sections_missing=result.get("sections_missing", []),
        )

    except Exception as e:
        logger.error(f"ATS check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ATS compatibility check failed: {str(e)}",
        )


@router.post(
    "/v1/jd/insights",
    response_model=JDInsightsResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Job Description"],
)
@rate_limit("20/minute")
async def get_jd_insights(
    request: Request,
    body: JDInsightsRequest,
    auth: AuthorizedAPIKey,
):
    """
    Get comprehensive insights for job description and resume matching.

    Combines JD analysis, skills matching, and ATS compatibility
    into a single comprehensive response with overall fit score.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 20 requests per minute per API key.

    Args:
        request: FastAPI Request object
        body: JDInsightsRequest with resume data and job description
        auth: API key authentication info

    Returns:
        JDInsightsResponse with comprehensive analysis
    """
    try:
        # Convert resume data to dict
        resume_dict = body.resume_data.model_dump(exclude_none=True)

        # 1. Analyze job description
        parsed_jd = parse_job_description(body.job_description)

        # 2. Match skills
        jd_parser = JobDescriptionParser()
        parsed = jd_parser.parse(body.job_description)
        jd_skills = set(parsed.skills)
        resume_skills = set(_extract_resume_skills(resume_dict))

        matched = list(jd_skills & resume_skills)
        missing = list(jd_skills - resume_skills)
        additional = list(resume_skills - jd_skills)

        match_rate = len(matched) / len(jd_skills) if jd_skills else 0.0
        match_score = int(match_rate * 100)

        skills_match = SkillsMatchResponse(
            matched_skills=matched,
            missing_skills=missing,
            additional_skills=additional,
            match_rate=match_rate,
            match_score=match_score,
            jd_skills=list(jd_skills),
            resume_skills=list(resume_skills),
        )

        # 3. Check ATS compatibility
        ats_result = check_ats_compatibility(
            resume_data=resume_dict,
            job_description=body.job_description,
        )

        ats_issues = [
            ATSIssue(
                type=issue.get("type", "unknown"),
                severity=issue.get("severity", "medium"),
                message=issue.get("message", ""),
            )
            for issue in ats_result.get("issues", [])
        ]

        ats_check = ATSCheckResponse(
            overall_score=ats_result.get("overall_score", 0),
            passed=ats_result.get("passed", False),
            issues=ats_issues,
            recommendations=ats_result.get("recommendations", []),
            keyword_match_rate=ats_result.get("keyword_match_rate", 0.0),
            formatting_score=ats_result.get("formatting_score", 0),
            content_score=ats_result.get("content_score", 0),
            sections_found=ats_result.get("sections_found", []),
            sections_missing=ats_result.get("sections_missing", []),
        )

        # 4. Build JD analysis response
        salary_info = None
        if parsed_jd.get("salary"):
            salary_info = SalaryInfo(
                min=parsed_jd["salary"].get("min"),
                max=parsed_jd["salary"].get("max"),
                currency=parsed_jd["salary"].get("currency", "USD"),
                period=parsed_jd["salary"].get("period", "yearly"),
            )

        jd_analysis = JDAnalysisResponse(
            title=parsed_jd.get("title"),
            company=parsed_jd.get("company"),
            location=parsed_jd.get("location"),
            remote_type=parsed_jd.get("remote_type"),
            salary=salary_info,
            requirements=parsed_jd.get("requirements", []),
            qualifications=parsed_jd.get("qualifications", []),
            responsibilities=parsed_jd.get("responsibilities", []),
            skills=parsed_jd.get("skills", []),
            experience_level=parsed_jd.get("experience_level"),
            experience_years=parsed_jd.get("experience_years"),
            education_requirements=parsed_jd.get("education_requirements", []),
            benefits=parsed_jd.get("benefits", []),
            keywords=parsed_jd.get("keywords", []),
        )

        # 5. Calculate overall fit score
        # Weight: 40% skills match, 40% ATS score, 20% content quality
        overall_fit = int(
            match_score * 0.4
            + ats_result.get("overall_score", 0) * 0.4
            + ats_result.get("content_score", 0) * 0.2
        )

        # 6. Generate summary
        summary_parts = []
        if parsed_jd.get("title"):
            summary_parts.append(f"Position: {parsed_jd['title']}")
        if parsed_jd.get("company"):
            summary_parts.append(f"at {parsed_jd['company']}")

        summary = " ".join(summary_parts) + ". " if summary_parts else ""

        if overall_fit >= 80:
            summary += (
                "Excellent match! Your resume aligns well with the job requirements."
            )
        elif overall_fit >= 60:
            summary += "Good match with room for improvement. Consider addressing the missing skills."
        elif overall_fit >= 40:
            summary += "Moderate match. Review the recommendations to improve your fit."
        else:
            summary += "Low match. Consider tailoring your resume more closely to the job requirements."

        # 7. Generate top recommendations
        recommendations = []

        # Add skills recommendations
        if missing:
            recommendations.append(
                f"Add these missing skills to your resume: {', '.join(missing[:5])}"
            )

        # Add ATS recommendations
        recommendations.extend(ats_result.get("recommendations", [])[:3])

        # Add content recommendations
        if ats_result.get("content_score", 0) < 70:
            recommendations.append(
                "Add quantifiable metrics to your experience bullets"
            )

        top_recommendations = list(dict.fromkeys(recommendations))[
            :5
        ]  # Remove duplicates

        return JDInsightsResponse(
            jd_analysis=jd_analysis,
            skills_match=skills_match,
            ats_check=ats_check,
            overall_fit_score=overall_fit,
            summary=summary,
            top_recommendations=top_recommendations,
        )

    except Exception as e:
        logger.error(f"JD insights failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job description insights failed: {str(e)}",
        )


def _extract_resume_skills(resume_data: Dict[str, Any]) -> List[str]:
    """Extract skills from resume data."""
    skills = []

    # Extract from skills section
    skills_section = resume_data.get("skills", [])
    if isinstance(skills_section, list):
        for skill in skills_section:
            if isinstance(skill, dict):
                if skill.get("name"):
                    skills.append(skill["name"].lower())
                if skill.get("keywords"):
                    skills.extend([k.lower() for k in skill["keywords"]])
            elif isinstance(skill, str):
                skills.append(skill.lower())

    # Extract from work experience
    work = resume_data.get("work", []) or resume_data.get("experience", [])
    for job in work:
        if isinstance(job, dict):
            # Check bullets/highlights
            bullets = job.get("bullets", []) or job.get("highlights", [])
            for bullet in bullets:
                text = (
                    bullet.get("text", "") if isinstance(bullet, dict) else str(bullet)
                )
                # Extract potential skills from text
                skills.extend(_extract_tech_terms(text))

            # Check description/summary
            description = job.get("summary", "") or job.get("description", "")
            if description:
                skills.extend(_extract_tech_terms(description))

    # Extract from projects
    projects = resume_data.get("projects", [])
    for proj in projects:
        if isinstance(proj, dict):
            description = proj.get("description", "")
            if description:
                skills.extend(_extract_tech_terms(description))

    # Remove duplicates and return
    return list(dict.fromkeys(skills))


def _extract_tech_terms(text: str) -> List[str]:
    """Extract technology terms from text."""
    tech_terms = [
        "python",
        "javascript",
        "typescript",
        "java",
        "go",
        "rust",
        "c++",
        "c#",
        "ruby",
        "php",
        "swift",
        "kotlin",
        "scala",
        "sql",
        "html",
        "css",
        "react",
        "vue",
        "angular",
        "node.js",
        "nodejs",
        "django",
        "flask",
        "fastapi",
        "spring",
        "rails",
        "next.js",
        "express",
        "tensorflow",
        "pytorch",
        "keras",
        "pandas",
        "numpy",
        "scikit-learn",
        "kubernetes",
        "docker",
        "aws",
        "azure",
        "gcp",
        "google cloud",
        "postgres",
        "postgresql",
        "mysql",
        "mongodb",
        "redis",
        "elasticsearch",
        "graphql",
        "rest",
        "api",
        "microservices",
        "devops",
        "ci/cd",
        "git",
        "github",
        "gitlab",
        "jenkins",
        "terraform",
        "ansible",
        "machine learning",
        "ml",
        "ai",
        "llm",
        "nlp",
        "data science",
        "agile",
        "scrum",
        "leadership",
        "communication",
        "teamwork",
    ]

    text_lower = text.lower()
    found = []

    for term in tech_terms:
        if term in text_lower:
            found.append(term)

    return found
