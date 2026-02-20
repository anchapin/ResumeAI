# Resume API

A FastAPI service for generating and tailoring professional resumes using LaTeX templates and AI, with user authentication and GitHub OAuth integration.

## Overview

This service provides RESTful endpoints for:
- Generating PDF resumes from JSON/YAML data using LaTeX templates
- AI-powered resume tailoring to match job descriptions
- Managing multiple resume template variants
- User account management with JWT authentication
- GitHub OAuth integration for importing projects and profiles

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

**Important:** GitHub integration uses OAuth authentication only. CLI mode is deprecated.

#### Authentication Endpoints
- `POST /api/auth/register` - Register a new user account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh expired access token
- `POST /api/auth/logout` - Logout (invalidate token)

#### GitHub OAuth Endpoints
- `GET /github/connect` - Initiate GitHub OAuth authorization
  - Requires: `Authorization: Bearer {jwt_token}` header
  - Returns: 302 redirect to GitHub authorization URL
- `GET /github/callback` - Handle GitHub OAuth callback
  - Query params: `code` (authorization code), `state` (CSRF protection)
  - Returns: 302 redirect to frontend with status
- `DELETE /github/disconnect` - Disconnect GitHub account
  - Requires: `Authorization: Bearer {jwt_token}` header
  - Returns: 204 No Content

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
- `auth_mode`: Authentication mode (always "oauth" for production)
- `github_username`: GitHub username if connected, null otherwise
- `message`: Optional message providing additional context

**Note:** CLI mode is deprecated and will be removed in a future release. All deployments should use OAuth mode.

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

The service supports GitHub integration for importing projects and profiles using OAuth authentication.

### Setting Up GitHub OAuth (Required for Production)

1. **Create a GitHub OAuth App:**
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Application name: `ResumeAI`
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL: `https://api.yourdomain.com/github/callback`
   - Click "Register application"
   - Copy the Client ID
   - Click "Generate a new client secret"
   - Copy the Client Secret

2. **Configure Environment Variables:**
```bash
# In resume-api/.env
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_AUTH_MODE=oauth  # OAuth mode only (CLI mode deprecated)
FRONTEND_URL=https://yourdomain.com  # Or http://localhost:5173 for development
```

3. **Configure JWT Secret:**
```bash
# Generate a secure JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Add to resume-api/.env
JWT_SECRET=<generated-secret>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### OAuth Flow

```
1. User clicks "Connect GitHub" in frontend
   └─ Frontend calls POST /api/auth/login or /api/auth/register
      └─ Returns JWT access token

2. Frontend calls GET /github/connect (with JWT in Authorization header)
   └─ Backend generates OAuth state and stores in database
   └─ Returns 302 redirect to GitHub

3. User authorizes the application on GitHub
   └─ User is redirected to /github/callback with code

4. Backend handles callback
   └─ Validates OAuth state
   └─ Exchanges code for access token
   └─ Fetches GitHub user profile
   └─ Encrypts and stores token in database
   └─ Redirects to frontend with success status
```

### OAuth Scopes

ResumeAI requests the following GitHub OAuth scopes:
- `user:email`: Access to user email addresses
- `read:user`: Access to user profile information

These scopes allow the application to:
- Fetch user profile data (name, username, bio)
- Import public repositories and projects
- Display GitHub activity in resume

### Security Features

- **State Parameter:** Cryptographically secure random state prevents CSRF attacks
- **Token Encryption:** Access tokens are encrypted using Fernet symmetric encryption
- **Database Storage:** Tokens are stored in SQLite database and never exposed to clients
- **Revocation:** Users can disconnect their GitHub account at any time

### Local Development Setup

For local development, you can use a GitHub OAuth App with localhost callback:

```bash
# In GitHub OAuth App settings:
Homepage URL: http://localhost:5173
Authorization callback URL: http://127.0.0.1:8000/github/callback

# In resume-api/.env:
GITHUB_CLIENT_ID=Iv1.dev_client_id_here
GITHUB_CLIENT_SECRET=dev_client_secret_here
GITHUB_AUTH_MODE=oauth
FRONTEND_URL=http://localhost:5173
```

### Deprecated CLI Mode

**CLI mode is deprecated and will be removed in a future release.**

Previous versions supported GitHub CLI authentication for development. This mode has been deprecated due to:
- Security concerns (server-side CLI access)
- Limited scalability (single-user mode)
- Incompatibility with multi-tenant architecture

All deployments should use OAuth mode. If you're still using CLI mode, migrate to OAuth by:
1. Creating a GitHub OAuth App (see above)
2. Setting `GITHUB_AUTH_MODE=oauth`
3. Configuring environment variables

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
