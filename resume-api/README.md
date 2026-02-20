# Resume API

A FastAPI service for generating and tailoring professional resumes using LaTeX templates and AI.

## Overview

This service provides RESTful endpoints for:
- Generating PDF resumes from JSON/YAML data using LaTeX templates
- AI-powered resume tailoring to match job descriptions
- Managing multiple resume template variants

## Project Structure

```
resume-api/
├── api/                # FastAPI routes and models
│   ├── __init__.py
│   ├── models.py       # Pydantic request/response models
│   └── routes.py       # API endpoint definitions
├── config/             # Configuration management
├── lib/                # Core resume generation library
│   ├── cli/            # Resume CLI functionality
│   │   ├── generator.py    # PDF generation
│   │   ├── tailorer.py     # AI-powered tailoring
│   │   └── variants.py     # Variant management
│   └── utils/          # Utility functions
│       └── ai.py       # AI integration
├── templates/           # LaTeX resume templates
│   └── base/           # Base template
│       ├── main.tex
│       └── metadata.yaml
├── main.py             # FastAPI application entry point
├── requirements.txt    # Python dependencies
└── Dockerfile          # Docker configuration
```

## Installation

### Prerequisites

- Python 3.11+
- LaTeX (TeX Live with xelatex)
  - Ubuntu/Debian: `sudo apt-get install texlive-xetex`
  - macOS: `brew install mactex`
  - Or use the Docker image (recommended)

### Local Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Docker Setup

Build and run with Docker:

```bash
docker build -t resume-api .
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key_here \
  resume-api
```

## API Endpoints

### Health Check
- `GET /health` - Check API health status

### GitHub Integration

#### Get GitHub Status
- `GET /github/status` - Check GitHub connection status

Response:
```json
{
  "connection_status": "connected",
  "auth_mode": "oauth",
  "github_username": "username",
  "message": null
}
```

**Response Fields:**
- `connection_status`: Connection status ("connected", "not_connected", or "error")
- `auth_mode`: Authentication mode ("oauth" or "cli")
- `github_username`: GitHub username if connected, null otherwise
- `message`: Optional message providing additional context

**Authentication Modes:**
- `oauth`: Checks the database for OAuth connection (recommended for production)
- `cli`: Checks if gh CLI is authenticated (deprecated, will be removed)

**Note:** CLI mode is deprecated. Please use OAuth mode for all deployments.

#### GitHub OAuth Flow
- `GET /github/connect` - Initiate GitHub OAuth authorization
- `GET /github/callback` - Handle GitHub OAuth callback
- `DELETE /github/disconnect` - Disconnect GitHub account

### PDF Generation
- `POST /v1/render/pdf` - Generate PDF resume from JSON data

Request body:
```json
{
  "resume_data": {
    "basics": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "work": [...],
    "education": [...]
  },
  "variant": "base"
}
```

### Resume Tailoring
- `POST /v1/tailor` - Tailor resume to job description

Request body:
```json
{
  "resume_data": {...},
  "job_description": "Job description text...",
  "company_name": "Company Name",
  "job_title": "Job Title"
}
```

### List Variants
- `GET /v1/variants` - List available resume templates

## AI Configuration

The service supports multiple AI providers:

### OpenAI (Default)
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Anthropic Claude
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Google Gemini
```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
```

## GitHub OAuth Configuration

The service supports GitHub integration for importing projects and profiles.

### GitHub OAuth (Recommended for Production)

1. Create a GitHub OAuth App at https://github.com/settings/developers
   - Application name: ResumeAI
   - Homepage URL: https://yourdomain.com
   - Authorization callback URL: https://api.yourdomain.com/github/callback

2. Configure environment variables:
```bash
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_AUTH_MODE=oauth  # Recommended for production
```

### GitHub CLI (Deprecated)

For local development, you can use GitHub CLI authentication:

```bash
GITHUB_AUTH_MODE=cli  # Deprecated, will be removed
```

**Note:** CLI mode is deprecated and will be removed in a future release. Please migrate to OAuth mode.

### Environment-Specific Defaults

- **Production**: `oauth` (default)
- **Development**: `cli` (for local testing without OAuth setup)

See `.env.example` for full configuration options.

## Development

### Run with hot reload:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Run tests:
```bash
pytest
```

### Format code:
```bash
black .
flake8 .
mypy .
```

## Adding New Templates

1. Create a new directory in `templates/`:
```bash
mkdir templates/my-template
```

2. Add `main.tex` with LaTeX template code

3. Add `metadata.yaml`:
```yaml
name: my-template
display_name: My Custom Template
description: Description of the template
format: latex
output_formats:
  - pdf
```

4. The template will be automatically available via `/v1/variants`

## License

MIT License - See LICENSE file for details
