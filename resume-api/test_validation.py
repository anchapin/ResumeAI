#!/usr/bin/env python3
"""
Test script to validate the input validation implementation.
"""

import sys
from pathlib import Path

# Add lib path
sys.path.insert(0, str(Path(__file__).parent))

from api.models import (  # noqa: E402
    BasicInfo,
    ResumeData,
    WorkItem,
    ResumeRequest,
    TailorRequest,
)


def test_valid_data():
    """Test that valid resume data passes validation."""
    print("Testing valid resume data...")

    try:
        ResumeData(
            basics=BasicInfo(
                name="John Doe",
                email="john@example.com",
                phone="+1 (555) 123-4567",
                url="https://johndoe.com",
                summary="Software engineer with 5 years of experience",
            ),
            work=[
                WorkItem(
                    company="Tech Corp",
                    position="Software Engineer",
                    startDate="2020-01-01",
                    endDate="2023-12-31",
                    summary="Developed web applications",
                    highlights=["Built REST API", "Improved performance by 50%"],
                )
            ],
        )

        ResumeRequest(resume_data=resume, variant="base")

        print("✓ Valid resume data passed validation")
        return True

    except Exception as e:
        print(f"✗ Valid data failed validation: {e}")
        return False


def test_invalid_email():
    """Test that invalid email is rejected."""
    print("\nTesting invalid email...")

    try:
        ResumeData(
            basics=BasicInfo(
                name="John Doe",
                email="invalid-email",  # Invalid
            )
        )
        print("✗ Invalid email should have been rejected")
        return False

    except ValueError as e:
        if "Invalid email format" in str(e):
            print(f"✓ Invalid email correctly rejected: {e}")
            return True
        else:
            print(f"✗ Wrong error for invalid email: {e}")
            return False


def test_invalid_url():
    """Test that invalid URL is rejected."""
    print("\nTesting invalid URL...")

    try:
        ResumeData(
            basics=BasicInfo(
                name="John Doe",
                url="not-a-url",  # Invalid
            )
        )
        print("✗ Invalid URL should have been rejected")
        return False

    except ValueError as e:
        if "Invalid URL format" in str(e):
            print(f"✓ Invalid URL correctly rejected: {e}")
            return True
        else:
            print(f"✗ Wrong error for invalid URL: {e}")
            return False


def test_xss_attempt():
    """Test that XSS attempts are sanitized."""
    print("\nTesting XSS sanitization...")

    try:
        xss_payload = "<script>alert('XSS')</script>"
        ResumeData(
            basics=BasicInfo(
                name=xss_payload, summary="<img src=x onerror=alert('XSS')>"
            )
        )

        # Check that script tags were removed
        if "<script>" not in resume.basics.name:
            print(f"✓ Script tags removed from name: '{resume.basics.name}'")
            return True
        else:
            print(f"✗ Script tags not removed: '{resume.basics.name}'")
            return False

    except Exception as e:
        print(f"✗ XSS sanitization failed: {e}")
        return False


def test_invalid_date_range():
    """Test that end date before start date is rejected."""
    print("\nTesting invalid date range...")

    try:
        ResumeData(
            work=[
                WorkItem(
                    company="Tech Corp",
                    position="Software Engineer",
                    startDate="2023-12-31",
                    endDate="2020-01-01",  # End date before start date
                )
            ]
        )
        print("✗ Invalid date range should have been rejected")
        return False

    except ValueError as e:
        if "cannot be before start date" in str(e):
            print(f"✓ Invalid date range correctly rejected: {e}")
            return True
        else:
            print(f"✗ Wrong error for invalid date range: {e}")
            return False


def test_empty_resume():
    """Test that empty resume is rejected."""
    print("\nTesting empty resume...")

    try:
        ResumeData()
        print("✗ Empty resume should have been rejected")
        return False

    except ValueError as e:
        if "cannot be empty" in str(e):
            print(f"✓ Empty resume correctly rejected: {e}")
            return True
        else:
            print(f"✗ Wrong error for empty resume: {e}")
            return False


def test_too_long_string():
    """Test that overly long strings are rejected."""
    print("\nTesting string length limit...")

    try:
        long_name = "x" * 2000  # Exceeds MAX_STRING_LENGTH
        ResumeData(basics=BasicInfo(name=long_name))
        print("✗ Overly long string should have been rejected")
        return False

    except ValueError as e:
        if "exceeds maximum length" in str(e):
            print(f"✓ Overly long string correctly rejected: {e}")
            return True
        else:
            print(f"✗ Wrong error for long string: {e}")
            return False


def test_tailor_request_validation():
    """Test that TailorRequest validates job description."""
    print("\nTesting TailorRequest validation...")

    # Test too short job description
    try:
        tailoring_request = TailorRequest(
            resume_data=ResumeData(basics=BasicInfo(name="John Doe")),
            job_description="short",  # Less than 10 characters
        )
        print("✗ Short job description should have been rejected")
        return False

    except ValueError as e:
        if "too short" in str(e):
            print(f"✓ Short job description correctly rejected: {e}")
        else:
            print(f"✗ Wrong error for short job description: {e}")
            return False

    # Test valid job description with XSS
    try:
        tailoring_request = TailorRequest(
            resume_data=ResumeData(basics=BasicInfo(name="John Doe")),
            job_description="Great job opportunity <script>alert('XSS')</script>",
            company_name="Tech Corp",
            job_title="Engineer",
        )

        # Check that script tag was sanitized
        if "<script>" not in tailoring_request.job_description:
            print(f"✓ Job description sanitized: '{tailoring_request.job_description}'")
            return True
        else:
            print(
                f"✗ Job description not sanitized: '{tailoring_request.job_description}'"
            )
            return False

    except Exception as e:
        print(f"✗ Valid TailorRequest failed: {e}")
        return False


def test_invalid_phone():
    """Test that invalid phone number is rejected."""
    print("\nTesting invalid phone number...")

    try:
        ResumeData(basics=BasicInfo(name="John Doe", phone="abc123"))  # Invalid phone
        print("✗ Invalid phone number should have been rejected")
        return False

    except ValueError as e:
        if "Invalid phone number format" in str(e):
            print(f"✓ Invalid phone number correctly rejected: {e}")
            return True
        else:
            print(f"✗ Wrong error for invalid phone: {e}")
            return False


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("ResumeAI Input Validation Tests")
    print("=" * 60)

    tests = [
        test_valid_data,
        test_invalid_email,
        test_invalid_url,
        test_xss_attempt,
        test_invalid_date_range,
        test_empty_resume,
        test_too_long_string,
        test_tailor_request_validation,
        test_invalid_phone,
    ]

    results = []
    for test in tests:
        results.append(test())

    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)

    return all(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
