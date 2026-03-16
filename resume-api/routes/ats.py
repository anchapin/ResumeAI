"""
ATS Compatibility Check API endpoints.

Provides endpoints for analyzing resume files for ATS (Applicant Tracking System) compatibility.
"""

import os
import tempfile
import time
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from lib.matchers.ats_analyzer import get_analyzer

router = APIRouter(prefix="/api/v1/ats", tags=["ATS Compatibility"])


class ATSCheckResponse(BaseModel):
    """Response model for ATS compatibility check."""

    file_type: str
    ats_score: int
    is_parseable: bool
    word_count: int
    issues: list[dict]
    parsed_text: str
    calculation_time_ms: float


class ATSFixRecommendation(BaseModel):
    """Recommendation for fixing an ATS issue."""

    issue_type: str
    priority: str
    fix: str
    estimated_impact: int


@router.post("/check", response_model=ATSCheckResponse)
async def check_ats_compatibility(file: UploadFile = File(...)):
    """
    Check ATS compatibility of a resume file.

    Accepts PDF or DOCX files and returns:
    - ATS compatibility score (0-100)
    - List of issues (critical, warning, info)
    - Parsed text as ATS would see it
    - Fix recommendations

    **Score Interpretation:**
    - 80-100: GOOD - Will likely reach recruiter
    - 50-79: FAIR - May have parsing issues
    - 20-49: POOR - Significant parsing problems
    - 0-19: CRITICAL - Will likely be rejected by ATS
    """
    start_time = time.time()

    # Validate file type
    allowed_extensions = [".pdf", ".docx", ".doc"]
    file_ext = os.path.splitext(file.filename or "")[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            400,
            f"Unsupported file type: {file_ext}. Allowed: {', '.join(allowed_extensions)}",
        )

    # Save uploaded file to temporary location
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=file_ext
        ) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # Analyze the file
        analyzer = get_analyzer()
        result = analyzer.analyze_file(temp_path)

        calculation_time = (time.time() - start_time) * 1000

        return ATSCheckResponse(
            file_type=result["file_type"],
            ats_score=result["ats_score"],
            is_parseable=result["is_parseable"],
            word_count=result["word_count"],
            issues=[
                {
                    "type": issue["type"],
                    "element": issue["element"],
                    "description": issue["description"],
                    "page": issue.get("page"),
                    "fix": issue["fix"],
                }
                for issue in result["issues"]
            ],
            parsed_text=result["parsed_text"][:5000],  # Limit to 5000 chars
            calculation_time_ms=round(calculation_time, 2),
        )

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"ATS analysis failed: {str(e)}")
    finally:
        # Clean up temp file
        if "temp_path" in locals():
            try:
                os.unlink(temp_path)
            except Exception:
                pass


@router.get("/score/{score}/interpretation")
async def get_score_interpretation(score: int):
    """
    Get interpretation of an ATS score.

    Returns human-readable explanation of what the score means.
    """
    if score < 0 or score > 100:
        raise HTTPException(400, "Score must be between 0 and 100")

    if score >= 80:
        return {
            "interpretation": "GOOD",
            "message": "Your resume is ATS-friendly and will likely reach the recruiter.",
            "recommendation": "Minor improvements possible, but your resume should parse correctly in most ATS systems.",
        }
    elif score >= 50:
        return {
            "interpretation": "FAIR",
            "message": "Your resume may have parsing issues in some ATS systems.",
            "recommendation": "Review the identified issues and fix critical problems to improve compatibility.",
        }
    elif score >= 20:
        return {
            "interpretation": "POOR",
            "message": "Your resume has significant parsing problems that will affect ATS compatibility.",
            "recommendation": "Address critical issues immediately. Consider reformatting your resume using an ATS-friendly template.",
        }
    else:
        return {
            "interpretation": "CRITICAL",
            "message": "Your resume will likely be rejected by ATS systems before reaching a human.",
            "recommendation": "Urgent action required. Re-create your resume using a simple, ATS-friendly format.",
        }


@router.post("/recommendations", response_model=list[ATSFixRecommendation])
async def get_fix_recommendations(issues: list[dict]):
    """
    Get prioritized fix recommendations for ATS issues.

    Returns a list of recommended fixes ordered by priority and impact.
    """
    recommendations = []

    # Priority order for issue types
    priority_order = {"CRITICAL": 1, "WARNING": 2, "INFO": 3}

    # Impact scores for different issue types
    impact_scores = {
        "images": 30,
        "scanned_pdf": 30,
        "contact_in_header": 25,
        "contact_in_footer": 25,
        "password_protected": 25,
        "text_boxes": 20,
        "complex_table": 15,
        "multi_column": 10,
        "non_standard_font": 5,
        "icons_special_bullets": 5,
    }

    for issue in issues:
        issue_type = issue.get("type", "INFO")
        element = issue.get("element", "unknown")

        recommendations.append(
            ATSFixRecommendation(
                issue_type=element,
                priority=issue_type,
                fix=issue.get("fix", "Review and fix this issue"),
                estimated_impact=impact_scores.get(element, 5),
            )
        )

    # Sort by priority (CRITICAL first) then by impact
    recommendations.sort(
        key=lambda r: (priority_order.get(r.priority, 3), -r.estimated_impact)
    )

    return recommendations
