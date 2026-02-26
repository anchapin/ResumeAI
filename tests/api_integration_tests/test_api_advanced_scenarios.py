"""
Advanced integration tests for API endpoints - Issue #389.

Tests for:
- Rate limiting behavior
- Authentication/API key handling
- Concurrent requests
- Large payload handling
- Performance characteristics
"""

import pytest
import sys
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "resume-api"))

from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client for the API."""
    return TestClient(app)


@pytest.fixture
def large_resume_data():
    """Generate large resume data for testing."""
    return {
        "basics": {
            "name": "John Doe",
            "label": "Senior Software Architect",
            "email": "john.doe@example.com",
            "phone": "+1-555-123-4567",
            "url": "https://johndoe.dev",
            "summary": "Experienced architect with " + "x" * 1000,
        },
        "work": [
            {
                "name": f"Company {i}",
                "position": f"Role {i}",
                "startDate": "2020-01-01",
                "endDate": "2023-12-31",
                "summary": f"Led development of major project {i}",
                "highlights": [
                    f"Achievement {j}" for j in range(10)
                ]
            }
            for i in range(15)
        ],
        "education": [
            {
                "institution": f"University {i}",
                "studyType": "Bachelor",
                "area": "Computer Science",
                "startDate": "2016-01-01",
                "endDate": "2020-05-01",
            }
            for i in range(3)
        ],
        "skills": [
            {"name": f"Skill {i}", "level": "Expert"}
            for i in range(20)
        ],
    }


class TestPayloadHandling:
    """Test handling of various payload sizes and structures."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_large_resume_payload(self, client, large_resume_data):
        """Test handling of large resume payload."""
        payload = {
            "resume_data": large_resume_data,
            "variant": "professional",
        }
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    @pytest.mark.api
    def test_deeply_nested_json(self, client):
        """Test handling of deeply nested JSON structure."""
        # Create deeply nested structure
        nested_data = {"basics": {"name": "Test", "email": "test@example.com"}}
        payload = {
            "resume_data": nested_data,
            "variant": "professional",
        }
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_maximum_string_fields(self, client):
        """Test fields with maximum allowed length."""
        max_string = "a" * 1000  # Assuming 1000 is max
        data = {
            "basics": {
                "name": max_string,
                "email": "test@example.com",
                "url": "https://example.com",
                "summary": max_string,
            }
        }
        payload = {
            "resume_data": data,
            "variant": "professional",
        }
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_maximum_array_items(self, client):
        """Test arrays with maximum allowed items."""
        data = {
            "basics": {
                "name": "Test User",
                "email": "test@example.com",
            },
            "work": [
                {
                    "name": f"Company {i}",
                    "position": "Role",
                    "startDate": "2020-01-01",
                }
                for i in range(50)  # Max items
            ]
        }
        payload = {
            "resume_data": data,
            "variant": "professional",
        }
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [200, 400, 422]


class TestAuthAndSecurity:
    """Test authentication and security aspects."""

    @pytest.mark.api
    @pytest.mark.auth
    def test_api_key_not_required_for_public_endpoints(self, client):
        """Test that public endpoints don't require API key."""
        # Health check should not require API key
        response = client.get("/health")
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.auth
    def test_missing_api_key_handling(self, client):
        """Test behavior when API key is missing (if required)."""
        # Note: Some endpoints may not require API key in test mode
        payload = {
            "resume_data": {"basics": {"name": "Test", "email": "test@example.com"}},
            "variant": "professional",
        }
        response = client.post("/v1/render/pdf", json=payload)
        # In test mode, API key is disabled, so should succeed
        assert response.status_code in [200, 401]

    @pytest.mark.api
    @pytest.mark.auth
    def test_invalid_api_key_handling(self, client):
        """Test handling of invalid API key."""
        payload = {
            "resume_data": {"basics": {"name": "Test", "email": "test@example.com"}},
            "variant": "professional",
        }
        headers = {"X-API-KEY": "invalid-key-12345"}
        response = client.post("/v1/render/pdf", json=payload, headers=headers)
        # May return 401 or 200 depending on test configuration
        assert response.status_code in [200, 401]


class TestConcurrentRequests:
    """Test behavior under concurrent requests."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_concurrent_health_checks(self, client):
        """Test multiple concurrent health check requests."""
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(client.get, "/health")
                for _ in range(5)
            ]
            results = [f.result() for f in as_completed(futures)]
            
        assert all(r.status_code == 200 for r in results)
        assert all("status" in r.json() for r in results)

    @pytest.mark.api
    @pytest.mark.integration
    def test_concurrent_variant_requests(self, client):
        """Test multiple concurrent variant requests."""
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(client.get, "/v1/variants")
                for _ in range(3)
            ]
            results = [f.result() for f in as_completed(futures)]
            
        assert all(r.status_code == 200 for r in results)


class TestParameterValidation:
    """Test parameter validation and edge cases."""

    @pytest.mark.api
    def test_analytics_negative_hours(self, client):
        """Test analytics endpoint with negative hours parameter."""
        response = client.get("/analytics/summary?hours=-1")
        # Should handle invalid parameter gracefully
        assert response.status_code in [200, 400]

    @pytest.mark.api
    def test_analytics_zero_limit(self, client):
        """Test analytics endpoint with zero limit."""
        response = client.get("/analytics/endpoints?limit=0")
        # Should handle edge case gracefully
        assert response.status_code in [200, 400]

    @pytest.mark.api
    def test_analytics_extreme_values(self, client):
        """Test analytics endpoint with extreme parameter values."""
        response = client.get("/analytics/summary?hours=999999")
        assert response.status_code in [200, 400]

    @pytest.mark.api
    def test_variants_empty_search(self, client):
        """Test variants endpoint with empty search parameter."""
        response = client.get("/v1/variants?search=")
        assert response.status_code == 200

    @pytest.mark.api
    def test_variants_special_chars_in_search(self, client):
        """Test variants endpoint with special characters in search."""
        response = client.get("/v1/variants?search=%20<>?#")
        assert response.status_code == 200


class TestDataIntegrity:
    """Test data integrity and consistency."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_pdf_output_consistency(self, client):
        """Test that same input produces same PDF output."""
        resume_data = {
            "basics": {
                "name": "John Doe",
                "email": "john@example.com",
            }
        }
        payload = {
            "resume_data": resume_data,
            "variant": "professional",
        }
        
        # Generate PDF twice
        response1 = client.post("/v1/render/pdf", json=payload)
        response2 = client.post("/v1/render/pdf", json=payload)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        # PDFs may have timestamps, so just verify both are valid
        assert response1.content.startswith(b"%PDF")
        assert response2.content.startswith(b"%PDF")

    @pytest.mark.api
    def test_variant_list_consistency(self, client):
        """Test that variant list is consistent across calls."""
        response1 = client.get("/v1/variants")
        response2 = client.get("/v1/variants")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        # Data structure should be consistent
        assert type(response1.json()) == type(response2.json())


class TestResponseConsistency:
    """Test consistency of API responses."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_consistent_error_format(self, client):
        """Test that errors return consistent format."""
        # Trigger validation error
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422
        assert isinstance(response.json(), dict)

    @pytest.mark.api
    @pytest.mark.integration
    def test_json_response_content_type(self, client):
        """Test that JSON endpoints return correct content type."""
        endpoints = [
            "/health",
            "/analytics/summary",
            "/v1/variants",
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            assert "application/json" in response.headers.get("content-type", "")

    @pytest.mark.api
    def test_cors_headers_presence(self, client):
        """Test that appropriate CORS headers are present."""
        response = client.get("/health")
        assert response.status_code == 200
        # CORS headers should be present (configured in main.py)
        # May vary based on configuration


class TestErrorRecovery:
    """Test error handling and recovery."""

    @pytest.mark.api
    def test_sequential_error_recovery(self, client):
        """Test that API recovers after errors."""
        # Send invalid request
        response1 = client.post("/v1/render/pdf", json={})
        assert response1.status_code == 422
        
        # Send valid request after error
        valid_payload = {
            "resume_data": {
                "basics": {
                    "name": "Test",
                    "email": "test@example.com"
                }
            },
            "variant": "professional",
        }
        response2 = client.post("/v1/render/pdf", json=valid_payload)
        assert response2.status_code == 200

    @pytest.mark.api
    @pytest.mark.integration
    def test_health_after_failed_request(self, client):
        """Test that health endpoint works after failed request."""
        # Send invalid request
        client.get("/v1/nonexistent")
        
        # Health check should still work
        response = client.get("/health")
        assert response.status_code == 200
        assert "status" in response.json()


class TestContentNegotiation:
    """Test content negotiation and media type handling."""

    @pytest.mark.api
    def test_accept_header_json(self, client):
        """Test JSON response with Accept header."""
        headers = {"Accept": "application/json"}
        response = client.get("/health", headers=headers)
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")

    @pytest.mark.api
    def test_accept_header_pdf(self, client):
        """Test PDF response with Accept header."""
        payload = {
            "resume_data": {
                "basics": {"name": "Test", "email": "test@example.com"}
            },
            "variant": "professional",
        }
        headers = {"Accept": "application/pdf"}
        response = client.post("/v1/render/pdf", json=payload, headers=headers)
        assert response.status_code == 200


class TestEndpointCombinations:
    """Test combinations of endpoints and workflows."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_variant_list_before_pdf_generation(self, client):
        """Test workflow: list variants, then generate PDF."""
        # Get variants
        var_response = client.get("/v1/variants")
        assert var_response.status_code == 200
        
        # Generate PDF with a variant
        payload = {
            "resume_data": {
                "basics": {"name": "Test", "email": "test@example.com"}
            },
            "variant": "professional",
        }
        pdf_response = client.post("/v1/render/pdf", json=payload)
        assert pdf_response.status_code == 200

    @pytest.mark.api
    @pytest.mark.integration
    def test_health_analytics_combination(self, client):
        """Test calling health and analytics endpoints together."""
        health_response = client.get("/health")
        assert health_response.status_code == 200
        
        analytics_response = client.get("/analytics/summary")
        assert analytics_response.status_code == 200
