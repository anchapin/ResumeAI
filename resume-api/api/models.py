"""
Pydantic models for request/response validation.
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


# Basic info models
class BasicInfo(BaseModel):
    """Basic contact information."""
    name: Optional[str] = None
    label: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    url: Optional[str] = None
    summary: Optional[str] = None


class Location(BaseModel):
    """Location information."""
    address: Optional[str] = None
    postalCode: Optional[str] = None
    city: Optional[str] = None
    countryCode: Optional[str] = None
    region: Optional[str] = None


class Profile(BaseModel):
    """Social media profiles."""
    network: Optional[str] = None
    username: Optional[str] = None
    url: Optional[str] = None


class Skill(BaseModel):
    """Skill information."""
    name: Optional[str] = None
    keywords: Optional[List[str]] = Field(default_factory=list)


class WorkItem(BaseModel):
    """Work experience item."""
    company: Optional[str] = None
    position: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    summary: Optional[str] = None
    highlights: Optional[List[str]] = Field(default_factory=list)


class EducationItem(BaseModel):
    """Education item."""
    institution: Optional[str] = None
    area: Optional[str] = None
    studyType: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    courses: Optional[List[str]] = Field(default_factory=list)


class ProjectItem(BaseModel):
    """Project item."""
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    roles: Optional[List[str]] = Field(default_factory=list)
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    highlights: Optional[List[str]] = Field(default_factory=list)


class ResumeData(BaseModel):
    """Complete resume data structure (JSON Resume standard)."""
    basics: Optional[BasicInfo] = None
    location: Optional[Location] = None
    profiles: Optional[List[Profile]] = Field(default_factory=list)
    work: Optional[List[WorkItem]] = Field(default_factory=list)
    volunteer: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    education: Optional[List[EducationItem]] = Field(default_factory=list)
    awards: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    certificates: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    publications: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    skills: Optional[List[Skill]] = Field(default_factory=list)
    languages: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    interests: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    references: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    projects: Optional[List[ProjectItem]] = Field(default_factory=list)


# API Request/Response Models


class ResumeRequest(BaseModel):
    """Request to generate a PDF resume."""
    resume_data: ResumeData = Field(
        ...,
        description="Resume data in JSON Resume format"
    )
    variant: str = Field(
        default="base",
        description="Template variant to use"
    )


class TailorRequest(BaseModel):
    """Request to tailor a resume to a job description."""
    resume_data: ResumeData = Field(
        ...,
        description="Original resume data"
    )
    job_description: str = Field(
        ...,
        description="Job description text"
    )
    company_name: Optional[str] = Field(
        None,
        description="Company name for personalization"
    )
    job_title: Optional[str] = Field(
        None,
        description="Job title for personalization"
    )


class VariantMetadata(BaseModel):
    """Metadata for a resume variant."""
    name: str
    display_name: str
    description: str
    format: str
    output_formats: List[str]


class VariantsResponse(BaseModel):
    """Response listing available variants."""
    variants: List[VariantMetadata]


class TailoredResumeResponse(BaseModel):
    """Response with tailored resume data."""
    resume_data: ResumeData
    keywords: List[str]
    suggestions: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str


# Error Models


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None
