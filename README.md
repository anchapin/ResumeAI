<div align="center">
<img width="1200" height="475" alt="ResumeAI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ResumeAI - AI-Powered Resume Builder

[![Frontend CI](https://github.com/anchapin/ResumeAI/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/anchapin/ResumeAI/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/backend-ci.yml)
[![PR Check](https://github.com/anchapin/ResumeAI/actions/workflows/pr-check.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/pr-check.yml)
[![Docker Build](https://github.com/anchapin/ResumeAI/actions/workflows/docker.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/docker.yml)

ResumeAI is a full-stack SaaS application that helps users create professional resumes with AI-powered enhancements. Build, customize, and export resumes in PDF format with job-specific tailoring.

## Features

- 📝 **Visual Resume Editor** - User-friendly interface for editing resume content
- 🤖 **AI-Powered Tailoring** - Automatically customize resumes for specific job postings
- 📄 **PDF Export** - Generate professional PDF resumes
- 🎨 **Template System** - Multiple resume templates to choose from
- 💼 **Job Applications** - Track and manage job applications
- 📦 **Resume Packages** - Generate tailored resume packages
- 🔐 **GitHub OAuth Integration** - Secure authentication for importing GitHub projects
- 👥 **User Accounts** - JWT-based authentication with account management

## Architecture

ResumeAI consists of two main components:

| Component | Technology | Description |
|-----------|------------|-------------|
| Frontend | React 19 + TypeScript + Vite | Single Page Application |
| Backend | FastAPI + Python | REST API with resume generation |

For detailed architecture documentation, see [CLAUDE.md](CLAUDE.md).

## Prerequisites

Before running ResumeAI, ensure you have the following installed:

- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Python**: 3.11 or 3.12 (Python 3.14 is NOT supported due to PyMuPDF compatibility)
- **LaTeX** - Required for PDF generation
  - macOS: `brew install texlive`
  - Ubuntu: `sudo apt-get install texlive-latex-base`
  - Windows: [TeX Live](https://www.tug.org/texlive/)
- **Docker** (optional) - For containerized deployment

## Installation

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/anchapin/ResumeAI.git
cd ResumeAI

# Install dependencies
npm install

# Create local environment file
cp .env.example .env.local

# Configure environment variables
# Edit .env.local and add your API keys (see Configuration section)

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

```bash
# Navigate to API directory
cd resume-api

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Configure environment variables
# Edit .env and add your API keys

# Start the API server
python main.py
```

The API will be available at `http://127.0.0.1:8000`

### Docker Setup

```bash
# Build and run the backend container
cd resume-api
docker-compose up

# Or build manually
docker build -t resume-api:latest .
docker run -p 8000:8000 resume-api:latest
```

## Configuration

### Frontend (.env.local)

```bash
# API Configuration
VITE_API_URL=http://127.0.0.1:8000

# AI Provider (optional - uses default if not set)
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub OAuth (optional - for development only)
# GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxxxx
```

### Backend (resume-api/.env)

```bash
# AI Configuration
AI_PROVIDER=openai  # Options: openai, claude, gemini
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GEMINI_API_KEY=...

# API Authentication
MASTER_API_KEY=rai_your_master_api_key_here
REQUIRE_API_KEY=true  # Set to false for development

# JWT Configuration (required for user accounts and GitHub OAuth)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# GitHub OAuth Configuration (required for GitHub integration)
# Create OAuth App at https://github.com/settings/developers
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_AUTH_MODE=oauth  # Only OAuth mode is supported (CLI mode deprecated)

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

## API Documentation

Once the backend is running:

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Development Commands

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run docs` | Generate TypeScript documentation |

### Backend

```bash
cd resume-api

# Run development server
python main.py

# Run tests
pytest

# Test specific module
python -m pytest tests/test_validation.py
```

## Deployment

### Frontend (Vercel)

The frontend is deployed to Vercel. See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed instructions.

Quick deploy:
```bash
npm install -g vercel
vercel --prod
```

### Backend (Google Cloud Run)

The backend can be deployed to Google Cloud Run. See [resume-api/CLOUDRUN_DEPLOYMENT.md](resume-api/CLOUDRUN_DEPLOYMENT.md) for instructions.

## Project Structure

```
ResumeAI/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── types.ts           # TypeScript types
│   └── App.tsx            # Main app component
├── resume-api/            # FastAPI backend
│   ├── api/               # API routes and models
│   ├── config/            # Configuration
│   ├── lib/               # CLI integration
│   ├── templates/         # Resume templates
│   ├── main.py            # FastAPI entry point
│   └── Dockerfile         # Container configuration
├── tests/                 # Frontend tests
├── docs/                  # Generated documentation
├── CLAUDE.md              # Developer documentation
└── package.json           # Node.js configuration
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit them
3. Push to the branch: `git push origin feature/your-feature`
4. Create a Pull Request

See [CLAUDE.md](CLAUDE.md) for detailed Git workflow guidelines.

## Troubleshooting

### PDF Generation Fails

Ensure LaTeX is installed:
```bash
# macOS
brew install texlive

# Ubuntu
sudo apt-get install texlive-latex-base
```

### API Connection Issues

1. Verify the backend is running: `curl http://127.0.0.1:8000/health`
2. Check CORS settings in backend
3. Ensure `VITE_API_URL` is correct in frontend `.env.local`

### GitHub OAuth Issues

**OAuth Callback Fails:**
1. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set correctly
2. Check that the callback URL in your GitHub OAuth app matches: `https://api.yourdomain.com/github/callback`
3. Ensure `GITHUB_AUTH_MODE=oauth` is set in backend `.env`

**"Invalid State" Error:**
1. Clear browser cookies and try again
2. Ensure the frontend URL matches the `FRONTEND_URL` setting in backend
3. Check backend logs for OAuth state validation errors

**GitHub Connection Status Shows "Not Connected":**
1. Verify user is logged in (check JWT token in localStorage)
2. Check `/github/status` endpoint response
3. Ensure JWT secret is consistent across all deployments

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear cache
rm -rf dist
npm run build
```

## License

MIT License - See [LICENSE](LICENSE) for details.

## Resources

- [CLAUDE.md](CLAUDE.md) - Detailed developer documentation
- [SETUP.md](SETUP.md) - Local development setup guide
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [resume-api/README.md](resume-api/README.md) - Backend documentation
- [resume-api/CLOUDRUN_DEPLOYMENT.md](resume-api/CLOUDRUN_DEPLOYMENT.md) - Backend deployment guide

## GitHub OAuth Integration

ResumeAI uses GitHub OAuth for secure authentication when importing GitHub projects and profiles. The OAuth flow provides:

- Secure, industry-standard authentication
- User account management with JWT tokens
- Encrypted token storage in the database
- Fine-grained permission control via OAuth scopes

### OAuth Flow Overview

```
1. User clicks "Connect GitHub" in frontend
2. Frontend calls POST /api/auth/register or /api/auth/login to get JWT
3. Frontend calls GET /github/connect (with JWT in Authorization header)
4. Backend generates OAuth state and redirects to GitHub
5. User authorizes the application on GitHub
6. GitHub redirects to /github/callback with code
7. Backend exchanges code for access token
8. Backend fetches GitHub user profile
9. Backend encrypts and stores token in database
10. Backend redirects to frontend with success status
```

### Setting Up GitHub OAuth

1. **Create a GitHub OAuth App:**
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Application name: `ResumeAI`
   - Homepage URL: `https://yourdomain.com` (or `http://localhost:5173` for dev)
   - Authorization callback URL: `https://api.yourdomain.com/github/callback`
   - Copy the Client ID and generate a Client Secret

2. **Configure Environment Variables:**
   ```bash
   # In resume-api/.env
   GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxxxx
   GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GITHUB_AUTH_MODE=oauth
   FRONTEND_URL=http://localhost:5173  # or your production frontend URL
   ```

3. **Configure JWT Secret:**
   ```bash
   # Generate a secure JWT secret
   python -c "import secrets; print(secrets.token_urlsafe(32))"

   # Add to resume-api/.env
   JWT_SECRET=<generated-secret>
   ```

### OAuth Scopes

ResumeAI requests the following GitHub OAuth scopes:
- `read:user`: Access to user profile information
- `user:email`: Access to user email addresses

These scopes allow the application to:
- Fetch user profile data (name, username, bio)
- Import public repositories and projects
- Display GitHub activity in resume

### Security Notes

- Access tokens are encrypted using Fernet symmetric encryption before storage
- OAuth state parameter prevents CSRF attacks
- Tokens are stored in the database and never exposed to clients
- Users can disconnect their GitHub account at any time, revoking access
