"""
ATS Compatibility Check API Routes.
"""

import io
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from config.dependencies import AuthorizedAPIKey, limiter
from config import settings
from lib.ats import ATSAnalyzer
from monitoring import logging_config

logger = logging_config.get_logger(__name__)
router = APIRouter(prefix="/ats", tags=["ATS"])

# Initialize analyzer
ats_analyzer = ATSAnalyzer()

# Supported file types
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class ATSCheckResponse(BaseModel):
    """Response model for ATS check"""
    file_type: str
    ats_score: int
    is_parseable: bool
    word_count: int
    issues: list[dict]
    parsed_text: str
    calculation_time_ms: float


def validate_file_type(filename: str) -> str:
    """Validate and return file type"""
    import os
    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return ext[1:]  # Remove the dot


async def check_rate_limit():
    """Apply rate limiting if enabled"""
    if settings.enable_rate_limiting:
        # Will be applied via dependency
        pass


@router.post(
    "/check",
    response_model=ATSCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check ATS Compatibility",
    description="Upload a resume to analyze its ATS compatibility score and detect issues"
)
async def check_ats_compatibility(
    file: UploadFile = File(..., description="Resume file (PDF, DOCX, or TXT)")
):
    """
    Analyze a resume for ATS compatibility.
    
    - **file**: Resume file (PDF, DOCX, or TXT format)
    
    Returns:
    - ATS compatibility score (0-100)
    - List of detected issues with severity and fix recommendations
    - Parsed text as ATS would see it
    - Analysis timing
    """
    # Validate file type
    try:
        file_type = validate_file_type(file.filename or "unknown")
    except HTTPException as e:
        raise e
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read file"
        )
    
    # Check file size
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file provided"
        )
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Analyze file
    try:
        result = ats_analyzer.analyze(content, file.filename or "unknown")
    except Exception as e:
        logger.error(f"ATS analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )
    
    return ATSCheckResponse(
        file_type=result.file_type,
        ats_score=result.ats_score,
        is_parseable=result.is_parseable,
        word_count=result.word_count,
        issues=[issue.to_dict() for issue in result.issues],
        parsed_text=result.parsed_text,
        calculation_time_ms=result.calculation_time_ms
    )


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="ATS Service Health Check"
)
async def health_check():
    """Check if ATS service is available"""
    return {"status": "healthy", "service": "ats-compatibility"}
