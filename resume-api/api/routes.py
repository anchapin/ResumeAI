"""
FastAPI routes for Resume API.
"""

import logging
import os
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response

from .models import (
    ResumeRequest,
    TailorRequest,
    VariantsResponse,
    VariantMetadata,
    TailoredResumeResponse,
    ErrorResponse,
    ResumeData,
)

# Setup library path
lib_path = Path(__file__).parent.parent
sys.path.insert(0, str(lib_path))

from lib.cli import ResumeGenerator, ResumeTailorer, VariantManager  # noqa: E402

# Import authentication and rate limiting
from config.dependencies import AuthorizedAPIKey, limiter  # noqa: E402
from config import settings  # noqa: E402


# Helper function to conditionally apply rate limiting
def rate_limit(limit_value: str):
    """
    Decorator that applies rate limiting only when enabled.

    Args:
        limit_value: Rate limit string (e.g., "10/minute")

    Returns:
        Decorator function or identity if disabled
    """
    if settings.enable_rate_limiting:
        return limiter.limit(limit_value)
    else:
        # Return identity decorator (no-op)
        return lambda f: f

# Configure logging
logger = logging.getLogger(__name__)

# Initialize components
LIB_DIR = Path(__file__).parent.parent
TEMPLATES_DIR = LIB_DIR / "templates"

router = APIRouter()

# Initialize managers
variant_manager = VariantManager(str(TEMPLATES_DIR))


@router.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@router.post(
    "/v1/render/pdf",
    response_class=Response,
    responses={
        200: {"content": {"application/pdf": {}}, "description": "PDF resume file"},
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Rendering"],
)
@rate_limit(settings.rate_limit_pdf)
async def render_pdf(request: Request, body: ResumeRequest, auth: AuthorizedAPIKey):
    """
    Generate a PDF resume from resume data.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 10 requests per minute per API key.

    Args:
        request: FastAPI Request object
        body: ResumeRequest containing resume_data and variant
        auth: API key authentication info

    Returns:
        PDF file as binary response
    """
    try:
        # Convert Pydantic model to dict
        resume_dict = body.resume_data.model_dump(exclude_none=True)

        # Initialize generator
        generator = ResumeGenerator(
            templates_dir=str(TEMPLATES_DIR), lib_dir=str(LIB_DIR)
        )

        # Generate PDF
        pdf_bytes = generator.generate_pdf(
            resume_data=resume_dict, variant=body.variant
        )

        # Return PDF response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="resume_{body.variant}.pdf"'
            },
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(e)}",
        )


@router.post(
    "/v1/tailor",
    response_model=TailoredResumeResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Tailoring"],
)
@rate_limit(settings.rate_limit_tailor)
async def tailor_resume(request: Request, body: TailorRequest, auth: AuthorizedAPIKey):
    """
    Tailor a resume to match a job description.

    Requires API key authentication via X-API-KEY header.

    Rate limit: 30 requests per minute per API key.

    Args:
        request: FastAPI Request object
        body: TailorRequest containing resume_data and job_description
        auth: API key authentication info

    Returns:
        TailoredResumeResponse with modified resume data
    """
    try:
        # Convert Pydantic model to dict
        resume_dict = body.resume_data.model_dump(exclude_none=True)

        # Initialize tailorer
        ai_provider = os.getenv("AI_PROVIDER", "openai")
        tailorer = ResumeTailorer(
            ai_provider=ai_provider,
            api_key=os.getenv(f"{ai_provider.upper()}_API_KEY"),
            model=os.getenv("AI_MODEL"),
        )

        # Tailor resume
        tailored_dict = tailorer.tailor_resume(
            resume_data=resume_dict,
            job_description=body.job_description,
            company_name=body.company_name,
            job_title=body.job_title,
        )

        # Get keywords
        keywords = tailorer.extract_keywords(body.job_description)

        # Get suggestions
        suggestions = tailorer.suggest_improvements(
            resume_data=resume_dict, job_description=body.job_description
        )

        # Convert back to Pydantic model
        tailored_data = ResumeData(**tailored_dict)

        return TailoredResumeResponse(
            resume_data=tailored_data, keywords=keywords, suggestions=suggestions
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume tailoring failed: {str(e)}",
        )


@router.get(
    "/v1/variants",
    response_model=VariantsResponse,
    responses={
        200: {"description": "List of variants"},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    tags=["Variants"]
)
@rate_limit(settings.rate_limit_variants)
async def list_variants(request: Request):
    """
    List all available resume template variants.

    Rate limit: 60 requests per minute per API key.

    Returns:
        VariantsResponse with list of available variants
    """
    try:
        variants = variant_manager.list_variants()

        variant_metadata = []
        for variant in variants:
            metadata = variant_manager.get_variant_metadata(variant)
            variant_metadata.append(VariantMetadata(**metadata))

        return VariantsResponse(variants=variant_metadata)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list variants: {str(e)}",
        )


@router.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Resume API",
        "version": "1.0.0",
        "description": "API for generating and tailoring professional resumes",
        "endpoints": {
            "health": "/health",
            "render_pdf": "/v1/render/pdf",
            "tailor": "/v1/tailor",
            "variants": "/v1/variants",
            "docs": "/docs",
        },
    }
