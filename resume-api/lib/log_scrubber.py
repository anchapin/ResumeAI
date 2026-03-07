"""
Log Scrubbing Module for ResumeAI API

Redacts sensitive data from logs to protect user privacy and security.
Supports PII, credentials, tokens, and other sensitive information.
"""

import re
import logging
from typing import List, Pattern, Dict, Any, Optional
from dataclasses import dataclass









@dataclass
class ScrubRule:
    """Represents a scrubbing rule for sensitive data"""

    name: str
    pattern: Pattern[str]
    replacement: str = "[REDACTED]"
    enabled: bool = True


class LogScrubber:
    """
    Main class for scrubbing sensitive data from logs.

    Usage:
        scrubber = LogScrubber()
        clean_message = scrubber.scrub("User password: secret123")
        # Output: "User password: [REDACTED]"
    """

    # Pre-compiled regex patterns for common sensitive data
    DEFAULT_RULES: List[ScrubRule] = [
        # API Keys and Tokens
        ScrubRule(
            name="api_key",
            pattern=re.compile(
                r"(?i)(api[_-]?key|apikey)[\"']?\s*[:=]\s*[\"']?([a-zA-Z0-9_\-]{20,})[\"']?",
                re.IGNORECASE,
            ),
            replacement="[API_KEY]",
        ),
        ScrubRule(
            name="bearer_token",
            pattern=re.compile(r"(?i)Bearer\s+([a-zA-Z0-9_\-\.]+)"),
            replacement="Bearer [TOKEN]",
        ),
        ScrubRule(
            name="jwt_token",
            pattern=re.compile(r"(?i)eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+"),
            replacement="[JWT_TOKEN]",
        ),
        ScrubRule(
            name="github_token",
            pattern=re.compile(r"(gh[pousr]_[a-zA-Z0-9]{36,})"),
            replacement="[GITHUB_TOKEN]",
        ),
        ScrubRule(
            name="aws_key",
            pattern=re.compile(r"(?i)(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}"),
            replacement="[AWS_ACCESS_KEY]",
        ),
        ScrubRule(
            name="aws_secret",
            pattern=re.compile(
                r"(?i)aws[_-]?secret[_-]?access[_-]?key[\"']?\s*[:=]\s*[\"']?([a-zA-Z0-9/+=]{40})[\"']?",
                re.IGNORECASE,
            ),
            replacement="[AWS_SECRET_KEY]",
        ),
        # Passwords and Credentials
        ScrubRule(
            name="password",
            pattern=re.compile(
                r"(?i)(password|passwd|pwd)[\"']?\s*[:=]\s*[\"']?([^\s\"'&]+)[\"']?", re.IGNORECASE
            ),
            replacement="[PASSWORD]",
        ),
        ScrubRule(
            name="secret",
            pattern=re.compile(
                r"(?i)(secret|client[_-]?secret)[\"']?\s*[:=]\s*[\"']?([^\s\"'&]+)[\"']?",
                re.IGNORECASE,
            ),
            replacement="[SECRET]",
        ),
        ScrubRule(
            name="private_key",
            pattern=re.compile(
                r"-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----"
            ),
            replacement="[PRIVATE_KEY]",
        ),
        # Personal Identifiable Information (PII)
        ScrubRule(
            name="email",
            pattern=re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
            replacement="[EMAIL]",
        ),
        ScrubRule(
            name="ssn", pattern=re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b"), replacement="[SSN]"
        ),
        ScrubRule(
            name="phone",
            pattern=re.compile(r"\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b"),
            replacement="[PHONE]",
        ),
        ScrubRule(
            name="credit_card",
            pattern=re.compile(
                r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b"
            ),
            replacement="[CREDIT_CARD]",
        ),
        # IP Addresses (optional - may want to keep for debugging)
        ScrubRule(
            name="ip_address",
            pattern=re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"),
            replacement="[IP]",
        ),
        # Authorization headers
        ScrubRule(
            name="auth_header",
            pattern=re.compile(r"(?i)Authorization:\s*[^\s]+"),
            replacement="Authorization: [REDACTED]",
        ),
    ]

    def __init__(self, custom_rules: Optional[List[ScrubRule]] = None):
        """
        Initialize the scrubber with default and optional custom rules.

        Args:
            custom_rules: Optional list of additional scrubbing rules
        """
        self.rules = self.DEFAULT_RULES.copy()
        if custom_rules:
            self.rules.extend(custom_rules)

        # Compile patterns
        self._compiled_rules: List[ScrubRule] = []
        for rule in self.rules:
            if rule.enabled:
                self._compiled_rules.append(rule)

    def scrub(self, message: str) -> str:
        """
        Scrub sensitive data from a log message.

        Args:
            message: The log message to scrub

        Returns:
            Cleaned message with sensitive data redacted
        """
        result = message

        for rule in self._compiled_rules:
            result = rule.pattern.sub(rule.replacement, result)

        return result

    def scrub_dict(
        self, data: Dict[str, Any], keys_to_scrub: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Recursively scrub sensitive data from a dictionary.

        Args:
            data: Dictionary to scrub
            keys_to_scrub: Optional list of specific keys to scrub

        Returns:
            Cleaned dictionary
        """
        if keys_to_scrub is None:
            # Default keys that likely contain sensitive data
            keys_to_scrub = [
                "password",
                "secret",
                "token",
                "key",
                "api_key",
                "apikey",
                "auth",
                "credential",
                "private",
                "ssn",
                "credit_card",
            ]

        result = {}

        for key, value in data.items():
            if isinstance(value, dict):
                result[key] = self.scrub_dict(value, keys_to_scrub)
            elif isinstance(value, list):
                result[key] = [
                    self.scrub_dict(item, keys_to_scrub) if isinstance(item, dict) else item
                    for item in value
                ]
            elif isinstance(value, str):
                # Check if this key should be scrubbed
                key_lower = key.lower()
                if any(sensitive in key_lower for sensitive in keys_to_scrub):
                    result[key] = "[REDACTED]"
                else:
                    result[key] = self.scrub(value)
            else:
                result[key] = value

        return result

    def scrub_exception(self, exc: Exception, include_traceback: bool = True) -> str:
        """
        Scrub sensitive data from an exception and optionally its traceback.

        Args:
            exc: Exception to scrub
            include_traceback: Whether to include traceback in output

        Returns:
            Cleaned exception string
        """
        parts = [f"{type(exc).__name__}: {str(exc)}"]

        if include_traceback:
            import traceback

            tb = traceback.format_exc()
            parts.append(self.scrub(tb))

        return "\n".join(parts)

    def add_rule(self, rule: ScrubRule) -> None:
        """Add a custom scrubbing rule"""
        if rule.enabled:
            self._compiled_rules.append(rule)

    def remove_rule(self, name: str) -> bool:
        """Remove a rule by name"""
        for i, rule in enumerate(self._compiled_rules):
            if rule.name == name:
                self._compiled_rules.pop(i)
                return True
        return False


# Global scrubber instance
_scrubber: Optional[LogScrubber] = None


def get_scrubber() -> LogScrubber:
    """Get or create global scrubber instance"""
    global _scrubber
    if _scrubber is None:
        _scrubber = LogScrubber()
    return _scrubber


def scrub(message: str) -> str:
    """Convenience function to scrub a message"""
    return get_scrubber().scrub(message)


def scrub_dict(data: Dict[str, Any], keys_to_scrub: Optional[List[str]] = None) -> Dict[str, Any]:
    """Convenience function to scrub a dictionary"""
    return get_scrubber().scrub_dict(data, keys_to_scrub)


class ScrubbingFormatter(logging.Formatter):
    """
    Custom logging formatter that automatically scrubs sensitive data.

    Usage:
        handler = logging.StreamHandler()
        handler.setFormatter(ScrubbingFormatter("%(message)s"))
    """

    def __init__(self, fmt: Optional[str] = None, scrubber: Optional[LogScrubber] = None):
        super().__init__(fmt)
        self.scrubber = scrubber or get_scrubber()

    def format(self, record: logging.LogRecord) -> str:
        # Scrub the message
        record.msg = self.scrubber.scrub(str(record.msg))

        # Also scrub any arguments
        if record.args:
            record.args = tuple(
                self.scrubber.scrub(str(arg)) if isinstance(arg, str) else arg
                for arg in record.args
            )

        return super().format(record)


def configure_logging(
    level: int = logging.INFO,
    format_string: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
) -> None:
    """
    Configure logging with scrubbing formatter.

    Args:
        level: Logging level
        format_string: Log format string
    """
    handler = logging.StreamHandler()
    handler.setFormatter(ScrubbingFormatter(format_string))

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(handler)


# Example usage and testing
if __name__ == "__main__":
    # Test the scrubber
    scrubber = LogScrubber()

    test_messages = [
        "User login: john@example.com with password: secret123",
        "API Request: api_key=sk_live_abc123def456ghi789",
        "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "SSN: 123-45-6789, Phone: (555) 123-4567",
        "Credit Card: 4111111111111111",
        "AWS: aws_access_key_id=AKIAIOSFODNN7EXAMPLE",
    ]

    print("=== Log Scrubbing Tests ===\n")
    for msg in test_messages:
        result = scrubber.scrub(msg)
        print(f"Input:  {msg}")
        print(f"Output: {result}")
        print()
