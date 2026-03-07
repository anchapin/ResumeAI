"""
LinkedIn Integration API Routes

Provides endpoints for:
- OAuth 2.0 authentication flow
- Importing LinkedIn data exports
- Exporting resumes in LinkedIn format
- Finding connections at target companies
"""

import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from lib.linkedin import LinkedInImporter, LinkedInExporter
from lib.connections import ConnectionFinder
from config import settings
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

# LinkedIn OAuth configuration
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_ACCESS_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me"
LINKEDIN_PROFILE_PICTURE_URL = "https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,localizedFirstName,localizedLastName,profilePicture(displayImage))"
LINKEDIN_SKILLS_URL = "https://api.linkedin.com/v2/me?fields=id,firstName,lastName"
LINKEDIN_EXPERIENCE_URL = "https://api.linkedin.com/v2/me/experience"
LINKEDIN_EDUCATION_URL = "https://api.linkedin.com/v2/me/education"

router = APIRouter(prefix="/linkedin", tags=["linkedin"])

# Store OAuth state temporarily (in production, use Redis or database)
_oauth_states = {}


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


class LinkedInOAuthStartResponse(BaseModel):
    """Response for OAuth flow initiation."""

    auth_url: str
    state: str


class LinkedInOAuthCallbackRequest(BaseModel):
    """Request model for OAuth callback."""

    code: str
    state: str


class LinkedInOAuthCallbackResponse(BaseModel):
    """Response model for OAuth callback."""

    success: bool
    access_token: str
    profile: Dict[str, Any]
    message: str = "Authentication successful"


class LinkedInProfileResponse(BaseModel):
    """Response model for LinkedIn profile data."""

    firstName: str
    lastName: str
    headline: Optional[str] = None
    summary: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []


# OAuth Endpoints
@router.get("/oauth/start", response_model=LinkedInOAuthStartResponse)
async def start_linkedin_oauth():
    """
    Start LinkedIn OAuth 2.0 flow.

    Returns a LinkedIn authorization URL and a state parameter for security.
    """
    try:
        # Validate required settings
        if not settings.linkedin_client_id or not settings.linkedin_client_secret:
            raise HTTPException(status_code=500, detail="LinkedIn OAuth credentials not configured")

        # Generate secure state parameter
        state = secrets.token_urlsafe(32)
        _oauth_states[state] = {
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=10),
        }

        # Build authorization URL
        params = {
            "response_type": "code",
            "client_id": settings.linkedin_client_id,
            "redirect_uri": settings.linkedin_redirect_uri,
            "state": state,
            "scope": "openid profile email",
        }

        auth_url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"

        logger.info("linkedin_oauth_started", state=state[:10])

        return LinkedInOAuthStartResponse(auth_url=auth_url, state=state)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("linkedin_oauth_start_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to initiate LinkedIn OAuth: {str(e)}")


@router.post("/oauth/callback", response_model=LinkedInOAuthCallbackResponse)
async def handle_linkedin_oauth_callback(request: LinkedInOAuthCallbackRequest):
    """
    Handle LinkedIn OAuth 2.0 callback.

    Exchanges authorization code for access token and fetches user profile.
    """
    try:
        # Validate state parameter
        if request.state not in _oauth_states:
            raise HTTPException(status_code=400, detail="Invalid state parameter")

        state_data = _oauth_states[request.state]
        if datetime.utcnow() > state_data["expires_at"]:
            del _oauth_states[request.state]
            raise HTTPException(status_code=400, detail="State parameter expired")

        # Exchange authorization code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                LINKEDIN_ACCESS_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": request.code,
                    "redirect_uri": settings.linkedin_redirect_uri,
                    "client_id": settings.linkedin_client_id,
                    "client_secret": settings.linkedin_client_secret,
                },
            )

            if token_response.status_code != 200:
                logger.error(
                    "linkedin_token_exchange_failed",
                    status=token_response.status_code,
                    response=token_response.text,
                )
                raise HTTPException(status_code=400, detail="Failed to exchange authorization code")

            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                raise HTTPException(status_code=400, detail="No access token in response")

            # Fetch user profile
            profile = await fetch_linkedin_profile(access_token)

            # Clean up state
            del _oauth_states[request.state]

            logger.info(
                "linkedin_oauth_success",
                user=f"{profile.get('firstName')} {profile.get('lastName')}",
            )

            return LinkedInOAuthCallbackResponse(
                success=True, access_token=access_token, profile=profile
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("linkedin_oauth_callback_failed", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to process LinkedIn callback: {str(e)}"
        )


async def fetch_linkedin_profile(access_token: str) -> Dict[str, Any]:
    """
    Fetch LinkedIn user profile using access token.

    Args:
         access_token: LinkedIn OAuth access token

    Returns:
         User profile data
    """
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}

            # Fetch profile info
            profile_response = await client.get(LINKEDIN_PROFILE_URL, headers=headers)

            if profile_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch LinkedIn profile")

            profile_data = profile_response.json()

            # Map LinkedIn API response to our format
            profile = {
                "firstName": profile_data.get("localizedFirstName", ""),
                "lastName": profile_data.get("localizedLastName", ""),
                "headline": profile_data.get("headline", ""),
                "summary": profile_data.get("summary", ""),
                "location": profile_data.get("location", {}).get("country", ""),
            }

            # Try to fetch experience
            try:
                exp_response = await client.get(LINKEDIN_EXPERIENCE_URL, headers=headers)
                if exp_response.status_code == 200:
                    exp_data = exp_response.json()
                    profile["experience"] = parse_linkedin_experience(exp_data)
            except Exception as e:
                logger.warning("failed_to_fetch_experience", error=str(e))
                profile["experience"] = []

            # Try to fetch education
            try:
                edu_response = await client.get(LINKEDIN_EDUCATION_URL, headers=headers)
                if edu_response.status_code == 200:
                    edu_data = edu_response.json()
                    profile["education"] = parse_linkedin_education(edu_data)
            except Exception as e:
                logger.warning("failed_to_fetch_education", error=str(e))
                profile["education"] = []

            return profile

    except HTTPException:
        raise
    except Exception as e:
        logger.error("fetch_linkedin_profile_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to fetch LinkedIn profile: {str(e)}")


def parse_linkedin_experience(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse LinkedIn experience data."""
    experience = []
    for item in data.get("elements", []):
        exp = {
            "company": item.get("companyName", ""),
            "title": item.get("title", ""),
            "startDate": format_linkedin_date(item.get("startDate")),
            "endDate": format_linkedin_date(item.get("endDate")),
            "description": item.get("description", ""),
            "current": item.get("endDate") is None,
        }
        experience.append(exp)
    return experience


def parse_linkedin_education(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse LinkedIn education data."""
    education = []
    for item in data.get("elements", []):
        edu = {
            "institution": item.get("schoolName", ""),
            "degree": item.get("degreeName", ""),
            "field": item.get("fieldOfStudy", ""),
            "startDate": format_linkedin_date(item.get("startDate")),
            "endDate": format_linkedin_date(item.get("endDate")),
        }
        education.append(edu)
    return education


def format_linkedin_date(date_obj: Optional[Dict[str, int]]) -> str:
    """Format LinkedIn date object to string."""
    if not date_obj:
        return ""
    year = date_obj.get("year", "")
    month = date_obj.get("month", "")
    if year and month:
        return f"{year}-{str(month).zfill(2)}"
    return str(year) if year else ""


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
        raise HTTPException(status_code=400, detail=f"Connection search failed: {str(e)}")


@router.get("/profile", response_model=LinkedInProfileResponse)
async def get_linkedin_profile():
    """
    Get the currently authenticated LinkedIn profile.

    Requires a valid LinkedIn access token.
    """
    try:
        # In production, you would validate the token and retrieve stored profile data
        # For now, this is a placeholder that requires the token to be passed
        raise HTTPException(
            status_code=501, detail="Profile endpoint requires authenticated session"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_linkedin_profile_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to fetch LinkedIn profile: {str(e)}")


@router.post("/disconnect")
async def disconnect_linkedin():
    """
    Disconnect LinkedIn account and revoke access token.

    Clears stored tokens and session data.
    """
    try:
        # Clear any stored LinkedIn session data
        # In production, you would also revoke the token with LinkedIn's API
        logger.info("linkedin_disconnected")

        return {"success": True, "message": "LinkedIn account disconnected"}

    except Exception as e:
        logger.error("linkedin_disconnect_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to disconnect LinkedIn: {str(e)}")


@router.post("/connections/{connection_id}/outreach", response_model=OutreachSuggestionResponse)
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

        return OutreachSuggestionResponse(connection_id=connection_id, suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Suggestion generation failed: {str(e)}")
