"""
FastAPI routes for Resume API.
"""

import os
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
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

from lib.cli import ResumeGenerator, ResumeTailorer, VariantManager

from config.dependencies import AuthorizedAPIKey

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
        500: {"model": ErrorResponse},
    },
    tags=["Rendering"],
)
async def render_pdf(request: ResumeRequest, auth: AuthorizedAPIKey):
    """
    Generate a PDF resume from resume data.

    Requires API key authentication via X-API-KEY header.

    Args:
        request: ResumeRequest containing resume_data and variant
        auth: API key authentication info

    Returns:
        PDF file as binary response
    """
    try:
        # Convert Pydantic model to dict
        resume_dict = request.resume_data.model_dump(exclude_none=True)

        # Initialize generator
        generator = ResumeGenerator(
            templates_dir=str(TEMPLATES_DIR), lib_dir=str(LIB_DIR)
        )

        # Generate PDF
        pdf_bytes = generator.generate_pdf(
            resume_data=resume_dict, variant=request.variant
        )

        # Return PDF response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="resume_{request.variant}.pdf"'
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
        500: {"model": ErrorResponse},
    },
    tags=["Tailoring"],
)
async def tailor_resume(request: TailorRequest, auth: AuthorizedAPIKey):
    """
    Tailor a resume to match a job description.

    Requires API key authentication via X-API-KEY header.

    Args:
        request: TailorRequest containing resume_data and job_description
        auth: API key authentication info

    Returns:
        TailoredResumeResponse with modified resume data
    """
    try:
        # Convert Pydantic model to dict
        resume_dict = request.resume_data.model_dump(exclude_none=True)

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
            job_description=request.job_description,
            company_name=request.company_name,
            job_title=request.job_title,
        )

        # Get keywords
        keywords = tailorer.extract_keywords(request.job_description)

        # Get suggestions
        suggestions = tailorer.suggest_improvements(
            resume_data=resume_dict, job_description=request.job_description
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


@router.get("/v1/variants", response_model=VariantsResponse, tags=["Variants"])
async def list_variants():
    """
    List all available resume template variants.

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
