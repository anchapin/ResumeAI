# Integration Tests Quick Start Guide

## Overview
**2,941 lines of code** across **8 test modules** with **155+ test cases** covering all major Resume API endpoints.

## File Structure
```
resume-api/tests/integration/
├── conftest.py                          (520 lines) - Shared fixtures & setup
├── test_pdf_generation_e2e.py          (282 lines) - PDF rendering tests
├── test_tailoring_e2e.py               (343 lines) - Resume tailoring tests
├── test_github_oauth_e2e.py            (349 lines) - GitHub OAuth tests
├── test_api_key_management_e2e.py      (330 lines) - API key tests
├── test_variants_e2e.py                (351 lines) - Template variant tests
├── test_error_handling_e2e.py          (455 lines) - Error handling tests
├── test_rate_limiting_e2e.py           (299 lines) - Rate limiting tests
└── README.md                            (400+ lines) - Full documentation
```

## Quick Commands

### Run ALL integration tests
```bash
cd resume-api
python -m pytest tests/integration/ -v
```

### Run specific test file
```bash
# PDF generation tests
python -m pytest tests/integration/test_pdf_generation_e2e.py -v

# OAuth tests
python -m pytest tests/integration/test_github_oauth_e2e.py -v

# API key tests
python -m pytest tests/integration/test_api_key_management_e2e.py -v
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
open htmlcov/index.html
```

### Run in parallel (faster)
```bash
python -m pytest tests/integration/ -n auto
```

## Test Breakdown

### 1. PDF Generation (23 tests)
**File**: `test_pdf_generation_e2e.py`

Tests for resume PDF rendering:
- Basic PDF generation
- Different templates (modern, classic, minimal)
- Unicode & special characters
- Very long content
- Missing required fields
- API key validation
- Rate limiting
- Concurrent requests

```bash
pytest tests/integration/test_pdf_generation_e2e.py -v
```

### 2. Resume Tailoring (20 tests)
**File**: `test_tailoring_e2e.py`

Tests for AI-powered resume tailoring:
- Basic tailoring with job descriptions
- Keyword extraction
- Improvement suggestions
- Different job types
- Unicode content
- Empty/missing descriptions
- Performance benchmarks

```bash
pytest tests/integration/test_tailoring_e2e.py -v
```

### 3. GitHub OAuth (28 tests)
**File**: `test_github_oauth_e2e.py`

Tests for GitHub authentication:
- Authorization URL generation
- OAuth callback handling
- Token exchange
- User profile retrieval
- Connection management
- Token encryption
- Error handling
- Complete flow integration

```bash
pytest tests/integration/test_github_oauth_e2e.py -v
```

### 4. API Key Management (19 tests)
**File**: `test_api_key_management_e2e.py`

Tests for API key operations:
- Key creation
- Key validation
- Rate limiting per key
- Key deactivation/deletion
- Metadata tracking
- Key rotation
- Permission scoping

```bash
pytest tests/integration/test_api_key_management_e2e.py -v
```

### 5. Template Variants (20 tests)
**File**: `test_variants_e2e.py`

Tests for template management:
- Listing variants
- Filtering (search, category, layout, theme, tags)
- Combined filters
- Variant usage
- Invalid variant handling
- Public access

```bash
pytest tests/integration/test_variants_e2e.py -v
```

### 6. Error Handling (28 tests)
**File**: `test_error_handling_e2e.py`

Tests for error scenarios:
- Missing required fields
- Invalid data formats
- Invalid data types
- Content size limits
- Many items in collections
- Authentication errors
- Response format validation

```bash
pytest tests/integration/test_error_handling_e2e.py -v
```

### 7. Rate Limiting (19 tests)
**File**: `test_rate_limiting_e2e.py`

Tests for rate limit enforcement:
- Limit enforcement
- Response headers
- Per-API-key limits
- Per-user limits
- Different endpoint limits
- Rapid requests
- Health check bypass

```bash
pytest tests/integration/test_rate_limiting_e2e.py -v
```

## Key Fixtures

### Client Fixtures
```python
@pytest.mark.asyncio
async def test_something(authenticated_client):
    response = await authenticated_client.post("/v1/render/pdf", json={...})
```

- `api_client` - HTTP client with test database
- `authenticated_client` - Client with API key header
- `unauthenticated_client` - Client without API key

### Data Fixtures
```python
async def test_with_resume(minimal_resume_data):
    response = await client.post("/v1/render/pdf", 
        json={"resume_data": minimal_resume_data, "variant": "modern"})
```

- `minimal_resume_data` - Basic valid resume
- `comprehensive_resume_data` - Full resume with all fields
- `resume_with_special_chars` - Unicode content (José, Zürich, 中文, etc.)
- `resume_with_long_text` - Very long content (50KB+)

### Auth Fixtures
```python
async def test_with_api_key(test_api_key, authenticated_client):
    # authenticated_client already has valid API key
```

- `test_user` - Test user account
- `test_api_key` - Valid API key for testing
- `github_connection` - Mock GitHub connection

### Job Description Fixtures
```python
async def test_tailoring(minimal_resume_data, job_description_tech):
    response = await client.post("/v1/tailor",
        json={"resume_data": minimal_resume_data,
              "job_description": job_description_tech["description"]})
```

- `job_description_tech` - Backend engineer job posting
- `job_description_ai` - ML engineer job posting

## Common Test Patterns

### Testing PDF Generation
```python
@pytest.mark.asyncio
async def test_pdf_generation(authenticated_client, minimal_resume_data):
    """Test generating PDF resume."""
    response = await authenticated_client.post(
        "/v1/render/pdf",
        json={
            "resume_data": minimal_resume_data,
            "variant": "modern",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 0
```

### Testing Error Handling
```python
@pytest.mark.asyncio
async def test_missing_field(authenticated_client):
    """Test error when required field is missing."""
    response = await authenticated_client.post(
        "/v1/render/pdf",
        json={"resume_data": {"contact": {}, "sections": {}}, "variant": "modern"},
    )

    assert response.status_code == 400
    assert "detail" in response.json()
```

### Testing Authentication
```python
@pytest.mark.asyncio
async def test_no_auth(unauthenticated_client, minimal_resume_data):
    """Test that endpoint requires API key."""
    response = await unauthenticated_client.post(
        "/v1/render/pdf",
        json={"resume_data": minimal_resume_data, "variant": "modern"},
    )

    assert response.status_code == 401
```

## Performance Expectations

All tests should complete quickly:
- **PDF Generation**: < 10 seconds
- **Resume Tailoring**: < 15 seconds  
- **Variant Listing**: < 2 seconds
- **OAuth Callback**: < 5 seconds
- **API Key Validation**: < 1 second

**Total Test Suite**: ~ 2-3 minutes (depending on environment)

## Coverage Summary

| Area | Test Count | Status |
|------|-----------|--------|
| PDF Generation | 23 | ✅ Complete |
| Resume Tailoring | 20 | ✅ Complete |
| GitHub OAuth | 28 | ✅ Complete |
| API Key Management | 19 | ✅ Complete |
| Template Variants | 20 | ✅ Complete |
| Error Handling | 28 | ✅ Complete |
| Rate Limiting | 19 | ✅ Complete |
| **TOTAL** | **155+** | ✅ Complete |

## Setup & Installation

### Install Dependencies
```bash
cd resume-api
pip install -r requirements.txt
```

### Run Tests
```bash
# All tests
python -m pytest tests/integration/ -v

# With coverage
python -m pytest tests/integration/ --cov=api --cov=routes

# In parallel (faster)
pip install pytest-xdist
python -m pytest tests/integration/ -n auto
```

## Debugging Failed Tests

### Show detailed error output
```bash
pytest tests/integration/test_pdf_generation_e2e.py::TestPDFGenerationBasic::test_generate_pdf_minimal_data -vv
```

### Use Python debugger
```bash
pytest tests/integration/ --pdb
```

### Show print statements
```bash
pytest tests/integration/ -s
```

### List all tests without running
```bash
pytest --collect-only tests/integration/
```

## CI/CD Integration

Ready for GitHub Actions, GitLab CI, or Jenkins:

```yaml
# .github/workflows/integration-tests.yml
- name: Run Integration Tests
  run: |
    cd resume-api
    python -m pytest tests/integration/ --tb=short -v
```

## Test Data

### Resume Data Included
- ✅ Minimal valid resume (name + email)
- ✅ Comprehensive resume (all sections)
- ✅ Unicode resume (José, Zürich, 中文)
- ✅ Long text resume (50KB+ content)

### Job Descriptions Included
- ✅ Tech job description (backend engineer)
- ✅ AI job description (ML engineer)

### Mock Data Included
- ✅ GitHub user profiles
- ✅ GitHub token responses
- ✅ OpenAI responses
- ✅ Anthropic responses

## Next Steps

1. **Run the tests**
   ```bash
   cd resume-api
   python -m pytest tests/integration/ -v
   ```

2. **Check coverage**
   ```bash
   python -m pytest tests/integration/ --cov=api --cov-report=html
   ```

3. **Add to CI/CD**
   - Copy test execution to your pipeline
   - Set up coverage reporting
   - Enable parallel execution

4. **Monitor performance**
   - Add benchmark markers
   - Compare against baseline
   - Track regressions

## Documentation

- **Full Docs**: See `tests/integration/README.md`
- **Implementation**: See `INTEGRATION_TESTS_IMPLEMENTATION.md`
- **API Docs**: See `API_DOCUMENTATION.md`

## Support

For issues or questions:
1. Check test output with `-vv` flag
2. Review test docstrings for expected behavior
3. Check `conftest.py` for fixture definitions
4. See `README.md` for detailed documentation

## Stats

- **Total Lines of Code**: 2,941
- **Total Test Cases**: 155+
- **Test Modules**: 8
- **Test Classes**: 50+
- **Fixture Functions**: 25+
- **Coverage Areas**: 7 major features

**Status**: ✅ Ready for use and CI/CD integration
