"""
LinkedIn Integration API Routes

Provides endpoints for:
- Importing LinkedIn data exports
- Exporting resumes in LinkedIn format
- Finding connections at target companies
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json

from lib.linkedin import LinkedInImporter, LinkedInExporter
from lib.connections import ConnectionFinder

router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])


# Request/Response Models
class LinkedInImportRequest(BaseModel):
    """Request model for importing LinkedIn data."""

    data: Dict[str, Any]  # LinkedIn export JSON
    mode: str = "merge"  # 'merge' or 'overwrite'


class LinkedInImportResponse(BaseModel):
    """Response model for LinkedIn import."""

    success: bool
    imported_fields: List[str]
    resume_data: Dict[str, Any]


class LinkedInExportRequest(BaseModel):
    """Request model for exporting to LinkedIn format."""

    resume_data: Dict[str, Any]


class LinkedInExportResponse(BaseModel):
    """Response model for LinkedIn export."""

    success: bool
    linkedin_profile: Dict[str, Any]
    share_url: str


class ConnectionFindRequest(BaseModel):
    """Request model for finding connections."""

    target_company: str
    user_profile: Dict[str, Any]
    limit: int = 10


class ConnectionResponse(BaseModel):
    """Response model for a single connection."""

    name: str
    company: str
    title: str
    connection_type: str
    profile_url: str
    avatar_url: Optional[str] = None
    similarity_score: float


class ConnectionFindResponse(BaseModel):
    """Response model for connection search."""

    success: bool
    connections: List[ConnectionResponse]
    count: int


class OutreachSuggestionResponse(BaseModel):
    """Response model for outreach suggestions."""

    connection_id: str
    suggestions: Dict[str, str]


# Import endpoint
@router.post("/import", response_model=LinkedInImportResponse)
async def import_linkedin_data(request: LinkedInImportRequest):
    """
    Import LinkedIn data export and convert to resume format.

    Supports 'merge' mode (combine with existing data) or 'overwrite' mode.
    """
    try:
        importer = LinkedInImporter()
        resume_data = importer.parse_export(request.data, mode=request.mode)

        imported_fields = list(resume_data.keys())

        return LinkedInImportResponse(
            success=True, imported_fields=imported_fields, resume_data=resume_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


# Export endpoint
@router.post("/export", response_model=LinkedInExportResponse)
async def export_to_linkedin(request: LinkedInExportRequest):
    """
    Export resume data in LinkedIn-compatible format.

    Returns a JSON structure that can be imported into LinkedIn
    and a shareable URL.
    """
    try:
        exporter = LinkedInExporter()
        linkedin_profile = exporter.to_linkedin_profile(request.resume_data)
        share_url = exporter.to_linkedin_url_format(request.resume_data)

        return LinkedInExportResponse(
            success=True, linkedin_profile=linkedin_profile, share_url=share_url
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")


# Connection finder endpoints
@router.post("/connections/find", response_model=ConnectionFindResponse)
async def find_connections(request: ConnectionFindRequest):
    """
    Find connections at a target company.

    Searches GitHub for:
    - Current employees at the company
    - Alumni from same school
    - People with shared previous companies
    """
    try:
        finder = ConnectionFinder()
        connections = await finder.find_connections(
            target_company=request.target_company,
            user_profile=request.user_profile,
            limit=request.limit,
        )

        connection_responses = [
            ConnectionResponse(
                name=c.name,
                company=c.company,
                title=c.title,
                connection_type=c.connection_type,
                profile_url=c.profile_url,
                avatar_url=c.avatar_url,
                similarity_score=c.similarity_score,
            )
            for c in connections
        ]

        return ConnectionFindResponse(
            success=True,
            connections=connection_responses,
            count=len(connection_responses),
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Connection search failed: {str(e)}"
        )


@router.post(
    "/connections/{connection_id}/outreach", response_model=OutreachSuggestionResponse
)
async def get_outreach_suggestions(
    connection_id: str, connection: ConnectionResponse, user_profile: Dict[str, Any]
):
    """
    Generate personalized outreach message suggestions for a connection.

    Returns short, medium, and long message templates.
    """
    try:
        finder = ConnectionFinder()

        # Reconstruct Connection object
        from lib.connections import Connection

        conn = Connection(
            name=connection.name,
            company=connection.company,
            title=connection.title,
            connection_type=connection.connection_type,
            profile_url=connection.profile_url,
            avatar_url=connection.avatar_url,
            similarity_score=connection.similarity_score,
        )

        suggestions = finder.generate_outreach_suggestions(conn, user_profile)

        return OutreachSuggestionResponse(
            connection_id=connection_id, suggestions=suggestions
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Suggestion generation failed: {str(e)}"
        )
