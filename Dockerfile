# Multi-stage build for optimized Docker image (Issue #554)
# Optimizations:
# - Multi-stage build (frontend builder → backend builder → runtime)
# - Optimize layer caching (rarely changed → frequently changed)
# - Non-root user for security
# - Healthcheck for monitoring
# - Minimal image size with selective copying

# Stage 1: Frontend Builder - Build React application
FROM node:20-alpine AS frontend-builder

LABEL stage="frontend-builder"

WORKDIR /app

# Copy frontend package files first for optimal layer caching
COPY package*.json ./

# Install all frontend dependencies (including dev dependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy frontend source code
COPY . .

# Build frontend (Vite production build)
RUN npm run build && \
    rm -rf node_modules src tests docs *.md .git* .vscode .idea

# Stage 2: Backend Builder - Install texlive and dependencies
# This stage runs once and is cached between builds
FROM python:3.11-slim AS backend-builder

LABEL stage="backend-builder"

ARG TEXLATE_PACKAGES="texlive-xetex texlive-latex-extra texlive-fonts-recommended texlive-fonts-extra texlive-lang-english"

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Install texlive and build dependencies
# Using specific packages only (not full texlive-full to save ~2GB)
RUN apt-get update -qq && apt-get install -y --no-install-recommends ${TEXLATE_PACKAGES} \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/share/texmf-config 2>/dev/null || true \
    && rm -rf /usr/share/texmf-var 2>/dev/null || true \
    && mktexlsr 2>/dev/null || true

# Stage 3: Runtime - Minimal image with necessary tools
FROM python:3.11-slim

LABEL maintainer="ResumeAI" \
      version="1.0" \
      description="ResumeAI Full-Stack Application" \
      org.opencontainers.image.title="ResumeAI" \
      org.opencontainers.image.description="AI-Powered Resume Builder with optimized multi-stage build" \
      org.opencontainers.image.authors="ResumeAI Team" \
      org.opencontainers.image.version="1.0"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app:/usr/local/lib/python3.11/site-packages \
    PORT=8000 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Install runtime dependencies only (minimal set)
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy texlive binaries and configs from backend-builder stage
COPY --from=backend-builder /usr/share/texlive /usr/share/texlive
COPY --from=backend-builder /usr/bin/xetex* /usr/bin/
COPY --from=backend-builder /etc/texmf /etc/texmf

WORKDIR /app

# Copy backend requirements first for optimal layer caching
COPY resume-api/requirements.txt ./resume-api/

# Install Python dependencies with no cache/compile to reduce layer size
RUN pip install --no-cache-dir --no-compile --disable-pip-version-check \
    -r resume-api/requirements.txt

# Copy frontend build artifacts from frontend-builder
COPY --from=frontend-builder /app/dist ./frontend

# Copy backend application code
COPY resume-api/ ./resume-api/

# Create non-root user for security (UID 1000 for compatibility)
RUN groupadd -r appuser && useradd -r -g appuser -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Health check - validate API and frontend are responding
# Using curl instead of Python for smaller footprint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start FastAPI application (serves frontend static files)
# Change to resume-api directory and run from there to ensure proper module resolution
CMD ["sh", "-c", "cd resume-api && uvicorn main:app --host 0.0.0.0 --port 8000"]
