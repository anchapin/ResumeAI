"""
Auto-Complete API endpoints.

Provides AI-powered completion suggestions for resume editing.
"""

import logging
import time
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from lib.autocomplete.context_analyzer import ContextAnalyzer
from lib.autocomplete.models import CompletionFeedback, CompletionRequest
from lib.autocomplete.personalization import PersonalizationEngine
from lib.autocomplete.streaming import StreamingHandler
from lib.autocomplete.suggestion_engine import SuggestionEngine

router = APIRouter(prefix="/api/v1/autocomplete", tags=["Auto-Complete"])

logger = logging.getLogger(__name__)


# Request/Response models


class AutocompleteRequest(BaseModel):
    """Request for completions."""

    text: str = Field(..., min_length=1, max_length=10000)
    cursor_position: int = Field(0, ge=0)
    section_type: str | None = None
    role: str | None = None
    limit: int = Field(5, ge=1, le=10)


class CompletionItem(BaseModel):
    """Individual completion item."""

    id: str
    text: str
    type: str
    confidence: float
    source: str | None = None


class AutocompleteResponse(BaseModel):
    """Response with completions."""

    completions: list[CompletionItem]
    context: dict[str, Any]
    processing_time_ms: float
    has_more: bool = False


class BulletRequest(BaseModel):
    """Request for bullet completions."""

    section_type: str
    role: str | None = None
    industry: str | None = None
    seniority: str | None = None
    limit: int = Field(3, ge=1, le=10)


class BulletResponse(BaseModel):
    """Response with bullet suggestions."""

    bullets: list[str]
    processing_time_ms: float


class ContextResponse(BaseModel):
    """Response with context analysis."""

    section_type: str
    writing_style: dict[str, Any]
    detected_role: str | None
    seniority_level: str | None
    bullet_structure: dict[str, Any]


class FeedbackRequest(BaseModel):
    """Request for completion feedback."""

    completion_id: str
    accepted: bool
    context: dict[str, Any] = Field(default_factory=dict)


# Helper functions


def get_suggestion_engine() -> SuggestionEngine:
    """Get suggestion engine instance."""
    return SuggestionEngine()


def get_context_analyzer() -> ContextAnalyzer:
    """Get context analyzer instance."""
    return ContextAnalyzer()


def get_personalization() -> PersonalizationEngine:
    """Get personalization engine instance."""
    return PersonalizationEngine()


def get_streaming_handler() -> StreamingHandler:
    """Get streaming handler instance."""
    return StreamingHandler()


# Endpoints


@router.post("/suggest", response_model=AutocompleteResponse)
async def get_completions(request: AutocompleteRequest):
    """
    Get completion suggestions for text.

    Provides inline completions as user types.
    Returns multiple options ranked by relevance.

    **Response:**
    - `completions`: List of completion suggestions
    - `context`: Analyzed context
    - `processing_time_ms`: Time taken
    """
    start_time = time.time()

    try:
        engine = get_suggestion_engine()
        analyzer = get_context_analyzer()

        # Analyze context
        context = analyzer.analyze(request.text, request.cursor_position)

        # Get completions
        completion_request = CompletionRequest(
            text=request.text,
            cursor_position=request.cursor_position,
            section_type=request.section_type or context.get("section_type"),
            role=request.role or context.get("detected_role"),
            limit=request.limit,
        )

        response = await engine.get_completions(completion_request)

        processing_time = (time.time() - start_time) * 1000

        return AutocompleteResponse(
            completions=[
                CompletionItem(
                    id=c.id,
                    text=c.text,
                    type=c.type,
                    confidence=c.confidence,
                    source=c.source,
                )
                for c in response.completions
            ],
            context=context,
            processing_time_ms=round(processing_time, 2),
            has_more=response.has_more,
        )

    except Exception as e:
        logger.error(f"Completion request failed: {e}")
        raise HTTPException(500, f"Failed to get completions: {str(e)}")


@router.post("/bullet", response_model=BulletResponse)
async def get_bullet_completions(request: BulletRequest):
    """
    Get bullet point completions.

    Generates full bullet point suggestions for sections.
    Useful for starting new bullets or empty sections.

    **Response:**
    - `bullets`: List of bullet point suggestions
    - `processing_time_ms`: Time taken
    """
    try:
        engine = get_suggestion_engine()

        bullets = await engine.get_bullet_completions(
            section_type=request.section_type,
            role=request.role,
            industry=request.industry,
            seniority=request.seniority,
            limit=request.limit,
        )

        return BulletResponse(
            bullets=bullets,
            processing_time_ms=0,  # Would be calculated
        )

    except Exception as e:
        logger.error(f"Bullet completion failed: {e}")
        raise HTTPException(500, f"Failed to get bullet completions: {str(e)}")


@router.get("/context", response_model=ContextResponse)
async def analyze_context(text: str, cursor_pos: int = 0):
    """
    Analyze text context.

    Detects section type, writing style, and structure.
    Useful for understanding user's current context.

    **Query Parameters:**
    - `text`: Text to analyze
    - `cursor_pos`: Cursor position
    """
    try:
        analyzer = get_context_analyzer()
        context = analyzer.analyze(text, cursor_pos)

        return ContextResponse(
            section_type=context.get("section_type", "experience"),
            writing_style=context.get("writing_style", {}),
            detected_role=context.get("detected_role"),
            seniority_level=context.get("seniority_level"),
            bullet_structure=context.get("bullet_structure", {}),
        )

    except Exception as e:
        logger.error(f"Context analysis failed: {e}")
        raise HTTPException(500, f"Failed to analyze context: {str(e)}")


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit feedback on a completion.

    Tracks accepted/rejected completions for personalization.

    **Request:**
    - `completion_id`: ID of completion
    - `accepted`: Whether it was accepted
    - `context`: Optional context
    """
    try:
        personalization = get_personalization()

        # Record feedback (async, don't wait)
        if request.accepted:
            # Would need completion text in production
            pass
        else:
            await personalization.record_rejection(
                user_id="anonymous",  # Would get from auth
                completion_id=request.completion_id,
                context=request.context,
            )

        return {"success": True, "completion_id": request.completion_id}

    except Exception as e:
        logger.error(f"Feedback submission failed: {e}")
        raise HTTPException(500, f"Failed to submit feedback: {str(e)}")


@router.get("/stream")
async def stream_completions(text: str, section_type: str | None = None):
    """
    Stream completions in real-time.

    Uses Server-Sent Events (SSE) for streaming responses.

    **Query Parameters:**
    - `text`: Text to complete
    - `section_type`: Optional section type
    """
    try:
        handler = get_streaming_handler()
        completion_id = str(uuid.uuid4())

        prompt = f"Complete this resume text: {text}"

        return StreamingResponse(
            handler.stream_completion(prompt, completion_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        logger.error(f"Streaming failed: {e}")
        raise HTTPException(500, f"Streaming failed: {str(e)}")


@router.get("/stream/bullet")
async def stream_bullet_completions(
    section_type: str,
    role: str | None = None,
):
    """
    Stream bullet point completions.

    Uses Server-Sent Events for streaming bullet suggestions.

    **Query Parameters:**
    - `section_type`: Type of section
    - `role`: Optional role/title
    """
    try:
        handler = get_streaming_handler()
        completion_id = str(uuid.uuid4())

        return StreamingResponse(
            handler.stream_bullet_completions(section_type, role, completion_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        logger.error(f"Bullet streaming failed: {e}")
        raise HTTPException(500, f"Bullet streaming failed: {str(e)}")
