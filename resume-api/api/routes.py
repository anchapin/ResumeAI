"""
FastAPI routes for Resume API.
"""

import io
import os
import re
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, status
from fastapi.responses import Response

import fitz  # PyMuPDF for PDF parsing
import docx  # python-docx for DOCX parsing

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


# PDF Import Endpoint and Helper Functions

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content from PDF file."""
    try:
        doc = fitz.open(stream=file_bytes, doc_type="pdf")
    except Exception as e:
        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")
    
    text_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            text_parts.append(text)
    
    doc.close()
    
    if not text_parts:
        raise ValueError("No text content found in PDF. This may be a scanned image.")
    
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text content from DOCX file."""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Invalid or corrupted DOCX file: {str(e)}")
    
    text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            text_parts.append(para.text)
    
    # Also extract text from tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    text_parts.append(cell.text)
    
    if not text_parts:
        raise ValueError("No text content found in DOCX file.")
    
    return "\n".join(text_parts)


def parse_resume_text(text: str) -> dict:
    """Parse extracted text into JSON Resume format."""
    lines = text.split("\n")
    resume = {
        "basics": {},
        "work": [],
        "education": [],
        "skills": [],
    }
    
    # Email pattern
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    # Phone pattern (various formats)
    phone_pattern = r'(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    
    # Extract contact info from first few lines
    name_candidates = []
    for line in lines[:10]:
        line = line.strip()
        if not line:
            continue
        email_match = re.search(email_pattern, line)
        if email_match and not resume["basics"].get("email"):
            resume["basics"]["email"] = email_match.group()
        phone_match = re.search(phone_pattern, line)
        if phone_match and not resume["basics"].get("phone"):
            resume["basics"]["phone"] = phone_match.group()
        if not resume["basics"].get("name") and len(line) > 2 and len(line) < 50:
            if "@" not in line and not re.search(phone_pattern, line):
                name_candidates.append(line)
    
    if name_candidates:
        resume["basics"]["name"] = name_candidates[0]
    
    # Detect sections
    section_keywords = {
        "experience": ["experience", "employment", "work history", "professional experience"],
        "education": ["education", "academic", "degree", "university", "college"],
        "skills": ["skills", "technical skills", "competencies", "technologies"],
        "summary": ["summary", "objective", "profile", "about"],
    }
    
    work_entries = []
    education_entries = []
    skills_list = []
    summary_text = []
    current_section = None
    
    for line in lines:
        line_lower = line.lower().strip()
        
        detected_section = None
        for section, keywords in section_keywords.items():
            if any(kw in line_lower for kw in keywords):
                if len(line) < 30:
                    detected_section = section
                    break
        
        if detected_section:
            current_section = detected_section
            continue
        
        if current_section == "experience" and line.strip():
            work_entries.append(line.strip())
        elif current_section == "education" and line.strip():
            education_entries.append(line.strip())
        elif current_section == "skills" and line.strip():
            skills_list.append(line.strip())
        elif current_section == "summary" and line.strip():
            summary_text.append(line.strip())
    
    # Build work experience entries
    if work_entries:
        work = []
        current_entry = {}
        for entry in work_entries:
            if re.match(r'\d{4}\s*[-–]\s*\d{4}|\d{4}\s*[-–]\s*present', entry, re.IGNORECASE):
                if current_entry:
                    work.append(current_entry)
                current_entry = {"position": "", "company": "", "startDate": "", "endDate": "", "highlights": []}
                current_entry["startDate"], current_entry["endDate"] = extract_dates(entry)
            elif current_entry is not None:
                if not current_entry.get("company"):
                    current_entry["company"] = entry
                elif not current_entry.get("position"):
                    current_entry["position"] = entry
                else:
                    if "highlights" not in current_entry:
                        current_entry["highlights"] = []
                    current_entry["highlights"].append(entry)
        
        if current_entry and current_entry.get("company"):
            work.append(current_entry)
        
        if work:
            resume["work"] = work
    
    # Build education entries
    if education_entries:
        education = []
        for entry in education_entries:
            edu = {}
            degree_keywords = ["phd", "master", "bachelor", "associate", "degree"]
            if any(kw in entry.lower() for kw in degree_keywords):
                edu["studyType"] = entry
            else:
                edu["institution"] = entry
            
            dates = extract_dates(entry)
            if dates[0]:
                edu["startDate"] = dates[0]
            if dates[1]:
                edu["endDate"] = dates[1]
            
            if edu:
                education.append(edu)
        
        if education:
            resume["education"] = education
    
    # Build skills section
    if skills_list:
        all_skills = []
        for skill_line in skills_list:
            parts = re.split(r'[,;|\n]', skill_line)
            for part in parts:
                part = part.strip()
                if part and len(part) < 50:
                    all_skills.append(part)
        
        if all_skills:
            resume["skills"] = [{"name": s} for s in all_skills[:20]]
    
    # Add summary if found
    if summary_text:
        resume["basics"]["summary"] = " ".join(summary_text[:3])
    
    return resume


def extract_dates(text: str) -> tuple:
    """Extract start and end dates from text."""
    date_pattern = r'(\d{4})\s*[-–]\s*(\d{4}|present|current)'
    match = re.search(date_pattern, text, re.IGNORECASE)
    
    if match:
        start_date = match.group(1)
        end_date = match.group(2)
        if end_date.lower() in ["present", "current"]:
            end_date = ""
        return (start_date, end_date)
    
    return ("", "")


@router.post(
    "/v1/import/pdf",
    response_model=ResumeData,
    responses={
        200: {"model": ResumeData, "description": "Imported resume data"},
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Import"],
)
@rate_limit("10/minute")
async def import_pdf(request: Request, file: UploadFile = File(...), auth: AuthorizedAPIKey = None):
    """Import resume from PDF file."""
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF files are accepted.",
        )
    
    try:
        content = await file.read()
        
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10MB.",
            )
        
        text = extract_text_from_pdf(content)
        resume_data = parse_resume_text(text)
        
        return ResumeData(**resume_data)
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF import failed: {str(e)}",
        )


@router.post(
    "/v1/import/docx",
    response_model=ResumeData,
    responses={
        200: {"model": ResumeData, "description": "Imported resume data"},
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Import"],
)
@rate_limit("10/minute")
async def import_docx(request: Request, file: UploadFile = File(...), auth: AuthorizedAPIKey = None):
    """
    Import resume from DOCX file.
    
    Accepts DOCX file uploads and extracts resume data in JSON Resume format.
    
    Requires API key authentication via X-API-KEY header.
    
    Rate limit: 10 requests per minute per API key.
    """
    # Check file type
    content_type = file.content_type
    if content_type not in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-word.document"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only DOCX files are accepted.",
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Check file size (max 10MB)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10MB.",
            )
        
        # Extract text from DOCX
        text = extract_text_from_docx(content)
        
        # Parse into JSON Resume format
        resume_data = parse_resume_text(text)
        
        # Validate and return
        return ResumeData(**resume_data)
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DOCX import failed: {str(e)}",
        )
