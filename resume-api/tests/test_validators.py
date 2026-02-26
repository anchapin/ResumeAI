#!/usr/bin/env python3
"""
Test input validation and LaTeX escaping for resume data.
"""

import pytest
import sys
from pathlib import Path

# Add lib path
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.utils.validators import (
    escape_latex,
    validate_email,
    validate_url,
    validate_phone,
    validate_string_length,
    validate_resume_field,
    validate_resume_data,
    sanitize_html,
)


class TestLatexEscaping:
    """Test LaTeX special character escaping."""

    def test_escape_dollar_sign(self):
        """Test escaping of dollar sign."""
        assert escape_latex("$100") == "\\$100"

    def test_escape_percent(self):
        """Test escaping of percent sign."""
        assert escape_latex("50%") == "50\\%"

    def test_escape_ampersand(self):
        """Test escaping of ampersand."""
        assert escape_latex("A & B") == "A \\& B"

    def test_escape_underscore(self):
        """Test escaping of underscore."""
        assert escape_latex("my_variable") == "my\\_variable"

    def test_escape_braces(self):
        """Test escaping of braces."""
        assert escape_latex("{hello}") == "\\{hello\\}"

    def test_escape_caret(self):
        """Test escaping of caret."""
        assert escape_latex("x^2") == "x\\textasciicircum{}2"

    def test_escape_tilde(self):
        """Test escaping of tilde."""
        assert escape_latex("path~user") == "path\\textasciitilde{}user"

    def test_escape_hash(self):
        """Test escaping of hash."""
        assert escape_latex("#hashtag") == "\\#hashtag"

    def test_escape_backslash(self):
        """Test escaping of backslash."""
        assert escape_latex("C:\\folder\\file") == "C:\\textbackslash{}folder\\textbackslash{}file"

    def test_escape_multiple_special_chars(self):
        """Test escaping of multiple special characters."""
        result = escape_latex("John's $100 bonus (50%)")
        assert "\\$" in result
        assert "\\%" in result
        # Note: apostrophe is not escaped as it's not a LaTeX special char

    def test_escape_none(self):
        """Test that None returns None."""
        assert escape_latex(None) is None

    def test_escape_empty_string(self):
        """Test that empty string returns empty string."""
        assert escape_latex("") == ""

    def test_escape_preserves_text(self):
        """Test that normal text is preserved."""
        text = "Hello World"
        assert escape_latex(text) == text


class TestEmailValidation:
    """Test email validation."""

    def test_valid_email(self):
        """Test valid email address."""
        email = validate_email("john@example.com")
        assert email == "john@example.com"

    def test_email_normalized_to_lowercase(self):
        """Test that email is normalized to lowercase."""
        email = validate_email("JOHN@EXAMPLE.COM")
        assert email == "john@example.com"

    def test_email_with_dots(self):
        """Test email with dots."""
        email = validate_email("john.doe@example.co.uk")
        assert email == "john.doe@example.co.uk"

    def test_email_with_plus(self):
        """Test email with plus sign."""
        email = validate_email("john+tag@example.com")
        assert email == "john+tag@example.com"

    def test_invalid_email_no_at(self):
        """Test email without @ sign."""
        with pytest.raises(ValueError, match="Invalid email format"):
            validate_email("johnexample.com")

    def test_invalid_email_no_domain(self):
        """Test email without domain."""
        with pytest.raises(ValueError, match="Invalid email format"):
            validate_email("john@")

    def test_invalid_email_no_extension(self):
        """Test email without extension."""
        with pytest.raises(ValueError, match="Invalid email format"):
            validate_email("john@example")

    def test_email_too_long(self):
        """Test email exceeding max length."""
        long_email = "a" * 1000 + "@example.com"
        with pytest.raises(ValueError, match="exceeds maximum length"):
            validate_email(long_email)

    def test_none_email(self):
        """Test None email."""
        assert validate_email(None) is None


class TestURLValidation:
    """Test URL validation."""

    def test_valid_https_url(self):
        """Test valid HTTPS URL."""
        url = validate_url("https://example.com")
        assert "example.com" in url

    def test_valid_http_url(self):
        """Test valid HTTP URL."""
        url = validate_url("http://example.com")
        assert "example.com" in url

    def test_valid_ftp_url(self):
        """Test valid FTP URL."""
        url = validate_url("ftp://example.com")
        assert "example.com" in url

    def test_valid_url_with_path(self):
        """Test URL with path."""
        url = validate_url("https://example.com/path/to/page")
        assert "example.com" in url

    def test_url_missing_protocol(self):
        """Test URL without protocol."""
        # Should handle gracefully or accept
        url = validate_url("example.com")
        assert "example.com" in url

    def test_invalid_url_no_domain(self):
        """Test invalid URL."""
        with pytest.raises(ValueError):
            validate_url("not-a-valid-url")

    def test_url_too_long(self):
        """Test URL exceeding max length."""
        long_url = "https://" + "a" * 1000 + ".com"
        with pytest.raises(ValueError, match="exceeds maximum length"):
            validate_url(long_url)

    def test_none_url(self):
        """Test None URL."""
        assert validate_url(None) is None


class TestPhoneValidation:
    """Test phone number validation."""

    def test_valid_phone_us(self):
        """Test valid US phone number."""
        phone = validate_phone("+1 (555) 123-4567")
        assert phone == "+1 (555) 123-4567"

    def test_valid_phone_simple(self):
        """Test simple phone number."""
        phone = validate_phone("555-123-4567")
        assert phone == "555-123-4567"

    def test_valid_phone_with_extension(self):
        """Test phone with extension."""
        phone = validate_phone("555-123-4567 x123")
        assert phone == "555-123-4567 x123"

    def test_invalid_phone_too_short(self):
        """Test phone number too short."""
        with pytest.raises(ValueError, match="Invalid phone format"):
            validate_phone("123-45")

    def test_invalid_phone_with_letters(self):
        """Test phone with letters."""
        with pytest.raises(ValueError, match="Invalid phone format"):
            validate_phone("555-CALL-ME")

    def test_none_phone(self):
        """Test None phone."""
        assert validate_phone(None) is None


class TestStringLengthValidation:
    """Test string length validation."""

    def test_valid_string_length(self):
        """Test valid string length."""
        text = "Hello World"
        result = validate_string_length(text, "Test", max_length=50)
        assert result == text

    def test_string_at_max_length(self):
        """Test string at max length."""
        text = "a" * 50
        result = validate_string_length(text, "Test", max_length=50)
        assert result == text

    def test_string_exceeds_max_length(self):
        """Test string exceeding max length."""
        text = "a" * 51
        with pytest.raises(ValueError, match="exceeds maximum length"):
            validate_string_length(text, "Test", max_length=50)

    def test_none_string(self):
        """Test None string."""
        assert validate_string_length(None, "Test") is None


class TestHTMLSanitization:
    """Test HTML/XSS sanitization."""

    def test_sanitize_script_tag(self):
        """Test removal of script tags."""
        result = sanitize_html("<script>alert('xss')</script>Hello")
        assert "<script>" not in result
        assert "alert" not in result
        assert "Hello" in result

    def test_sanitize_onclick(self):
        """Test removal of onclick handlers."""
        result = sanitize_html('<div onclick="alert(\'xss\')">Click me</div>')
        assert "onclick" not in result
        assert "alert" not in result

    def test_sanitize_javascript_url(self):
        """Test removal of javascript: URLs."""
        result = sanitize_html('<a href="javascript:alert(\'xss\')">Link</a>')
        assert "javascript:" not in result
        assert "alert" not in result

    def test_sanitize_iframe(self):
        """Test removal of iframe tags."""
        result = sanitize_html("<iframe src='evil.com'></iframe>Good")
        assert "<iframe" not in result
        assert "Good" in result

    def test_sanitize_normal_text(self):
        """Test that normal text is preserved."""
        text = "Hello World"
        assert sanitize_html(text) == text

    def test_sanitize_none(self):
        """Test None input."""
        assert sanitize_html(None) is None


class TestResumeFieldValidation:
    """Test resume field validation."""

    def test_validate_resume_field_simple(self):
        """Test simple resume field validation."""
        result = validate_resume_field("John Doe", "Name")
        assert result == "John Doe"

    def test_validate_resume_field_with_latex(self):
        """Test resume field with LaTeX escaping."""
        result = validate_resume_field("50% improvement", "Summary", escape_latex=True)
        assert "\\%" in result

    def test_validate_resume_field_with_xss(self):
        """Test resume field with XSS attempt."""
        result = validate_resume_field(
            "<script>alert('xss')</script>Hello", "Summary", sanitize=True
        )
        assert "<script>" not in result
        assert "Hello" in result

    def test_validate_resume_field_too_long(self):
        """Test resume field exceeding max length."""
        long_text = "a" * 1001
        with pytest.raises(ValueError, match="exceeds maximum length"):
            validate_resume_field(long_text, "Name", max_length=1000)

    def test_validate_resume_field_none(self):
        """Test None resume field."""
        assert validate_resume_field(None, "Name") is None


class TestResumeDataValidation:
    """Test complete resume data validation."""

    def test_validate_basic_info(self):
        """Test validation of basic info."""
        resume = {
            "basics": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1-555-123-4567",
                "url": "https://example.com",
                "summary": "Software engineer with 50% improvement",
            }
        }

        validated = validate_resume_data(resume)

        assert validated["basics"]["name"] == "John Doe"
        assert validated["basics"]["email"] == "john@example.com"
        assert "\\%" in validated["basics"]["summary"]

    def test_validate_work_experience(self):
        """Test validation of work experience."""
        resume = {
            "work": [
                {
                    "company": "Tech Corp",
                    "position": "Software Engineer",
                    "summary": "Built REST API & improved performance by 50%",
                    "highlights": ["Implemented $500K feature"],
                    "startDate": "2020-01-01",
                    "endDate": "2023-12-31",
                }
            ]
        }

        validated = validate_resume_data(resume)

        assert "\\&" in validated["work"][0]["summary"]
        assert "\\$" in validated["work"][0]["highlights"][0]

    def test_validate_education(self):
        """Test validation of education."""
        resume = {
            "education": [
                {
                    "institution": "University of Example",
                    "studyType": "Bachelor of Science",
                    "area": "Computer Science & AI",
                    "score": "4.0/4.0",
                    "startDate": "2016-01-01",
                    "endDate": "2020-05-31",
                }
            ]
        }

        validated = validate_resume_data(resume)

        assert "\\&" in validated["education"][0]["area"]

    def test_validate_skills(self):
        """Test validation of skills."""
        resume = {
            "skills": [
                {
                    "name": "Python & C++",
                    "level": "Expert",
                    "keywords": ["$100K project", "AWS deployment"],
                }
            ]
        }

        validated = validate_resume_data(resume)

        assert "\\&" in validated["skills"][0]["name"]
        assert "\\$" in validated["skills"][0]["keywords"][0]

    def test_validate_with_xss_injection(self):
        """Test validation with XSS injection attempt."""
        resume = {
            "basics": {
                "name": "<script>alert('xss')</script>John",
                "summary": "<img src=x onerror='alert(1)'>",
            }
        }

        validated = validate_resume_data(resume)

        # XSS attempts should be sanitized
        assert "<script>" not in str(validated["basics"]["name"])
        assert "onerror" not in str(validated["basics"]["summary"])

    def test_validate_resume_empty(self):
        """Test validation of empty resume."""
        resume = {}
        validated = validate_resume_data(resume)
        assert validated == {}

    def test_validate_resume_preserves_dates(self):
        """Test that dates are preserved."""
        resume = {
            "work": [
                {
                    "company": "Tech Corp",
                    "startDate": "2020-01-01",
                    "endDate": "2023-12-31",
                }
            ]
        }

        validated = validate_resume_data(resume)

        assert validated["work"][0]["startDate"] == "2020-01-01"
        assert validated["work"][0]["endDate"] == "2023-12-31"


class TestSecurityTestCases:
    """Test security scenarios."""

    def test_injection_latex_command(self):
        """Test LaTeX command injection prevention."""
        text = "John \\textbf{Doe}"
        # The backslash in the input should be escaped
        result = escape_latex(text)
        assert result.count("\\textbackslash") >= 1

    def test_sql_injection_attempt(self):
        """Test SQL injection attempt (should be sanitized)."""
        text = "John'; DROP TABLE users--"
        # This should be treated as normal text
        result = validate_resume_field(text, "Name")
        assert "DROP TABLE" in result

    def test_html_entity_injection(self):
        """Test HTML entity injection."""
        text = "John &#60;script&#62;"
        result = sanitize_html(text)
        # Should still contain the text content
        assert "John" in result

    def test_unicode_normalization(self):
        """Test handling of unicode characters."""
        text = "José García"
        result = validate_resume_field(text, "Name")
        assert result == text

    def test_emoji_handling(self):
        """Test handling of emoji."""
        text = "Team 🎉 Collaboration 👥"
        result = validate_resume_field(text, "Summary")
        assert "🎉" in result or "Collaboration" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
