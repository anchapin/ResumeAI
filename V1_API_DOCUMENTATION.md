# ResumeAI v1 API Documentation

This document describes the v1 API endpoints for the ResumeAI service.

## Overview

The v1 API provides three main endpoints for resume generation, tailoring, and template management:

1. `POST /v1/render/pdf` - Generate a PDF from resume data
2. `POST /v1/tailor` - Tailor resume data for a specific job description
3. `GET /v1/variants` - Get list of available resume templates/variants

## Base URL

```
http://localhost:8000
```

## Endpoints

### 1. Generate PDF

Generate a professional PDF from resume data using resume-cli.

**Endpoint:** `POST /v1/render/pdf`

**Request Body:**
```json
{
  "resume_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "role": "Senior Software Engineer",
    "experience": [
      {
        "id": "1",
        "company": "Tech Corp",
        "role": "Software Engineer",
        "startDate": "2020-01",
        "endDate": "2022-12",
        "current": false,
        "description": "Built amazing features",
        "tags": ["Python", "React", "AWS"]
      }
    ]
  },
  "variant": "professional"
}
```

**Parameters:**
- `resume_data` (required): Resume data matching the resume.yaml schema
- `variant` (optional, default: "base"): Template variant to use

**Response:**
- Content-Type: `application/pdf`
- Body: PDF binary data
- Headers: `Content-Disposition: attachment; filename=resume_{variant}.pdf`

**Example using curl:**
```bash
curl -X POST http://localhost:8000/v1/render/pdf \
  -H "Content-Type: application/json" \
  -d @resume.json \
  --output resume.pdf
```

---

### 2. Tailor Resume

Tailor resume data for a specific job description using AI.

**Endpoint:** `POST /v1/tailor`

**Request Body:**
```json
{
  "resume_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "role": "Senior Software Engineer",
    "experience": [...]
  },
  "job_description": "We are looking for a Senior Software Engineer with experience in Python, React, and AWS..."
}
```

**Parameters:**
- `resume_data` (required): Resume data to tailor
- `job_description` (required): Job description to tailor for

**Response:**
- Content-Type: `application/json`
- Body: Modified resume_data with tailoring annotations

**Example Response:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "_tailored": true,
  "_job_description_preview": "We are looking for a Senior Software Engineer...",
  "experience": [
    {
      "id": "1",
      "company": "Tech Corp",
      "role": "Software Engineer",
      "_tailored": true,
      "_relevance_score": 0.85,
      ...
    }
  ]
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:8000/v1/tailor \
  -H "Content-Type: application/json" \
  -d @tailor_request.json \
  -o tailored_resume.json
```

---

### 3. Get Variants

Get a list of available resume template variants.

**Endpoint:** `GET /v1/variants`

**Request:**
No parameters required.

**Response:**
- Content-Type: `application/json`
- Body: List of available variants

**Example Response:**
```json
{
  "variants": [
    "base",
    "backend",
    "creative",
    "minimal",
    "professional",
    "startup"
  ]
}
```

**Example using curl:**
```bash
curl -X GET http://localhost:8000/v1/variants
```

---

## Available Template Variants

The following template variants are currently available:

- **base**: Standard resume template
- **backend**: Optimized for backend engineering roles
- **creative**: Design-focused template with visual elements
- **minimal**: Clean, minimalist design
- **professional**: Traditional professional format
- **startup**: Modern, startup-friendly design

## Error Responses

All endpoints return HTTP status codes and error messages in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `500`: Internal server error

## Notes

### Current Implementation Status

The v1 API endpoints are currently in a **mock implementation** phase:

1. **PDF Generation**: Currently returns mock PDF data. The production implementation will:
   - Dump resume_data to temporary resume.yaml
   - Invoke resume-cli via subprocess
   - Read actual generated PDF bytes

2. **Resume Tailoring**: Currently adds mock tailoring annotations. The production implementation will:
   - Use resume-cli's AI generator with OpenAI/Claude/Gemini
   - Extract keywords from job description
   - Reorder bullets to prioritize relevant experience
   - Generate tailored bullet points

3. **Template Variants**: Currently returns a static list. The production implementation will:
   - Read variants from resume-cli config/templates directory
   - Dynamically discover available templates
   - Support custom template uploads

### Migration from Legacy Endpoints

The following legacy endpoints are still available for backward compatibility:

- `POST /generate/preview` - Generate markdown preview
- `POST /generate/pdf` - Generate PDF (legacy format)
- `POST /generate/package` - Generate full package

However, new integrations should use the v1 endpoints for consistency and future compatibility.

## Testing

Run the test suite to verify all endpoints:

```bash
# Run all tests
python -m pytest tests/test_v1_endpoints.py -v

# Run specific test
python -m pytest tests/test_v1_endpoints.py::TestV1Endpoints::test_v1_render_pdf_success -v
```

## Development

To run the server locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python server.py
```

The server will start on port 8000 (or the PORT environment variable if set).
