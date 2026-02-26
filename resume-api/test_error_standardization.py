#!/usr/bin/env python3
"""
Test script for error response standardization.
Verifies that all error responses follow the unified schema.
"""

import json
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Test imports
try:
    from config.errors import (
        ErrorCode,
        ErrorResponse,
        FieldError,
        create_error_response,
        generate_request_id,
        get_error_message,
        get_status_code,
        ERROR_MESSAGES,
        ERROR_STATUS_CODES,
    )
    print("✓ All imports successful")
except ImportError as e:
    print(f"✗ Import failed: {e}")
    sys.exit(1)


def test_error_codes():
    """Test that all error codes are defined"""
    expected_codes = [
        "VALIDATION_ERROR",
        "UNAUTHORIZED",
        "FORBIDDEN",
        "NOT_FOUND",
        "RATE_LIMITED",
        "PDF_GENERATION_FAILED",
        "OAUTH_INVALID_CODE",
        "INTERNAL_SERVER_ERROR",
    ]
    
    for code_name in expected_codes:
        assert hasattr(ErrorCode, code_name), f"Missing error code: {code_name}"
    
    print("✓ All error codes defined")


def test_error_messages():
    """Test that all error codes have messages"""
    for code in ErrorCode:
        assert code in ERROR_MESSAGES, f"Missing message for {code}"
        message = ERROR_MESSAGES[code]
        assert isinstance(message, str) and len(message) > 0, f"Invalid message for {code}"
    
    print("✓ All error codes have messages")


def test_status_codes():
    """Test that all error codes have status codes"""
    for code in ErrorCode:
        assert code in ERROR_STATUS_CODES, f"Missing status code for {code}"
        status = ERROR_STATUS_CODES[code]
        assert 400 <= status < 600, f"Invalid status code for {code}: {status}"
    
    print("✓ All error codes have status codes")


def test_request_id_generation():
    """Test request ID generation"""
    id1 = generate_request_id()
    id2 = generate_request_id()
    
    assert id1.startswith("req_"), f"Request ID should start with 'req_': {id1}"
    assert len(id1) == 20, f"Request ID should be 20 chars: {id1}"
    assert id1 != id2, "Request IDs should be unique"
    
    print("✓ Request ID generation works")


def test_get_error_message():
    """Test error message retrieval"""
    msg = get_error_message(ErrorCode.VALIDATION_ERROR)
    assert msg == "Request validation failed", f"Wrong message: {msg}"
    
    # Test with formatting
    msg = get_error_message(ErrorCode.MISSING_FIELD, field="email")
    assert "email" in msg, f"Message should contain field name: {msg}"
    
    print("✓ Error message retrieval works")


def test_get_status_code():
    """Test status code retrieval"""
    code = get_status_code(ErrorCode.VALIDATION_ERROR)
    assert code == 400, f"Expected 400, got {code}"
    
    code = get_status_code(ErrorCode.UNAUTHORIZED)
    assert code == 401, f"Expected 401, got {code}"
    
    code = get_status_code(ErrorCode.NOT_FOUND)
    assert code == 404, f"Expected 404, got {code}"
    
    print("✓ Status code retrieval works")


def test_field_error_model():
    """Test FieldError model"""
    field_error = FieldError(
        field="email",
        message="Invalid email format",
        code="INVALID_FORMAT"
    )
    
    assert field_error.field == "email"
    assert field_error.message == "Invalid email format"
    assert field_error.code == "INVALID_FORMAT"
    
    # Test JSON serialization
    json_str = field_error.model_dump_json()
    assert "email" in json_str
    
    print("✓ FieldError model works")


def test_error_response_model():
    """Test ErrorResponse model"""
    response = ErrorResponse(
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        request_id="req_test123456",
        timestamp="2024-02-26T13:40:22.892Z",
        status=400,
        path="/v1/render/pdf",
        method="POST"
    )
    
    assert response.error_code == "VALIDATION_ERROR"
    assert response.message == "Request validation failed"
    assert response.request_id == "req_test123456"
    assert response.status == 400
    
    # Test JSON serialization
    json_data = response.model_dump(exclude_none=True)
    assert "error_code" in json_data
    assert "message" in json_data
    assert "request_id" in json_data
    assert "timestamp" in json_data
    
    print("✓ ErrorResponse model works")


def test_create_error_response():
    """Test error response factory function"""
    response = create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR,
        message="Custom message",
        path="/test",
        method="POST"
    )
    
    assert response.error_code == "VALIDATION_ERROR"
    assert response.message == "Custom message"
    assert response.request_id.startswith("req_")
    assert response.status == 400
    assert response.path == "/test"
    assert response.method == "POST"
    assert response.timestamp.endswith("Z")
    
    # Test with field errors
    field_errors = [
        FieldError(field="email", message="Invalid email")
    ]
    response = create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR,
        field_errors=field_errors
    )
    
    assert response.field_errors is not None
    assert len(response.field_errors) == 1
    assert response.field_errors[0].field == "email"
    
    print("✓ create_error_response factory works")


def test_error_response_json_structure():
    """Test that error response JSON has correct structure"""
    response = create_error_response(
        error_code=ErrorCode.NOT_FOUND,
        path="/v1/resumes/123",
        method="GET",
        details={"resume_id": "123"}
    )
    
    json_data = response.model_dump(exclude_none=True)
    
    # Check required fields
    assert "error_code" in json_data, "Missing error_code"
    assert "message" in json_data, "Missing message"
    assert "request_id" in json_data, "Missing request_id"
    assert "timestamp" in json_data, "Missing timestamp"
    
    # Check optional fields
    assert "status" in json_data, "Missing status"
    assert "path" in json_data, "Missing path"
    assert "method" in json_data, "Missing method"
    assert "details" in json_data, "Missing details"
    
    # Check types
    assert isinstance(json_data["error_code"], str)
    assert isinstance(json_data["message"], str)
    assert isinstance(json_data["request_id"], str)
    assert isinstance(json_data["timestamp"], str)
    assert isinstance(json_data["status"], int)
    
    print("✓ Error response JSON structure is correct")


def test_consistent_error_schema():
    """Test that multiple errors follow the same schema"""
    errors_to_test = [
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.NOT_FOUND,
        ErrorCode.RATE_LIMITED,
        ErrorCode.PDF_GENERATION_FAILED,
        ErrorCode.INTERNAL_SERVER_ERROR,
    ]
    
    schemas = []
    for error_code in errors_to_test:
        response = create_error_response(error_code=error_code)
        json_data = response.model_dump(exclude_none=True)
        schemas.append(set(json_data.keys()))
    
    # All should have the same required keys
    required_keys = {"error_code", "message", "request_id", "timestamp", "status"}
    for schema in schemas:
        assert required_keys.issubset(schema), f"Missing required keys in schema: {schema}"
    
    print("✓ All errors have consistent schema")


def run_all_tests():
    """Run all tests"""
    tests = [
        test_error_codes,
        test_error_messages,
        test_status_codes,
        test_request_id_generation,
        test_get_error_message,
        test_get_status_code,
        test_field_error_model,
        test_error_response_model,
        test_create_error_response,
        test_error_response_json_structure,
        test_consistent_error_schema,
    ]
    
    print("\n" + "="*60)
    print("ERROR STANDARDIZATION TESTS")
    print("="*60 + "\n")
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__}: {e}")
            failed += 1
    
    print("\n" + "="*60)
    print(f"Results: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
