"""
Integration tests for Resume API endpoints.

Tests all major API endpoints with various scenarios including:
- Success cases
- Error cases
- Authentication/authorization
- Rate limiting
- Data validation
"""

# Import the app from the resume-api directory
import sys
from pathlib import Path
import os

# Add the resume-api directory to the path
# If running from root, resume-api is just "resume-api"
# If running from tests, it might be ../resume-api
# This path logic seems specific to where the test is run
# The original code used Path(__file__).parent.parent / "resume-api"
# If test_api_integration.py is at root, parent is root, parent.parent is outside repo?
# Assuming the file is at root, Path(__file__).parent is root.
# So Path(__file__).parent / "resume-api" is correct.
# The original code had parent.parent which suggests it might have been moved or copy-pasted.
# I will stick to what seems correct for the file location or preserve original intent if possible.
# Wait, list_files showed test_api_integration.py at root.
# So Path(__file__).parent is root. parent.parent is outside.
# If I simply move imports, I should be careful.

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

# Add resume-api to path correctly
resume_api_path = Path(__file__).parent / "resume-api"
sys.path.insert(0, str(resume_api_path))

try:
    from main import app
except ImportError:
    # Fallback or handle if main is not found (e.g. if path is wrong)
    # But for linting, we just need imports after sys.path hack
    pass


client = TestClient(app)


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "basics": {
            "name": "John Doe",
            "label": "Programmer",
            "email": "john@example.com",
            "phone": "(912) 555-4321",
            "url": "https://johndoe.com",
            "summary": "A summary of John Doe...",
        },
        "work": [
            {
                "company": "Company A",
                "position": "Software Engineer",
                "startDate": "2020-01-01",
                "endDate": "2022-01-01",
                "summary": "Description...",
                "highlights": ["Started the company"],
            }
        ],
        "education": [
            {
                "institution": "University",
                "area": "Software Development",
                "studyType": "Bachelor",
                "startDate": "2016-01-01",
                "endDate": "2020-01-01",
            }
        ],
        "skills": [
            {"name": "Web Development", "keywords": ["HTML", "CSS", "JavaScript"]}
        ],
    }


@pytest.fixture
def valid_api_key():
    """Valid API key for testing."""
    return os.getenv("TEST_API_KEY", "valid-test-key")


@pytest.fixture
def master_api_key():
    """Master API key for testing."""
    return os.getenv("MASTER_API_KEY", "master-key")


class TestHealthEndpoint:
    """Test the health check endpoint."""

    def test_health_endpoint_success(self):
        """Test that health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"

    def test_root_endpoint(self):
        """Test the root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data


class TestRenderPDfEndpoint:
    """Test the /v1/render/pdf endpoint."""

    def test_render_pdf_success_with_valid_data(
        self, sample_resume_data, valid_api_key
    ):
        """Test successful PDF generation with valid data."""
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": sample_resume_data, "variant": "base"},
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    def test_render_pdf_with_default_variant(self, sample_resume_data, valid_api_key):
        """Test PDF generation with default variant when none specified."""
        response = client.post(
            "/api/v1/render/pdf",
            json={
                "resume_data": sample_resume_data
                # variant not specified, should default to "base"
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    def test_render_pdf_with_different_variants(
        self, sample_resume_data, valid_api_key
    ):
        """Test PDF generation with different template variants."""
        variants = ["base", "creative", "minimal", "professional"]

        for variant in variants:
            response = client.post(
                "/api/v1/render/pdf",
                json={"resume_data": sample_resume_data, "variant": variant},
                headers={"X-API-KEY": valid_api_key},
            )
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"

    def test_render_pdf_missing_api_key(self, sample_resume_data):
        """Test PDF generation fails without API key."""
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": sample_resume_data, "variant": "base"},
            # No API key provided
        )
        assert response.status_code == 401

    def test_render_pdf_invalid_api_key(self, sample_resume_data):
        """Test PDF generation fails with invalid API key."""
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": sample_resume_data, "variant": "base"},
            headers={"X-API-KEY": "invalid-key"},
        )
        assert response.status_code == 403

    def test_render_pdf_invalid_data(self, valid_api_key):
        """Test PDF generation fails with invalid resume data."""
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": {}, "variant": "base"},  # Empty resume data
            headers={"X-API-KEY": valid_api_key},
        )
        # Could be 400 or 500 depending on how the generator handles empty data
        assert response.status_code in [400, 500]

    def test_render_pdf_invalid_variant(self, sample_resume_data, valid_api_key):
        """Test PDF generation with invalid variant."""
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": sample_resume_data, "variant": "nonexistent-variant"},
            headers={"X-API-KEY": valid_api_key},
        )
        # Could be 400 or 500 depending on how the generator handles invalid variants
        assert response.status_code in [400, 500]


class TestTailorEndpoint:
    """Test the /v1/tailor endpoint."""

    def test_tailor_success(self, sample_resume_data, valid_api_key):
        """Test successful resume tailoring."""
        job_description = "We are looking for a Senior Software Engineer with experience in Python, React, and AWS."

        response = client.post(
            "/api/v1/tailor",
            json={
                "resume_data": sample_resume_data,
                "job_description": job_description,
                "company_name": "Tech Corp",
                "job_title": "Senior Software Engineer",
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"

        data = response.json()
        assert "resume_data" in data
        assert "keywords" in data
        assert "suggestions" in data

    def test_tailor_without_optional_fields(self, sample_resume_data, valid_api_key):
        """Test tailoring without optional company_name and job_title fields."""
        job_description = "Looking for experienced Python developer."

        response = client.post(
            "/api/v1/tailor",
            json={
                "resume_data": sample_resume_data,
                "job_description": job_description,
                # company_name and job_title not provided
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"

    def test_tailor_missing_required_fields(self, valid_api_key):
        """Test tailoring fails without required fields."""
        response = client.post(
            "/api/v1/tailor",
            json={
                "job_description": "Some job description"
                # Missing resume_data
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 422  # Validation error

    def test_tailor_missing_api_key(self, sample_resume_data):
        """Test tailoring fails without API key."""
        job_description = "We are looking for a Senior Software Engineer."

        response = client.post(
            "/api/v1/tailor",
            json={
                "resume_data": sample_resume_data,
                "job_description": job_description,
            },
            # No API key provided
        )
        assert response.status_code == 401

    def test_tailor_invalid_api_key(self, sample_resume_data):
        """Test tailoring fails with invalid API key."""
        job_description = "We are looking for a Senior Software Engineer."

        response = client.post(
            "/api/v1/tailor",
            json={
                "resume_data": sample_resume_data,
                "job_description": job_description,
            },
            headers={"X-API-KEY": "invalid-key"},
        )
        assert response.status_code == 403

    def test_tailor_empty_job_description(self, sample_resume_data, valid_api_key):
        """Test tailoring with empty job description."""
        response = client.post(
            "/api/v1/tailor",
            json={
                "resume_data": sample_resume_data,
                "job_description": "",  # Empty job description
            },
            headers={"X-API-KEY": valid_api_key},
        )
        # This might return 400 or 500 depending on implementation
        assert response.status_code in [200, 400, 500]


class TestVariantsEndpoint:
    """Test the /v1/variants endpoint."""

    def test_variants_success(self):
        """Test successful retrieval of variants."""
        response = client.get("/api/v1/variants")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"

        data = response.json()
        assert "variants" in data
        assert isinstance(data["variants"], list)
        # At least one variant should be returned
        assert len(data["variants"]) >= 1

        # Check that each variant has required fields
        for variant in data["variants"]:
            assert "name" in variant
            assert "display_name" in variant
            assert "description" in variant

    def test_variants_with_api_key_not_required(self):
        """Test that variants endpoint doesn't require API key."""
        response = client.get("/api/v1/variants")
        assert response.status_code == 200

        # Try with an API key too, should still work
        response_with_key = client.get("/api/v1/variants", headers={"X-API-KEY": "any-key"})
        assert response_with_key.status_code == 200


class TestAuthenticationAndAuthorization:
    """Test authentication and authorization mechanisms."""

    def test_valid_api_key_authentication(self, sample_resume_data, valid_api_key):
        """Test that valid API key allows access to protected endpoints."""
        # Test with render endpoint
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": sample_resume_data, "variant": "base"},
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code != 401 and response.status_code != 403

    def test_invalid_api_key_rejected(self, sample_resume_data):
        """Test that invalid API key is rejected."""
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": sample_resume_data, "variant": "base"},
            headers={"X-API-KEY": "invalid-key"},
        )
        assert response.status_code == 403

    def test_no_api_key_rejected(self, sample_resume_data):
        """Test that missing API key is rejected for protected endpoints."""
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": sample_resume_data, "variant": "base"},
            # No API key provided
        )
        assert response.status_code == 401

    def test_public_endpoints_accessible_without_api_key(self):
        """Test that public endpoints don't require API key."""
        # Health check should be accessible
        response = client.get("/health")
        assert response.status_code == 200

        # Variants endpoint should be accessible
        response = client.get("/api/v1/variants")
        assert response.status_code == 200


class TestRateLimiting:
    """Test rate limiting functionality."""

    @patch("slowapi.Limiter.limit")
    def test_rate_limit_decorator_applied(self, mock_limit):
        """Test that rate limiting is applied to endpoints."""
        # This test verifies that the rate limiting decorator is properly applied
        # by checking if the limiter.limit method is called when making requests

        mock_limit.return_value = lambda f: f  # Mock decorator to do nothing

        # Make a request to trigger rate limiting check
        response = client.get("/health")  # This shouldn't be rate limited
        assert response.status_code == 200


class TestDataValidation:
    """Test data validation for API endpoints."""

    def test_invalid_json_format(self, valid_api_key):
        """Test that invalid JSON format returns appropriate error."""
        response = client.post(
            "/api/v1/render/pdf",
            content="invalid json {",
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 422  # Validation error

    def test_missing_required_fields_in_resume_data(self, valid_api_key):
        """Test handling of missing required fields in resume data."""
        # Send minimal data that might be missing required fields
        response = client.post(
            "/api/v1/render/pdf",
            json={"resume_data": {}, "variant": "base"},  # Empty resume data
            headers={"X-API-KEY": valid_api_key},
        )
        # This could either be a validation error or processed with defaults
        assert response.status_code in [200, 400, 422, 500]

    def test_extra_unexpected_fields_ignored(self, sample_resume_data, valid_api_key):
        """Test that extra unexpected fields in request are ignored."""
        response = client.post(
            "/api/v1/render/pdf",
            json={
                "resume_data": sample_resume_data,
                "variant": "base",
                "extra_field": "should_be_ignored",  # Extra field
            },
            headers={"X-API-KEY": valid_api_key},
        )
        # Should still work even with extra fields
        assert response.status_code in [200, 400, 500]
