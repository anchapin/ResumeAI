"""
Log scrubbing module for removing sensitive data from logs.

This module provides:
- Patterns for detecting sensitive data (PII, credentials, tokens)
- Structlog processor for scrubbing sensitive data from log entries
- Validation utilities to ensure no sensitive information is logged
"""

import re
from typing import Any

import structlog

# Patterns for sensitive data detection
SENSITIVE_PATTERNS = {
    # API Keys and Tokens
    "api_key": re.compile(
        r"(?i)(api[_-]?key|apikey|access[_-]?token|auth[_-]?token)"
        r"[\"']?\s*[:=]\s*[\"']?([a-zA-Z0-9_\-]{20,})[\"']?",
        re.IGNORECASE,
    ),
    "bearer_token": re.compile(
        r"(?i)(bearer|jwt)[\"']?\s*[:=]\s*[\"']?([a-zA-Z0-9_\-\.]+)[\"']?",
        re.IGNORECASE,
    ),
    "secret_key": re.compile(
        r"(?i)(secret[_-]?key|client[_-]?secret|app[_-]?secret)"
        r"[\"']?\s*[:=]\s*[\"']?([a-zA-Z0-9_\-]{16,})[\"']?",
        re.IGNORECASE,
    ),
    "password": re.compile(
        r"(?i)(password|passwd|pwd|pass)" r"[\"']?\s*[:=]\s*[\"']?([^\s\"']{4,})[\"']?",
        re.IGNORECASE,
    ),
    "private_key": re.compile(
        r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----",
        re.IGNORECASE,
    ),
    "github_token": re.compile(
        r"(?i)(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}",
        re.IGNORECASE,
    ),
    "aws_access_key": re.compile(
        r"(?i)(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}",
    ),
    "aws_secret_key": re.compile(
        r"(?i)aws[_-]?secret[_-]?access[_-]?key" r"[\"']?\s*[:=]\s*[\"']?[a-zA-Z0-9/+=]{40}[\"']?",
    ),
    # PII patterns
    "email": re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    ),
    "ssn": re.compile(
        r"\b(?!000|666|9\d{2})[0-9]{3}[-\s]?(?!00)[0-9]{2}" r"[-\s]?(?!0000)[0-9]{4}\b",
    ),
    "phone": re.compile(
        r"\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b",
    ),
    "credit_card": re.compile(
        r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}"
        r"|6(?:011|5[0-9]{2})[0-9]{12})\b",
    ),
    "ip_address": re.compile(
        r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}"
        r"(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
    ),
}

# Fields that should always be redacted regardless of content
SENSITIVE_FIELDS = {
    # Authentication
    "password",
    "passwd",
    "pwd",
    "secret",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "apikey",
    "api_secret",
    "client_secret",
    "private_key",
    "session_token",
    "jwt",
    "bearer_token",
    "authorization",
    # Credentials
    "credentials",
    "credential",
    "auth",
    "auth_key",
    # PII
    "email",
    "phone",
    "ssn",
    "social_security",
    "social_security_number",
    "date_of_birth",
    "dob",
    "first_name",
    "last_name",
    "full_name",
    "address",
    "credit_card",
    "card_number",
    # Keys and secrets
    "encryption_key",
    "encryption_key_id",
    "hmac_key",
    "signing_key",
    "aws_access_key_id",
    "aws_secret_access_key",
    "github_token",
    "github_oauth_token",
    "linkedin_token",
    "google_token",
}

# Replacement string for sensitive data
REDACTED = "[REDACTED]"


def _get_sensitive_fields_regex() -> re.Pattern:
    """Build regex pattern for matching sensitive field names."""
    field_pattern = "|".join(re.escape(f) for f in SENSITIVE_FIELDS)
    return re.compile(rf"\b({field_pattern})\b", re.IGNORECASE)


_SENSITIVE_FIELD_REGEX = _get_sensitive_fields_regex()


def _is_sensitive_field_key(key: str) -> bool:
    """Check if a field key is considered sensitive."""
    return bool(_SENSITIVE_FIELD_REGEX.search(key))


def scrub_value(value: Any) -> Any:
    """
    Recursively scrub sensitive values from a dictionary or list.

    Args:
        value: The value to scrub (can be dict, list, str, or other)

    Returns:
        The scrubbed value with sensitive data replaced
    """
    if isinstance(value, dict):
        return {
            k: REDACTED if _is_sensitive_field_key(k) else scrub_value(v) for k, v in value.items()
        }
    elif isinstance(value, list):
        return [scrub_value(item) for item in value]
    elif isinstance(value, str):
        return _scrub_string(value)
    return value


def _scrub_string(text: str) -> str:
    """
    Scrub sensitive patterns from a string.

    Args:
        text: The text to scrub

    Returns:
        The scrubbed text
    """
    result = text

    # Check for high-confidence secrets first (private keys, AWS keys, GitHub tokens)
    for pattern_name, pattern in SENSITIVE_PATTERNS.items():
        if pattern_name in ("private_key", "github_token", "aws_access_key", "aws_secret_key"):
            result = pattern.sub(REDACTED, result)

    # Generic patterns that might cause false positives - only apply in context
    # These check for key=value patterns
    for pattern_name, pattern in SENSITIVE_PATTERNS.items():
        if pattern_name in ("api_key", "bearer_token", "secret_key", "password"):
            result = pattern.sub(lambda m: f"{m.group(1)}={REDACTED}", result)

    return result


def scrub_log_entry(
    logger: structlog.stdlib.BoundLogger,
    method_name: str,
    event_dict: dict,
) -> dict:
    """
    Structlog processor to scrub sensitive data from log entries.

    This processor should be added early in the processor chain to ensure
    all log data is scrubbed before rendering.

    Args:
        logger: The structlog logger
        method_name: The log method name (info, warning, error, etc.)
        event_dict: The log event dictionary

    Returns:
        The scrubbed event dictionary
    """
    # Scrub all values in the event dictionary
    for key, value in event_dict.items():
        # Always redact sensitive field keys
        if _is_sensitive_field_key(key):
            event_dict[key] = REDACTED
        # Scrub string values for patterns
        elif isinstance(value, str):
            event_dict[key] = _scrub_string(value)
        # Recursively scrub nested structures
        elif isinstance(value, (dict, list)):
            event_dict[key] = scrub_value(value)

    return event_dict


def validate_log_entry(event_dict: dict) -> list[str]:
    """
    Validate that a log entry doesn't contain sensitive data.

    Args:
        event_dict: The log event dictionary to validate

    Returns:
        List of warnings for potential sensitive data found
    """
    warnings = []

    # Check field keys
    for key in event_dict.keys():
        if _is_sensitive_field_key(key):
            warnings.append(f"Potentially sensitive field key: {key}")

    # Check string values for patterns
    def check_values(value: Any, path: str = ""):
        if isinstance(value, dict):
            for k, v in value.items():
                check_values(v, f"{path}.{k}" if path else k)
        elif isinstance(value, list):
            for i, item in enumerate(value):
                check_values(item, f"{path}[{i}]")
        elif isinstance(value, str):
            # Check for sensitive patterns
            for pattern_name, pattern in SENSITIVE_PATTERNS.items():
                if pattern.search(value):
                    warnings.append(
                        f"Potential {pattern_name} detected at {path}: "
                        f"{value[:50]}{'...' if len(value) > 50 else ''}"
                    )

    check_values(event_dict)

    return warnings


def get_scrubber_processor():
    """
    Get a configured structlog processor for scrubbing.

    Returns:
        A structlog processor function for use in structlog.configure()
    """
    return scrub_log_entry


# Module-level processor that can be used directly
scrubber_processor = scrub_log_entry
