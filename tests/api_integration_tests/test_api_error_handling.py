"""
API error handling integration tests - Issue #389.

Tests for:
- Error response formats
- HTTP status codes
- Error recovery
- Edge case handling
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "resume-api"))

from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def valid_resume():
    """Valid resume data."""
    return {
        "basics": {
            "name": "Test User",
            "email": "test@example.com",
        }
    }


class TestHttpStatusCodes:
    """Test appropriate HTTP status codes."""

    @pytest.mark.api
    def test_success_200(self, client, valid_resume):
        """Test 200 OK response for successful request."""
        payload = {"resume_data": valid_resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_validation_error_422(self, client):
        """Test 422 Unprocessable Entity for validation errors."""
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422

    @pytest.mark.api
    def test_method_not_allowed_405(self, client):
        """Test 405 Method Not Allowed."""
        response = client.get("/v1/render/pdf")
        assert response.status_code == 405

    @pytest.mark.api
    def test_not_found_404(self, client):
        """Test 404 Not Found."""
        response = client.get("/v1/nonexistent-endpoint")
        assert response.status_code == 404


class TestValidationErrors:
    """Test validation error responses."""

    @pytest.mark.api
    def test_missing_required_field(self, client):
        """Test error response for missing required field."""
        payload = {"variant": "professional"}  # Missing resume_data
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 422
        assert "detail" in response.json() or "errors" in response.json()

    @pytest.mark.api
    def test_invalid_type(self, client):
        """Test error response for invalid type."""
        payload = {
            "resume_data": "not an object",
            "variant": "professional",
        }
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 422

    @pytest.mark.api
    def test_invalid_json(self, client):
        """Test error response for invalid JSON."""
        response = client.post(
            "/v1/render/pdf",
            data="{invalid json}",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code in [400, 422]


class TestErrorMessages:
    """Test error message quality."""

    @pytest.mark.api
    def test_error_response_format(self, client):
        """Test that error responses have expected format."""
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422
        data = response.json()
        # FastAPI provides detail field
        assert isinstance(data, dict)

    @pytest.mark.api
    def test_validation_error_includes_details(self, client):
        """Test that validation errors include details."""
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422
        data = response.json()
        # Should have some information about what went wrong
        assert len(data) > 0


class TestEdgeCaseHandling:
    """Test handling of edge cases."""

    @pytest.mark.api
    def test_empty_json_object(self, client):
        """Test empty JSON object."""
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422

    @pytest.mark.api
    def test_empty_string_values(self, client):
        """Test empty string values."""
        resume = {
            "basics": {
                "name": "",
                "email": "test@example.com",
            }
        }
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Empty strings may be valid or invalid depending on validation
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_whitespace_only_values(self, client):
        """Test whitespace-only values."""
        resume = {
            "basics": {
                "name": "   ",
                "email": "test@example.com",
            }
        }
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_extremely_large_payload(self, client):
        """Test handling of extremely large payload."""
        large_resume = {
            "basics": {
                "name": "Test",
                "email": "test@example.com",
            },
            "work": [
                {
                    "name": "Company",
                    "position": "Role",
                    "startDate": "2020-01-01",
                    "highlights": ["x" * 10000 for _ in range(100)],
                }
            ],
        }
        payload = {"resume_data": large_resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Should either process or reject gracefully
        assert response.status_code in [200, 400, 413, 422]


class TestErrorRecovery:
    """Test API recovery from errors."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_api_functional_after_error(self, client, valid_resume):
        """Test that API works after error."""
        # Send invalid request
        response1 = client.post("/v1/render/pdf", json={})
        assert response1.status_code == 422

        # Send valid request - should work
        payload = {"resume_data": valid_resume, "variant": "professional"}
        response2 = client.post("/v1/render/pdf", json=payload)
        assert response2.status_code == 200

    @pytest.mark.api
    @pytest.mark.integration
    def test_health_check_after_error(self, client):
        """Test health endpoint works after errors."""
        # Generate errors
        for _ in range(3):
            client.post("/v1/render/pdf", json={})
            client.get("/v1/nonexistent")

        # Health check should still work
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestResponseConsistency:
    """Test consistency of error responses."""

    @pytest.mark.api
    def test_consistent_error_format(self, client):
        """Test that similar errors have consistent format."""
        # Test multiple validation errors
        errors = [
            {},  # Missing fields
            {"variant": "professional"},  # Missing resume_data
            {"resume_data": None},  # Null resume_data
        ]

        responses = [client.post("/v1/render/pdf", json=err) for err in errors]

        # All should be validation errors
        assert all(r.status_code == 422 for r in responses)
        # All should have response body
        assert all(r.json() for r in responses)


class TestInvalidInputs:
    """Test various invalid input scenarios."""

    @pytest.mark.api
    def test_invalid_variant_name(self, client, valid_resume):
        """Test invalid variant name."""
        payload = {"resume_data": valid_resume, "variant": "nonexistent-variant-xyz"}
        response = client.post("/v1/render/pdf", json=payload)
        # May be 200 if variant falls back, or 400 if strict
        assert response.status_code in [200, 400]

    @pytest.mark.api
    def test_invalid_email_format(self, client):
        """Test invalid email format."""
        resume = {
            "basics": {
                "name": "Test",
                "email": "not-a-valid-email",
            }
        }
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_invalid_url_format(self, client):
        """Test invalid URL format."""
        resume = {
            "basics": {
                "name": "Test",
                "email": "test@example.com",
                "url": "not a valid url",
            }
        }
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_too_long_string(self, client):
        """Test string exceeding maximum length."""
        resume = {
            "basics": {
                "name": "x" * 5000,
                "email": "test@example.com",
            }
        }
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]


class TestContentTypeHandling:
    """Test content type handling."""

    @pytest.mark.api
    def test_json_content_type_required(self, client, valid_resume):
        """Test that JSON content type is expected."""
        payload = {"resume_data": valid_resume, "variant": "professional"}
        response = client.post(
            "/v1/render/pdf",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200

    @pytest.mark.api
    def test_incorrect_content_type(self, client):
        """Test incorrect content type."""
        response = client.post(
            "/v1/render/pdf",
            data="test",
            headers={"Content-Type": "text/plain"},
        )
        assert response.status_code in [400, 415, 422]


class TestBoundaryConditions:
    """Test boundary conditions."""

    @pytest.mark.api
    def test_single_work_item(self, client, valid_resume):
        """Test with exactly one work item."""
        resume = valid_resume.copy()
        resume["work"] = [
            {"name": "Company", "position": "Role", "startDate": "2020-01-01"}
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_many_work_items(self, client, valid_resume):
        """Test with many work items (boundary)."""
        resume = valid_resume.copy()
        resume["work"] = [
            {"name": f"Co {i}", "position": "R", "startDate": "2020-01-01"}
            for i in range(50)
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Should process or reject gracefully
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_single_skill(self, client, valid_resume):
        """Test with single skill."""
        resume = valid_resume.copy()
        resume["skills"] = [{"name": "Python", "level": "Expert"}]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_many_skills(self, client, valid_resume):
        """Test with many skills."""
        resume = valid_resume.copy()
        resume["skills"] = [
            {"name": f"Skill {i}", "level": "Expert"} for i in range(100)
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [200, 400, 422]
