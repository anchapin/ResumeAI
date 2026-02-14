# API Integration Tests

This directory contains comprehensive integration tests for the Resume API endpoints.

## Test Structure

The tests are organized into the following categories:

- **Health Endpoint Tests**: Verify the health check endpoint works correctly
- **Render PDF Endpoint Tests**: Test PDF generation functionality with various inputs
- **Tailor Endpoint Tests**: Test resume tailoring functionality
- **Variants Endpoint Tests**: Test listing available resume variants
- **Authentication & Authorization Tests**: Verify API key validation
- **Rate Limiting Tests**: Test rate limiting functionality
- **Data Validation Tests**: Test input validation and error handling

## Running Tests

To run the integration tests:

```bash
# From the worktree directory
cd "$(dirname "$0")"

# Install dependencies if needed
pip install pytest fastapi requests python-multipart

# Run all integration tests
pytest tests/api_integration_tests/

# Run with verbose output
pytest tests/api_integration_tests/ -v

# Run specific test file
pytest tests/api_integration_tests/test_api_endpoints.py
```

## Test Coverage

The integration tests cover:

### Success Cases
- Valid API requests with proper data
- Different template variants
- Proper response formats

### Error Cases
- Invalid API keys
- Missing required fields
- Malformed JSON requests
- Server errors

### Authentication & Authorization
- Valid API key verification
- Invalid API key rejection
- Missing API key handling
- Master key functionality

### Data Validation
- Input sanitization
- Schema validation
- Error response formatting

### Edge Cases
- Empty request bodies
- Very large payloads
- Special characters in inputs
- Invalid enum values

## Environment Variables

The tests use the following environment variables:

- `TEST_API_KEY`: API key for testing (defaults to "valid-test-key")
- `MASTER_API_KEY`: Master API key for testing (defaults to "master-key")

## Dependencies

The tests require:
- `pytest`
- `fastapi`
- `requests`
- `python-multipart`
- `slowapi` (for rate limiting)
- `pydantic`
- `pydantic-settings`

## Test Philosophy

Each test follows the Arrange-Act-Assert pattern:
1. **Arrange**: Set up test data and preconditions
2. **Act**: Execute the API call
3. **Assert**: Verify the expected outcome

Tests are designed to be:
- Independent: Each test can run in isolation
- Deterministic: Same inputs produce same outputs
- Fast: Minimal external dependencies
- Clear: Descriptive names and assertions