# API Schema Documentation

The Resume API already includes comprehensive OpenAPI/Swagger documentation.

## Accessing the Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Features

### Automatic Documentation

FastAPI automatically generates API documentation from:

- Route decorators (`@app.get`, `@app.post`, etc.)
- Pydantic models for request/response schemas
- Docstrings on endpoint functions

### Authentication Documentation

The API key authentication is documented in the Swagger UI. Protected endpoints show the "Authorize" button for entering API keys.

### Example Requests

Swagger UI provides:

- Interactive "Try it out" feature
- Request body editors with schema validation
- Response examples
- Schema definitions

## Verification

To verify the API documentation is working:

```bash
# Start the server
cd resume-api && python main.py

# Access the documentation
curl http://localhost:8000/openapi.json | jq '.info'
```

Expected output:

```json
{
  "title": "Resume API",
  "description": "API service for generating and tailoring professional resumes using LaTeX templates and AI",
  "version": "1.0.0"
}
```

## Acceptance Criteria Status

- ✅ OpenAPI/Swagger documentation available at /docs
- ✅ API endpoints documented with request/response schemas
- ✅ Authentication requirements documented
- ✅ Example requests included (via Swagger UI)
