"""
Cover Letter Generation API Routes.

Endpoints for AI-powered cover letter generation based on resume and job description.
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from config.dependencies import AuthorizedAPIKey, limiter  # noqa: E402
from config import settings  # noqa: E402
from monitoring import logging_config  # noqa: E402
from lib.utils.ai import generate_cover_letter

logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/cover-letter", tags=["Cover Letter"])


# Request/Response models
class CoverLetterRequest(BaseModel):
    resume: Dict[str, Any]
    job_description: str
    tone: str = "formal"  # formal, conversational, enthusiastic
    company_name: Optional[str] = None
    hiring_manager: Optional[str] = None


class CoverLetterResponse(BaseModel):
    cover_letter: str
    tone: str
    word_count: int


def rate_limit(limit_value: str):
    """Apply rate limiting only when enabled."""
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    else:
        return lambda f: f


@router.post(
    "/generate",
    response_model=CoverLetterResponse,
    responses={
        400: {"model": Dict[str, str]},
        500: {"model": Dict[str, str]},
    },
    tags=["Cover Letter"],
)
@rate_limit("10/minute")
async def generate_cover_letter_endpoint(
    request: Request,
    body: CoverLetterRequest,
):
    """
    Generate a cover letter based on resume and job description.

    Args:
        resume: Resume data in SimpleResumeData format
        job_description: Job description text
        tone: Tone for the cover letter (formal, conversational, enthusiastic)
        company_name: Target company name
        hiring_manager: Hiring manager name (optional)

    Returns:
        Generated cover letter
    """
    try:
        # Validate required fields
        if not body.resume:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume data is required",
            )

        if not body.job_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job description is required",
            )

        # Validate tone
        valid_tones = ["formal", "conversational", "enthusiastic"]
        if body.tone not in valid_tones:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tone must be one of: {', '.join(valid_tones)}",
            )

        # Generate cover letter using AI
        try:
            cover_letter = await generate_cover_letter(
                resume_data=body.resume,
                job_description=body.job_description,
                tone=body.tone,
                company_name=body.company_name,
                hiring_manager=body.hiring_manager,
            )
        except Exception as e:
            logger.warning(f"AI cover letter generation failed: {e}, using template")
            # Fallback to template generation
            cover_letter = _generate_template_cover_letter(
                body.resume,
                body.job_description,
                body.tone,
                body.company_name,
                body.hiring_manager,
            )

        word_count = len(cover_letter.split())

        return CoverLetterResponse(
            cover_letter=cover_letter,
            tone=body.tone,
            word_count=word_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cover letter generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cover letter generation failed: {str(e)}",
        )


def _generate_template_cover_letter(
    resume: Dict[str, Any],
    job_description: str,
    tone: str,
    company_name: Optional[str],
    hiring_manager: Optional[str],
) -> str:
    """Generate a template-based cover letter when AI is unavailable."""
    import datetime

    date = datetime.datetime.now().strftime("%B %d, %Y")

    # Build greeting
    if hiring_manager:
        greeting = f"Dear {hiring_manager},"
    else:
        greeting = "Dear Hiring Manager,"

    # Get candidate info
    name = resume.get("name", resume.get("contact", {}).get("name", "[Your Name]"))
    email = resume.get("email", resume.get("contact", {}).get("email", "[Your Email]"))
    phone = resume.get("phone", resume.get("contact", {}).get("phone", ""))
    role = resume.get("role", resume.get("title", "the position"))
    summary = resume.get("summary", "")

    # Get experience highlights
    experience = resume.get("experience", [])
    highlights = []
    for exp in experience[:2]:
        highlights.append(f"- {exp.get('role', 'Position')} at {exp.get('company', 'Company')}")

    # Build tone-specific closing
    tone_closings = {
        "formal": "I look forward to the opportunity to discuss how my skills and experience would benefit your organization.",
        "conversational": "I'd love to chat about how I can bring my experience to your team.",
        "enthusiastic": "I'm thrilled about the opportunity to contribute and make an impact!",
    }
    tone_closing = tone_closings.get(tone, tone_closings["formal"])

    # Build the letter
    letter = f"""{date}

{greeting}

I am writing to express my strong interest in the {role} position at {company_name or '[Company Name]'}. With my background in this field, I believe I would be a valuable addition to your team.

{summary if summary else f"I bring several years of experience and a proven track record of success in my field."}

In my previous roles, I have demonstrated:
{chr(10).join(highlights) if highlights else "- Relevant work experience"}

{tone_closing}

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience would benefit {company_name or 'your organization'}.

Sincerely,
{name}
{email}
{phone if phone else ''}"""

    # Clean up extra newlines
    while "\n\n\n" in letter:
        letter = letter.replace("\n\n\n", "\n\n")

    return letter.strip()
