# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ResumeAI** is a resume builder SaaS application with two main components:

- **Frontend:** React 19 application with TypeScript and Vite
- **Backend:** FastAPI Python service with Resume CLI integration
- **Architecture:** SPA (Single Page Application) with client-side state management
- **Deployment:** Docker containers for API service, Vercel for frontend

## Development Commands

### Frontend
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend
```bash
# Start development server (in resume-api/)
cd resume-api && python main.py

# Start with production settings (auto-detected from .env or PORT env)
cd resume-api && PORT=8000 python main.py
```

### Docker
```bash
# Build API service image
cd resume-api && docker build -t resume-api:latest .

# Run container locally
docker run -p 8000:8000 resume-api:latest

# Run container with auto-restart
docker-compose up

# Run container with specific .env
docker-compose --env-file .env up
```

## Project Structure

```
/
├── src/                    # React frontend (Vite, TSX, Tailwind)
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route-based pages (Dashboard, Editor, Workspace, Settings)
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types.ts            # Shared TypeScript types
│   └── App.tsx            # Main app component
├── resume-api/            # Backend FastAPI service
│   ├── api/                # API routes and models
│   ├── config/             # Settings and authentication
│   ├── lib/                # CLI integration (vendor resume-cli)
│   │   ├── cli/          # Resume generator, tailorer, variants
│   │   └── utils/         # AI integration
│   ├── templates/           # Resume YAML templates
│   ├── main.py             # FastAPI application entry
│   ├── Dockerfile          # Docker container config
│   ├── requirements.txt      # Python dependencies
│   └── docker-compose.yml  # Docker Compose config
├── public/                 # Static assets (Vite output)
├── tests/                  # Test files
└── package.json            # Node.js config
```

## Key Architecture Decisions

### Frontend State Management
- Uses `localStorage` for user profile persistence (MVP approach)
- Client-side navigation via React state in `App.tsx` (not React Router)
- API key stored in `localStorage` under `RESUMEAI_API_KEY` key
- Future: Consider IndexedDB or user API for multi-device sync

### API Architecture
- **Legacy Endpoints** (mock server in `server.py`): `/generate/preview`, `/generate/pdf`, `/generate/package`
- **V1 API** (production): `/v1/render/pdf`, `/v1/tailor`, `/v1/variants`
- **Authentication:** API Key middleware in `resume-api/config/dependencies.py`
  - Required: `X-API-KEY` header for protected endpoints
  - Optional: Public endpoints allow unauthenticated access
  - Development Mode: Set `REQUIRE_API_KEY=false` to disable

### Backend Modules
- **FastAPI:** Web framework with automatic OpenAPI docs (`/docs`)
- **Pydantic:** Request/response validation with `pydantic_settings.BaseSettings`
- **Resume CLI Integration:** Vendor code in `resume-api/lib/cli/` wraps Python CLI library
- **AI Abstraction:** `resume-api/lib/utils/ai.py` supports OpenAI, Claude, Gemini
- **Template System:** YAML-based resume templates in `resume-api/templates/`

### Environment Configuration

**Frontend (.env.local):**
```bash
GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_URL=http://127.0.0.1:8000  # Local development
# VITE_API_URL=https://api.resumeai.com   # Production deployment
```

**Backend (resume-api/.env):**
```bash
# AI Configuration
AI_PROVIDER=openai              # openai, claude, gemini
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GEMINI_API_KEY=...

# API Authentication
MASTER_API_KEY=rai_1234567890abcdef...  # For ResumeAI frontend
API_KEYS=rai_xyz...,rai_abc...  # For 3rd party developers
REQUIRE_API_KEY=true           # Set to false to disable auth

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

## TypeScript Configuration

- **Strict mode:** `strict` in tsconfig.json
- **Path mapping:** `@/*` paths for clean imports
- **Build target:** esnext for modern syntax
- **Vite plugin:** React hot module replacement

## Docker Configuration

- **Base Image:** `python:3.11-slim`
- **Python Path:** `PYTHONPATH=/app:/usr/local/lib/python3.11/site-packages`
- **Working Directory:** `/app`
- **Exposed Port:** 8000
- **Health Check:** `python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=10).raise_for_status() or exit(1)"`
- **Non-root User:** `appuser` (UID 1000)

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/test_server_performance.tsx

# Test backend (from resume-api/)
cd resume-api && python -m pytest

# Test Docker container
cd resume-api && docker build -t resume-api:test . && docker run --rm resume-api:test python -c "from lib.cli import ResumeGenerator; print('SUCCESS')"
```

## Known Limitations & Gotchas

1. **Docker Build Time:** The `resume-api` Dockerfile includes `texlive` which is 2-4GB and can take 10+ minutes to build
2. **Frontend Routing:** Using React state for routing instead of React Router means route changes require code deployment
3. **API Key Storage:** Currently using `localStorage` - consider user accounts for production
4. **CORS:** Enabled for all origins during development (`allow_origins=["*"]`)

## Code Style & Conventions

- **File naming:** `kebab-case` for TypeScript files
- **Component naming:** PascalCase (e.g., `Dashboard.tsx`, `Editor.tsx`)
- **Function naming:** `camelCase` (e.g., `useGeneratePackage`, `formatResumeData`)
- **Constants:** `UPPER_SNAKE_CASE` for magic values
- **Type definitions:** All shared types in `types.ts`
- **Git hooks:** Custom hooks in `hooks/` directory
- **Pydantic models:** All request/response models in `resume-api/api/models.py`

## Deployment

See `MVP_ROADMAP.md` for detailed deployment strategy.

## Git Workflow

All new commits should be made on **feature branches**, not directly to `main`. This enables:
- Isolated development for each feature
- Easier PR creation (feature branch vs main)
- Parallel development without branch conflicts
- Clear separation of concerns

**Creating a Feature Branch:**
```bash
# Create a new feature branch from main
git checkout main
git checkout -b feature/issue-XX description

# Work on your feature
# Make commits
git add .
git commit -m "feat: description"

# Push to remote
git push origin feature/issue-XX
```

**Creating a Pull Request:**
```bash
# Create PR from feature branch to main
gh pr create --base main --head feature/issue-XX --title "..." --body "Closes #XX"
```

**Completing a Feature:**
```bash
# Once PR is merged, the branch can be deleted
git checkout main
git pull origin main
git branch -d feature/issue-XX
```

**Never merge feature branches directly to main:**
- ❌ Don't use `git merge feature/XX` - this bypasses PR review
- ❌ Don't push directly to main without PR - loses commit history
- ❌ Don't delete feature branches before PR merges

**Main Branch Purpose:**
- The `main` branch should only receive updates via merged PRs
- This ensures every feature goes through code review
- Maintains clean commit history

**Exception:**
- Hotfixes that need immediate deployment may be committed directly to main temporarily, but should still go through PR process for tracking.
