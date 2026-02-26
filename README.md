<div align="center">
<img width="1200" height="475" alt="ResumeAI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ResumeAI - AI-Powered Resume Builder

[![Frontend CI](https://github.com/anchapin/ResumeAI/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/anchapin/ResumeAI/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/backend-ci.yml)
[![PR Check](https://github.com/anchapin/ResumeAI/actions/workflows/pr-check.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/pr-check.yml)
[![Docker Build](https://github.com/anchapin/ResumeAI/actions/workflows/docker.yml/badge.svg)](https://github.com/anchapin/ResumeAI/actions/workflows/docker.yml)
[![Coverage Status](https://img.shields.io/badge/coverage-60%25%2B-green)](./COVERAGE_GUIDE.md)

ResumeAI is a full-stack SaaS application that helps users create professional resumes with AI-powered enhancements. Build, customize, and export resumes in PDF format with job-specific tailoring.

## Features

- 📝 **Visual Resume Editor** - User-friendly interface for editing resume content
- 🤖 **AI-Powered Tailoring** - Automatically customize resumes for specific job postings
- 📄 **PDF Export** - Generate professional PDF resumes
- 🎨 **Template System** - Multiple resume templates to choose from
- 💼 **Job Applications** - Track and manage job applications
- 📦 **Resume Packages** - Generate tailored resume packages

## Architecture

ResumeAI consists of two main components:

| Component | Technology                   | Description                     |
| --------- | ---------------------------- | ------------------------------- |
| Frontend  | React 19 + TypeScript + Vite | Single Page Application         |
| Backend   | FastAPI + Python             | REST API with resume generation |

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

# GitHub OAuth Configuration (REQUIRED)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

#### GitHub OAuth Setup

1. **Register a GitHub OAuth App**:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in the application details:
     - Application name: `ResumeAI`
     - Homepage URL: `http://localhost:5173` (for development)
     - Application description: `Resume builder with GitHub integration`
     - Authorization callback URL: `http://localhost:8000/github/callback`
   - Copy the **Client ID** and **Client Secret**

2. **Configure Environment Variables**:
   - Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to your `.env` file
   - Set `GITHUB_REDIRECT_URI` to match your deployment environment

3. **Frontend OAuth Configuration** (.env.local):
   ```bash
   # Backend API URL
   VITE_API_URL=http://127.0.0.1:8000
   ```

## GitHub Integration

ResumeAI uses GitHub OAuth for secure authentication and integration:

### OAuth Flow

1. **User clicks "Connect GitHub"** in the settings or sync dialog
2. **Frontend requests OAuth URL** from backend (`GET /github/connect`)
3. **User is redirected to GitHub** to authorize the application
4. **GitHub redirects back** to the callback endpoint with authorization code
5. **Backend exchanges code for access token** (`GET /github/callback`)
6. **Token is encrypted and stored** in the database
7. **User can now sync GitHub projects** and manage their repositories

### API Endpoints

- `GET /github/connect` - Initiate OAuth authorization flow
- `GET /github/callback` - Handle OAuth callback from GitHub
- `GET /github/status` - Check current GitHub connection status
- `GET /github/repositories` - Fetch user's GitHub repositories
- `DELETE /github/disconnect` - Disconnect GitHub account and revoke token

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## API Documentation

Once the backend is running:

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Testing

ResumeAI maintains **60% minimum code coverage** for both frontend and backend. Coverage is automatically checked on all PRs.

### Running Tests

```bash
# Frontend tests
npm test                    # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report

# Backend tests (from project root)
cd resume-api
python -m pytest                                    # Run all tests
python -m pytest --cov=resume-api --cov-report=html  # Run with coverage
```

For detailed coverage information and how to improve test coverage, see [COVERAGE_GUIDE.md](COVERAGE_GUIDE.md).

## Development Commands

### Frontend

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Start development server          |
| `npm run build`         | Build for production              |
| `npm run preview`       | Preview production build          |
| `npm test`              | Run tests                         |
| `npm run test:coverage` | Run tests with coverage report    |
| `npm run docs`          | Generate TypeScript documentation |

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

### GitHub Connection Issues

If you see errors connecting to GitHub:

1. **Verify GitHub OAuth App credentials**:
   - Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correctly set
   - Ensure your OAuth App exists at https://github.com/settings/developers

2. **Check callback URL**:
   - Make sure `GITHUB_REDIRECT_URI` in backend `.env` matches the authorization callback URL in your GitHub OAuth App

3. **Clear browser session**:
   - Clear browser cookies and localStorage
   - Try connecting again

4. **Check backend logs** for detailed error messages:
   ```bash
   docker logs <container_id>
   ```

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

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear cache
rm -rf dist
npm run build
```

### CLI Authentication (Deprecated)

⚠️ **DEPRECATED**: The GitHub CLI authentication mode has been deprecated and will be removed in a future version. Please use OAuth instead.

If you see warnings about CLI mode:

1. Update to the latest version
2. Use OAuth for authentication
3. See the GitHub Integration section above for setup instructions

## License

MIT License - See [LICENSE](LICENSE) for details.

## Resources

- [CLAUDE.md](CLAUDE.md) - Detailed developer documentation
- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Frontend deployment guide
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [resume-api/README.md](resume-api/README.md) - Backend documentation
