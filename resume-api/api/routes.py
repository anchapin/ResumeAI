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
from pydantic import BaseModel

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import docx  # python-docx for DOCX parsing
import httpx  # HTTP client for LinkedIn API
import fitz  # PyMuPDF for PDF parsing

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
from config.dependencies import (
    AuthorizedAPIKey, 
    limiter, 
    check_api_key_rate_limit,
    per_api_key_limiter
)  # noqa: E402
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
    # Apply per-API-key rate limiting
    per_api_key_limiter.set_limit(auth, settings.rate_limit_pdf)
    await check_api_key_rate_limit(auth)
    
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
    # Apply per-API-key rate limiting
    per_api_key_limiter.set_limit(auth, settings.rate_limit_tailor)
    await check_api_key_rate_limit(auth)
    
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
async def list_variants(
    request: Request,
    search: str = None,
    tags: str = None,
    category: str = None,
    industry: str = None,
    layout: str = None,
    color_theme: str = None,
):
    """
    List or filter resume template variants.

    Rate limit: 60 requests per minute per API key.
    
    Query Parameters:
    - search: Search query for name/description
    - tags: Comma-separated list of tags (e.g., "modern,professional")
    - category: Template category (e.g., "technical", "creative")
    - industry: Industry filter (e.g., "technology", "finance")
    - layout: Layout type ("single-column", "double-column")
    - color_theme: Color theme

    Returns:
        VariantsResponse with list of available (or filtered) variants
    """
    try:
        # Parse tags from comma-separated string
        tags_list = None
        if tags:
            tags_list = [t.strip() for t in tags.split(",") if t.strip()]
        
        # Use filter if any filter params provided, otherwise get all with metadata
        if any([search, tags_list, category, industry, layout, color_theme]):
            filtered_variants = variant_manager.filter_variants(
                search=search,
                tags=tags_list,
                category=category,
                industry=industry,
                layout=layout,
                color_theme=color_theme,
            )
            variant_metadata = [VariantMetadata(**v) for v in filtered_variants]
        else:
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


# PDF Import Endpoint and Helper Functions

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text content from PDF file.
    
    Args:
        file_bytes: PDF file content as bytes
        
    Returns:
        Extracted text content
        
    Raises:
        ValueError: If PDF is corrupted or invalid
    """
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


def parse_resume_text(text: str) -> dict:
    """
    Parse extracted text into JSON Resume format.
    
    Args:
        text: Extracted text from PDF
        
    Returns:
        Dictionary in JSON Resume format
    """
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
    
    # Extract contact info from first few lines (usually name at top)
    name_candidates = []
    for line in lines[:10]:
        line = line.strip()
        if not line:
            continue
        # Look for email
        email_match = re.search(email_pattern, line)
        if email_match and not resume["basics"].get("email"):
            resume["basics"]["email"] = email_match.group()
        # Look for phone
        phone_match = re.search(phone_pattern, line)
        if phone_match and not resume["basics"].get("phone"):
            resume["basics"]["phone"] = phone_match.group()
        # First substantial line is likely the name
        if not resume["basics"].get("name") and len(line) > 2 and len(line) < 50:
            if "@" not in line and not re.search(phone_pattern, line):
                name_candidates.append(line)
    
    if name_candidates:
        resume["basics"]["name"] = name_candidates[0]
    
    # Detect sections
    current_section = None
    current_work = {}
    current_education = {}
    
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
    
    for line in lines:
        line_lower = line.lower().strip()
        
        # Check for section headers
        detected_section = None
        for section, keywords in section_keywords.items():
            if any(kw in line_lower for kw in keywords):
                if len(line) < 30:  # Likely a header
                    detected_section = section
                    break
        
        if detected_section:
            current_section = detected_section
            continue
        
        # Add content to appropriate section
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
        # Group consecutive entries into work experiences
        work = []
        current_entry = {}
        for entry in work_entries:
            # Check if this looks like a date line
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
            # Check for degree
            degree_keywords = ["phd", "master", "bachelor", "associate", "degree"]
            if any(kw in entry.lower() for kw in degree_keywords):
                edu["studyType"] = entry
            else:
                edu["institution"] = entry
            
            # Check for dates
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
        # Parse skills - could be comma-separated or newline-separated
        all_skills = []
        for skill_line in skills_list:
            # Split by common separators
            parts = re.split(r'[,;|\n]', skill_line)
            for part in parts:
                part = part.strip()
                if part and len(part) < 50:
                    all_skills.append(part)
        
        if all_skills:
            resume["skills"] = [{"name": s} for s in all_skills[:20]]  # Limit to 20
    
    # Add summary if found
    if summary_text:
        resume["basics"]["summary"] = " ".join(summary_text[:3])
    
    return resume


def extract_dates(text: str) -> tuple:
    """
    Extract start and end dates from text.
    
    Args:
        text: Text containing date information
        
    Returns:
        Tuple of (start_date, end_date)
    """
    # Pattern for year ranges like "2020-2024" or "2020 - Present"
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
    """
    Import resume from PDF file.
    
    Accepts PDF file uploads and extracts resume data in JSON Resume format.
    
    Requires API key authentication via X-API-KEY header.
    
    Rate limit: 10 requests per minute per API key.
    
    Args:
        request: FastAPI Request object
        file: PDF file to import
        auth: API key authentication info (optional)
    
    Returns:
        ResumeData in JSON Resume format
    """
    # Check file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF files are accepted.",
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
        
        # Extract text from PDF
        text = extract_text_from_pdf(content)
        
        # Parse into JSON Resume format
        resume_data = parse_resume_text(text)
        
        # Validate and return
        return ResumeData(**resume_data)
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF import failed: {str(e)}",
        )


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
    
    return "
".join(text_parts)


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


# Request model for LinkedIn import
class LinkedInImportRequest(BaseModel):
    url: str


async def fetch_linkedin_profile(url: str, api_key: str = None) -> dict:
    """
    Fetch LinkedIn profile data using a third-party API.
    
    This uses the LinkedIn Profile Scraper API as an example.
    The API key should be configured via LINKEDIN_SCRAPER_API_KEY environment variable.
    """
    api_key = api_key or os.getenv("LINKEDIN_SCRAPER_API_KEY")
    
    if not api_key:
        raise ValueError(
            "LinkedIn profile import is not configured. "
            "Please set LINKEDIN_SCRAPER_API_KEY environment variable."
        )
    
    # Example API endpoint - this would need to be configured with actual service
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.linkedinprofile.io/v1/scrape",
                json={"url": url},
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0
            )
            
            if response.status_code == 429:
                raise ValueError("Rate limited. Please try again later.")
            elif response.status_code == 404:
                raise ValueError("LinkedIn profile not found or is private.")
            elif response.status_code != 200:
                raise ValueError(f"Failed to fetch LinkedIn profile: {response.text}")
            
            return response.json()
            
        except httpx.TimeoutException:
            raise ValueError("Request timed out. Please try again.")
        except Exception as e:
            raise ValueError(f"Failed to fetch LinkedIn profile: {str(e)}")


def parse_linkedin_to_resume(profile_data: dict) -> dict:
    """Convert LinkedIn profile data to JSON Resume format."""
    resume = {
        "basics": {},
        "work": [],
        "education": [],
        "skills": [],
    }
    
    # Extract basics
    if profile_data.get("fullName"):
        resume["basics"]["name"] = profile_data["fullName"]
    
    if profile_data.get("headline"):
        resume["basics"]["headline"] = profile_data["headline"]
    
    if profile_data.get("email"):
        resume["basics"]["email"] = profile_data["email"]
    
    if profile_data.get("phone"):
        resume["basics"]["phone"] = profile_data["phone"]
    
    if profile_data.get("summary"):
        resume["basics"]["summary"] = profile_data["summary"]
    
    # Location
    if profile_data.get("location"):
        location = profile_data["location"]
        if isinstance(location, dict):
            resume["basics"]["location"] = {
                "city": location.get("city", ""),
                "region": location.get("region", ""),
                "countryCode": location.get("countryCode", "")
            }
        else:
            resume["basics"]["location"] = {"address": str(location)}
    
    # Extract work experience
    for job in profile_data.get("experience", []):
        work_entry = {}
        
        if job.get("title"):
            work_entry["position"] = job["title"]
        
        if job.get("companyName"):
            work_entry["company"] = job["companyName"]
        
        if job.get("startDate"):
            work_entry["startDate"] = job["startDate"]
        
        if job.get("endDate"):
            work_entry["endDate"] = job["endDate"]
        elif job.get("current"):
            work_entry["endDate"] = ""
        
        if job.get("description"):
            work_entry["summary"] = job["description"]
        
        if job.get("highlights"):
            work_entry["highlights"] = job["highlights"]
        
        if work_entry:
            resume["work"].append(work_entry)
    
    # Extract education
    for edu in profile_data.get("education", []):
        edu_entry = {}
        
        if edu.get("schoolName"):
            edu_entry["institution"] = edu["schoolName"]
        
        if edu.get("degreeName"):
            edu_entry["studyType"] = edu["degreeName"]
        
        if edu.get("fieldOfStudy"):
            edu_entry["area"] = edu["fieldOfStudy"]
        
        if edu.get("startDate"):
            edu_entry["startDate"] = edu["startDate"]
        
        if edu.get("endDate"):
            edu_entry["endDate"] = edu["endDate"]
        
        if edu_entry:
            resume["education"].append(edu_entry)
    
    # Extract skills
    for skill in profile_data.get("skills", []):
        if isinstance(skill, str):
            resume["skills"].append({"name": skill})
        elif isinstance(skill, dict) and skill.get("name"):
            resume["skills"].append({"name": skill["name"]})
    
    return resume


@router.post(
    "/v1/import/linkedin",
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
@rate_limit("5/minute")
async def import_linkedin(request: Request, body: LinkedInImportRequest, auth: AuthorizedAPIKey = None):
    """
    Import resume from LinkedIn profile.
    
    Accepts LinkedIn profile URL and fetches profile data using configured API.
    
    Requires API key authentication via X-API-KEY header.
    
    Rate limit: 5 requests per minute per API key.
    
    Configuration:
    - LINKEDIN_SCRAPER_API_KEY: API key for LinkedIn scraping service
    """
    # Validate URL
    linkedin_url = body.url.strip()
    
    # Check if it's a valid LinkedIn URL
    if "linkedin.com" not in linkedin_url.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid LinkedIn profile URL.",
        )
    
    # Check for common LinkedIn URL patterns
    if not re.search(r'linkedin\.com/(in|pub|profile)/', linkedin_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid LinkedIn profile URL format.",
        )
    
    try:
        # Fetch profile data
        profile_data = await fetch_linkedin_profile(linkedin_url)
        
        # Parse to JSON Resume format
        resume_data = parse_linkedin_to_resume(profile_data)
        
        # Return validated data
        return ResumeData(**resume_data)
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LinkedIn import failed: {str(e)}",
        )
