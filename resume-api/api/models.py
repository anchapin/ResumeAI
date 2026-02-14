"""
Pydantic models for request/response validation.
"""

import re
from typing import Dict, Any, Optional, List
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
                            f"{field_name[:-1].capitalize()} field '{key}' exceeds maximum length of {MAX_STRING_LENGTH} characters"
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
                                    f"{field_name[:-1].capitalize()} list item exceeds maximum length of {MAX_STRING_LENGTH} characters"
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
    suggestions: Optional[Dict[str, Any]] = Field(
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
