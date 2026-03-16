"""
Export API Routes for Resume AI.

Provides endpoints for exporting resumes in various formats:
- JSON: JSON Resume standard format
- HTML: Web-ready HTML with embedded CSS
- PDF: Multiple template styles (coming soon)
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse, PlainTextResponse

from api.models import ResumeData
from config.dependencies import limiter
from lib.exporters import JsonExporter, HtmlExporter

router = APIRouter(prefix="/export", tags=["Export"])


# ============================================================================
# JSON Export Endpoints
# ============================================================================


@router.post(
    "/json",
    response_class=JSONResponse,
    status_code=status.HTTP_200_OK,
    summary="Export resume to JSON",
    description="Export resume data to JSON Resume standard format with ResumeAI metadata",
    responses={
        200: {
            "description": "JSON export successful",
            "content": {"application/json": {"example": {"basics": {"name": "John Doe"}}}},
        },
        400: {"description": "Invalid resume data"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit("10/minute")
async def export_to_json(
    request: Request,
    resume_data: ResumeData,
    include_metadata: bool = Query(
        default=True,
        description="Include ResumeAI-specific metadata (tailoring changes, etc.)",
    ),
    title: Optional[str] = Query(default=None, description="Resume title for metadata"),
    tags: Optional[List[str]] = Query(
        default=None, description="Tags for categorization"
    ),
) -> JSONResponse:
    """
    Export resume to JSON Resume format.

    This endpoint converts resume data to the JSON Resume standard format,
    which is widely supported by resume tools and job boards.

    **Features:**
    - Follows JSON Resume schema v1.0.0
    - Optional ResumeAI metadata (tailoring changes, version info)
    - Round-trip compatible (export → import)
    - Preserves all resume sections

    **Use cases:**
    - Version control (Git-friendly)
    - Backup and restore
    - Integration with other tools
    - Developer workflows

    Args:
        request: FastAPI request object
        resume_data: Resume data to export
        include_metadata: Whether to include ResumeAI metadata
        title: Optional title for the resume
        tags: Optional tags for categorization

    Returns:
        JSON response with resume data in JSON Resume format

    Raises:
        HTTPException: If resume data is invalid or export fails
    """
    try:
        # Build metadata
        metadata: Dict[str, Any] = {}
        if title:
            metadata["title"] = title
        if tags:
            metadata["tags"] = tags

        # Export to JSON
        exporter = JsonExporter(include_metadata=include_metadata)
        result = exporter.export(resume_data, metadata=metadata)

        # Create response with proper headers
        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename = f"resume-export-{timestamp}.json"

        response = JSONResponse(content=result.json_data)
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        response.headers["Content-Type"] = "application/json"
        response.headers["X-Export-Format"] = "json-resume"
        response.headers["X-Export-Version"] = JsonExporter.SCHEMA_VERSION

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resume data: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}",
        )


# ============================================================================
# HTML Export Endpoints
# ============================================================================


@router.post(
    "/html",
    response_class=PlainTextResponse,
    status_code=status.HTTP_200_OK,
    summary="Export resume to HTML",
    description="Export resume to self-contained HTML with embedded CSS",
    responses={
        200: {
            "description": "HTML export successful",
            "content": {"text/html": {"example": "<!DOCTYPE html>..."}},
        },
        400: {"description": "Invalid resume data"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit("10/minute")
async def export_to_html(
    request: Request,
    resume_data: ResumeData,
    template: str = Query(
        default="modern",
        description="HTML template to use (modern, classic, minimal)",
    ),
    dark_mode: bool = Query(
        default=True,
        description="Enable dark mode support via prefers-color-scheme",
    ),
    title: Optional[str] = Query(default=None, description="Resume title"),
) -> PlainTextResponse:
    """
    Export resume to HTML format.

    This endpoint generates a self-contained HTML file with embedded CSS,
    perfect for web portfolios and personal websites.

    **Features:**
    - Self-contained HTML (no external dependencies)
    - Responsive design (mobile, tablet, desktop)
    - Print-friendly styles
    - Dark mode support (optional)
    - SEO-friendly meta tags
    - Accessibility compliant (WCAG 2.1 AA)

    **Use cases:**
    - Personal website/portfolio
    - Web sharing
    - Email attachment (small size)
    - Quick preview

    Args:
        request: FastAPI request object
        resume_data: Resume data to export
        template: Template style (modern, classic, minimal)
        dark_mode: Enable dark mode support
        title: Optional title for the resume

    Returns:
        Plain text response with HTML content

    Raises:
        HTTPException: If resume data is invalid or export fails
    """
    try:
        # Build metadata
        metadata: Dict[str, Any] = {}
        if title:
            metadata["title"] = title

        # Export to HTML
        exporter = HtmlExporter()
        result = exporter.export(
            resume_data,
            template=template,
            dark_mode=dark_mode,
            metadata=metadata,
        )

        # Create response with proper headers
        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename = f"resume-export-{timestamp}.html"

        response = PlainTextResponse(content=result.html_content)
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        response.headers["X-Export-Format"] = "html"
        response.headers["X-Template"] = template

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resume data: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}",
        )


# ============================================================================
# Template Preview Endpoint
# ============================================================================


@router.get(
    "/preview/{template_name}",
    response_class=PlainTextResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview template",
    description="Get HTML preview of a template with sample content",
    responses={
        200: {"description": "Template preview HTML"},
        404: {"description": "Template not found"},
    },
)
@limiter.limit("30/minute")
async def preview_template(
    request: Request,
    template_name: str,
) -> PlainTextResponse:
    """
    Get a preview of a template with sample content.

    This endpoint returns HTML that shows how a template looks,
    useful for template selection in the UI.

    Args:
        request: FastAPI request object
        template_name: Name of the template to preview

    Returns:
        HTML preview of the template

    Raises:
        HTTPException: If template doesn't exist
    """
    try:
        exporter = HtmlExporter()
        html_content = exporter.get_template_preview(template_name)

        response = PlainTextResponse(content=html_content)
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        response.headers["X-Template"] = template_name
        response.headers["Cache-Control"] = "public, max-age=3600"  # Cache for 1 hour

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_name}' not found. Available: modern, classic, minimal",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Preview failed: {str(e)}",
        )
