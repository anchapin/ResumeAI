# Deployment Guide

This guide covers deploying the ResumeAI application with both frontend and backend components.

## Architecture Overview

- **Frontend**: React/Vite app deployed on Vercel
- **Backend**: Python FastAPI deployed on Google Cloud Run
- **Database**: SQLite (for MVP) or PostgreSQL (for production)

## Prerequisites

1. Google Cloud Platform account
2. Vercel account
3. OpenAI/Anthropic/Gemini API key (for AI features)

---

## Backend Deployment (Google Cloud Run)

### 1. Configure Environment Variables

Create `resume-api/.env` with your settings:

```bash
# Application Settings
DEBUG=false
APP_NAME=Resume API
APP_VERSION=1.0.0

# Server Settings
HOST=0.0.0.0
PORT=8000

# API Authentication
REQUIRE_API_KEY=true
MASTER_API_KEY=rai_your_secure_master_key_here

# AI Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here

# Rate Limiting
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PDF=10/minute
RATE_LIMIT_TAILOR=30/minute
RATE_LIMIT_VARIANTS=60/minute
```

### 2. Build and Test Docker Image

```bash
cd resume-api

# Build the Docker image
docker build -t resume-api .

# Test locally
docker run -p 8000:8000 --env-file .env resume-api
```

### 3. Deploy to Google Cloud Run

Using the deployment script:

```bash
cd resume-api
./deploy-cloudrun.sh
```

Or manually:

```bash
# Push to Google Container Registry
docker push gcr.io/PROJECT_ID/resume-api

# Deploy to Cloud Run
gcloud run deploy resume-api \
  --image gcr.io/PROJECT_ID/resume-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars HOST=0.0.0.0,PORT=8000
```

### 4. Get Your Backend URL

After deployment, note your Cloud Run URL:
```
https://resume-api-xxxxx-uc.a.run.app
```

---

## Frontend Deployment (Vercel)

### 1. Connect Repository to Vercel

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 2. Configure Environment Variables

In Vercel dashboard, add these environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your Cloud Run URL (e.g., `https://resume-api-xxxxx-uc.a.run.app`) |
| `RESUMEAI_API_KEY` | The same `MASTER_API_KEY` you set in backend |

### 3. Deploy

Vercel will automatically deploy on push to main branch.

---

## Production Checklist

### Security
- [ ] Change default `MASTER_API_KEY` to a secure random value
- [ ] Enable `REQUIRE_API_KEY=true` in production
- [ ] Configure `CORS_ORIGINS` to your Vercel domain
- [ ] Enable rate limiting (`ENABLE_RATE_LIMITING=true`)

### Monitoring
- [ ] Set up Sentry for error tracking (optional)
- [ ] Configure Prometheus metrics (optional)

### Backup
- [ ] If using SQLite, set up regular backups
- [ ] Consider migrating to PostgreSQL for production

---

## CI/CD Setup

GitHub Actions workflows are included in `.github/workflows/`:

- `backend-ci.yml`: Python backend tests
- `frontend-ci.yml`: React frontend tests
- `pr-check.yml`: PR validation checks

### Running Tests Locally

```bash
# Backend tests
cd resume-api
pip install -r requirements.txt
pytest

# Frontend tests
npm install
npm test
```

---

## Troubleshooting

### Backend Issues

**LaTeX not found**
```bash
# Install LaTeX (for PDF generation)
# Ubuntu/Debian
sudo apt-get install texlive-xetex

# macOS
brew install mactex
```

**Port already in use**
```bash
# Find and kill process
lsof -i :8000
kill -9 PID
```

### Frontend Issues

**CORS errors**
- Check that `CORS_ORIGINS` in backend includes your Vercel domain

**API connection failed**
- Verify `VITE_API_URL` points to your Cloud Run URL
- Check that backend is running and healthy at `/health` endpoint

---

## Quick Start (Development)

For local development:

1. Start backend:
```bash
cd resume-api
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

2. Start frontend:
```bash
npm install
npm run dev
```

3. Open http://localhost:5173
