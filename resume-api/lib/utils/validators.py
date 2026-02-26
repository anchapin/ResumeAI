"""
Input validation and LaTeX escaping utilities for the Resume API.

This module provides functions for:
1. LaTeX special character escaping
2. Input validation (length, format, etc.)
3. Email and URL validation
4. XSS prevention
"""

import re
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse


# LaTeX special characters that need escaping
LATEX_SPECIAL_CHARS = {
    "\\": "\\textbackslash{}",
    "{": "\\{",
    "}": "\\}",
    "$": "\\$",
    "%": "\\%",
    "#": "\\#",
    "&": "\\&",
    "_": "\\_",
    "^": "\\textasciicircum{}",
    "~": "\\textasciitilde{}",
}

# Validation patterns
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
URL_PATTERN = re.compile(
    r"^(https?://|ftp://)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$", re.IGNORECASE
)
PHONE_PATTERN = re.compile(r"^[\d\s\-\+\(\)]{7,20}$")

# Maximum field lengths
MAX_STRING_LENGTH = 1000
MAX_LONG_STRING_LENGTH = 10000
MAX_SUMMARY_LENGTH = 5000
MAX_HIGHLIGHT_LENGTH = 500
MAX_DESCRIPTION_LENGTH = 2000


def escape_latex(text: Optional[str]) -> Optional[str]:
    """
    Escape LaTeX special characters in text to prevent injection attacks.

    LaTeX special characters that are escaped:
    - \\ (backslash) -> \\textbackslash{}
    - { (left brace) -> \\{
    - } (right brace) -> \\}
    - $ (dollar) -> \\$
    - % (percent) -> \\%
    - # (hash) -> \\#
    - & (ampersand) -> \\&
    - _ (underscore) -> \\_
    - ^ (caret) -> \\textasciicircum{}
    - ~ (tilde) -> \\textasciitilde{}

    Args:
        text: String to escape

    Returns:
        Escaped string, or None if input is None

    Example:
        >>> escape_latex("John's $100 bonus (50%)")
        "John's \\$100 bonus (50\\%)"
    """
    if not text:
        return text

    # Process in order: backslash first to avoid double-escaping
    result = text
    for char, escaped in LATEX_SPECIAL_CHARS.items():
        result = result.replace(char, escaped)

    return result


def validate_email(email: Optional[str]) -> Optional[str]:
    """
    Validate email address format.

    Args:
        email: Email address to validate

    Returns:
        Normalized (lowercase) email if valid, None if input is None

    Raises:
        ValueError: If email format is invalid
    """
    if not email:
        return email

    email = email.strip().lower()

    if not EMAIL_PATTERN.match(email):
        raise ValueError(f"Invalid email format: '{email}'")

    # Check length
    if len(email) > MAX_STRING_LENGTH:
        raise ValueError(f"Email exceeds maximum length of {MAX_STRING_LENGTH} characters")

    return email


def validate_url(url: Optional[str]) -> Optional[str]:
    """
    Validate URL format.

    Args:
        url: URL to validate

    Returns:
        Validated URL if valid, None if input is None

    Raises:
        ValueError: If URL format is invalid
    """
    if not url:
        return url

    url = url.strip()

    if not URL_PATTERN.match(url):
        raise ValueError(f"Invalid URL format: '{url}'")

    # Check length
    if len(url) > MAX_STRING_LENGTH:
        raise ValueError(f"URL exceeds maximum length of {MAX_STRING_LENGTH} characters")

    try:
        parsed = urlparse(url if url.startswith(("http://", "https://", "ftp://")) else f"https://{url}")
        if not parsed.netloc:
            raise ValueError("URL must have a valid domain")
    except Exception as e:
        raise ValueError(f"Invalid URL: {str(e)}")

    return url


def validate_phone(phone: Optional[str]) -> Optional[str]:
    """
    Validate phone number format.

    Args:
        phone: Phone number to validate

    Returns:
        Validated phone number if valid, None if input is None

    Raises:
        ValueError: If phone format is invalid
    """
    if not phone:
        return phone

    phone = phone.strip()

    if not PHONE_PATTERN.match(phone):
        raise ValueError(
            f"Invalid phone format: '{phone}'. "
            "Phone must contain 7-20 digits and may include spaces, dashes, plus, or parentheses"
        )

    return phone


def validate_string_length(
    text: Optional[str], field_name: str, max_length: int = MAX_STRING_LENGTH
) -> Optional[str]:
    """
    Validate that a string does not exceed maximum length.

    Args:
        text: String to validate
        field_name: Name of field for error messages
        max_length: Maximum allowed length

    Returns:
        Validated string, or None if input is None

    Raises:
        ValueError: If string exceeds maximum length
    """
    if text and len(text) > max_length:
        raise ValueError(
            f"{field_name} exceeds maximum length of {max_length} characters "
            f"(current: {len(text)})"
        )
    return text


def validate_list_length(
    items: Optional[List[str]], field_name: str, max_items: int = 100
) -> List[str]:
    """
    Validate that a list does not exceed maximum item count.

    Args:
        items: List to validate
        field_name: Name of field for error messages
        max_items: Maximum allowed items

    Returns:
        Validated list, or empty list if input is None

    Raises:
        ValueError: If list exceeds maximum items
    """
    if items and len(items) > max_items:
        raise ValueError(
            f"{field_name} exceeds maximum of {max_items} items "
            f"(current: {len(items)})"
        )
    return items or []


def sanitize_html(text: Optional[str]) -> Optional[str]:
    """
    Remove potentially dangerous HTML/JavaScript from input.

    Removes:
    - Script tags and content
    - Dangerous tags (iframe, object, embed, form, input, button)
    - Event handlers (onclick, onerror, etc.)
    - JavaScript and data URLs

    Args:
        text: Input string to sanitize

    Returns:
        Sanitized string, or None if input is None or becomes empty after sanitization
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

    # Remove event handlers
    text = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', "", text, flags=re.IGNORECASE)

    # Remove javascript: and data: URLs
    text = re.sub(r"javascript\s*:", "", text, flags=re.IGNORECASE)
    text = re.sub(r"data\s*:", "", text, flags=re.IGNORECASE)

    stripped = text.strip() if text else ""
    return stripped if stripped else None


def validate_resume_field(
    value: Optional[str],
    field_name: str,
    max_length: int = MAX_STRING_LENGTH,
    escape_latex: bool = True,
    sanitize: bool = True,
) -> Optional[str]:
    """
    Validate and optionally escape/sanitize a resume field.

    This is the primary validation function for resume fields.

    Args:
        value: Field value to validate
        field_name: Name of field for error messages
        max_length: Maximum allowed length
        escape_latex: Whether to escape LaTeX special chars
        sanitize: Whether to sanitize HTML/XSS

    Returns:
        Validated/escaped/sanitized value, or None

    Raises:
        ValueError: If validation fails
    """
    if not value:
        return value

    # Sanitize HTML first
    if sanitize:
        value = sanitize_html(value)
        if not value:
            return None

    # Check length
    validate_string_length(value, field_name, max_length)

    # Escape LaTeX
    if escape_latex:
        value = globals()["escape_latex"](value)

    return value


def validate_resume_data(resume_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and escape all fields in resume data.

    Args:
        resume_dict: Resume data dictionary to validate

    Returns:
        Validated/escaped resume data

    Raises:
        ValueError: If validation fails
    """
    validated = {}

    # Validate basic info
    if "basics" in resume_dict and resume_dict["basics"]:
        basics = resume_dict["basics"]
        validated_basics = {}

        if "name" in basics:
            validated_basics["name"] = validate_resume_field(
                basics["name"], "Name", MAX_STRING_LENGTH
            )
        if "label" in basics:
            validated_basics["label"] = validate_resume_field(
                basics["label"], "Label", MAX_STRING_LENGTH
            )
        if "email" in basics:
            validated_basics["email"] = validate_email(basics.get("email"))
        if "phone" in basics:
            validated_basics["phone"] = validate_phone(basics.get("phone"))
        if "url" in basics:
            validated_basics["url"] = validate_url(basics.get("url"))
        if "summary" in basics:
            validated_basics["summary"] = validate_resume_field(
                basics["summary"], "Summary", MAX_SUMMARY_LENGTH
            )
        if "location" in basics and basics["location"]:
            validated_basics["location"] = validate_location(basics["location"])

        validated["basics"] = validated_basics

    # Validate work experience
    if "work" in resume_dict and resume_dict["work"]:
        validated["work"] = [
            validate_work_item(item) for item in resume_dict["work"]
        ]

    # Validate education
    if "education" in resume_dict and resume_dict["education"]:
        validated["education"] = [
            validate_education_item(item) for item in resume_dict["education"]
        ]

    # Validate skills
    if "skills" in resume_dict and resume_dict["skills"]:
        validated["skills"] = [
            validate_skill_item(item) for item in resume_dict["skills"]
        ]

    # Validate projects
    if "projects" in resume_dict and resume_dict["projects"]:
        validated["projects"] = [
            validate_project_item(item) for item in resume_dict["projects"]
        ]

    # Validate languages
    if "languages" in resume_dict and resume_dict["languages"]:
        validated["languages"] = [
            validate_language_item(item) for item in resume_dict["languages"]
        ]

    # Copy any other fields as-is
    for key in resume_dict:
        if key not in validated:
            validated[key] = resume_dict[key]

    return validated


def validate_location(location: Dict[str, Any]) -> Dict[str, Any]:
    """Validate location fields."""
    validated = {}

    if "address" in location:
        validated["address"] = validate_resume_field(
            location.get("address"), "Address", MAX_STRING_LENGTH
        )
    if "city" in location:
        validated["city"] = validate_resume_field(
            location.get("city"), "City", MAX_STRING_LENGTH
        )
    if "region" in location:
        validated["region"] = validate_resume_field(
            location.get("region"), "Region", MAX_STRING_LENGTH
        )
    if "countryCode" in location:
        validated["countryCode"] = validate_resume_field(
            location.get("countryCode"), "Country Code", 5
        )
    if "postalCode" in location:
        validated["postalCode"] = validate_resume_field(
            location.get("postalCode"), "Postal Code", 20
        )

    return validated


def validate_work_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Validate work experience item."""
    validated = {}

    if "company" in item:
        validated["company"] = validate_resume_field(
            item.get("company"), "Company", MAX_STRING_LENGTH
        )
    if "position" in item:
        validated["position"] = validate_resume_field(
            item.get("position"), "Position", MAX_STRING_LENGTH
        )
    if "summary" in item:
        validated["summary"] = validate_resume_field(
            item.get("summary"), "Work Summary", MAX_DESCRIPTION_LENGTH
        )
    if "highlights" in item and item["highlights"]:
        validated["highlights"] = [
            validate_resume_field(h, "Highlight", MAX_HIGHLIGHT_LENGTH)
            for h in item["highlights"]
        ]
    if "startDate" in item:
        validated["startDate"] = item.get("startDate")
    if "endDate" in item:
        validated["endDate"] = item.get("endDate")
    if "url" in item:
        validated["url"] = validate_url(item.get("url"))

    return validated


def validate_education_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Validate education item."""
    validated = {}

    if "institution" in item:
        validated["institution"] = validate_resume_field(
            item.get("institution"), "Institution", MAX_STRING_LENGTH
        )
    if "studyType" in item:
        validated["studyType"] = validate_resume_field(
            item.get("studyType"), "Study Type", MAX_STRING_LENGTH
        )
    if "area" in item:
        validated["area"] = validate_resume_field(
            item.get("area"), "Area of Study", MAX_STRING_LENGTH
        )
    if "score" in item:
        validated["score"] = validate_resume_field(
            item.get("score"), "Score", 50
        )
    if "startDate" in item:
        validated["startDate"] = item.get("startDate")
    if "endDate" in item:
        validated["endDate"] = item.get("endDate")
    if "url" in item:
        validated["url"] = validate_url(item.get("url"))

    return validated


def validate_skill_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Validate skill item."""
    validated = {}

    if "name" in item:
        validated["name"] = validate_resume_field(
            item.get("name"), "Skill Name", MAX_STRING_LENGTH
        )
    if "level" in item:
        validated["level"] = validate_resume_field(
            item.get("level"), "Skill Level", 50
        )
    if "keywords" in item and item["keywords"]:
        validated["keywords"] = [
            validate_resume_field(k, "Keyword", MAX_STRING_LENGTH)
            for k in item["keywords"]
        ]

    return validated


def validate_project_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Validate project item."""
    validated = {}

    if "name" in item:
        validated["name"] = validate_resume_field(
            item.get("name"), "Project Name", MAX_STRING_LENGTH
        )
    if "description" in item:
        validated["description"] = validate_resume_field(
            item.get("description"), "Project Description", MAX_DESCRIPTION_LENGTH
        )
    if "highlights" in item and item["highlights"]:
        validated["highlights"] = [
            validate_resume_field(h, "Project Highlight", MAX_HIGHLIGHT_LENGTH)
            for h in item["highlights"]
        ]
    if "startDate" in item:
        validated["startDate"] = item.get("startDate")
    if "endDate" in item:
        validated["endDate"] = item.get("endDate")
    if "url" in item:
        validated["url"] = validate_url(item.get("url"))

    return validated


def validate_language_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Validate language item."""
    validated = {}

    if "language" in item:
        validated["language"] = validate_resume_field(
            item.get("language"), "Language", MAX_STRING_LENGTH
        )
    if "fluency" in item:
        validated["fluency"] = validate_resume_field(
            item.get("fluency"), "Fluency", MAX_STRING_LENGTH
        )

    return validated
