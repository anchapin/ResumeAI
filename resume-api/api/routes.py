"""
FastAPI routes for Resume API.
"""

import io
import os
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

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
from monitoring import logging_config  # noqa: E402


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
logger = logging_config.get_logger(__name__)

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
        500: {"model": ErrorResponse},
    },
    tags=["Variants"],
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


# DOCX Export Functions

def create_docx_from_resume(resume_data: dict) -> bytes:
    """
    Generate a DOCX file from resume data.
    
    Args:
        resume_data: Resume data in JSON Resume format
        
    Returns:
        DOCX file as bytes
    """
    doc = Document()
    
    # Get basics
    basics = resume_data.get("basics", {})
    
    # Title - Name
    if basics.get("name"):
        title = doc.add_heading(basics["name"], 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Headline
    if basics.get("headline"):
        headline = doc.add_paragraph(basics["headline"])
        headline.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Contact info
    contact_parts = []
    if basics.get("email"):
        contact_parts.append(basics["email"])
    if basics.get("phone"):
        contact_parts.append(basics["phone"])
    if basics.get("location"):
        location = basics["location"]
        if isinstance(location, dict):
            location_str = ", ".join(filter(None, [location.get("city"), location.get("region")]))
        else:
            location_str = str(location)
        if location_str:
            contact_parts.append(location_str)
    
    if basics.get("url"):
        contact_parts.append(basics["url"])
    
    if contact_parts:
        contact_para = doc.add_paragraph(" | ".join(contact_parts))
        contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_paragraph()  # Empty line
    
    # Summary
    if basics.get("summary"):
        doc.add_heading("Summary", level=1)
        doc.add_paragraph(basics["summary"])
    
    # Work Experience
    work = resume_data.get("work", [])
    if work:
        doc.add_heading("Experience", level=1)
        for job in work:
            # Job title and company
            job_title = job.get("position", "")
            company = job.get("company", "")
            if job_title or company:
                job_para = doc.add_paragraph()
                if job_title:
                    run = job_para.add_run(job_title)
                    run.bold = True
                if company:
                    if job_title:
                        job_para.add_run(" at ")
                    run = job_para.add_run(company)
                    run.italic = True
            
            # Dates
            dates = []
            if job.get("startDate"):
                dates.append(job["startDate"])
            if job.get("endDate"):
                dates.append(job["endDate"])
            elif job.get("current"):
                dates.append("Present")
            
            if dates:
                date_para = doc.add_paragraph(" - ".join(dates))
                date_para.runs[0].italic = True
            
            # Description/Summary
            if job.get("summary"):
                doc.add_paragraph(job["summary"])
            
            # Highlights
            highlights = job.get("highlights", [])
            for highlight in highlights:
                doc.add_paragraph(highlight, style="List Bullet")
            
            doc.add_paragraph()  # Empty line between jobs
    
    # Education
    education = resume_data.get("education", [])
    if education:
        doc.add_heading("Education", level=1)
        for edu in education:
            # Degree and institution
            parts = []
            if edu.get("studyType"):
                parts.append(edu["studyType"])
            if edu.get("area"):
                parts.append(edu["area"])
            if edu.get("institution"):
                parts.append(edu["institution"])
            
            if parts:
                edu_para = doc.add_paragraph()
                run = edu_para.add_run(" - ".join(parts[:2]))
                run.bold = True
                if len(parts) > 2:
                    edu_para.add_run(f" at {parts[2]}")
            
            # Dates
            dates = []
            if edu.get("startDate"):
                dates.append(edu["startDate"])
            if edu.get("endDate"):
                dates.append(edu["endDate"])
            
            if dates:
                date_para = doc.add_paragraph(" - ".join(dates))
                date_para.runs[0].italic = True
            
            doc.add_paragraph()
    
    # Skills
    skills = resume_data.get("skills", [])
    if skills:
        doc.add_heading("Skills", level=1)
        
        # Group skills by category if available
        skill_names = []
        for skill in skills:
            if isinstance(skill, dict):
                name = skill.get("name", "")
                if name:
                    skill_names.append(name)
            elif isinstance(skill, str):
                skill_names.append(skill)
        
        if skill_names:
            skills_para = doc.add_paragraph(", ".join(skill_names))
    
    # Save to bytes
    docx_bytes = io.BytesIO()
    doc.save(docx_bytes)
    docx_bytes.seek(0)
    
    return docx_bytes.getvalue()


@router.post(
    "/v1/export/docx",
    response_class=Response,
    responses={
        200: {"content": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {}}, "description": "DOCX resume file"},
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Export"],
)
@rate_limit(settings.rate_limit_pdf)
async def export_docx(request: Request, body: ResumeRequest, auth: AuthorizedAPIKey):
    """
    Generate a DOCX resume from resume data.
    
    Requires API key authentication via X-API-KEY header.
    
    Rate limit: 10 requests per minute per API key.
    
    Args:
        request: FastAPI Request object
        body: ResumeRequest containing resume_data and variant
        auth: API key authentication info
    
    Returns:
        DOCX file as binary response
    """
    try:
        # Convert Pydantic model to dict
        resume_dict = body.resume_data.model_dump(exclude_none=True)
        
        # Generate DOCX
        docx_bytes = create_docx_from_resume(resume_dict)
        
        # Return DOCX response
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="resume_{body.variant or "docx"}.docx"'
            },
        )
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DOCX generation failed: {str(e)}",
        )
