#!/usr/bin/env python3
"""
Integration tests for error response standardization.
Tests that error responses are standardized across all scenarios.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def test_error_response_structure():
    """Test that error response has consistent structure"""
    from config.errors import create_error_response, ErrorCode

    # Test basic error
    response = create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR, path="/v1/render/pdf", method="POST"
    )

    # Verify all required fields exist
    json_data = response.model_dump(exclude_none=True)

    required_fields = {"error_code", "message", "request_id", "timestamp", "status"}
    assert required_fields.issubset(
        json_data.keys()
    ), f"Missing required fields: {required_fields - json_data.keys()}"

    # Verify field types
    assert isinstance(json_data["error_code"], str), "error_code should be string"
    assert isinstance(json_data["message"], str), "message should be string"
    assert isinstance(json_data["request_id"], str), "request_id should be string"
    assert isinstance(json_data["timestamp"], str), "timestamp should be string"
    assert isinstance(json_data["status"], int), "status should be integer"

    # Verify timestamp format (ISO 8601)
    assert json_data["timestamp"].endswith("Z"), "timestamp should end with Z"

    # Verify request ID format
    assert json_data["request_id"].startswith("req_"), "request_id should start with req_"

    print("✓ Error response structure is valid")


def test_validation_error_with_field_errors():
    """Test validation error with field-specific errors"""
    from config.errors import create_error_response, ErrorCode, FieldError

    field_errors = [
        FieldError(field="email", message="Invalid email format", code="INVALID_FORMAT"),
        FieldError(field="phone", message="Too short", code="VALIDATION_ERROR"),
    ]

    response = create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR, field_errors=field_errors
    )

    json_data = response.model_dump(exclude_none=True)

    assert "field_errors" in json_data, "field_errors should be included"
    assert len(json_data["field_errors"]) == 2, "Should have 2 field errors"
    assert json_data["field_errors"][0]["field"] == "email"

    print("✓ Validation error with field errors works")


def test_error_with_details():
    """Test error with additional details"""
    from config.errors import create_error_response, ErrorCode

    details = {"resume_id": "123", "template": "modern", "error_type": "LaTeX"}

    response = create_error_response(error_code=ErrorCode.PDF_GENERATION_FAILED, details=details)

    json_data = response.model_dump(exclude_none=True)

    assert "details" in json_data, "details should be included"
    assert json_data["details"]["resume_id"] == "123"

    print("✓ Error with details works")


def test_error_status_codes():
    """Test that error codes map to correct HTTP status codes"""
    from config.errors import get_status_code, ErrorCode

    test_cases = [
        (ErrorCode.VALIDATION_ERROR, 400),
        (ErrorCode.UNAUTHORIZED, 401),
        (ErrorCode.FORBIDDEN, 403),
        (ErrorCode.NOT_FOUND, 404),
        (ErrorCode.CONFLICT, 409),
        (ErrorCode.RATE_LIMITED, 429),
        (ErrorCode.INTERNAL_SERVER_ERROR, 500),
        (ErrorCode.SERVICE_UNAVAILABLE, 503),
    ]

    for error_code, expected_status in test_cases:
        actual_status = get_status_code(error_code)
        assert (
            actual_status == expected_status
        ), f"{error_code.value} should map to {expected_status}, got {actual_status}"

    print("✓ All error codes map to correct HTTP status codes")


def test_error_message_formatting():
    """Test error message formatting with parameters"""
    from config.errors import get_error_message, ErrorCode

    # Test without parameters
    msg = get_error_message(ErrorCode.NOT_FOUND)
    assert msg == "Resource not found"

    # Test with parameters
    msg = get_error_message(ErrorCode.MISSING_FIELD, field="email")
    assert "email" in msg

    msg = get_error_message(ErrorCode.INVALID_FORMAT, field="phone")
    assert "phone" in msg

    print("✓ Error message formatting works")


def test_all_error_codes_defined():
    """Test that all error codes are properly defined"""
    from config.errors import ErrorCode, ERROR_MESSAGES, ERROR_STATUS_CODES

    for error_code in ErrorCode:
        # Each code should have a message
        assert error_code in ERROR_MESSAGES, f"Missing message for error code: {error_code.value}"

        # Each code should have a status code
        assert (
            error_code in ERROR_STATUS_CODES
        ), f"Missing status code for error code: {error_code.value}"

        # Message should not be empty
        msg = ERROR_MESSAGES[error_code]
        assert (
            isinstance(msg, str) and len(msg) > 0
        ), f"Invalid message for {error_code.value}: {msg}"

        # Status code should be 4xx or 5xx
        status = ERROR_STATUS_CODES[error_code]
        assert 400 <= status < 600, f"Invalid status code for {error_code.value}: {status}"

    print(f"✓ All {len(ErrorCode)} error codes properly defined")


def test_request_id_uniqueness():
    """Test that request IDs are unique"""
    from config.errors import generate_request_id

    ids = set()
    for _ in range(100):
        request_id = generate_request_id()
        assert request_id not in ids, f"Duplicate request ID: {request_id}"
        ids.add(request_id)

    assert len(ids) == 100, "Should generate 100 unique IDs"

    print("✓ Request ID generation is unique")


def test_error_response_json_serialization():
    """Test that error response can be JSON serialized"""
    from config.errors import create_error_response, ErrorCode

    response = create_error_response(
        error_code=ErrorCode.PDF_GENERATION_FAILED,
        path="/v1/render/pdf",
        method="POST",
        details={"reason": "LaTeX error"},
    )

    json_str = response.model_dump_json()

    # Should be valid JSON
    parsed = json.loads(json_str)

    # Should have all required fields
    assert "error_code" in parsed
    assert "message" in parsed
    assert "request_id" in parsed
    assert "timestamp" in parsed

    print("✓ Error response JSON serialization works")


def test_middleware_error_conversion():
    """Test that middleware would properly convert HTTPException to unified error"""
    from fastapi import HTTPException, status

    # Create an HTTPException like the routes would
    exc = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume data")

    # The middleware would convert this to unified error response
    # Let's verify the conversion logic
    from config.errors import create_error_response, ErrorCode

    error_response = create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR,
        message=exc.detail,
        path="/v1/render/pdf",
        method="POST",
    )

    assert error_response.error_code == "VALIDATION_ERROR"
    assert error_response.message == "Invalid resume data"
    assert error_response.status == 400

    print("✓ HTTPException to unified error conversion works")


def test_example_error_responses():
    """Test realistic error response examples"""
    from config.errors import create_error_response, ErrorCode, FieldError

    # Example 1: Validation error
    response = create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR,
        field_errors=[
            FieldError(
                field="resume_data.name",
                message="Name is required",
                code="MISSING_FIELD",
            ),
            FieldError(
                field="resume_data.email",
                message="Invalid email format",
                code="INVALID_FORMAT",
            ),
        ],
        path="/v1/render/pdf",
        method="POST",
    )

    data = response.model_dump(exclude_none=True)
    assert data["error_code"] == "VALIDATION_ERROR"
    assert len(data["field_errors"]) == 2
    print("  ✓ Validation error example")

    # Example 2: Authentication error
    response = create_error_response(
        error_code=ErrorCode.UNAUTHORIZED,
        message="Invalid API key",
        path="/v1/render/pdf",
        method="POST",
    )

    data = response.model_dump(exclude_none=True)
    assert data["error_code"] == "UNAUTHORIZED"
    assert data["status"] == 401
    print("  ✓ Authentication error example")

    # Example 3: Resource not found
    response = create_error_response(
        error_code=ErrorCode.NOT_FOUND,
        message="Resume with ID '123' not found",
        path="/v1/resumes/123",
        method="GET",
    )

    data = response.model_dump(exclude_none=True)
    assert data["error_code"] == "NOT_FOUND"
    assert data["status"] == 404
    print("  ✓ Not found error example")

    # Example 4: Rate limit
    response = create_error_response(
        error_code=ErrorCode.RATE_LIMITED,
        path="/v1/render/pdf",
        method="POST",
        details={"retry_after_seconds": 60},
    )

    data = response.model_dump(exclude_none=True)
    assert data["error_code"] == "RATE_LIMITED"
    assert data["status"] == 429
    print("  ✓ Rate limit error example")

    # Example 5: Server error
    response = create_error_response(
        error_code=ErrorCode.INTERNAL_SERVER_ERROR, path="/v1/render/pdf", method="POST"
    )

    data = response.model_dump(exclude_none=True)
    assert data["error_code"] == "INTERNAL_SERVER_ERROR"
    assert data["status"] == 500
    print("  ✓ Server error example")

    print("✓ All realistic error response examples valid")


def run_all_tests():
    """Run all integration tests"""
    tests = [
        test_error_response_structure,
        test_validation_error_with_field_errors,
        test_error_with_details,
        test_error_status_codes,
        test_error_message_formatting,
        test_all_error_codes_defined,
        test_request_id_uniqueness,
        test_error_response_json_serialization,
        test_middleware_error_conversion,
        test_example_error_responses,
    ]

    print("\n" + "=" * 60)
    print("ERROR INTEGRATION TESTS")
    print("=" * 60 + "\n")

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__}: {e}")
            import traceback

            traceback.print_exc()
            failed += 1

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60 + "\n")

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
