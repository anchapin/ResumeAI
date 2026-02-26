# Resume API Integration Tests

Comprehensive end-to-end integration tests for the Resume API backend.

## Overview

These integration tests verify complete API flows across all major features:

- **PDF Generation** - Resume rendering with various templates and edge cases
- **Resume Tailoring** - AI-powered resume customization for job descriptions
- **GitHub OAuth** - Complete OAuth authentication flow
- **API Key Management** - Key creation, validation, and rate limiting
- **Variants** - Template selection and management
- **Error Handling** - Validation and error responses
- **Rate Limiting** - Endpoint rate limit enforcement

## Test Structure

```
integration/
├── conftest.py                          # Shared fixtures and configuration
├── test_pdf_generation_e2e.py          # PDF generation tests
├── test_tailoring_e2e.py               # Resume tailoring tests
├── test_github_oauth_e2e.py            # GitHub OAuth flow tests
├── test_api_key_management_e2e.py      # API key management tests
├── test_variants_e2e.py                # Template variant tests
├── test_error_handling_e2e.py          # Error handling tests
├── test_rate_limiting_e2e.py           # Rate limiting tests
└── README.md                            # This file
```

## Running Tests

### Run all integration tests

```bash
cd resume-api
python -m pytest tests/integration/ -v
```

### Run specific test file

```bash
python -m pytest tests/integration/test_pdf_generation_e2e.py -v
```

### Run specific test class

```bash
python -m pytest tests/integration/test_pdf_generation_e2e.py::TestPDFGenerationBasic -v
```

### Run specific test

```bash
python -m pytest tests/integration/test_pdf_generation_e2e.py::TestPDFGenerationBasic::test_generate_pdf_minimal_data -v
```

### Run with coverage

```bash
python -m pytest tests/integration/ --cov=api --cov=routes --cov-report=html
```

### Run with detailed output

```bash
python -m pytest tests/integration/ -vv --tb=long
```

### Run in parallel (faster)

```bash
python -m pytest tests/integration/ -n auto
```

## Test Coverage

### PDF Generation (`test_pdf_generation_e2e.py`)

- ✅ Basic PDF generation with minimal and comprehensive data
- ✅ Different template variants (modern, classic, minimal)
- ✅ Special characters and Unicode handling
- ✅ Long text content processing
- ✅ Missing required fields error handling
- ✅ Invalid input validation
- ✅ Authentication requirements
- ✅ Rate limiting headers
- ✅ Performance characteristics
- ✅ Concurrent request handling

**Test Classes:**

- `TestPDFGenerationBasic` - Core functionality
- `TestPDFGenerationEdgeCases` - Edge cases and special content
- `TestPDFGenerationAuthentication` - Auth requirements
- `TestPDFGenerationRateLimiting` - Rate limit enforcement
- `TestPDFGenerationPerformance` - Performance validation

### Resume Tailoring (`test_tailoring_e2e.py`)

- ✅ Basic tailoring with job descriptions
- ✅ Keyword extraction from job postings
- ✅ Improvement suggestions generation
- ✅ Different job types and industries
- ✅ Special characters in content
- ✅ Long text handling
- ✅ Missing job description handling
- ✅ Empty job description validation
- ✅ Authentication requirements
- ✅ Performance benchmarks

**Test Classes:**

- `TestResumeTailoringBasic` - Core functionality
- `TestResumeTailoringSpecialContent` - Unicode and long text
- `TestResumeTailoringEdgeCases` - Edge cases
- `TestResumeTailoringAuthentication` - Auth requirements
- `TestResumeTailoringRateLimiting` - Rate limit enforcement
- `TestResumeTailoringPerformance` - Performance validation

### GitHub OAuth (`test_github_oauth_e2e.py`)

- ✅ Authorization URL generation
- ✅ OAuth callback handling
- ✅ Token exchange flow
- ✅ GitHub user profile retrieval
- ✅ Connection persistence
- ✅ Token encryption and security
- ✅ Scope management
- ✅ Error handling (expired tokens, revoked access)
- ✅ Complete OAuth flow integration

**Test Classes:**

- `TestGitHubOAuthInitiation` - Authorization flow start
- `TestGitHubOAuthCallback` - Callback handling
- `TestGitHubTokenExchange` - Token exchange process
- `TestGitHubUserProfile` - User profile retrieval
- `TestGitHubConnectionManagement` - Connection CRUD
- `TestGitHubScopeHandling` - Scope management
- `TestGitHubErrorHandling` - Error scenarios
- `TestGitHubIntegrationFlow` - Complete flow

### API Key Management (`test_api_key_management_e2e.py`)

- ✅ API key creation and listing
- ✅ Key validation and authentication
- ✅ Inactive key rejection
- ✅ Invalid key handling
- ✅ Rate limiting per key
- ✅ Key deactivation and deletion
- ✅ Metadata tracking (creation time, last used)
- ✅ Key rotation
- ✅ Permission scoping

**Test Classes:**

- `TestAPIKeyCreation` - Creation and listing
- `TestAPIKeyValidation` - Validation logic
- `TestAPIKeyRateLimiting` - Per-key rate limits
- `TestAPIKeyDeactivation` - Deactivation/deletion
- `TestAPIKeyMetadata` - Tracking and info
- `TestAPIKeyRotation` - Key rotation
- `TestAPIKeyPermissions` - Permission scoping

### Template Variants (`test_variants_e2e.py`)

- ✅ Listing all available variants
- ✅ Variant metadata completeness
- ✅ Filtering by search term
- ✅ Filtering by category
- ✅ Filtering by layout
- ✅ Filtering by color theme
- ✅ Filtering by tags
- ✅ Combined multi-filter queries
- ✅ Variant selection in PDF generation
- ✅ Invalid variant handling

**Test Classes:**

- `TestVariantListing` - Listing and retrieval
- `TestVariantFiltering` - Filter capabilities
- `TestVariantInPDFGeneration` - Using variants
- `TestVariantMetadata` - Metadata validation
- `TestVariantPerformance` - Query performance
- `TestVariantAvailability` - Public access

### Error Handling (`test_error_handling_e2e.py`)

- ✅ Missing required fields
- ✅ Invalid data formats (email, phone, URL)
- ✅ Invalid data types
- ✅ Content size limitations
- ✅ Too many items in collections
- ✅ Authentication errors
- ✅ Validation error responses
- ✅ Null/empty value handling
- ✅ Error response format

**Test Classes:**

- `TestValidationErrors` - Validation failures
- `TestMissingRequiredFields` - Required field validation
- `TestInvalidDataTypes` - Type checking
- `TestContentLimitations` - Size/count limits
- `TestAuthenticationErrors` - Auth failures
- `TestErrorResponseFormat` - Error response structure
- `TestEdgeCaseErrors` - Edge case scenarios

### Rate Limiting (`test_rate_limiting_e2e.py`)

- ✅ Rate limit enforcement on PDF endpoint
- ✅ Rate limit enforcement on tailor endpoint
- ✅ Rate limit enforcement on variants endpoint
- ✅ Different rate limits per endpoint
- ✅ Rate limit headers in responses
- ✅ Per-API-key rate limiting
- ✅ Per-user rate limiting
- ✅ Rate limit reset behavior
- ✅ Health check bypass
- ✅ Rapid request handling

**Test Classes:**

- `TestPDFGenerationRateLimit` - PDF endpoint limits
- `TestTailoringRateLimit` - Tailor endpoint limits
- `TestVariantsRateLimit` - Variants endpoint limits
- `TestRateLimitedResponses` - Limit exceeded responses
- `TestDifferentRateLimitScopings` - Scope variations
- `TestRateLimitBehavior` - Limit behavior
- `TestRateLimitBypass` - Bypass scenarios
- `TestRateLimitConsistency` - Consistency checks

## Fixtures

### Database and Client Fixtures

- `test_db_engine` - In-memory SQLite database
- `test_db_session` - Database session
- `api_client` - HTTP client with test database
- `authenticated_client` - Client with valid API key
- `unauthenticated_client` - Client without API key

### User and Auth Fixtures

- `test_user` - Test user account
- `test_api_key` - API key for test user
- `github_connection` - Mock GitHub connection

### Resume Data Fixtures

- `minimal_resume_data` - Minimal valid resume
- `comprehensive_resume_data` - Complete resume with all sections
- `resume_with_special_chars` - Unicode and special characters
- `resume_with_long_text` - Very long text content

### Job Description Fixtures

- `job_description_tech` - Backend engineer job posting
- `job_description_ai` - ML engineer job posting

### Mock Fixtures

- `mock_openai_response` - Mock OpenAI API response
- `mock_anthropic_response` - Mock Anthropic API response
- `mock_github_user` - Mock GitHub user profile
- `mock_github_token_response` - Mock token exchange response

## Key Testing Scenarios

### 1. PDF Generation with Edge Cases

- Minimal resume data
- Comprehensive resume with all fields
- Unicode and special characters (é, ñ, ü, 中文, etc.)
- Very long text content
- Missing optional fields
- Invalid email/phone/URL formats
- Empty sections
- Many items in collections

### 2. Resume Tailoring with AI

- Different job descriptions
- Keyword extraction validation
- Suggestion generation
- Support for multiple AI providers
- Graceful handling of AI API failures

### 3. GitHub OAuth Integration

- Complete OAuth flow from start to finish
- Token exchange and encryption
- User profile retrieval
- Connection persistence
- CSRF protection (state parameter)
- Token refresh/rotation

### 4. Authentication & Authorization

- API key validation
- Inactive key rejection
- Per-user data isolation
- Rate limiting per API key
- Proper HTTP status codes

### 5. Error Handling

- Validation error messages
- Missing field errors
- Type validation
- Data size limits
- Proper error response format

## Performance Expectations

All integration tests should complete within:

- **PDF Generation**: < 10 seconds
- **Resume Tailoring**: < 15 seconds
- **Variant Listing**: < 2 seconds
- **OAuth Callback**: < 5 seconds
- **API Key Validation**: < 1 second

## Debugging Failed Tests

### Check test output details

```bash
pytest tests/integration/test_pdf_generation_e2e.py::TestPDFGenerationBasic::test_generate_pdf_minimal_data -vv
```

### Use pdb debugger

```bash
pytest tests/integration/ --pdb
```

### Show print statements

```bash
pytest tests/integration/ -s
```

### Check test dependencies

```bash
pytest --collect-only tests/integration/
```

## Known Limitations

1. **PDF Generation Mocking** - PDF generation requires LaTeX/texlive which is heavy. Tests may mock PDF output.
2. **AI Provider Mocking** - OpenAI/Anthropic/Gemini API calls are mocked to avoid costs and external dependencies.
3. **Rate Limiting** - Some rate limit tests may be skipped in CI environments without careful timing.
4. **OAuth State** - OAuth state parameter validation depends on database setup.

## Contributing

When adding new integration tests:

1. **Use descriptive test names** that explain what is being tested
2. **Document edge cases** in test docstrings
3. **Use appropriate fixtures** for setup/teardown
4. **Test error paths** not just happy paths
5. **Keep tests independent** - don't rely on test execution order
6. **Add parametrization** for multiple scenarios
7. **Check performance** - ensure tests complete in reasonable time

Example test:

```python
@pytest.mark.asyncio
async def test_pdf_generation_with_unicode(
    self, authenticated_client: AsyncClient, resume_with_special_chars
):
    """Test PDF generation handles Unicode characters correctly."""
    response = await authenticated_client.post(
        "/v1/render/pdf",
        json={
            "resume_data": resume_with_special_chars,
            "variant": "modern",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Integration Tests
  run: |
    cd resume-api
    python -m pytest tests/integration/ --tb=short --junit-xml=test-results.xml

- name: Upload Results
  uses: actions/upload-artifact@v2
  with:
    name: test-results
    path: test-results.xml
```

## Related Documentation

- [API Documentation](../../../API_DOCUMENTATION.md)
- [Error Codes](../ERROR_CODES.md)
- [Testing Guide](../README.md)
- [Main Configuration](../config/README.md)
