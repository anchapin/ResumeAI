"""
Pydantic models for request/response validation.
"""

import re
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from pydantic import BaseModel, Field, field_validator, model_validator

# Validation constants
MAX_STRING_LENGTH = 1000
MAX_LONG_STRING_LENGTH = 10000
MAX_LIST_LENGTH = 100
MAX_RESUME_ITEMS = 50

# Regex patterns for validation
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
URL_PATTERN = re.compile(
    r"^(https?://|ftp://)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$", re.IGNORECASE
)
PHONE_PATTERN = re.compile(r"^[\d\s\-\+\(\)]{7,20}$")


def sanitize_html(text: Optional[str]) -> Optional[str]:
    """
    Remove potentially dangerous HTML/JavaScript from input.

    Args:
        text: Input string to sanitize

    Returns:
        Sanitized string or None
    """
    if not text:
        return None

    # Remove script tags and content
    text = re.sub(
        r"<script[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL
    )

    # Remove other dangerous tags
    dangerous_tags = ["iframe", "object", "embed", "form", "input", "button"]
    for tag in dangerous_tags:
        text = re.sub(
            f"<{tag}[^>]*>.*?</{tag}>", "", text, flags=re.IGNORECASE | re.DOTALL
        )
        text = re.sub(f"<{tag}[^>]*/?>", "", text, flags=re.IGNORECASE)

    # Remove event handlers (onclick, onerror, etc.)
    text = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', "", text, flags=re.IGNORECASE)

    # Remove javascript: and data: URLs
    text = re.sub(r"javascript\s*:", "", text, flags=re.IGNORECASE)
    text = re.sub(r"data\s*:", "", text, flags=re.IGNORECASE)

    return text.strip()


def validate_string_length(
    value: Optional[str], field_name: str, max_length: int = MAX_STRING_LENGTH
) -> Optional[str]:
    """
    Validate string length and provide helpful error message.

    Args:
        value: String to validate
        field_name: Name of the field for error messages
        max_length: Maximum allowed length

    Returns:
        Validated string or None

    Raises:
        ValueError: If string is too long
    """
    if value and len(value) > max_length:
        raise ValueError(
            f"{field_name} exceeds maximum length of {max_length} characters "
            f"(current: {len(value)})"
        )
    return value


def validate_list_length(
    value: Optional[List], field_name: str, max_length: int = MAX_LIST_LENGTH
) -> List:
    """
    Validate list length and provide helpful error message.

    Args:
        value: List to validate
        field_name: Name of the field for error messages
        max_length: Maximum allowed length

    Returns:
        Validated list or empty list

    Raises:
        ValueError: If list is too long
    """
    if value and len(value) > max_length:
        raise ValueError(
            f"{field_name} exceeds maximum length of {max_length} items "
            f"(current: {len(value)})"
        )
    return value or []


# Basic info models
class BasicInfo(BaseModel):
    """Basic contact information."""

    name: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Full name of the person"
    )
    label: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Professional label or title"
    )
    email: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Email address"
    )
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    url: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Personal website URL"
    )
    summary: Optional[str] = Field(
        None,
        max_length=MAX_LONG_STRING_LENGTH,
        description="Professional summary or bio",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate email format."""
        if v:
            v = sanitize_html(v)
            if not EMAIL_PATTERN.match(v):
                raise ValueError(
                    f"Invalid email format: '{v}'. " "Expected format: user@example.com"
                )
        return v

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate URL format."""
        if v:
            v = sanitize_html(v)
            if not URL_PATTERN.match(v):
                raise ValueError(
                    f"Invalid URL format: '{v}'. "
                    "URL must start with http://, https://, or ftp://"
                )
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format."""
        if v:
            v = sanitize_html(v)
            if not PHONE_PATTERN.match(v):
                raise ValueError(
                    f"Invalid phone number format: '{v}'. "
                    "Phone number must contain 7-20 digits and may include spaces, dashes, plus, or parentheses"
                )
        return v

    @field_validator("name", "label", "summary")
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields to prevent injection attacks."""
        return sanitize_html(v) if v else v


class Location(BaseModel):
    """Location information."""

    address: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Street address"
    )
    postalCode: Optional[str] = Field(
        None, max_length=20, description="Postal or ZIP code"
    )
    city: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="City name"
    )
    countryCode: Optional[str] = Field(
        None, max_length=5, description="ISO 3166-1 country code (e.g., 'US', 'GB')"
    )
    region: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="State, province, or region"
    )

    @field_validator("countryCode")
    @classmethod
    def validate_country_code(cls, v: Optional[str]) -> Optional[str]:
        """Validate ISO country code format."""
        if v:
            v = sanitize_html(v)
            if len(v) < 2 or len(v) > 3:
                raise ValueError(
                    f"Invalid country code format: '{v}'. "
                    "Expected ISO 3166-1 code (2 or 3 letters, e.g., 'US', 'GBR')"
                )
        return v

    @field_validator("*")
    @classmethod
    def sanitize_location_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize all location fields."""
        return sanitize_html(v) if v else v


class Profile(BaseModel):
    """Social media profiles."""

    network: Optional[str] = Field(
        None,
        max_length=MAX_STRING_LENGTH,
        description="Social network name (e.g., 'LinkedIn', 'Twitter')",
    )
    username: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Username or handle"
    )
    url: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Profile URL"
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate URL format."""
        if v:
            v = sanitize_html(v)
            if not URL_PATTERN.match(v):
                raise ValueError(
                    f"Invalid profile URL format: '{v}'. "
                    "URL must start with http://, https://, or ftp://"
                )
        return v

    @field_validator("network", "username")
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class Skill(BaseModel):
    """Skill information."""

    name: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Skill name or category"
    )
    keywords: Optional[List[str]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="List of related keywords or technologies",
    )

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, v: Optional[List[str]]) -> List[str]:
        """Validate keywords list."""
        if v is None:
            return []

        # Check list length
        if len(v) > MAX_LIST_LENGTH:
            raise ValueError(
                f"Skill keywords exceed maximum of {MAX_LIST_LENGTH} items "
                f"(current: {len(v)})"
            )

        # Sanitize and validate each keyword
        validated = []
        for keyword in v:
            if keyword:
                sanitized = sanitize_html(keyword)
                if len(sanitized) > MAX_STRING_LENGTH:
                    raise ValueError(
                        f"Skill keyword exceeds maximum length of {MAX_STRING_LENGTH} characters: '{keyword}'"
                    )
                validated.append(sanitized)

        return validated

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize skill name."""
        return sanitize_html(v) if v else v


class WorkItem(BaseModel):
    """Work experience item."""

    company: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Company name"
    )
    position: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Job title or position"
    )
    startDate: Optional[str] = Field(
        None,
        max_length=20,
        description="Start date (ISO 8601 format recommended: YYYY-MM-DD)",
    )
    endDate: Optional[str] = Field(
        None,
        max_length=20,
        description="End date (ISO 8601 format recommended: YYYY-MM-DD). Leave empty if current position",
    )
    summary: Optional[str] = Field(
        None,
        max_length=MAX_LONG_STRING_LENGTH,
        description="Job summary or description",
    )
    highlights: Optional[List[str]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="List of key achievements or responsibilities",
    )

    @field_validator("highlights")
    @classmethod
    def validate_highlights(cls, v: Optional[List[str]]) -> List[str]:
        """Validate highlights list."""
        if v is None:
            return []

        if len(v) > MAX_LIST_LENGTH:
            raise ValueError(
                f"Work highlights exceed maximum of {MAX_LIST_LENGTH} items "
                f"(current: {len(v)})"
            )

        validated = []
        for highlight in v:
            if highlight:
                sanitized = sanitize_html(highlight)
                if len(sanitized) > MAX_STRING_LENGTH:
                    raise ValueError(
                        f"Work highlight exceeds maximum length of {MAX_STRING_LENGTH} characters"
                    )
                validated.append(sanitized)

        return validated

    @model_validator(mode="after")
    def validate_date_range(self) -> "WorkItem":
        """Validate that end date is after start date (if both provided)."""
        if self.startDate and self.endDate:
            # Simple comparison for ISO format dates (YYYY-MM-DD)
            start_parts = self.startDate.split("-")
            end_parts = self.endDate.split("-")

            if len(start_parts) == 3 and len(end_parts) == 3:
                try:
                    start_year, start_month, start_day = map(int, start_parts)
                    end_year, end_month, end_day = map(int, end_parts)

                    if (
                        end_year < start_year
                        or (end_year == start_year and end_month < start_month)
                        or (
                            end_year == start_year
                            and end_month == start_month
                            and end_day < start_day
                        )
                    ):
                        raise ValueError(
                            f"End date '{self.endDate}' cannot be before start date '{self.startDate}'"
                        )
                except ValueError:
                    # If date parsing fails, skip validation
                    pass

        return self

    @field_validator("company", "position", "summary")
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class EducationItem(BaseModel):
    """Education item."""

    institution: Optional[str] = Field(
        None,
        max_length=MAX_STRING_LENGTH,
        description="Institution name (university, college, etc.)",
    )
    area: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Field of study or major"
    )
    studyType: Optional[str] = Field(
        None,
        max_length=MAX_STRING_LENGTH,
        description="Degree type (e.g., 'Bachelor', 'Master', 'PhD')",
    )
    startDate: Optional[str] = Field(
        None,
        max_length=20,
        description="Start date (ISO 8601 format recommended: YYYY-MM-DD)",
    )
    endDate: Optional[str] = Field(
        None,
        max_length=20,
        description="End date (ISO 8601 format recommended: YYYY-MM-DD)",
    )
    courses: Optional[List[str]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="List of relevant courses",
    )

    @field_validator("courses")
    @classmethod
    def validate_courses(cls, v: Optional[List[str]]) -> List[str]:
        """Validate courses list."""
        if v is None:
            return []

        if len(v) > MAX_LIST_LENGTH:
            raise ValueError(
                f"Education courses exceed maximum of {MAX_LIST_LENGTH} items "
                f"(current: {len(v)})"
            )

        validated = []
        for course in v:
            if course:
                sanitized = sanitize_html(course)
                if len(sanitized) > MAX_STRING_LENGTH:
                    raise ValueError(
                        f"Course name exceeds maximum length of {MAX_STRING_LENGTH} characters"
                    )
                validated.append(sanitized)

        return validated

    @model_validator(mode="after")
    def validate_date_range(self) -> "EducationItem":
        """Validate that end date is after start date (if both provided)."""
        if self.startDate and self.endDate:
            start_parts = self.startDate.split("-")
            end_parts = self.endDate.split("-")

            if len(start_parts) == 3 and len(end_parts) == 3:
                try:
                    start_year, start_month, start_day = map(int, start_parts)
                    end_year, end_month, end_day = map(int, end_parts)

                    if (
                        end_year < start_year
                        or (end_year == start_year and end_month < start_month)
                        or (
                            end_year == start_year
                            and end_month == start_month
                            and end_day < start_day
                        )
                    ):
                        raise ValueError(
                            f"End date '{self.endDate}' cannot be before start date '{self.startDate}'"
                        )
                except ValueError:
                    pass

        return self

    @field_validator("institution", "area", "studyType")
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class ProjectItem(BaseModel):
    """Project item."""

    name: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Project name"
    )
    description: Optional[str] = Field(
        None, max_length=MAX_LONG_STRING_LENGTH, description="Project description"
    )
    url: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Project URL"
    )
    roles: Optional[List[str]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="List of roles or responsibilities",
    )
    startDate: Optional[str] = Field(
        None,
        max_length=20,
        description="Start date (ISO 8601 format recommended: YYYY-MM-DD)",
    )
    endDate: Optional[str] = Field(
        None,
        max_length=20,
        description="End date (ISO 8601 format recommended: YYYY-MM-DD)",
    )
    highlights: Optional[List[str]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="List of key achievements or features",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate URL format."""
        if v:
            v = sanitize_html(v)
            if not URL_PATTERN.match(v):
                raise ValueError(
                    f"Invalid project URL format: '{v}'. "
                    "URL must start with http://, https://, or ftp://"
                )
        return v

    @field_validator("roles", "highlights")
    @classmethod
    def validate_lists(cls, v: Optional[List[str]], info) -> List[str]:
        """Validate list fields."""
        field_name = info.field_name

        if v is None:
            return []

        if len(v) > MAX_LIST_LENGTH:
            raise ValueError(
                f"Project {field_name} exceed maximum of {MAX_LIST_LENGTH} items "
                f"(current: {len(v)})"
            )

        validated = []
        for item in v:
            if item:
                sanitized = sanitize_html(item)
                if len(sanitized) > MAX_STRING_LENGTH:
                    raise ValueError(
                        f"Project {field_name[:-1]} exceeds maximum length of {MAX_STRING_LENGTH} characters"
                    )
                validated.append(sanitized)

        return validated

    @model_validator(mode="after")
    def validate_date_range(self) -> "ProjectItem":
        """Validate that end date is after start date (if both provided)."""
        if self.startDate and self.endDate:
            start_parts = self.startDate.split("-")
            end_parts = self.endDate.split("-")

            if len(start_parts) == 3 and len(end_parts) == 3:
                try:
                    start_year, start_month, start_day = map(int, start_parts)
                    end_year, end_month, end_day = map(int, end_parts)

                    if (
                        end_year < start_year
                        or (end_year == start_year and end_month < start_month)
                        or (
                            end_year == start_year
                            and end_month == start_month
                            and end_day < start_day
                        )
                    ):
                        raise ValueError(
                            f"End date '{self.endDate}' cannot be before start date '{self.startDate}'"
                        )
                except ValueError:
                    pass

        return self

    @field_validator("name", "description")
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class ResumeData(BaseModel):
    """Complete resume data structure (JSON Resume standard)."""

    basics: Optional[BasicInfo] = Field(None, description="Basic contact information")
    location: Optional[Location] = Field(None, description="Location information")
    profiles: Optional[List[Profile]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="Social media profiles",
    )
    work: Optional[List[WorkItem]] = Field(
        default_factory=list,
        max_length=MAX_RESUME_ITEMS,
        description="Work experience items",
    )
    volunteer: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        max_length=MAX_RESUME_ITEMS,
        description="Volunteer experience items",
    )
    education: Optional[List[EducationItem]] = Field(
        default_factory=list, max_length=MAX_RESUME_ITEMS, description="Education items"
    )
    awards: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        max_length=MAX_RESUME_ITEMS,
        description="Awards and honors",
    )
    certificates: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        max_length=MAX_RESUME_ITEMS,
        description="Certificates and certifications",
    )
    publications: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list, max_length=MAX_RESUME_ITEMS, description="Publications"
    )
    skills: Optional[List[Skill]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="Skills and competencies",
    )
    languages: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="Languages and proficiency levels",
    )
    interests: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        max_length=MAX_LIST_LENGTH,
        description="Interests and hobbies",
    )
    references: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list, max_length=MAX_RESUME_ITEMS, description="References"
    )
    projects: Optional[List[ProjectItem]] = Field(
        default_factory=list, max_length=MAX_RESUME_ITEMS, description="Project items"
    )

    @field_validator(
        "volunteer",
        "awards",
        "certificates",
        "publications",
        "languages",
        "interests",
        "references",
    )
    @classmethod
    def validate_generic_lists(
        cls, v: Optional[List[Dict[str, Any]]], info
    ) -> List[Dict[str, Any]]:
        """Validate and sanitize generic lists (volunteer, awards, etc.)."""
        field_name = info.field_name

        if v is None:
            return []

        # Check list length
        max_length = MAX_RESUME_ITEMS
        if len(v) > max_length:
            raise ValueError(
                f"Resume {field_name} exceed maximum of {max_length} items "
                f"(current: {len(v)})"
            )

        # Validate and sanitize each item
        validated = []
        for item in v:
            if not isinstance(item, dict):
                raise ValueError(
                    f"Invalid {field_name[:-1]} type: expected dict, got {type(item).__name__}"
                )

            # Sanitize string values in the dict
            sanitized_item = {}
            for key, value in item.items():
                if isinstance(value, str):
                    sanitized = sanitize_html(value)
                    if len(sanitized) > MAX_STRING_LENGTH:
                        raise ValueError(
                            f"{field_name[:-1].capitalize()} field '{key}' "
                            f"exceeds maximum length of {MAX_STRING_LENGTH} characters"
                        )
                    sanitized_item[key] = sanitized
                elif isinstance(value, list):
                    # Validate list items
                    validated_list = []
                    for list_item in value:
                        if isinstance(list_item, str):
                            sanitized = sanitize_html(list_item)
                            if len(sanitized) > MAX_STRING_LENGTH:
                                raise ValueError(
                                    f"{field_name[:-1].capitalize()} list item "
                                    f"exceeds maximum length of {MAX_STRING_LENGTH} characters"
                                )
                            validated_list.append(sanitized)
                        else:
                            validated_list.append(list_item)
                    sanitized_item[key] = validated_list
                else:
                    sanitized_item[key] = value

            validated.append(sanitized_item)

        return validated

    @model_validator(mode="after")
    def validate_resume_data(self) -> "ResumeData":
        """Validate that resume has at least basic information."""
        # Check if resume is completely empty
        has_data = any(
            [
                self.basics,
                self.location,
                self.profiles,
                self.work,
                self.volunteer,
                self.education,
                self.awards,
                self.certificates,
                self.publications,
                self.skills,
                self.languages,
                self.interests,
                self.references,
                self.projects,
            ]
        )

        if not has_data:
            raise ValueError(
                "Resume data cannot be empty. "
                "At least one section (e.g., basics, work, education) must be provided."
            )

        # Warn if basics is missing (not an error, but common issue)
        if not self.basics:
            # This is logged at runtime rather than raising an error
            # because some resumes might not have basic info
            pass

        return self


# API Request/Response Models


class ResumeRequest(BaseModel):
    """Request to generate a PDF resume."""

    resume_data: ResumeData = Field(
        ..., description="Resume data in JSON Resume format"
    )
    variant: str = Field(
        default="base",
        max_length=50,
        description="Template variant to use (e.g., 'base', 'modern', 'classic')",
    )
    customization: Optional["TemplateCustomization"] = Field(
        default=None, description="Template customization options"
    )

    @field_validator("variant")
    @classmethod
    def validate_variant(cls, v: str) -> str:
        """Validate variant name."""
        v = sanitize_html(v)
        if not v or not v.strip():
            raise ValueError("Variant name cannot be empty")

        # Allow only alphanumeric characters, hyphens, and underscores
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                f"Invalid variant name: '{v}'. "
                "Variant name must contain only letters, numbers, hyphens, and underscores"
            )

        return v.strip().lower()


class TailorRequest(BaseModel):
    """Request to tailor a resume to a job description."""

    resume_data: ResumeData = Field(..., description="Original resume data")
    job_description: str = Field(
        ...,
        min_length=10,
        max_length=MAX_LONG_STRING_LENGTH,
        description="Job description text (minimum 10 characters)",
    )
    company_name: Optional[str] = Field(
        None,
        max_length=MAX_STRING_LENGTH,
        description="Company name for personalization",
    )
    job_title: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Job title for personalization"
    )

    @field_validator("job_description")
    @classmethod
    def validate_job_description(cls, v: str) -> str:
        """Validate and sanitize job description."""
        v = sanitize_html(v)

        if not v or not v.strip():
            raise ValueError("Job description cannot be empty")

        if len(v) < 10:
            raise ValueError(
                f"Job description is too short. Minimum 10 characters required (current: {len(v)})"
            )

        return v

    @field_validator("company_name", "job_title")
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class VariantMetadata(BaseModel):
    """Metadata for a resume variant."""

    name: str = Field(..., max_length=50, description="Variant identifier")
    display_name: str = Field(..., max_length=100, description="Human-readable name")
    description: str = Field(
        ..., max_length=MAX_STRING_LENGTH, description="Variant description"
    )
    format: str = Field(
        ..., max_length=20, description="File format (e.g., 'json', 'yaml')"
    )
    output_formats: List[str] = Field(
        ..., max_length=10, description="Supported output formats"
    )

    @field_validator("output_formats")
    @classmethod
    def validate_output_formats(cls, v: List[str]) -> List[str]:
        """Validate output formats list."""
        if not v:
            raise ValueError("Output formats cannot be empty")

        if len(v) > 10:
            raise ValueError(
                f"Output formats exceed maximum of 10 items (current: {len(v)})"
            )

        # Common output formats

        validated = []
        for fmt in v:
            fmt_lower = fmt.lower().strip()
            if not fmt_lower:
                raise ValueError("Output format cannot be empty string")

            # Sanitize
            fmt_sanitized = sanitize_html(fmt_lower)
            if fmt_sanitized != fmt_lower:
                raise ValueError(f"Output format contains invalid characters: '{fmt}'")

            # Validate format (allow custom formats but warn in description)
            validated.append(fmt_sanitized)

        return validated

    @field_validator("name", "display_name", "description", "format")
    @classmethod
    def sanitize_text_fields(cls, v: str) -> str:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class VariantsResponse(BaseModel):
    """Response listing available variants."""

    variants: List[VariantMetadata]


class TailoredResumeResponse(BaseModel):
    """Response with tailored resume data."""

    resume_data: ResumeData = Field(..., description="Tailored resume data")
    keywords: List[str] = Field(
        ...,
        max_length=MAX_LIST_LENGTH,
        description="Extracted keywords from job description",
    )
    suggestions: Optional[List[str]] = Field(
        None, description="AI-generated improvement suggestions"
    )

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, v: List[str]) -> List[str]:
        """Validate keywords list."""
        if not v:
            return []

        if len(v) > MAX_LIST_LENGTH:
            raise ValueError(
                f"Keywords exceed maximum of {MAX_LIST_LENGTH} items (current: {len(v)})"
            )

        validated = []
        for keyword in v:
            if keyword:
                sanitized = sanitize_html(keyword)
                if len(sanitized) > MAX_STRING_LENGTH:
                    raise ValueError(
                        f"Keyword exceeds maximum length of {MAX_STRING_LENGTH} characters"
                    )
                validated.append(sanitized)

        return validated


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str


# Error Models


class ErrorResponse(BaseModel):
    """Error response."""

    error: str
    detail: Optional[str] = None


# Template Customization Models


class ColorScheme(BaseModel):
    """Color scheme definition."""

    name: str = Field(..., max_length=50, description="Scheme name")
    primary: List[int] = Field(
        ...,
        description="Primary color RGB values [R, G, B]",
        min_length=3,
        max_length=3,
    )
    accent: List[int] = Field(
        ..., description="Accent color RGB values [R, G, B]", min_length=3, max_length=3
    )
    secondary: List[int] = Field(
        ...,
        description="Secondary color RGB values [R, G, B]",
        min_length=3,
        max_length=3,
    )

    @field_validator("primary", "accent", "secondary")
    @classmethod
    def validate_rgb_values(cls, v: List[int]) -> List[int]:
        """Validate RGB color values."""
        for value in v:
            if not (0 <= value <= 255):
                raise ValueError(f"RGB values must be between 0 and 255. Got: {value}")
        return v

    @field_validator("*")
    @classmethod
    def sanitize_text_fields(cls, v: str) -> str:
        """Sanitize text fields."""
        return sanitize_html(v) if isinstance(v, str) else v


class TemplateMetadata(BaseModel):
    """Enhanced template metadata."""

    name: str = Field(..., max_length=50, description="Template identifier")
    display_name: str = Field(..., max_length=100, description="Human-readable name")
    description: str = Field(
        ..., max_length=MAX_STRING_LENGTH, description="Template description"
    )
    format: str = Field(..., max_length=20, description="File format")
    output_formats: List[str] = Field(..., description="Supported output formats")
    category: str = Field(..., max_length=50, description="Template category")
    style: str = Field(..., max_length=50, description="Template style")
    features: List[str] = Field(default_factory=list, description="Template features")
    recommended_for: List[str] = Field(
        default_factory=list, description="Recommended roles"
    )
    font_options: List[str] = Field(default_factory=list, description="Available fonts")
    color_schemes: List[ColorScheme] = Field(
        default_factory=list, description="Color schemes"
    )

    @field_validator(
        "name", "display_name", "description", "format", "category", "style"
    )
    @classmethod
    def sanitize_text_fields(cls, v: str) -> str:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v

    @field_validator("output_formats", "features", "recommended_for", "font_options")
    @classmethod
    def validate_string_lists(cls, v: Optional[List[str]]) -> List[str]:
        """Validate and sanitize string lists."""
        if not v:
            return []

        validated = []
        for item in v:
            if item:
                sanitized = sanitize_html(item)
                validated.append(sanitized)

        return validated


class TemplateCustomization(BaseModel):
    """Template customization options."""

    template_name: str = Field(..., max_length=50, description="Template to customize")
    color_scheme: str = Field(
        default="default", max_length=50, description="Color scheme name"
    )
    font: str = Field(default="default", max_length=50, description="Font choice")
    paper_size: str = Field(
        default="letter", max_length=10, description="Paper size (letter, A4)"
    )
    margin_left: Optional[float] = Field(
        default=0.75, ge=0.25, le=2.0, description="Left margin in inches"
    )
    margin_right: Optional[float] = Field(
        default=0.75, ge=0.25, le=2.0, description="Right margin in inches"
    )
    margin_top: Optional[float] = Field(
        default=0.6, ge=0.25, le=2.0, description="Top margin in inches"
    )
    margin_bottom: Optional[float] = Field(
        default=0.6, ge=0.25, le=2.0, description="Bottom margin in inches"
    )

    @field_validator("template_name", "color_scheme", "font", "paper_size")
    @classmethod
    def sanitize_text_fields(cls, v: str) -> str:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class SavedTemplateConfiguration(BaseModel):
    """Saved template configuration for a user."""

    id: str = Field(..., max_length=100, description="Configuration ID")
    user_id: str = Field(..., max_length=100, description="User ID")
    name: str = Field(..., max_length=100, description="Configuration name")
    customization: TemplateCustomization = Field(
        ..., description="Customization settings"
    )
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

    @field_validator("id", "user_id", "name", "created_at", "updated_at")
    @classmethod
    def sanitize_text_fields(cls, v: str) -> str:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


# Advanced Features Models


class ResumeMetadata(BaseModel):
    """Resume metadata for listing resumes."""

    id: int
    title: str
    tags: List[str]
    is_public: bool
    created_at: str
    updated_at: str
    version_count: int = 0


class CreateResumeRequest(BaseModel):
    """Request to create a new resume."""

    title: str = Field(..., max_length=200, description="Resume title")
    data: ResumeData = Field(..., description="Resume data")
    tags: Optional[List[str]] = Field(
        default_factory=list, max_length=20, description="Tags for categorization"
    )


class UpdateResumeRequest(BaseModel):
    """Request to update an existing resume."""

    title: Optional[str] = Field(None, max_length=200, description="Resume title")
    data: Optional[ResumeData] = Field(None, description="Updated resume data")
    tags: Optional[List[str]] = Field(None, max_length=20, description="Updated tags")
    change_description: Optional[str] = Field(
        None, max_length=500, description="Description of changes made"
    )


class ResumeResponse(BaseModel):
    """Response with resume data and metadata."""

    id: int
    title: str
    data: ResumeData
    tags: List[str]
    is_public: bool
    current_version_id: Optional[int]
    created_at: str
    updated_at: str


class ResumeVersionResponse(BaseModel):
    """Response with resume version data."""

    id: int
    resume_id: int
    version_number: int
    data: ResumeData
    change_description: Optional[str]
    created_at: str


class CommentRequest(BaseModel):
    """Request to add a comment to a resume."""

    author_name: str = Field(..., max_length=200, description="Comment author name")
    author_email: str = Field(..., max_length=255, description="Comment author email")
    content: str = Field(
        ..., min_length=1, max_length=5000, description="Comment content"
    )
    section: Optional[str] = Field(
        None, max_length=100, description="Resume section being commented on"
    )

    @field_validator("author_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        v = sanitize_html(v)
        if not EMAIL_PATTERN.match(v):
            raise ValueError(f"Invalid email format: '{v}'")
        return v

    @field_validator("author_name", "section")
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields."""
        return sanitize_html(v) if v else v


class CommentResponse(BaseModel):
    """Response with comment data."""

    id: int
    resume_id: int
    author_name: str
    author_email: str
    content: str
    section: Optional[str]
    is_resolved: bool
    created_at: str
    updated_at: str


class ShareResumeRequest(BaseModel):
    """Request to share a resume."""

    permissions: str = Field(
        default="view",
        max_length=50,
        description="Permissions level (view, comment, edit)",
    )
    expires_at: Optional[str] = Field(
        None, description="Expiration date (ISO 8601 format)"
    )
    max_views: Optional[int] = Field(
        None, ge=1, description="Maximum number of views allowed"
    )
    password: Optional[str] = Field(
        None, max_length=100, description="Optional password protection"
    )


class ShareResumeResponse(BaseModel):
    """Response with share link information."""

    share_token: str
    share_url: str
    permissions: str
    expires_at: Optional[str]
    max_views: Optional[int]


class BulkOperationRequest(BaseModel):
    """Request to perform bulk operations on resumes."""

    resume_ids: List[int] = Field(..., max_length=100, description="List of resume IDs")
    operation: str = Field(
        ...,
        max_length=50,
        description="Operation type (delete, export, duplicate, tag)",
    )
    tags: Optional[List[str]] = Field(
        None, max_length=20, description="Tags for tag operation"
    )
    export_format: Optional[str] = Field(
        None, max_length=20, description="Export format for export operation"
    )


class BulkOperationResponse(BaseModel):
    """Response with bulk operation results."""

    successful: List[int] = Field(description="IDs of successfully processed resumes")
    failed: List[dict] = Field(description="IDs of failed resumes with error messages")


class FormatOptions(BaseModel):
    """Advanced formatting options."""

    font_family: str = Field(default="Arial", max_length=50, description="Font family")
    font_size: int = Field(default=11, ge=8, le=24, description="Font size")
    line_spacing: float = Field(
        default=1.15, ge=1.0, le=2.0, description="Line spacing"
    )
    margin_top: float = Field(
        default=0.5, ge=0, le=2.0, description="Top margin (inches)"
    )
    margin_bottom: float = Field(
        default=0.5, ge=0, le=2.0, description="Bottom margin (inches)"
    )
    margin_left: float = Field(
        default=0.75, ge=0, le=2.0, description="Left margin (inches)"
    )
    margin_right: float = Field(
        default=0.75, ge=0, le=2.0, description="Right margin (inches)"
    )
    color_theme: str = Field(
        default="default", max_length=50, description="Color theme name"
    )
    layout: str = Field(
        default="single", max_length=20, description="Layout (single, double)"
    )
    show_section_dividers: bool = Field(
        default=True, description="Show section dividers"
    )
    section_order: Optional[List[str]] = Field(
        None, max_length=20, description="Custom section order"
    )


class ExportRequest(BaseModel):
    """Request to export resume in different formats."""

    resume_data: ResumeData = Field(..., description="Resume data to export")
    format: str = Field(
        ..., max_length=20, description="Export format (pdf, docx, html)"
    )
    format_options: Optional[FormatOptions] = Field(
        None, description="Advanced formatting options"
    )
    variant: str = Field(default="base", max_length=50, description="Template variant")


class ImportRequest(BaseModel):
    """Request to import resume from different formats."""

    format: str = Field(
        ..., max_length=20, description="Import format (pdf, docx, json)"
    )
    data: Optional[str] = Field(None, description="Raw data for JSON import")
    url: Optional[str] = Field(
        None, max_length=500, description="URL for LinkedIn import"
    )


class TemplateFilter(BaseModel):
    """Filter options for template search."""

    search: Optional[str] = Field(None, max_length=100, description="Search query")
    tags: Optional[List[str]] = Field(None, max_length=20, description="Filter by tags")
    category: Optional[str] = Field(
        None, max_length=50, description="Filter by category"
    )
    industry: Optional[str] = Field(
        None, max_length=50, description="Filter by industry"
    )
    layout: Optional[str] = Field(
        None, max_length=20, description="Filter by layout (single, double)"
    )
    color_theme: Optional[str] = Field(
        None, max_length=50, description="Filter by color theme"
    )


class KeyboardShortcut(BaseModel):
    """Keyboard shortcut definition."""

    key: str = Field(..., max_length=50, description="Key combination (e.g., 'Ctrl+S')")
    action: str = Field(..., max_length=100, description="Action description")
    category: str = Field(
        ..., max_length=50, description="Category (e.g., 'File', 'Edit')"
    )


class UserSettingsRequest(BaseModel):
    """Request to update user settings."""

    keyboard_shortcuts_enabled: Optional[bool] = Field(
        None, description="Enable keyboard shortcuts"
    )
    high_contrast_mode: Optional[bool] = Field(
        None, description="Enable high contrast mode"
    )
    reduced_motion: Optional[bool] = Field(None, description="Enable reduced motion")
    screen_reader_optimized: Optional[bool] = Field(
        None, description="Optimize for screen readers"
    )
    default_font: Optional[str] = Field(None, max_length=50, description="Default font")
    default_font_size: Optional[int] = Field(
        None, ge=8, le=24, description="Default font size"
    )
    default_spacing: Optional[str] = Field(
        None, max_length=20, description="Default spacing"
    )


class UserSettingsResponse(BaseModel):
    """Response with user settings."""

    keyboard_shortcuts_enabled: bool
    high_contrast_mode: bool
    reduced_motion: bool
    screen_reader_optimized: bool
    default_font: str
    default_font_size: int
    default_spacing: str


# =============================================================================
# Authentication Models
# =============================================================================


class UserCreate(BaseModel):
    """Request model for user registration."""

    email: str = Field(..., max_length=255, description="User email address")
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    password: str = Field(
        ..., min_length=8, max_length=100, description="Password (min 8 characters)"
    )
    full_name: Optional[str] = Field(
        None, max_length=200, description="Full name (optional)"
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        v = v.strip().lower()
        if not EMAIL_PATTERN.match(v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username format."""
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and hyphens"
            )
        return v


class UserLogin(BaseModel):
    """Request model for user login."""

    email: str = Field(..., max_length=255, description="User email address")
    password: str = Field(..., max_length=100, description="User password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        return v.strip().lower()


class TokenResponse(BaseModel):
    """Response model for token endpoints."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration in seconds")


class RefreshTokenRequest(BaseModel):
    """Request model for refreshing access token."""

    refresh_token: str = Field(..., description="JWT refresh token")


class TokenRefreshResponse(BaseModel):
    """Response model for token refresh."""

    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration in seconds")


class UserResponse(BaseModel):
    """Response model for user information."""

    id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email address")
    username: str = Field(..., description="Username")
    full_name: Optional[str] = Field(None, description="Full name")
    is_active: bool = Field(..., description="Whether user is active")
    is_verified: bool = Field(..., description="Whether user email is verified")
    created_at: datetime = Field(..., description="Account creation timestamp")

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Request model for updating user profile."""

    full_name: Optional[str] = Field(None, max_length=200, description="Full name")
    username: Optional[str] = Field(
        None, min_length=3, max_length=100, description="Username"
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        """Validate username format."""
        if v is not None:
            v = v.strip()
            if not re.match(r"^[a-zA-Z0-9_-]+$", v):
                raise ValueError(
                    "Username can only contain letters, numbers, underscores, and hyphens"
                )
        return v


class PasswordChangeRequest(BaseModel):
    """Request model for changing password."""

    current_password: str = Field(..., max_length=100, description="Current password")
    new_password: str = Field(
        ..., min_length=8, max_length=100, description="New password (min 8 characters)"
    )


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str = Field(..., description="Response message")


# =============================================================================
# Job Description Parsing Models
# =============================================================================


class SalaryInfo(BaseModel):
    """Salary information extracted from job description."""

    min: Optional[int] = Field(None, description="Minimum salary")
    max: Optional[int] = Field(None, description="Maximum salary")
    currency: str = Field(default="USD", description="Currency code")
    period: str = Field(
        default="yearly", description="Salary period (yearly, hourly, monthly)"
    )


class JDAnalysisRequest(BaseModel):
    """Request to analyze a job description."""

    job_description: str = Field(
        ...,
        min_length=10,
        max_length=MAX_LONG_STRING_LENGTH,
        description="Job description text to analyze",
    )


class JDAnalysisResponse(BaseModel):
    """Response with parsed job description data."""

    title: Optional[str] = Field(None, description="Job title")
    company: Optional[str] = Field(None, description="Company name")
    location: Optional[str] = Field(None, description="Job location")
    remote_type: Optional[str] = Field(
        None, description="Remote work type (remote, hybrid, onsite)"
    )
    salary: Optional[SalaryInfo] = Field(None, description="Salary information")
    requirements: List[str] = Field(
        default_factory=list, description="Job requirements"
    )
    qualifications: List[str] = Field(
        default_factory=list, description="Preferred qualifications"
    )
    responsibilities: List[str] = Field(
        default_factory=list, description="Job responsibilities"
    )
    skills: List[str] = Field(default_factory=list, description="Required skills")
    experience_level: Optional[str] = Field(
        None, description="Experience level (entry, mid, senior, lead, executive)"
    )
    experience_years: Optional[Tuple[int, int]] = Field(
        None, description="Years of experience range (min, max)"
    )
    education_requirements: List[str] = Field(
        default_factory=list, description="Education requirements"
    )
    benefits: List[str] = Field(default_factory=list, description="Benefits offered")
    keywords: List[str] = Field(default_factory=list, description="Top keywords")


class SkillsMatchRequest(BaseModel):
    """Request to match resume skills against job description."""

    resume_data: ResumeData = Field(..., description="Resume data")
    job_description: str = Field(
        ...,
        min_length=10,
        max_length=MAX_LONG_STRING_LENGTH,
        description="Job description text",
    )


class SkillsMatchResponse(BaseModel):
    """Response with skills matching results."""

    matched_skills: List[str] = Field(
        ..., description="Skills found in both resume and job description"
    )
    missing_skills: List[str] = Field(
        ..., description="Skills from job description not found in resume"
    )
    additional_skills: List[str] = Field(
        ..., description="Skills in resume not mentioned in job description"
    )
    match_rate: float = Field(
        ..., ge=0.0, le=1.0, description="Skills match rate (0.0 to 1.0)"
    )
    match_score: int = Field(
        ..., ge=0, le=100, description="Overall match score (0-100)"
    )
    jd_skills: List[str] = Field(
        ..., description="Skills extracted from job description"
    )
    resume_skills: List[str] = Field(..., description="Skills extracted from resume")


class ATSCheckRequest(BaseModel):
    """Request to check ATS compatibility."""

    resume_data: ResumeData = Field(..., description="Resume data to check")
    job_description: Optional[str] = Field(
        None,
        max_length=MAX_LONG_STRING_LENGTH,
        description="Optional job description for keyword matching",
    )


class ATSIssue(BaseModel):
    """ATS compatibility issue."""

    type: str = Field(..., description="Issue type")
    severity: str = Field(..., description="Issue severity (high, medium, low)")
    message: str = Field(..., description="Issue description")


class ATSCheckResponse(BaseModel):
    """Response with ATS compatibility results."""

    overall_score: int = Field(
        ..., ge=0, le=100, description="Overall ATS score (0-100)"
    )
    passed: bool = Field(
        ..., description="Whether resume passed ATS check (score >= 70)"
    )
    issues: List[ATSIssue] = Field(..., description="List of ATS issues found")
    recommendations: List[str] = Field(
        ..., description="Recommendations for improvement"
    )
    keyword_match_rate: float = Field(
        ..., ge=0.0, le=1.0, description="Keyword match rate with job description"
    )
    formatting_score: int = Field(..., ge=0, le=100, description="Formatting score")
    content_score: int = Field(..., ge=0, le=100, description="Content quality score")
    sections_found: List[str] = Field(..., description="Resume sections found")
    sections_missing: List[str] = Field(..., description="Required sections missing")


class JDInsightsRequest(BaseModel):
    """Request for comprehensive JD insights and resume matching."""

    resume_data: ResumeData = Field(..., description="Resume data")
    job_description: str = Field(
        ...,
        min_length=10,
        max_length=MAX_LONG_STRING_LENGTH,
        description="Job description text",
    )


class JDInsightsResponse(BaseModel):
    """Comprehensive response with JD analysis and resume matching."""

    jd_analysis: JDAnalysisResponse = Field(..., description="Parsed job description")
    skills_match: SkillsMatchResponse = Field(
        ..., description="Skills matching results"
    )
    ats_check: ATSCheckResponse = Field(..., description="ATS compatibility check")
    overall_fit_score: int = Field(
        ..., ge=0, le=100, description="Overall candidate fit score"
    )
    summary: str = Field(..., description="Summary of analysis")
    top_recommendations: List[str] = Field(
        ..., description="Top recommendations for improving fit"
    )


class SkillGapRequest(BaseModel):
    """Request model for skill-gap analysis."""

    job_description: str = Field(..., description="Full job description text")
    resume_data: Dict[str, Any] = Field(..., description="Resume JSON payload")


class SkillGapResponse(BaseModel):
    """Response model for skill-gap analysis."""

    missing_skills: List[str] = Field(
        ...,
        description="Skills required by the job but not present in the resume",
    )
    matched_skills: List[str] = Field(
        ..., description="Skills present in both job and resume"
    )
    match_score: int = Field(..., description="Overall match percentage (0-100)")


# =============================================================================
# Team Collaboration Models
# =============================================================================


class TeamMemberRole(str):
    """Team member role enumeration."""

    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class TeamCreate(BaseModel):
    """Request model for creating a team."""

    name: str = Field(..., max_length=200, description="Team name")
    description: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Team description"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate team name."""
        v = sanitize_html(v)
        if not v or not v.strip():
            raise ValueError("Team name cannot be empty")
        return v.strip()


class TeamUpdate(BaseModel):
    """Request model for updating a team."""

    name: Optional[str] = Field(None, max_length=200, description="Team name")
    description: Optional[str] = Field(
        None, max_length=MAX_STRING_LENGTH, description="Team description"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate team name."""
        if v is not None:
            v = sanitize_html(v)
            if not v.strip():
                raise ValueError("Team name cannot be empty")
            return v.strip()
        return v


class TeamInvite(BaseModel):
    """Request model for inviting a team member."""

    email: str = Field(..., max_length=255, description="Email of user to invite")
    role: str = Field(
        default="viewer",
        max_length=50,
        description="Role to assign (owner, admin, editor, viewer)",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        v = v.strip().lower()
        if not EMAIL_PATTERN.match(v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate role."""
        valid_roles = ["owner", "admin", "editor", "viewer"]
        v = v.strip().lower()
        if v not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        return v


class TeamMemberResponse(BaseModel):
    """Response model for team member."""

    user_id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    username: str = Field(..., description="Username")
    role: str = Field(..., description="Team role")
    joined_at: str = Field(..., description="Join timestamp")


class TeamResponse(BaseModel):
    """Response model for team."""

    id: int = Field(..., description="Team ID")
    name: str = Field(..., description="Team name")
    description: Optional[str] = Field(None, description="Team description")
    owner_id: int = Field(..., description="Owner user ID")
    member_count: int = Field(..., description="Number of team members")
    resume_count: int = Field(default=0, description="Number of shared resumes")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


class TeamDetailResponse(BaseModel):
    """Detailed response model for team with members."""

    id: int = Field(..., description="Team ID")
    name: str = Field(..., description="Team name")
    description: Optional[str] = Field(None, description="Team description")
    owner_id: int = Field(..., description="Owner user ID")
    members: List[TeamMemberResponse] = Field(
        default_factory=list, description="Team members"
    )
    resume_count: int = Field(default=0, description="Number of shared resumes")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


class TeamResumeShare(BaseModel):
    """Request model for sharing a resume with a team."""

    resume_id: int = Field(..., description="Resume ID to share")
    permission: str = Field(
        default="view",
        max_length=50,
        description="Permission level (view, edit, admin)",
    )

    @field_validator("permission")
    @classmethod
    def validate_permission(cls, v: str) -> str:
        """Validate permission."""
        valid_permissions = ["view", "edit", "admin"]
        v = v.strip().lower()
        if v not in valid_permissions:
            raise ValueError(
                f"Invalid permission. Must be one of: {', '.join(valid_permissions)}"
            )
        return v


class TeamActivityResponse(BaseModel):
    """Response model for team activity."""

    id: int = Field(..., description="Activity ID")
    team_id: int = Field(..., description="Team ID")
    user_id: int = Field(..., description="User who performed the action")
    username: str = Field(..., description="Username")
    action: str = Field(..., description="Action type")
    resource_type: str = Field(..., description="Type of resource (resume, comment)")
    resource_id: Optional[int] = Field(None, description="Resource ID")
    description: str = Field(..., description="Activity description")
    created_at: str = Field(..., description="Activity timestamp")


class ResumeCommentCreate(BaseModel):
    """Request model for adding a comment to a resume."""

    content: str = Field(
        ..., min_length=1, max_length=5000, description="Comment content"
    )
    section: Optional[str] = Field(
        None, max_length=100, description="Resume section being commented on"
    )
    position: Optional[Dict[str, Any]] = Field(
        None, description="Position information for inline comments"
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        """Validate comment content."""
        v = sanitize_html(v)
        if not v.strip():
            raise ValueError("Comment content cannot be empty")
        return v


class ResumeCommentResponse(BaseModel):
    """Response model for resume comment."""

    id: int = Field(..., description="Comment ID")
    resume_id: int = Field(..., description="Resume ID")
    user_id: int = Field(..., description="User who created the comment")
    username: str = Field(..., description="Username")
    content: str = Field(..., description="Comment content")
    section: Optional[str] = Field(None, description="Resume section")
    position: Optional[Dict[str, Any]] = Field(None, description="Position info")
    is_resolved: bool = Field(..., description="Whether comment is resolved")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    replies: List["ResumeCommentResponse"] = Field(
        default_factory=list, description="Comment replies"
    )


class ResumeCommentUpdate(BaseModel):
    """Request model for updating a comment."""

    content: Optional[str] = Field(
        None, min_length=1, max_length=5000, description="Comment content"
    )
    is_resolved: Optional[bool] = Field(None, description="Mark as resolved")

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Optional[str]) -> Optional[str]:
        """Validate comment content."""
        if v is not None:
            v = sanitize_html(v)
            if not v.strip():
                raise ValueError("Comment content cannot be empty")
            return v
        return v


# =============================================================================
# GitHub Integration Models
# =============================================================================


class GitHubStatusResponse(BaseModel):
    """Response model for GitHub connection status."""

    authenticated: bool = Field(
        ..., description="Whether user is authenticated with GitHub"
    )
    mode: str = Field(..., description="Authentication mode being used (oauth or cli)")
    username: Optional[str] = Field(
        None, description="GitHub username if authenticated"
    )
    github_user_id: Optional[str] = Field(
        None, description="GitHub user ID if authenticated"
    )
    connected_at: Optional[str] = Field(
        None, description="Timestamp when connection was established (OAuth mode only)"
    )
    error: Optional[str] = Field(None, description="Error message if check failed")


class GitHubDisconnectResponse(BaseModel):
    """Response model for GitHub disconnection."""

    message: str = Field(..., description="Success message")


class GitHubCLIStatus(BaseModel):
    """Internal model for GitHub CLI status check."""

    authenticated: bool
    username: Optional[str] = None
    error: Optional[str] = None
