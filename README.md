<div align="center">
<img width="1200" height="475" alt="ResumeAI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ResumeAI - AI-Powered Resume Builder

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

| Component | Technology | Description |
|-----------|------------|-------------|
| Frontend | React 19 + TypeScript + Vite | Single Page Application |
| Backend | FastAPI + Python | REST API with resume generation |

For detailed architecture documentation, see [CLAUDE.md](CLAUDE.md).

## Prerequisites

Before running ResumeAI, ensure you have the following installed:

- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Python** (v3.11+) - [Download](https://www.python.org/)
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
- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Frontend deployment guide
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [resume-api/README.md](resume-api/README.md) - Backend documentation
