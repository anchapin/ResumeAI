# ResumeAI Local Development Setup

A comprehensive guide to setting up and running ResumeAI locally for development.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
- [Detailed Installation](#detailed-installation)
- [Verification & Health Checks](#verification--health-checks)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Architecture Overview](#architecture-overview)

## System Requirements

- **Node.js**: 18+ (check with `node --version`)
- **Python**: 3.11 or 3.12 (3.14 is NOT supported due to PyMuPDF compatibility)
  - Check with `python3 --version`
- **LaTeX**: Required for PDF generation
  - **Ubuntu/Debian**: `sudo apt-get install texlive-latex-base`
  - **Fedora/RHEL**: `sudo dnf install texlive-scheme-full`
  - **macOS**: `brew install mactex`
  - Verify: `pdflatex --version`
- **Git**: For version control and creating feature branches
- **Make**: For using Makefile commands (optional, but recommended)

## Quick Start

The fastest way to get everything running:

```bash
# 1. Clone/navigate to project
cd ResumeAI

# 2. Install all dependencies
make install

# 3. Start the development servers
make start

# 4. Verify everything is working
make health
```

Then open your browser:

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## Detailed Installation

### Prerequisites Check

Verify you have all required tools:

```bash
# Check Node.js (need v18+)
node --version

# Check Python (need 3.11 or 3.12)
python3 --version

# Check LaTeX (need pdflatex)
pdflatex --version

# Check Git
git --version

# Check Make (optional)
make --version
```

### Step 1: Frontend Setup

```bash
# Install Node dependencies
npm install

# Create environment file
cp .env.example .env.local

# (Optional) Configure API endpoint if not using localhost:8000
# Edit .env.local and update VITE_API_URL if needed
```

**Environment file** (`.env.local`):

```bash
VITE_API_URL=http://127.0.0.1:8000
GEMINI_API_KEY=your_gemini_api_key_here  # Optional: only if using Gemini
```

### Step 2: Backend Setup

```bash
cd resume-api

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip and install dependencies
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env with your configuration (see below)
```

**Environment file** (`.env`):

```bash
# Server configuration
DEBUG=false
PORT=8000
HOST=0.0.0.0

# API Authentication (disabled for local development)
REQUIRE_API_KEY=false
MASTER_API_KEY=rai_dev_key

# Rate limiting (disabled for local development)
ENABLE_RATE_LIMITING=false

# AI Configuration (optional)
AI_PROVIDER=openai  # Options: openai, claude, gemini
# OPENAI_API_KEY=sk_...       # Optional
# ANTHROPIC_API_KEY=sk-...    # Optional
# GEMINI_API_KEY=...          # Optional
```

### Step 3: Verify Installation

```bash
# Frontend dependencies
npm list | head -20

# Backend dependencies (from resume-api/)
source venv/bin/activate
pip list | grep -E "(fastapi|pydantic|anthropic)"
```

## Starting the Development Servers

### Using Make (Recommended)

```bash
# Start both servers
make start

# View health status
make health

# View logs
make logs

# Stop both servers
make stop

# Restart both servers
make restart
```

### Manual Start

```bash
# Terminal 1: Backend
cd resume-api
source venv/bin/activate
python main.py

# Terminal 2: Frontend
cd ResumeAI
npm run dev
```

### Docker (Optional)

```bash
# Build and run with Docker
cd resume-api
docker build -t resume-api:latest .
docker run -p 8000:8000 resume-api:latest

# Or use docker-compose
docker-compose up
```

## Verification & Health Checks

### Quick Health Check

```bash
# Comprehensive health check
make health

# Check specific services
curl http://localhost:8000/api/v1/health      # Backend
curl http://localhost:3000              # Frontend
curl http://localhost:8000/docs         # API documentation
```

### Expected Output

**Backend Health Check** (should return JSON):

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

**Frontend** (should load HTML):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>ResumeAI SaaS</title>
    ...
  </head>
</html>
```

## Development Workflow

### Common Development Tasks

```bash
# Start development with auto-reload
make dev

# Run tests
make test              # All tests
make test-frontend     # Frontend only
make test-backend      # Backend only

# Format code
make format            # Format frontend + backend

# Lint code
make lint              # Lint frontend + backend

# View logs
make logs              # Both services
make logs-backend      # Backend only (follow with -f for tail)
make logs-frontend     # Frontend only

# Clean build artifacts
make clean
```

### Hot Reload

Both frontend and backend support hot reload during development:

- **Frontend**: Vite automatically reloads on file changes (HMR enabled)
- **Backend**: `python main.py` uses debugger auto-reload if available
  - For manual reload, stop and restart the server
  - Or use `python -m uvicorn main:app --reload` for auto-reload

### Adding AI API Keys

To enable AI features (resume tailoring, cover letter generation):

1. **OpenAI (GPT-4)**:

   ```bash
   # Get key from https://platform.openai.com/api-keys
   echo "OPENAI_API_KEY=sk_..." >> resume-api/.env
   ```

2. **Anthropic (Claude)**:

   ```bash
   # Get key from https://console.anthropic.com/
   echo "ANTHROPIC_API_KEY=sk-..." >> resume-api/.env
   echo "AI_PROVIDER=anthropic" >> resume-api/.env
   ```

3. **Google Gemini**:
   ```bash
   # Get key from https://aistudio.google.com/app/apikey
   echo "GEMINI_API_KEY=..." >> resume-api/.env
   echo "AI_PROVIDER=gemini" >> resume-api/.env
   ```

Then restart the backend:

```bash
make restart
```

## Project Structure

```
ResumeAI/
├── src/                      # React frontend
│   ├── components/           # Reusable UI components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   └── App.tsx              # Main app component
├── resume-api/              # FastAPI backend
│   ├── api/                 # API routes and models
│   ├── config/              # Configuration
│   ├── lib/                 # CLI integration
│   ├── templates/           # Resume templates
│   ├── main.py              # FastAPI entry point
│   ├── requirements.txt      # Python dependencies
│   └── venv/                # Virtual environment (auto-created)
├── scripts/                 # Development scripts
│   ├── start-dev.sh        # Start both servers
│   ├── stop-dev.sh         # Stop both servers
│   ├── check-health.sh     # Health check
│   └── wait-for-services.sh # Wait for startup
├── logs/                    # Development logs
├── Makefile                 # Development commands
├── .env.local              # Frontend configuration (gitignored)
├── .env.example            # Frontend configuration template
├── package.json            # Node.js configuration
└── README.md               # Project overview
```

## Troubleshooting

### "Port Already in Use"

If you get "Address already in use" errors:

```bash
# Stop any existing services
make stop

# Or manually kill processes
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### "Module Not Found" (Backend)

```bash
# Ensure virtual environment is activated
cd resume-api
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### "Dependencies Not Found" (Frontend)

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend Won't Start

1. **Check Python version**:

   ```bash
   python3 --version  # Need 3.11 or 3.12
   ```

2. **Check dependencies**:

   ```bash
   cd resume-api && source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Check logs**:

   ```bash
   tail -f logs/backend.log
   ```

4. **Try manual start**:
   ```bash
   cd resume-api
   source venv/bin/activate
   python main.py
   ```

### Frontend Won't Start

1. **Check Node version**:

   ```bash
   node --version  # Need v18+
   ```

2. **Clear cache and rebuild**:

   ```bash
   rm -rf node_modules dist
   npm install
   npm run dev
   ```

3. **Check logs**:
   ```bash
   tail -f logs/frontend.log
   ```

### "PDF generation failed"

PDF generation requires LaTeX. Check installation:

```bash
# Verify LaTeX is installed
pdflatex --version

# If not installed:
# Ubuntu/Debian: sudo apt-get install texlive-latex-base
# Fedora/RHEL: sudo dnf install texlive-scheme-full
# macOS: brew install mactex
```

### "CORS error" in browser console

If the frontend can't reach the backend:

1. **Verify backend is running**:

   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Check VITE_API_URL in .env.local**:

   ```bash
   cat .env.local | grep VITE_API_URL
   # Should be: VITE_API_URL=http://127.0.0.1:8000
   ```

3. **Check backend CORS settings** (resume-api/main.py)

4. **Try localhost instead of 127.0.0.1**:
   ```bash
   # Edit .env.local
   VITE_API_URL=http://localhost:8000
   ```

### "API Key Required" errors

If you get 401 errors from the API:

1. **Check REQUIRE_API_KEY setting**:

   ```bash
   grep REQUIRE_API_KEY resume-api/.env
   # Should be: REQUIRE_API_KEY=false (for development)
   ```

2. **If set to true, add API key to frontend .env.local**:
   ```bash
   # In .env.local
   RESUMEAI_API_KEY=rai_your_key_here
   ```

### Database Errors

The backend uses SQLite with async support. If you get database errors:

```bash
# The database should auto-initialize
# If not, check the backend logs:
tail logs/backend.log

# Try manual initialization (if available):
cd resume-api && source venv/bin/activate
python -c "from database import create_db_and_tables; create_db_and_tables()"
```

## Architecture Overview

### Frontend (React + Vite)

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.x (fast HMR)
- **Styling**: Tailwind CSS
- **State Management**: React hooks + localStorage
- **API Client**: Fetch API / httpx
- **Hot Reload**: Enabled by default

### Backend (FastAPI)

- **Framework**: FastAPI 0.115.0
- **Server**: Uvicorn with auto-reload support
- **Database**: SQLAlchemy async + SQLite
- **Validation**: Pydantic 2.x
- **Documentation**: Automatic OpenAPI at `/docs`
- **Logging**: Structured logging with colorama

### AI Integration

- **OpenAI**: GPT-4o, GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet
- **Google**: Gemini 1.5

### PDF Generation

- **Method**: LaTeX-based (pdflatex)
- **Fallback**: Pandoc (if pdflatex unavailable)
- **Requirements**: texlive-latex-base or texlive-scheme-full

## Next Steps

1. **Access the application**: http://localhost:3000
2. **Review API documentation**: http://localhost:8000/docs
3. **Configure AI API keys** (optional): See "Adding AI API Keys" section
4. **Start building resumes**: Create sample data and test generation
5. **Run tests**: `make test`
6. **Check CLAUDE.md** for architecture and development guidelines

## Getting Help

- **API Documentation**: http://localhost:8000/docs (when running)
- **Git Workflow**: See CLAUDE.md for branch and PR guidelines
- **Architecture**: See CLAUDE.md for detailed architecture documentation
- **Issues**: Check GitHub issues or create a new one

## Additional Resources

- [CLAUDE.md](CLAUDE.md) - Developer guidelines and architecture
- [README.md](README.md) - Project overview and features
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [resume-api/README.md](resume-api/README.md) - Backend documentation
