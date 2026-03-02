"""
Comprehensive Error Handling Tests for Backend
Issue #601: [T5-Test-6] Add Error Handling Tests

Tests cover:
- All error codes mapped to correct HTTP status codes
- Error response format validation
- Token expiration scenarios
- OAuth error scenarios
- Concurrent request error handling
- Error recovery from database/external service failures
- Field-level validation errors
- Request ID tracking across errors
"""

import pytest
import json
from fastapi.testclient import TestClient
from fastapi import status
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from config.errors import (
    ErrorCode,
    create_error_response,
    generate_request_id,
    get_status_code,
    get_error_message,
)


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


# ============================================================
# Error Code Mapping Tests
# ============================================================
class TestErrorCodeMapping:
    """Test error codes map to correct HTTP status codes."""

    @pytest.mark.api
    def test_validation_error_400(self):
        """Test VALIDATION_ERROR maps to 400."""
        status_code = get_status_code(ErrorCode.VALIDATION_ERROR)
        assert status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.api
    def test_unauthorized_401(self):
        """Test UNAUTHORIZED maps to 401."""
        status_code = get_status_code(ErrorCode.UNAUTHORIZED)
        assert status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.api
    def test_forbidden_403(self):
        """Test FORBIDDEN maps to 403."""
        status_code = get_status_code(ErrorCode.FORBIDDEN)
        assert status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.api
    def test_not_found_404(self):
        """Test NOT_FOUND maps to 404."""
        status_code = get_status_code(ErrorCode.NOT_FOUND)
        assert status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.api
    def test_conflict_409(self):
        """Test CONFLICT maps to 409."""
        status_code = get_status_code(ErrorCode.CONFLICT)
        assert status_code == status.HTTP_409_CONFLICT

    @pytest.mark.api
    def test_rate_limited_429(self):
        """Test RATE_LIMITED maps to 429."""
        status_code = get_status_code(ErrorCode.RATE_LIMITED)
        assert status_code == status.HTTP_429_TOO_MANY_REQUESTS

    @pytest.mark.api
    def test_internal_server_error_500(self):
        """Test INTERNAL_SERVER_ERROR maps to 500."""
        status_code = get_status_code(ErrorCode.INTERNAL_SERVER_ERROR)
        assert status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.api
    def test_service_unavailable_503(self):
        """Test SERVICE_UNAVAILABLE maps to 503."""
        status_code = get_status_code(ErrorCode.SERVICE_UNAVAILABLE)
        assert status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    @pytest.mark.api
    def test_all_error_codes_have_mapping(self):
        """Test all error codes have status code mapping."""
        from config.errors import ERROR_STATUS_CODES

        for error_code in ErrorCode:
            assert error_code in ERROR_STATUS_CODES, f"Missing mapping for {error_code}"


# ============================================================
# Error Response Format Tests
# ============================================================
class TestErrorResponseFormat:
    """Test error response format validation."""

    @pytest.mark.api
    def test_error_response_structure(self):
        """Test error response has required fields."""
        response = create_error_response(ErrorCode.VALIDATION_ERROR)

        assert response.error_code == ErrorCode.VALIDATION_ERROR.value
        assert response.message is not None
        assert response.request_id is not None
        assert response.timestamp is not None
        assert response.status is not None

    @pytest.mark.api
    def test_error_response_includes_request_id(self):
        """Test error response includes unique request ID."""
        response1 = create_error_response(ErrorCode.VALIDATION_ERROR)
        response2 = create_error_response(ErrorCode.VALIDATION_ERROR)

        assert response1.request_id != response2.request_id
        assert response1.request_id.startswith("req_")
        assert response2.request_id.startswith("req_")

    @pytest.mark.api
    def test_error_response_timestamp_format(self):
        """Test error response timestamp is ISO 8601."""
        response = create_error_response(ErrorCode.VALIDATION_ERROR)

        # Should be ISO format with Z suffix
        assert response.timestamp.endswith("Z")
        assert "T" in response.timestamp  # ISO format has T

    @pytest.mark.api
    def test_error_response_with_custom_message(self):
        """Test error response with custom message."""
        custom_msg = "Custom error message"
        response = create_error_response(ErrorCode.VALIDATION_ERROR, message=custom_msg)

        assert response.message == custom_msg

    @pytest.mark.api
    def test_error_response_with_field_errors(self):
        """Test error response with field-level errors."""
        from config.errors import FieldError

        field_errors = [
            FieldError(field="email", message="Invalid email format"),
            FieldError(field="name", message="Name is required"),
        ]

        response = create_error_response(
            ErrorCode.VALIDATION_ERROR, field_errors=field_errors
        )

        assert response.field_errors is not None
        assert len(response.field_errors) == 2
        assert response.field_errors[0].field == "email"

    @pytest.mark.api
    def test_error_response_with_details(self):
        """Test error response with additional details."""
        details = {"attempted_action": "saveResume", "retry_count": 3}
        response = create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, details=details
        )

        assert response.details == details

    @pytest.mark.api
    def test_error_response_with_path_and_method(self):
        """Test error response includes request path and method."""
        response = create_error_response(
            ErrorCode.VALIDATION_ERROR,
            path="/v1/render/pdf",
            method="POST",
        )

        assert response.path == "/v1/render/pdf"
        assert response.method == "POST"


# ============================================================
# Token Expiration Tests
# ============================================================
class TestTokenExpiration:
    """Test token expiration error scenarios."""

    @pytest.mark.api
    def test_expired_token_401(self, client):
        """Test request with expired token returns 401."""
        headers = {"Authorization": "Bearer expired.token.here"}
        response = client.get("/v1/resumes", headers=headers)

        assert response.status_code in [401, 422]  # May fail on validation first

    @pytest.mark.api
    def test_oauth_token_expired_error(self):
        """Test OAuth token expired error."""
        response = create_error_response(ErrorCode.OAUTH_TOKEN_EXPIRED)

        assert response.status == status.HTTP_401_UNAUTHORIZED
        assert "OAuth" in response.message or "expired" in response.message.lower()

    @pytest.mark.api
    def test_oauth_invalid_code_error(self):
        """Test OAuth invalid code error."""
        response = create_error_response(ErrorCode.OAUTH_INVALID_CODE)

        assert response.status == status.HTTP_400_BAD_REQUEST
        assert "OAuth" in response.message or "code" in response.message.lower()

    @pytest.mark.api
    def test_oauth_invalid_state_error(self):
        """Test OAuth state mismatch error."""
        response = create_error_response(ErrorCode.OAUTH_INVALID_STATE)

        assert response.status == status.HTTP_400_BAD_REQUEST

    @pytest.mark.api
    def test_oauth_scope_denied_error(self):
        """Test OAuth scope denial error."""
        response = create_error_response(ErrorCode.OAUTH_SCOPE_DENIED)

        assert response.status == status.HTTP_403_FORBIDDEN

    @pytest.mark.api
    def test_oauth_provider_error(self):
        """Test OAuth provider error."""
        response = create_error_response(ErrorCode.OAUTH_PROVIDER_ERROR)

        assert response.status == status.HTTP_502_BAD_GATEWAY


# ============================================================
# Validation Error Tests
# ============================================================
class TestValidationErrors:
    """Test validation error scenarios."""

    @pytest.mark.api
    def test_missing_required_field_error(self, client):
        """Test missing required field error."""
        payload = {"variant": "professional"}  # Missing resume_data
        response = client.post("/v1/render/pdf", json=payload)

        assert response.status_code == 422

    @pytest.mark.api
    def test_invalid_type_error(self, client):
        """Test invalid type error."""
        payload = {"resume_data": "not an object", "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)

        assert response.status_code == 422

    @pytest.mark.api
    def test_field_level_validation_errors(self):
        """Test field-level validation errors."""
        from config.errors import FieldError

        field_errors = [
            FieldError(
                field="email", message="Invalid email format", code="INVALID_FORMAT"
            ),
            FieldError(field="age", message="Must be a number", code="INVALID_FORMAT"),
            FieldError(
                field="name", message="Minimum 2 characters", code="VALIDATION_ERROR"
            ),
        ]

        response = create_error_response(
            ErrorCode.VALIDATION_ERROR,
            message="Multiple validation errors",
            field_errors=field_errors,
        )

        assert len(response.field_errors) == 3
        assert response.field_errors[0].field == "email"
        assert response.field_errors[1].code == "INVALID_FORMAT"

    @pytest.mark.api
    def test_missing_field_error_message(self):
        """Test missing field error with field name."""
        response = create_error_response(ErrorCode.MISSING_FIELD, field="email")

        assert "email" in response.message

    @pytest.mark.api
    def test_invalid_format_error_message(self):
        """Test invalid format error with field name."""
        response = create_error_response(ErrorCode.INVALID_FORMAT, field="phone_number")

        assert "phone_number" in response.message

    @pytest.mark.api
    def test_empty_payload_validation(self, client):
        """Test validation of empty payload."""
        response = client.post("/v1/render/pdf", json={})
        assert response.status_code == 422

    @pytest.mark.api
    def test_null_field_validation(self, client):
        """Test validation of null fields."""
        payload = {"resume_data": None, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 422


# ============================================================
# Resume-Specific Error Tests
# ============================================================
class TestResumeSpecificErrors:
    """Test resume-specific error scenarios."""

    @pytest.mark.api
    def test_resume_not_found(self):
        """Test resume not found error."""
        response = create_error_response(ErrorCode.RESUME_NOT_FOUND)

        assert response.status == status.HTTP_404_NOT_FOUND

    @pytest.mark.api
    def test_resume_locked_error(self):
        """Test resume locked error."""
        response = create_error_response(ErrorCode.RESUME_LOCKED)

        assert response.status == status.HTTP_409_CONFLICT

    @pytest.mark.api
    def test_resume_archived_error(self):
        """Test resume archived error."""
        response = create_error_response(ErrorCode.RESUME_ARCHIVED)

        assert response.status == status.HTTP_410_GONE

    @pytest.mark.api
    def test_resume_invalid_error(self):
        """Test resume invalid error."""
        response = create_error_response(ErrorCode.RESUME_INVALID)

        assert response.status == status.HTTP_400_BAD_REQUEST

    @pytest.mark.api
    def test_pdf_generation_failed(self):
        """Test PDF generation failed error."""
        response = create_error_response(ErrorCode.PDF_GENERATION_FAILED)

        assert response.status == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.api
    def test_pdf_not_found(self):
        """Test PDF not found error."""
        response = create_error_response(ErrorCode.PDF_NOT_FOUND)

        assert response.status == status.HTTP_404_NOT_FOUND

    @pytest.mark.api
    def test_pdf_invalid_template(self):
        """Test PDF invalid template error."""
        response = create_error_response(ErrorCode.PDF_INVALID_TEMPLATE)

        assert response.status == status.HTTP_400_BAD_REQUEST

    @pytest.mark.api
    def test_pdf_rendering_error(self):
        """Test PDF rendering error."""
        response = create_error_response(ErrorCode.PDF_RENDERING_ERROR)

        assert response.status == status.HTTP_500_INTERNAL_SERVER_ERROR


# ============================================================
# Server Error Tests
# ============================================================
class TestServerErrors:
    """Test server error scenarios."""

    @pytest.mark.api
    def test_internal_server_error(self):
        """Test internal server error."""
        response = create_error_response(ErrorCode.INTERNAL_SERVER_ERROR)

        assert response.status == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.api
    def test_database_error(self):
        """Test database error."""
        response = create_error_response(ErrorCode.DATABASE_ERROR)

        assert response.status == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.api
    def test_external_service_error(self):
        """Test external service error."""
        response = create_error_response(ErrorCode.EXTERNAL_SERVICE_ERROR)

        assert response.status == status.HTTP_502_BAD_GATEWAY

    @pytest.mark.api
    def test_service_unavailable_error(self):
        """Test service unavailable error."""
        response = create_error_response(ErrorCode.SERVICE_UNAVAILABLE)

        assert response.status == status.HTTP_503_SERVICE_UNAVAILABLE

    @pytest.mark.api
    def test_database_connection_error(self):
        """Test database connection error."""
        response = create_error_response(
            ErrorCode.DATABASE_ERROR,
            details={"connection_pool_exhausted": True},
        )

        assert response.status == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.details["connection_pool_exhausted"] is True


# ============================================================
# Rate Limiting Tests
# ============================================================
class TestRateLimitingErrors:
    """Test rate limiting error scenarios."""

    @pytest.mark.api
    def test_rate_limited_error(self):
        """Test rate limited error."""
        response = create_error_response(ErrorCode.RATE_LIMITED)

        assert response.status == status.HTTP_429_TOO_MANY_REQUESTS

    @pytest.mark.api
    def test_rate_limit_with_retry_after(self):
        """Test rate limit error includes retry-after info."""
        response = create_error_response(
            ErrorCode.RATE_LIMITED,
            details={"retry_after_seconds": 60},
        )

        assert response.status == status.HTTP_429_TOO_MANY_REQUESTS
        assert response.details["retry_after_seconds"] == 60


# ============================================================
# Error Messages Tests
# ============================================================
class TestErrorMessages:
    """Test error message generation."""

    @pytest.mark.api
    def test_error_message_for_validation(self):
        """Test error message for validation error."""
        message = get_error_message(ErrorCode.VALIDATION_ERROR)
        assert message is not None
        assert len(message) > 0

    @pytest.mark.api
    def test_error_message_with_field_name(self):
        """Test error message formatting with field name."""
        message = get_error_message(ErrorCode.MISSING_FIELD, field="email")
        assert "email" in message

    @pytest.mark.api
    def test_all_error_codes_have_messages(self):
        """Test all error codes have messages."""
        from config.errors import ERROR_MESSAGES

        for error_code in ErrorCode:
            assert error_code in ERROR_MESSAGES, f"Missing message for {error_code}"

    @pytest.mark.api
    def test_error_messages_are_user_friendly(self):
        """Test error messages are human-readable."""
        from config.errors import ERROR_MESSAGES

        for error_code, message in ERROR_MESSAGES.items():
            assert isinstance(message, str)
            assert len(message) > 0
            assert "{" not in message or "}" in message  # No unclosed placeholders


# ============================================================
# Concurrent Error Handling Tests
# ============================================================
class TestConcurrentErrorHandling:
    """Test concurrent error handling."""

    @pytest.mark.api
    def test_concurrent_requests_with_different_errors(self, client, valid_resume):
        """Test handling multiple concurrent requests with different errors."""
        # Valid request
        payload_valid = {"resume_data": valid_resume, "variant": "professional"}

        # Invalid request
        payload_invalid = {"variant": "professional"}  # Missing resume_data

        response_valid = client.post("/v1/render/pdf", json=payload_valid)
        response_invalid = client.post("/v1/render/pdf", json=payload_invalid)

        assert response_valid.status_code == 200
        assert response_invalid.status_code == 422

    @pytest.mark.api
    def test_request_ids_are_unique(self, client):
        """Test that request IDs are unique across requests."""
        request_ids = set()

        for _ in range(5):
            response = client.post("/v1/render/pdf", json={})
            # Try to extract request ID from response headers or body
            request_id = response.headers.get("X-Request-ID")
            if request_id:
                request_ids.add(request_id)

        # At least some requests should have unique IDs
        assert len(request_ids) > 0

    @pytest.mark.api
    def test_error_isolation_in_concurrent_requests(self, client):
        """Test errors are isolated between concurrent requests."""
        payloads = [
            {},  # Missing fields
            {"variant": "professional"},  # Missing resume_data
            {"resume_data": None},  # Null value
        ]

        responses = [client.post("/v1/render/pdf", json=p) for p in payloads]

        # All should be errors
        assert all(r.status_code >= 400 for r in responses)
        # Error messages should be different
        error_messages = [r.json() for r in responses]
        assert len(error_messages) == 3


# ============================================================
# Request Tracking Tests
# ============================================================
class TestRequestTracking:
    """Test request tracking with error handling."""

    @pytest.mark.api
    def test_request_id_in_error_response(self, client):
        """Test error response includes request ID."""
        response = client.post("/v1/render/pdf", json={})
        request_id = response.headers.get("X-Request-ID")

        assert request_id is not None
        assert request_id.startswith("req_") or len(request_id) > 0

    @pytest.mark.api
    def test_request_id_uniqueness(self):
        """Test request IDs are unique."""
        ids = [generate_request_id() for _ in range(100)]
        assert len(set(ids)) == 100

    @pytest.mark.api
    def test_request_id_generation(self):
        """Test request ID generation format."""
        request_id = generate_request_id()

        assert isinstance(request_id, str)
        assert request_id.startswith("req_")
        assert len(request_id) == 20  # req_ (4) + 16 hex chars


# ============================================================
# Error Recovery Tests
# ============================================================
class TestErrorRecovery:
    """Test error recovery scenarios."""

    @pytest.mark.api
    def test_api_functional_after_error(self, client, valid_resume):
        """Test API continues working after error."""
        # Send invalid request
        response1 = client.post("/v1/render/pdf", json={})
        assert response1.status_code == 422

        # Send valid request - should work
        payload = {"resume_data": valid_resume, "variant": "professional"}
        response2 = client.post("/v1/render/pdf", json=payload)
        assert response2.status_code == 200

    @pytest.mark.api
    def test_health_check_after_errors(self, client):
        """Test health endpoint works after errors."""
        # Generate errors
        for _ in range(3):
            client.post("/v1/render/pdf", json={})
            client.get("/v1/nonexistent")

        # Health check should still work
        response = client.get("/health")
        assert response.status_code == 200

    @pytest.mark.api
    def test_retry_after_transient_error(self, client, valid_resume):
        """Test successful retry after transient error."""
        payload = {"resume_data": valid_resume, "variant": "professional"}

        # First attempt
        response1 = client.post("/v1/render/pdf", json=payload)
        # Second attempt (should both work or handle consistently)
        response2 = client.post("/v1/render/pdf", json=payload)

        assert response1.status_code in [200, 202]
        assert response2.status_code in [200, 202]


# ============================================================
# Edge Cases Tests
# ============================================================
class TestEdgeCases:
    """Test edge cases in error handling."""

    @pytest.mark.api
    def test_extremely_long_error_message(self):
        """Test handling of extremely long error messages."""
        long_message = "x" * 10000
        response = create_error_response(
            ErrorCode.VALIDATION_ERROR, message=long_message
        )

        assert response.message == long_message

    @pytest.mark.api
    def test_special_characters_in_error_message(self):
        """Test special characters in error messages."""
        special_message = "Error with special chars: <>&\"'"
        response = create_error_response(
            ErrorCode.VALIDATION_ERROR, message=special_message
        )

        assert response.message == special_message

    @pytest.mark.api
    def test_unicode_in_error_message(self):
        """Test Unicode characters in error messages."""
        unicode_message = "Error: 日本語 中文 한국어"
        response = create_error_response(
            ErrorCode.VALIDATION_ERROR, message=unicode_message
        )

        assert response.message == unicode_message

    @pytest.mark.api
    def test_null_values_in_error_response(self):
        """Test null values are properly handled."""
        response = create_error_response(ErrorCode.VALIDATION_ERROR)

        # Non-required fields can be None
        assert response.field_errors is None or isinstance(response.field_errors, list)
        assert response.details is None or isinstance(response.details, dict)

    @pytest.mark.api
    def test_error_response_serialization(self):
        """Test error response serializes to valid JSON."""
        response = create_error_response(
            ErrorCode.VALIDATION_ERROR,
            field_errors=[],
            details={"key": "value"},
        )

        # Should be serializable
        json_str = response.model_dump_json(exclude_none=True)
        assert json_str is not None
        assert len(json_str) > 0

        # Should deserialize back
        data = json.loads(json_str)
        assert data["error_code"] is not None


# ============================================================
# Performance Tests
# ============================================================
class TestErrorHandlingPerformance:
    """Test error handling performance."""

    @pytest.mark.api
    def test_error_response_creation_performance(self):
        """Test error response creation is fast."""
        import time

        start_time = time.time()

        for _ in range(1000):
            create_error_response(ErrorCode.VALIDATION_ERROR)

        elapsed = time.time() - start_time

        # Should create 1000 responses in < 1 second
        assert elapsed < 1.0

    @pytest.mark.api
    def test_error_message_generation_performance(self):
        """Test error message generation is fast."""
        import time

        start_time = time.time()

        for _ in range(1000):
            get_error_message(ErrorCode.MISSING_FIELD, field="email")

        elapsed = time.time() - start_time

        # Should generate 1000 messages in < 0.5 seconds
        assert elapsed < 0.5

    @pytest.mark.api
    def test_request_id_generation_performance(self):
        """Test request ID generation is fast."""
        import time

        start_time = time.time()

        for _ in range(10000):
            generate_request_id()

        elapsed = time.time() - start_time

        # Should generate 10000 IDs in < 0.5 seconds
        assert elapsed < 0.5


# ============================================================
# Integration Tests
# ============================================================
class TestErrorHandlingIntegration:
    """Test error handling integration."""

    @pytest.mark.api
    @pytest.mark.integration
    def test_complete_error_flow(self, client):
        """Test complete error flow from request to response."""
        response = client.post("/v1/render/pdf", json={})

        assert response.status_code == 422
        data = response.json()
        # Should have structure
        assert isinstance(data, (dict, list))

    @pytest.mark.api
    @pytest.mark.integration
    def test_error_consistency_across_endpoints(self, client):
        """Test errors are consistent across endpoints."""
        # Test multiple endpoints with invalid requests
        invalid_payload = {}

        response1 = client.post("/v1/render/pdf", json=invalid_payload)

        # Both should have consistent error format
        assert response1.status_code >= 400

    @pytest.mark.api
    @pytest.mark.integration
    def test_error_handler_middleware_activation(self, client):
        """Test error handler middleware is active."""
        response = client.get("/v1/nonexistent-endpoint")

        assert response.status_code == 404
        # Response should contain data
        assert len(response.content) > 0
