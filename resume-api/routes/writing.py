"""
Writing Assistant API endpoints.

Provides real-time AI-powered writing suggestions for resume editing.
"""

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..database import WritingSuggestion
from ..lib.writing_assistant.ai_enhancer import AIEnhancer, AIEnhancerConfig
from ..lib.writing_assistant.grammar_checker import GrammarChecker, GrammarCheckerConfig
from ..lib.writing_assistant.service import WritingAssistantService, WritingAssistantConfig
from ..lib.writing_assistant.suggestion_manager import SuggestionManager
from ..lib.writing_assistant.style_analyzer import StyleAnalyzer, StyleAnalyzerConfig

router = APIRouter(prefix="/api/v1/writing", tags=["Writing Assistant"])

logger = logging.getLogger(__name__)


# Dependency injection for services
def get_writing_service() -> WritingAssistantService:
    """Get writing assistant service instance."""
    config = WritingAssistantConfig(
        grammar_checker=GrammarCheckerConfig(
            api_url="http://languagetool:8010",
            enabled=True,
        ),
        style_analyzer=StyleAnalyzerConfig(
            enabled=True,
        ),
        ai_enhancer=AIEnhancerConfig(
            enabled=True,
            use_cache=True,
        ),
        enabled=True,
    )
    return WritingAssistantService(config=config)


def get_suggestion_manager(db_session) -> SuggestionManager:
    """Get suggestion manager instance."""
    return SuggestionManager(db_session)


# Request/Response models


class SuggestionRequest(BaseModel):
    """Request for writing suggestions."""

    text: str = Field(..., min_length=1, max_length=10000, description="Text to analyze")
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context (section_type, role, industry, etc.)",
    )


class SuggestionItem(BaseModel):
    """Individual suggestion item."""

    id: str
    type: str  # spelling, grammar, style, enhancement
    severity: str  # error, warning, info
    message: str
    offset: int
    length: int
    replacements: list[str]
    explanation: str
    rule_id: str
    confidence: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class SuggestionResponse(BaseModel):
    """Response with writing suggestions."""

    suggestions: list[SuggestionItem]
    processing_time_ms: float
    cache_hit: bool = False
    quality_score: float | None = None


class GrammarCheckRequest(BaseModel):
    """Request for grammar check."""

    text: str = Field(..., min_length=1, max_length=10000)


class GrammarCheckResponse(BaseModel):
    """Response with grammar check results."""

    suggestions: list[SuggestionItem]
    error_count: int
    warning_count: int
    processing_time_ms: float


class EnhancementRequest(BaseModel):
    """Request for AI enhancement."""

    text: str = Field(..., min_length=1, max_length=5000)
    enhancement_type: str = Field(
        ...,
        description="Type of enhancement: action_verbs, quantification, star, ats",
    )
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Context (role, industry, jd_keywords, etc.)",
    )


class EnhancementResponse(BaseModel):
    """Response with AI enhancement result."""

    original: str
    enhanced: str
    enhancement_type: str
    changes: list[dict[str, Any]]
    confidence: float
    explanation: str


class QuantifyRequest(BaseModel):
    """Request for achievement quantification."""

    text: str = Field(..., min_length=10, max_length=2000)
    role: str = Field(default="", description="Role context")


class QualityAssessmentRequest(BaseModel):
    """Request for section quality assessment."""

    text: str = Field(..., min_length=1, max_length=10000)
    section_type: str = Field(..., description="Section type: experience, education, etc.")
    context: dict[str, Any] = Field(default_factory=dict)


class QualityAssessmentResponse(BaseModel):
    """Response with quality assessment."""

    quality_score: float
    grade: str  # A, B, C, D, F
    suggestion_count: int
    error_count: int
    recommendations: list[str]


class SuggestionHistoryRequest(BaseModel):
    """Request for suggestion history."""

    limit: int = Field(default=50, ge=1, le=200)
    status: str | None = Field(default=None, description="Filter by status")


class SuggestionHistoryResponse(BaseModel):
    """Response with suggestion history."""

    suggestions: list[dict[str, Any]]
    total_count: int
    stats: dict[str, Any]


class UpdateSuggestionStatusRequest(BaseModel):
    """Request to update suggestion status."""

    suggestion_id: str
    status: str  # accepted, rejected, ignored


# Endpoints


@router.post("/suggest", response_model=SuggestionResponse)
async def get_suggestions(
    request: SuggestionRequest,
    service: WritingAssistantService = Depends(get_writing_service),
):
    """
    Get real-time writing suggestions for text.

    Analyzes text for:
    - Grammar and spelling errors
    - Style issues (passive voice, weak verbs)
    - Enhancement opportunities (stronger action verbs, quantification)

    **Response:**
    - `suggestions`: Ranked list of suggestions
    - `processing_time_ms`: Time taken to analyze
    - `quality_score`: Overall quality score (0-100)

    **Suggestion Types:**
    - `spelling`: Spelling errors
    - `grammar`: Grammar issues
    - `style`: Style improvements
    - `enhancement`: AI-powered enhancements
    """
    start_time = time.time()

    try:
        response = await service.get_suggestions(
            text=request.text,
            context=request.context,
        )

        # Convert to response format
        suggestions = [
            SuggestionItem(
                id=s.id,
                type=s.type,
                severity=s.severity,
                message=s.message,
                offset=s.offset,
                length=s.length,
                replacements=s.replacements,
                explanation=s.explanation,
                rule_id=s.rule_id,
                confidence=s.confidence,
                metadata=s.metadata,
            )
            for s in response.suggestions
        ]

        # Calculate quality score
        quality_score = service._calculate_quality_score(request.text, response.suggestions)

        return SuggestionResponse(
            suggestions=suggestions,
            processing_time_ms=round(response.processing_time_ms, 2),
            cache_hit=response.cache_hit,
            quality_score=round(quality_score, 2),
        )

    except Exception as e:
        logger.error(f"Suggestion request failed: {e}")
        raise HTTPException(500, f"Failed to get suggestions: {str(e)}")


@router.post("/grammar", response_model=GrammarCheckResponse)
async def check_grammar(
    request: GrammarCheckRequest,
    service: WritingAssistantService = Depends(get_writing_service),
):
    """
    Check text for grammar and spelling errors.

    Uses LanguageTool for comprehensive grammar checking.

    **Returns:**
    - Grammar errors (subject-verb agreement, tense, etc.)
    - Spelling mistakes
    - Punctuation issues
    """
    try:
        grammar_suggestions = await service.grammar_checker.get_suggestions(
            request.text
        )

        error_count = sum(1 for s in grammar_suggestions if s.severity == "error")
        warning_count = sum(1 for s in grammar_suggestions if s.severity == "warning")

        suggestions = [
            SuggestionItem(
                id=s.id,
                type=s.type,
                severity=s.severity,
                message=s.message,
                offset=s.offset,
                length=s.length,
                replacements=s.replacements,
                explanation=s.explanation,
                rule_id=s.rule_id,
                confidence=s.confidence,
                metadata=s.metadata,
            )
            for s in grammar_suggestions
        ]

        return GrammarCheckResponse(
            suggestions=suggestions,
            error_count=error_count,
            warning_count=warning_count,
            processing_time_ms=0,  # Would be calculated in service
        )

    except Exception as e:
        logger.error(f"Grammar check failed: {e}")
        raise HTTPException(500, f"Grammar check failed: {str(e)}")


@router.post("/enhance", response_model=EnhancementResponse)
async def enhance_text(
    request: EnhancementRequest,
    service: WritingAssistantService = Depends(get_writing_service),
):
    """
    Enhance text with AI-powered suggestions.

    **Enhancement Types:**
    - `action_verbs`: Replace weak verbs with stronger alternatives
    - `quantification`: Add measurable metrics to achievements
    - `star`: Transform using STAR method
    - `ats`: Optimize for ATS keyword matching

    **Context Parameters:**
    - `role`: Target role/title
    - `industry`: Target industry
    - `jd_keywords`: Keywords from job description
    """
    try:
        if request.enhancement_type == "action_verbs":
            result = await service.ai_enhancer.enhance_bullet(
                request.text, request.context
            )
        elif request.enhancement_type == "quantification":
            result = await service.ai_enhancer.quantify_achievement(
                request.text, request.context.get("role", "")
            )
        elif request.enhancement_type == "star":
            result = await service.ai_enhancer.transform_to_star(
                request.text, request.context.get("context", "")
            )
        elif request.enhancement_type == "ats":
            result = await service.ai_enhancer.optimize_for_ats(
                request.text,
                request.context.get("jd_keywords", []),
                request.context.get("role", ""),
            )
        else:
            raise HTTPException(400, f"Unknown enhancement type: {request.enhancement_type}")

        return EnhancementResponse(
            original=result.original,
            enhanced=result.enhanced,
            enhancement_type=result.enhancement_type,
            changes=result.changes,
            confidence=result.confidence,
            explanation=result.explanation,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhancement failed: {e}")
        raise HTTPException(500, f"Enhancement failed: {str(e)}")


@router.post("/quantify", response_model=EnhancementResponse)
async def quantify_achievement(
    request: QuantifyRequest,
    service: WritingAssistantService = Depends(get_writing_service),
):
    """
    Add quantifiable metrics to an achievement bullet.

    Suggests ways to add:
    - Percentages (% improvement, % reduction)
    - Dollar amounts ($ budget, $ revenue)
    - Time metrics (hours saved, days reduced)
    - Volume metrics (# of users, # of projects)
    """
    try:
        result = await service.ai_enhancer.quantify_achievement(
            request.text, request.role
        )

        return EnhancementResponse(
            original=result.original,
            enhanced=result.enhanced,
            enhancement_type=result.enhancement_type,
            changes=result.changes,
            confidence=result.confidence,
            explanation=result.explanation,
        )

    except Exception as e:
        logger.error(f"Quantification failed: {e}")
        raise HTTPException(500, f"Quantification failed: {str(e)}")


@router.get("/quality", response_model=QualityAssessmentResponse)
async def assess_quality(
    request: QualityAssessmentRequest = Depends(),
    service: WritingAssistantService = Depends(get_writing_service),
):
    """
    Assess the overall quality of a resume section.

    Returns:
    - Quality score (0-100)
    - Letter grade (A-F)
    - Specific recommendations for improvement
    """
    try:
        result = await service.get_section_quality(
            section_text=request.text,
            section_type=request.section_type,
            context=request.context,
        )

        return QualityAssessmentResponse(
            quality_score=round(result["quality_score"], 2),
            grade=result["grade"],
            suggestion_count=result["suggestion_count"],
            error_count=result["error_count"],
            recommendations=result["recommendations"],
        )

    except Exception as e:
        logger.error(f"Quality assessment failed: {e}")
        raise HTTPException(500, f"Quality assessment failed: {str(e)}")


@router.get("/history", response_model=SuggestionHistoryResponse)
async def get_history(
    limit: int = 50,
    status: str | None = None,
    # Would need user authentication here
    # user: User = Depends(get_current_user),
):
    """
    Get user's suggestion history.

    **Parameters:**
    - `limit`: Number of results (1-200)
    - `status`: Filter by status (pending, accepted, rejected, ignored)

    **Returns:**
    - List of suggestions with metadata
    - Total count
    - User statistics (acceptance rate, etc.)
    """
    # This would require database session and user auth
    # Placeholder for implementation
    return SuggestionHistoryResponse(
        suggestions=[],
        total_count=0,
        stats={
            "total_suggestions": 0,
            "accepted": 0,
            "rejected": 0,
            "acceptance_rate": 0.0,
        },
    )


@router.post("/history/update")
async def update_suggestion_status(
    request: UpdateSuggestionStatusRequest,
    # Would need user authentication and database session
    # user: User = Depends(get_current_user),
    # db: AsyncSession = Depends(get_db),
):
    """
    Update the status of a suggestion.

    **Status Values:**
    - `accepted`: User applied the suggestion
    - `rejected`: User explicitly rejected
    - `ignored`: User dismissed without action
    """
    # Placeholder for implementation
    # manager = SuggestionManager(db)
    # success = await manager.mark_accepted(request.suggestion_id)
    # or mark_rejected, mark_ignored

    return {"success": True, "suggestion_id": request.suggestion_id, "status": request.status}


@router.get("/stats")
async def get_stats(
    # Would need user authentication and database session
    # user: User = Depends(get_current_user),
    # db: AsyncSession = Depends(get_db),
):
    """
    Get user's writing assistant statistics.

    Returns:
    - Total suggestions received
    - Acceptance rate
    - Most common suggestion types
    - Quality trend over time
    """
    # Placeholder for implementation
    return {
        "total_suggestions": 0,
        "accepted": 0,
        "rejected": 0,
        "acceptance_rate": 0.0,
        "common_types": [],
    }
