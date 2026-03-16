"""
ATS Compatibility Check API Routes.
"""

import io
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
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


@router.post(
    "/check/bulk",
    response_model=list[ATSCheckResponse],
    status_code=status.HTTP_200_OK,
    summary="Bulk ATS Compatibility Check",
    description="Upload multiple resumes to analyze their ATS compatibility"
)
async def check_ats_compatibility_bulk(
    files: list[UploadFile] = File(..., description="Multiple resume files (PDF, DOCX, or TXT)")
):
    """
    Analyze multiple resumes for ATS compatibility.
    
    - **files**: List of resume files (max 10 files per request)
    
    Returns:
    - List of ATS compatibility results
    """
    # Limit number of files
    MAX_BULK_FILES = 10
    if len(files) > MAX_BULK_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_BULK_FILES} files allowed per request"
        )
    
    results = []
    
    for file in files:
        # Validate file type
        try:
            file_type = validate_file_type(file.filename or "unknown")
        except HTTPException:
            continue
        
        # Read file content
        try:
            content = await file.read()
        except Exception:
            continue
        
        # Skip empty or too large files
        if len(content) == 0 or len(content) > MAX_FILE_SIZE:
            continue
        
        # Analyze file
        try:
            result = ats_analyzer.analyze(content, file.filename or "unknown")
            results.append(ATSCheckResponse(
                file_type=result.file_type,
                ats_score=result.ats_score,
                is_parseable=result.is_parseable,
                word_count=result.word_count,
                issues=[issue.to_dict() for issue in result.issues],
                parsed_text=result.parsed_text,
                calculation_time_ms=result.calculation_time_ms
            ))
        except Exception:
            continue
    
    return results


# ATS History endpoint - requires database
try:
    from database import ATSHistory, get_db_session
    HAS_DATABASE = True
except ImportError:
    HAS_DATABASE = False


class ATSHistoryResponse(BaseModel):
    """Response model for ATS history"""
    id: int
    resume_id: Optional[int] = None
    file_type: str
    ats_score: int
    is_parseable: bool
    word_count: int
    issues_count: int
    analysis_time_ms: float
    created_at: str


@router.get(
    "/history",
    response_model=list[ATSHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get ATS Score History",
    description="Get the history of ATS checks for the current user"
)
async def get_ats_history(
    limit: int = Query(10, ge=1, le=100, description="Number of results to return"),
    resume_id: Optional[int] = Query(None, description="Filter by specific resume"),
    skip_db: bool = Query(False, description="Skip database storage (for testing)")
):
    """
    Get ATS score history for the authenticated user.
    
    Returns:
    - List of previous ATS checks with scores and timestamps
    """
    # For now, return empty list if database is not available
    if not HAS_DATABASE or skip_db:
        return []
    
    # TODO: Implement actual database query when user auth is integrated
    # This would query the ATSHistory table filtered by user_id
    return []


@router.post(
    "/history",
    response_model=ATSHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save ATS Check to History",
    description="Save an ATS check result to history"
)
async def save_ats_history(
    file_type: str,
    ats_score: int,
    is_parseable: bool,
    word_count: int,
    issues: list[dict],
    analysis_time_ms: float,
    resume_id: Optional[int] = None,
    skip_db: bool = Query(False, description="Skip database storage (for testing)")
):
    """
    Save an ATS check result to history.
    
    Returns:
    - The saved history entry
    """
    if not HAS_DATABASE or skip_db:
        # Return a mock response when database is not available
        return ATSHistoryResponse(
            id=0,
            resume_id=resume_id,
            file_type=file_type,
            ats_score=ats_score,
            is_parseable=is_parseable,
            word_count=word_count,
            issues_count=len(issues),
            analysis_time_ms=analysis_time_ms,
            created_at=datetime.utcnow().isoformat()
        )
    
    # TODO: Implement actual database insert when user auth is integrated
    return ATSHistoryResponse(
        id=0,
        resume_id=resume_id,
        file_type=file_type,
        ats_score=ats_score,
        is_parseable=is_parseable,
        word_count=word_count,
        issues_count=len(issues),
        analysis_time_ms=analysis_time_ms,
        created_at=datetime.utcnow().isoformat()
    )
