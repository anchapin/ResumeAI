"""
Resume Tailoring API Routes.

Endpoints for AI-powered resume tailoring to match job descriptions.
"""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from config.dependencies import AuthorizedAPIKey, limiter  # noqa: E402
from config import settings  # noqa: E402
from monitoring import logging_config  # noqa: E402

logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/tailor", tags=["Resume Tailoring"])


# Request/Response models
class TailorRequest(BaseModel):
    resume: Dict[str, Any]
    job_description: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None


class TailorChange(BaseModel):
    section: str
    field: str
    original: str
    proposed: str
    reason: str
    accepted: bool = False


class TailorResponse(BaseModel):
    tailored_resume: Dict[str, Any]
    changes: List[Dict[str, Any]]
    suggestions: List[str]
    keywords: List[str]


def rate_limit(limit_value: str):
    """Apply rate limiting only when enabled."""
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    else:
        return lambda f: f


def _convert_simple_resume_to_json_resume(simple_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert SimpleResumeData format to JSON Resume format."""
    # Map simple format to JSON Resume schema
    json_resume = {
        "basics": {
            "name": simple_data.get("name", ""),
            "email": simple_data.get("email", ""),
            "phone": simple_data.get("phone", ""),
            "url": simple_data.get("url", ""),
            "summary": simple_data.get("summary", ""),
            "location": {
                "address": simple_data.get("location", ""),
            },
            "profiles": [],
        },
        "work": [],
        "education": [],
        "skills": [],
        "projects": [],
    }

    # Convert experience to work
    for exp in simple_data.get("experience", []):
        json_resume["work"].append({
            "name": exp.get("company", ""),
            "position": exp.get("role", ""),
            "url": exp.get("url", ""),
            "startDate": exp.get("startDate", ""),
            "endDate": exp.get("endDate", ""),
            "summary": exp.get("description", ""),
            "highlights": exp.get("highlights", []),
            "keywords": exp.get("tags", []),
        })

    # Convert education
    for edu in simple_data.get("education", []):
        json_resume["education"].append({
            "institution": edu.get("institution", ""),
            "area": edu.get("area", ""),
            "studyType": edu.get("studyType", ""),
            "startDate": edu.get("startDate", ""),
            "endDate": edu.get("endDate", ""),
            "courses": edu.get("courses", []),
        })

    # Convert skills
    for skill in simple_data.get("skills", []):
        json_resume["skills"].append({
            "name": skill,
            "level": "",
            "keywords": [],
        })

    # Convert projects
    for proj in simple_data.get("projects", []):
        json_resume["projects"].append({
            "name": proj.get("name", ""),
            "description": proj.get("description", ""),
            "highlights": proj.get("highlights", []),
            "keywords": proj.get("roles", []),
            "startDate": proj.get("startDate", ""),
            "endDate": proj.get("endDate", ""),
            "url": proj.get("url", ""),
        })

    return json_resume


def _convert_json_resume_to_simple(json_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert JSON Resume format back to SimpleResumeData format."""
    basics = json_data.get("basics", {})
    
    simple_data = {
        "name": basics.get("name", ""),
        "email": basics.get("email", ""),
        "phone": basics.get("phone", ""),
        "url": basics.get("url", ""),
        "summary": basics.get("summary", ""),
        "location": basics.get("location", {}).get("address", ""),
        "role": basics.get("label", ""),
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
    }

    # Convert work to experience
    for work in json_data.get("work", []):
        simple_data["experience"].append({
            "company": work.get("name", ""),
            "role": work.get("position", ""),
            "url": work.get("url", ""),
            "startDate": work.get("startDate", ""),
            "endDate": work.get("endDate", ""),
            "description": work.get("summary", ""),
            "highlights": work.get("highlights", []),
            "tags": work.get("keywords", []),
        })

    # Convert education
    for edu in json_data.get("education", []):
        simple_data["education"].append({
            "institution": edu.get("institution", ""),
            "area": edu.get("area", ""),
            "studyType": edu.get("studyType", ""),
            "startDate": edu.get("startDate", ""),
            "endDate": edu.get("endDate", ""),
            "courses": edu.get("courses", []),
        })

    # Convert skills
    for skill in json_data.get("skills", []):
        skill_name = skill.get("name", "")
        if skill_name:
            simple_data["skills"].append(skill_name)

    # Convert projects
    for proj in json_data.get("projects", []):
        simple_data["projects"].append({
            "name": proj.get("name", ""),
            "description": proj.get("description", ""),
            "highlights": proj.get("highlights", []),
            "roles": proj.get("keywords", []),
            "startDate": proj.get("startDate", ""),
            "endDate": proj.get("endDate", ""),
            "url": proj.get("url", ""),
        })

    return simple_data


def _extract_keywords(job_description: str) -> List[str]:
    """Extract keywords from job description (fallback without AI)."""
    # Technical keywords to look for
    tech_keywords = [
        "javascript", "typescript", "python", "java", "react", "angular", "vue",
        "node", "express", "django", "flask", "sql", "mysql", "postgresql", "mongodb",
        "aws", "azure", "gcp", "docker", "kubernetes", "git", "ci/cd", "devops",
        "agile", "scrum", "rest", "api", "graphql", "microservices", "machine learning",
        "data", "analytics", "leadership", "management", "communication"
    ]
    
    text_lower = job_description.lower()
    found_keywords = []
    
    for kw in tech_keywords:
        if kw in text_lower:
            found_keywords.append(kw)
    
    # Also extract common technical terms
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text_lower)
    technical_terms = {'html', 'css', 'json', 'xml', 'yaml', 'sql', 'api', 'rest', 'url'}
    for word in words:
        if word in technical_terms and word not in found_keywords:
            found_keywords.append(word)
    
    return found_keywords[:20]


def _generate_changes(
    resume_data: Dict[str, Any],
    job_description: str,
    keywords: List[str],
) -> List[Dict[str, Any]]:
    """Generate tailoring changes for the resume."""
    changes = []
    
    # Generate summary changes
    if resume_data.get("summary"):
        original = resume_data["summary"]
        # Add relevant keywords to summary
        relevant_kw = keywords[:3]
        if relevant_kw:
            proposed = f"{original} Experienced with {', '.join(relevant_kw)}."
            changes.append({
                "section": "summary",
                "field": "summary",
                "original": original,
                "proposed": proposed,
                "reason": "Align summary with job requirements",
                "accepted": False,
            })
    
    # Generate experience changes (for simple format)
    if "experience" in resume_data:
        for idx, exp in enumerate(resume_data.get("experience", [])):
            if exp.get("description"):
                original = exp["description"]
                # Enhance description with keywords
                proposed = _enhance_description(original, keywords)
                if proposed != original:
                    changes.append({
                        "section": "experience",
                        "field": str(idx),
                        "original": original,
                        "proposed": proposed,
                        "reason": "Enhanced with job-relevant keywords",
                        "accepted": False,
                    })
    
    # Generate skills changes
    existing_skills = set(s.lower() for s in resume_data.get("skills", []))
    missing_keywords = [kw for kw in keywords if kw.lower() not in existing_skills]
    
    if missing_keywords:
        original = ", ".join(resume_data.get("skills", []))
        proposed = ", ".join(resume_data.get("skills", []) + missing_keywords[:5])
        changes.append({
            "section": "skills",
            "field": "skills",
            "original": original,
            "proposed": proposed,
            "reason": f"Add relevant skills from job description: {', '.join(missing_keywords[:3])}",
            "accepted": False,
        })
    
    return changes


def _enhance_description(description: str, keywords: List[str]) -> str:
    """Enhance a description with relevant keywords."""
    relevant_keywords = keywords[:2]
    if not relevant_keywords:
        return description
    
    desc_lower = description.lower()
    missing_keywords = [kw for kw in relevant_keywords if kw.lower() not in desc_lower]
    
    if not missing_keywords:
        return description
    
    # Add keywords naturally to description
    enhanced = f"{description} Strong proficiency in {', '.join(missing_keywords)}."
    return enhanced


def _generate_suggestions(
    resume_data: Dict[str, Any],
    keywords: List[str],
    changes: List[Dict[str, Any]],
) -> List[str]:
    """Generate improvement suggestions."""
    suggestions = []
    
    existing_skills = set(s.lower() for s in resume_data.get("skills", []))
    missing_keywords = [kw for kw in keywords if kw.lower() not in existing_skills]
    
    if missing_keywords:
        suggestions.append(f"Consider adding these skills: {', '.join(missing_keywords[:3])}")
    
    # Check for quantifiable achievements
    has_metrics = bool(re.search(r'\d+[%$]|\d+\+', str(resume_data)))
    if not has_metrics:
        suggestions.append("Add quantifiable metrics to your achievements (e.g., 'increased efficiency by 25%')")
    
    # Check for summary
    if not resume_data.get("summary"):
        suggestions.append("Add a professional summary to highlight your qualifications")
    
    # Check for keywords in experience
    exp_text = " ".join(exp.get("description", "") for exp in resume_data.get("experience", []))
    missing_from_exp = [kw for kw in keywords if kw.lower() not in exp_text.lower()]
    if missing_from_exp:
        suggestions.append(f"Incorporate these keywords in your experience descriptions: {', '.join(missing_from_exp[:2])}")
    
    return suggestions[:5]


async def _call_ai_tailor(
    resume_data: Dict[str, Any],
    job_description: str,
    company_name: Optional[str] = None,
    job_title: Optional[str] = None,
) -> Dict[str, Any]:
    """Call AI to tailor the resume."""
    # Try to use the ResumeTailorer class
    try:
        from lib.cli.tailorer import ResumeTailorer
        
        # Convert simple format to JSON Resume
        json_resume = _convert_simple_resume_to_json_resume(resume_data)
        
        # Initialize tailorer
        ai_provider = os.getenv("AI_PROVIDER", "openai").lower()
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("GEMINI_API_KEY")
        model = os.getenv("AI_MODEL")
        
        tailorer = ResumeTailorer(
            ai_provider=ai_provider,
            api_key=api_key,
            model=model,
        )
        
        # Tailor the resume
        tailored = tailorer.tailor_resume(
            json_resume,
            job_description,
            company_name or "Unknown Company",
            job_title or "Unknown Position",
        )
        
        # Convert back to simple format
        return _convert_json_resume_to_simple(tailored)
    except Exception as e:
        logger.warning(f"AI tailoring failed, using fallback: {e}")
        raise


@router.post(
    "",
    response_model=TailorResponse,
    responses={
        400: {"model": Dict[str, str]},
        422: {"model": Dict[str, str]},
        500: {"model": Dict[str, str]},
    },
    tags=["Resume Tailoring"],
)
@rate_limit("5/minute")
async def tailor_resume(
    request: Request,
    body: TailorRequest,
):
    """
    Tailor a resume to match a job description.

    Analyzes the resume against the job description and generates
    suggested changes to improve match score.

    Rate limit: 5 requests per minute.

    Args:
        request: FastAPI Request object
        body: TailorRequest with resume and job description

    Returns:
        TailorResponse with tailored resume, changes, suggestions, and keywords
    """
    try:
        resume_data = body.resume
        job_description = body.job_description
        
        if not resume_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume data is required",
            )
        
        if not job_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job description is required",
            )
        
        # Extract keywords
        keywords = _extract_keywords(job_description)
        
        # Try AI tailoring first
        tailored_resume = None
        try:
            tailored_resume = await _call_ai_tailor(
                resume_data,
                job_description,
                body.company_name,
                body.job_title,
            )
        except Exception as e:
            logger.warning(f"AI tailoring failed: {e}, using local changes")
            # Use the original resume as base
            tailored_resume = resume_data.copy()
        
        # Generate changes based on diff
        changes = _generate_changes(resume_data, job_description, keywords)
        
        # Generate suggestions
        suggestions = _generate_suggestions(resume_data, keywords, changes)
        
        return TailorResponse(
            tailored_resume=tailored_resume,
            changes=changes,
            suggestions=suggestions,
            keywords=keywords,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tailoring error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tailoring failed: {str(e)}",
        )


@router.get(
    "/keywords",
    responses={
        400: {"model": Dict[str, str]},
        500: {"model": Dict[str, str]},
    },
    tags=["Resume Tailoring"],
)
async def extract_keywords(
    job_description: str,
):
    """
    Extract keywords from a job description.

    Args:
        job_description: Job description text

    Returns:
        List of extracted keywords
    """
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description is required",
        )
    
    keywords = _extract_keywords(job_description)
    
    return {"keywords": keywords}