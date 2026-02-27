"""
Comprehensive API endpoint integration tests - Issue #389.

Tests all major FastAPI endpoints with coverage of:
- Request/response validation
- Error handling
- Edge cases and boundary conditions
- HTTP status codes
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
def sample_resume():
    """Sample valid resume."""
    return {
        "basics": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1-555-0123",
        }
    }


class TestHealthCheckEndpoints:
    """Test health check endpoints."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_health_basic(self, client):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == 200
        assert "status" in response.json()

    @pytest.mark.api
    @pytest.mark.integration
    def test_health_detailed(self, client):
        """Test detailed health check."""
        response = client.get("/health/detailed")
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.integration
    def test_health_ready(self, client):
        """Test readiness check."""
        response = client.get("/health/ready")
        assert response.status_code == 200


class TestAnalyticsEndpoints:
    """Test analytics endpoints."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_analytics_summary(self, client):
        """Test analytics summary."""
        response = client.get("/analytics/summary")
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.integration
    def test_analytics_endpoints(self, client):
        """Test endpoint popularity."""
        response = client.get("/analytics/endpoints")
        assert response.status_code == 200


class TestPdfRenderingEndpoint:
    """Test PDF rendering endpoint."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_render_pdf_success(self, client, sample_resume):
        """Test successful PDF rendering."""
        payload = {"resume_data": sample_resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    @pytest.mark.api
    def test_render_pdf_missing_data(self, client):
        """Test error when data missing."""
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422

    @pytest.mark.api
    def test_render_pdf_invalid_email(self, client):
        """Test email validation."""
        resume = {"basics": {"name": "Test", "email": "not-an-email"}}
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    @pytest.mark.integration
    def test_render_pdf_variants(self, client, sample_resume):
        """Test all variants."""
        for variant in ["base", "professional", "minimal"]:
            payload = {"resume_data": sample_resume, "variant": variant}
            response = client.post("/v1/render/pdf", json=payload)
            assert response.status_code == 200


class TestVariantsEndpoint:
    """Test variants endpoint."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_variants_list(self, client):
        """Test variants list."""
        response = client.get("/v1/variants")
        assert response.status_code == 200

    @pytest.mark.api
    def test_variants_with_search(self, client):
        """Test variants with search."""
        response = client.get("/v1/variants?search=professional")
        assert response.status_code == 200


class TestErrorHandling:
    """Test error handling."""

    @pytest.mark.api
    def test_404_not_found(self, client):
        """Test 404 response."""
        response = client.get("/nonexistent")
        assert response.status_code == 404

    @pytest.mark.api
    def test_405_method_not_allowed(self, client):
        """Test 405 response."""
        response = client.get("/v1/render/pdf")
        assert response.status_code == 405

    @pytest.mark.api
    def test_validation_error_format(self, client):
        """Test validation error format."""
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422
        assert isinstance(response.json(), dict)


class TestRequestValidation:
    """Test request validation."""

    @pytest.mark.api
    def test_email_validation(self, client, sample_resume):
        """Test email format validation."""
        resume = sample_resume.copy()
        resume["basics"]["email"] = "invalid"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_url_validation(self, client, sample_resume):
        """Test URL validation."""
        resume = sample_resume.copy()
        resume["basics"]["url"] = "not-a-url"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_string_length_validation(self, client):
        """Test string length validation."""
        resume = {"basics": {"name": "x" * 5000, "email": "test@example.com"}}
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]


class TestEdgeCases:
    """Test edge cases."""

    @pytest.mark.api
    def test_special_characters(self, client, sample_resume):
        """Test special character handling."""
        resume = sample_resume.copy()
        resume["basics"]["name"] = "John & Mary <Doe> 100%"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_unicode_characters(self, client):
        """Test Unicode support."""
        resume = {"basics": {"name": "José García", "email": "test@example.com"}}
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_empty_arrays(self, client, sample_resume):
        """Test empty arrays."""
        resume = sample_resume.copy()
        resume["work"] = []
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_null_optional_fields(self, client, sample_resume):
        """Test null optional fields."""
        resume = sample_resume.copy()
        resume["basics"]["phone"] = None
        resume["basics"]["url"] = None
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200


class TestResponseStructure:
    """Test response structure."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_pdf_response_is_binary(self, client, sample_resume):
        """Test PDF is binary."""
        payload = {"resume_data": sample_resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200
        assert isinstance(response.content, bytes)
        assert response.content.startswith(b"%PDF")

    @pytest.mark.api
    @pytest.mark.integration
    def test_json_response_structure(self, client):
        """Test JSON response."""
        response = client.get("/health")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)

    @pytest.mark.api
    def test_content_type_headers(self, client, sample_resume):
        """Test content type headers."""
        # JSON endpoint
        response = client.get("/health")
        assert "application/json" in response.headers["content-type"]

        # PDF endpoint
        payload = {"resume_data": sample_resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert "application/pdf" in response.headers["content-type"]


class TestApiRecovery:
    """Test API recovery after errors."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_recovery_after_error(self, client, sample_resume):
        """Test API works after error."""
        # Send invalid request
        client.post("/v1/render/pdf", json={})

        # Send valid request
        payload = {"resume_data": sample_resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.integration
    def test_health_after_errors(self, client):
        """Test health endpoint after errors."""
        # Generate errors
        client.post("/v1/render/pdf", json={})
        client.get("/nonexistent")

        # Health should work
        response = client.get("/health")
        assert response.status_code == 200
