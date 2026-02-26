# API Integration Tests - Issue #389

Comprehensive integration test suite for FastAPI endpoints in ResumeAI.

## Overview

This directory contains integration tests for all major API endpoints with extensive coverage of:

- **Request/Response Validation**: Tests for proper validation of all input fields
- **Error Handling**: Comprehensive error handling and HTTP status code testing
- **Edge Cases**: Boundary conditions, special characters, Unicode support
- **Performance**: Concurrent request handling and large payload testing
- **Security**: Input sanitization and injection prevention

## Test Files

### 1. `test_api_endpoints_integration.py`
Main integration test suite covering:
- Health check endpoints (`/health`, `/health/detailed`, `/health/ready`)
- Analytics endpoints (`/analytics/summary`, `/analytics/endpoints`)
- PDF rendering endpoint (`POST /v1/render/pdf`)
- Variants endpoint (`GET /v1/variants`)
- Error handling across all endpoints
- Response structure and content types

**Key Test Classes:**
- `TestHealthEndpoints`: Health check functionality
- `TestAnalyticsEndpoints`: Analytics data retrieval
- `TestRenderPdfEndpoint`: PDF generation with various inputs
- `TestVariantsEndpoint`: Resume template variants
- `TestErrorHandling`: Error response validation
- `TestRequestValidation`: Input validation
- `TestEdgeCases`: Boundary conditions
- `TestResponseStructure`: Response format consistency

### 2. `test_api_request_validation.py`
Detailed request validation tests covering:
- Basics section validation (name, email, phone, URL)
- Work experience validation
- Education section validation
- Skills section validation
- Special character handling (LaTeX, HTML, Unicode)
- Type validation
- Missing/null field handling

**Key Test Classes:**
- `TestBasicsValidation`: Contact info validation
- `TestWorkExperienceValidation`: Work history validation
- `TestEducationValidation`: Education section validation
- `TestSkillsValidation`: Skills section validation
- `TestSpecialCharacterHandling`: Character encoding and escaping
- `TestTypeValidation`: Type checking
- `TestMissingFields`: Required field validation
- `TestNullFields`: Null value handling

### 3. `test_api_error_handling.py`
Comprehensive error handling tests covering:
- HTTP status codes (200, 400, 404, 405, 422)
- Validation error responses
- Error message quality
- Error recovery and API resilience
- Response consistency
- Invalid input scenarios
- Content type handling
- Boundary conditions

**Key Test Classes:**
- `TestHttpStatusCodes`: Status code correctness
- `TestValidationErrors`: Validation error responses
- `TestErrorMessages`: Error message quality
- `TestEdgeCaseHandling`: Edge case error handling
- `TestErrorRecovery`: API recovery after errors
- `TestResponseConsistency`: Consistent error formats
- `TestInvalidInputs`: Invalid input handling
- `TestBoundaryConditions`: Boundary value testing

### 4. `test_api_advanced_scenarios.py`
Advanced integration scenarios covering:
- Large payload handling
- Concurrent requests
- Parameter validation edge cases
- Data integrity checks
- Response consistency validation
- Content negotiation
- Endpoint workflow combinations

**Key Test Classes:**
- `TestPayloadHandling`: Large and nested payloads
- `TestAuthAndSecurity`: Authentication aspects
- `TestConcurrentRequests`: Concurrent request handling
- `TestParameterValidation`: Query parameter validation
- `TestDataIntegrity`: Data consistency
- `TestResponseConsistency`: Response format consistency
- `TestErrorRecovery`: Error recovery mechanisms
- `TestContentNegotiation`: Content type negotiation
- `TestEndpointCombinations`: Multi-endpoint workflows

### 5. `conftest.py`
Pytest configuration and fixtures:
- Test client setup
- Sample resume data fixtures (minimal, complete, invalid)
- Environment variable configuration
- Custom pytest markers registration

**Available Fixtures:**
- `client`: FastAPI test client
- `sample_resume_data`: Complete valid resume
- `minimal_resume_data`: Minimal valid resume
- `invalid_resume_no_email`: Invalid resume missing email
- `invalid_resume_bad_email`: Invalid resume with malformed email
- `invalid_resume_bad_url`: Invalid resume with malformed URL

## Test Markers

Tests are organized with markers for easy filtering:

```bash
# Run only integration tests
pytest -m integration

# Run only API endpoint tests
pytest -m api

# Run only authentication tests
pytest -m auth

# Run only rate limiting tests
pytest -m rate_limit

# Combine markers
pytest -m "api and integration"
pytest -m "not rate_limit"
```

## Running the Tests

### Run all tests
```bash
pytest tests/api_integration_tests/ -v
```

### Run specific test file
```bash
pytest tests/api_integration_tests/test_api_endpoints_integration.py -v
```

### Run specific test class
```bash
pytest tests/api_integration_tests/test_api_endpoints_integration.py::TestHealthEndpoints -v
```

### Run specific test
```bash
pytest tests/api_integration_tests/test_api_endpoints_integration.py::TestHealthEndpoints::test_health_check_basic -v
```

### Run with coverage
```bash
pytest tests/api_integration_tests/ --cov=resume-api --cov-report=html
```

### Run with specific markers
```bash
pytest tests/api_integration_tests/ -m integration -v
pytest tests/api_integration_tests/ -m "api and not rate_limit" -v
```

## Test Coverage

The test suite provides comprehensive coverage of:

| Endpoint | Tests | Coverage |
|----------|-------|----------|
| `/health` | 3 | ✓ Basic, Detailed, Readiness |
| `/analytics/summary` | 3 | ✓ Default, Custom hours, Validation |
| `/analytics/endpoints` | 2 | ✓ Default, Custom params |
| `/v1/render/pdf` | 25+ | ✓ Success, Validation, Variants, Errors |
| `/v1/variants` | 5 | ✓ List, Search, Filters, Error cases |
| Error Handling | 30+ | ✓ Status codes, Messages, Recovery |
| Request Validation | 40+ | ✓ Fields, Types, Constraints, Special chars |

**Total Test Count:** 100+ test cases

## Sample Test Execution

```bash
$ pytest tests/api_integration_tests/ -v --tb=short

test_api_endpoints_integration.py::TestHealthEndpoints::test_health_check_basic PASSED
test_api_endpoints_integration.py::TestHealthEndpoints::test_health_check_detailed PASSED
test_api_endpoints_integration.py::TestRenderPdfEndpoint::test_render_pdf_success PASSED
test_api_endpoints_integration.py::TestRenderPdfEndpoint::test_render_pdf_all_variants PASSED
test_api_request_validation.py::TestBasicsValidation::test_basics_email_format PASSED
test_api_error_handling.py::TestHttpStatusCodes::test_success_200 PASSED
test_api_advanced_scenarios.py::TestPayloadHandling::test_large_resume_payload PASSED

============ 100+ passed in 15.23s ============
```

## Key Testing Patterns

### 1. Valid Input Testing
```python
def test_render_pdf_success(self, client, sample_resume_data):
    payload = {
        "resume_data": sample_resume_data,
        "variant": "professional",
    }
    response = client.post("/v1/render/pdf", json=payload)
    assert response.status_code == 200
```

### 2. Invalid Input Testing
```python
def test_invalid_email(self, client):
    resume = {"basics": {"name": "Test", "email": "invalid-email"}}
    payload = {"resume_data": resume, "variant": "professional"}
    response = client.post("/v1/render/pdf", json=payload)
    assert response.status_code in [400, 422]
```

### 3. Edge Case Testing
```python
def test_special_characters(self, client):
    data = {"basics": {"name": "John & Mary <Doe> 100%"}}
    payload = {"resume_data": data, "variant": "professional"}
    response = client.post("/v1/render/pdf", json=payload)
    assert response.status_code == 200
```

### 4. Error Recovery Testing
```python
def test_recovery_after_error(self, client, valid_resume):
    # Error request
    client.post("/v1/render/pdf", json={})
    # Should recover
    payload = {"resume_data": valid_resume, "variant": "professional"}
    response = client.post("/v1/render/pdf", json=payload)
    assert response.status_code == 200
```

## Environment Configuration

Tests automatically configure:
- `TESTING=True`: Enable test mode
- `REQUIRE_API_KEY=False`: Disable API key requirement
- `ENABLE_RATE_LIMITING=False`: Disable rate limiting
- `DEBUG=False`: Disable debug mode

Configure in `conftest.py` if different behavior is needed.

## Integration with CI/CD

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run API Integration Tests
  run: pytest tests/api_integration_tests/ -v --tb=short
```

## Performance Expectations

- Single test: < 500ms
- Full suite: < 30s
- Coverage analysis: < 60s

## Troubleshooting

### Tests fail with import errors
- Ensure `resume-api` directory is in Python path
- Check `conftest.py` path configuration

### Tests fail with connection errors
- Verify FastAPI app starts correctly
- Check environment variables in `conftest.py`

### Tests timeout
- Increase pytest timeout: `pytest --timeout=30`
- Check for blocking operations in test code

## Future Enhancements

- [ ] WebSocket endpoint tests
- [ ] Database transaction tests
- [ ] OAuth flow integration tests
- [ ] Performance baseline tests
- [ ] Load testing scenarios
- [ ] API versioning tests
- [ ] Deprecation warning tests

## Related Documentation

- [API Documentation](../../API_DOCUMENTATION.md)
- [Error Handling Guide](../../ERROR_HANDLER_GUIDE.md)
- [Testing Guide](../../COVERAGE_GUIDE.md)
- [Validation Rules](../../INPUT_VALIDATION_IMPLEMENTATION.md)

## Contributing

When adding new tests:
1. Follow existing test structure and naming conventions
2. Add appropriate markers (`@pytest.mark.api`, `@pytest.mark.integration`)
3. Use fixtures from `conftest.py`
4. Document test purpose in docstring
5. Ensure tests are independent and isolated
6. Add to appropriate test class

## License

Part of ResumeAI project - see LICENSE file in repository root.
