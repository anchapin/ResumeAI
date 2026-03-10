#!/usr/bin/env python3
"""
Standalone test script for validators (no pytest required).
Tests input validation and LaTeX escaping.
"""

import sys
import importlib.util

# Import validators directly
spec = importlib.util.spec_from_file_location("validators", "lib/utils/validators.py")
validators = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validators)

test_count = 0
passed = 0
failed = 0


def test(name, fn):
    """Run a test."""
    global test_count, passed, failed
    test_count += 1
    try:
        fn()
        print(f"✓ {name}")
        passed += 1
    except AssertionError as e:
        print(f"✗ {name}: {e}")
        failed += 1
    except Exception as e:
        print(f"✗ {name}: {type(e).__name__}: {e}")
        failed += 1


# LaTeX Escaping Tests
print("\n=== LaTeX Escaping ===")

test(
    "escape_latex: dollar sign",
    lambda: (
        validators.escape_latex("$100") == "\\$100"
        or (_ for _ in ()).throw(AssertionError("Failed to escape $"))
    ),
)

test(
    "escape_latex: percent sign",
    lambda: (
        validators.escape_latex("50%") == "50\\%"
        or (_ for _ in ()).throw(AssertionError("Failed to escape %"))
    ),
)

test(
    "escape_latex: ampersand",
    lambda: (
        validators.escape_latex("A & B") == "A \\& B"
        or (_ for _ in ()).throw(AssertionError("Failed to escape &"))
    ),
)

test(
    "escape_latex: underscore",
    lambda: (
        validators.escape_latex("my_var") == "my\\_var"
        or (_ for _ in ()).throw(AssertionError("Failed to escape _"))
    ),
)

test(
    "escape_latex: braces",
    lambda: (
        validators.escape_latex("{hello}") == "\\{hello\\}"
        or (_ for _ in ()).throw(AssertionError("Failed to escape braces"))
    ),
)

test(
    "escape_latex: hash",
    lambda: (
        validators.escape_latex("#tag") == "\\#tag"
        or (_ for _ in ()).throw(AssertionError("Failed to escape #"))
    ),
)

test(
    "escape_latex: multiple chars",
    lambda: (
        (
            "\\$" in validators.escape_latex("$100 bonus (50%)")
            and "\\%" in validators.escape_latex("$100 bonus (50%)")
        )
        or (_ for _ in ()).throw(AssertionError("Failed to escape multiple"))
    ),
)

test(
    "escape_latex: None returns None",
    lambda: (
        validators.escape_latex(None) is None
        or (_ for _ in ()).throw(AssertionError("None handling failed"))
    ),
)

test(
    "escape_latex: empty string preserved",
    lambda: (
        validators.escape_latex("") == ""
        or (_ for _ in ()).throw(AssertionError("Empty string handling failed"))
    ),
)


# Email Validation Tests
print("\n=== Email Validation ===")

test(
    "validate_email: simple valid",
    lambda: (
        validators.validate_email("john@example.com") == "john@example.com"
        or (_ for _ in ()).throw(AssertionError("Valid email rejected"))
    ),
)

test(
    "validate_email: normalized to lowercase",
    lambda: (
        validators.validate_email("JOHN@EXAMPLE.COM") == "john@example.com"
        or (_ for _ in ()).throw(AssertionError("Normalization failed"))
    ),
)

test(
    "validate_email: with plus",
    lambda: (
        validators.validate_email("john+tag@example.com") == "john+tag@example.com"
        or (_ for _ in ()).throw(AssertionError("Plus handling failed"))
    ),
)


def test_invalid_email():
    try:
        validators.validate_email("invalid-email")
        raise AssertionError("Should have rejected invalid email")
    except ValueError:
        pass


test("validate_email: rejects invalid", test_invalid_email)

test(
    "validate_email: None returns None",
    lambda: (
        validators.validate_email(None) is None
        or (_ for _ in ()).throw(AssertionError("None handling failed"))
    ),
)


# URL Validation Tests
print("\n=== URL Validation ===")

test(
    "validate_url: https",
    lambda: (
        "example.com" in validators.validate_url("https://example.com")
        or (_ for _ in ()).throw(AssertionError("HTTPS URL rejected"))
    ),
)

test(
    "validate_url: http",
    lambda: (
        "example.com" in validators.validate_url("http://example.com")
        or (_ for _ in ()).throw(AssertionError("HTTP URL rejected"))
    ),
)

test(
    "validate_url: ftp",
    lambda: (
        "example.com" in validators.validate_url("ftp://example.com")
        or (_ for _ in ()).throw(AssertionError("FTP URL rejected"))
    ),
)

test(
    "validate_url: None returns None",
    lambda: (
        validators.validate_url(None) is None
        or (_ for _ in ()).throw(AssertionError("None handling failed"))
    ),
)


# Phone Validation Tests
print("\n=== Phone Validation ===")

test(
    "validate_phone: formatted US",
    lambda: (
        validators.validate_phone("+1 (555) 123-4567") == "+1 (555) 123-4567"
        or (_ for _ in ()).throw(AssertionError("US phone rejected"))
    ),
)

test(
    "validate_phone: simple",
    lambda: (
        validators.validate_phone("555-123-4567") == "555-123-4567"
        or (_ for _ in ()).throw(AssertionError("Simple phone rejected"))
    ),
)

test(
    "validate_phone: None returns None",
    lambda: (
        validators.validate_phone(None) is None
        or (_ for _ in ()).throw(AssertionError("None handling failed"))
    ),
)


# String Length Validation Tests
print("\n=== String Length Validation ===")

test(
    "validate_string_length: within limit",
    lambda: (
        validators.validate_string_length("Hello", "Test", 50) == "Hello"
        or (_ for _ in ()).throw(AssertionError("Valid length rejected"))
    ),
)

test(
    "validate_string_length: at limit",
    lambda: (
        validators.validate_string_length("a" * 50, "Test", 50) == "a" * 50
        or (_ for _ in ()).throw(AssertionError("Max length rejected"))
    ),
)


def test_exceeded_length():
    try:
        validators.validate_string_length("a" * 51, "Test", 50)
        raise AssertionError("Should have rejected exceeded length")
    except ValueError:
        pass


test("validate_string_length: exceeds limit", test_exceeded_length)


# HTML Sanitization Tests
print("\n=== HTML Sanitization ===")


def test_script_tags():
    result = validators.sanitize_html("<script>alert('xss')</script>Hello")
    assert result is None or "<script>" not in result
    assert result is None or "alert" not in result


test("sanitize_html: removes script tags", test_script_tags)

test(
    "sanitize_html: removes onclick",
    lambda: (
        "onclick" not in validators.sanitize_html('<div onclick="alert()">Click</div>')
        or (_ for _ in ()).throw(AssertionError("onclick not removed"))
    ),
)

test(
    "sanitize_html: removes javascript URLs",
    lambda: (
        "javascript:" not in validators.sanitize_html('<a href="javascript:alert()">')
        or (_ for _ in ()).throw(AssertionError("javascript: not removed"))
    ),
)

test(
    "sanitize_html: preserves normal text",
    lambda: (
        "Hello" in validators.sanitize_html("<p>Hello</p>")
        or (_ for _ in ()).throw(AssertionError("Text content lost"))
    ),
)

test(
    "sanitize_html: None returns None",
    lambda: (
        validators.sanitize_html(None) is None
        or (_ for _ in ()).throw(AssertionError("None handling failed"))
    ),
)


# Resume Field Validation Tests
print("\n=== Resume Field Validation ===")

test(
    "validate_resume_field: simple text",
    lambda: (
        validators.validate_resume_field("John Doe", "Name") == "John Doe"
        or (_ for _ in ()).throw(AssertionError("Simple text failed"))
    ),
)

test(
    "validate_resume_field: LaTeX escaping",
    lambda: (
        "\\%" in validators.validate_resume_field("50% improvement", "Summary", escape_latex=True)
        or (_ for _ in ()).throw(AssertionError("LaTeX escaping failed"))
    ),
)

test(
    "validate_resume_field: sanitization",
    lambda: (
        "<script>"
        not in str(
            validators.validate_resume_field("<script>alert()</script>Hi", "Summary", sanitize=True)
        )
        or (_ for _ in ()).throw(AssertionError("Sanitization failed"))
    ),
)


# Resume Data Validation Tests
print("\n=== Resume Data Validation ===")


def test_basic_info():
    resume = {
        "basics": {
            "name": "John Doe",
            "email": "john@example.com",
            "summary": "Built product with $500 value & 50% improvement",
        }
    }
    validated = validators.validate_resume_data(resume)
    assert validated["basics"]["name"] == "John Doe"
    assert validated["basics"]["email"] == "john@example.com"
    assert "\\$" in validated["basics"]["summary"]
    assert "\\&" in validated["basics"]["summary"]
    assert "\\%" in validated["basics"]["summary"]


test("validate_resume_data: basic info with escaping", test_basic_info)


def test_work_experience():
    resume = {
        "work": [
            {
                "company": "Tech Corp",
                "position": "Engineer",
                "summary": "Built API with $1M budget & 50% improvement",
                "highlights": ["$500K project", "A & B testing"],
            }
        ]
    }
    validated = validators.validate_resume_data(resume)
    assert "\\$" in validated["work"][0]["summary"]
    assert "\\&" in validated["work"][0]["summary"]
    assert "\\%" in validated["work"][0]["summary"]
    assert "\\$" in validated["work"][0]["highlights"][0]
    assert "\\&" in validated["work"][0]["highlights"][1]


test("validate_resume_data: work experience with escaping", test_work_experience)


def test_xss_in_resume():
    resume = {
        "basics": {
            "name": "<script>alert('xss')</script>John",
            "summary": "<img src=x onerror='alert(1)'>Summary",
        }
    }
    validated = validators.validate_resume_data(resume)
    # XSS attempts should be sanitized
    name_str = str(validated["basics"]["name"]) if validated["basics"]["name"] else ""
    summary_str = str(validated["basics"]["summary"]) if validated["basics"]["summary"] else ""
    assert "<script>" not in name_str or validated["basics"]["name"] is None
    assert "onerror" not in summary_str or validated["basics"]["summary"] is None


test("validate_resume_data: XSS sanitization", test_xss_in_resume)


def test_empty_resume():
    resume = {}
    validated = validators.validate_resume_data(resume)
    assert validated == {}


test("validate_resume_data: empty resume", test_empty_resume)


# Security Tests
print("\n=== Security Tests ===")

test(
    "security: LaTeX command injection escaping",
    lambda: (
        "\\textbackslash" in validators.escape_latex("John \\textbf{Doe}")
        or (_ for _ in ()).throw(AssertionError("Backslash not escaped"))
    ),
)

test(
    "security: SQL-like injection treated as text",
    lambda: (
        "DROP TABLE" in validators.validate_resume_field("John'; DROP TABLE users--", "Name")
        or (_ for _ in ()).throw(AssertionError("SQL-like text not preserved"))
    ),
)

test(
    "security: unicode characters preserved",
    lambda: (
        "José" in validators.validate_resume_field("José García", "Name")
        or (_ for _ in ()).throw(AssertionError("Unicode not preserved"))
    ),
)


# Print summary
print(f"\n{'='*50}")
print(f"Total tests: {test_count}")
print(f"Passed:      {passed}")
print(f"Failed:      {failed}")
print(f"Success rate: {(passed/test_count*100):.1f}%")

if failed > 0:
    print("\n✗ Some tests failed!")
else:
    print("\n✓ All tests passed!")
