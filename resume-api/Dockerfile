# Multi-stage build for optimized Docker image (Issues #376, #606)
# Optimizations:
# - Multi-stage build (builder -> runtime)
# - Minimal texlive installation
# - Layer caching strategy (requirements before code)
# - Non-root user for security
# - Health checks with curl (smaller footprint)
# - Build args for flexibility

# Stage 1: Builder - install texlive and dependencies
# This stage runs once and is cached between builds
FROM python:3.11-slim AS builder

# Build arguments for customization
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

# Stage 2: Runtime - minimal image with necessary tools
FROM python:3.11-slim

LABEL maintainer="ResumeAI" \
      version="1.0" \
      description="FastAPI Resume Generator Service" \
      org.opencontainers.image.title="ResumeAI API" \
      org.opencontainers.image.description="FastAPI Resume Generator Service with optimized multi-stage build" \
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

# Copy texlive binaries and configs from builder stage
# Only copy runtime files, not source/build artifacts
COPY --from=builder /usr/share/texlive /usr/share/texlive
COPY --from=builder /usr/bin/xetex* /usr/bin/
COPY --from=builder /etc/texmf /etc/texmf

WORKDIR /app

# Copy requirements first for optimal layer caching
# This layer is only invalidated if requirements.txt changes
COPY requirements.txt .

# Install Python dependencies with no cache/compile to reduce layer size
RUN pip install --no-cache-dir --no-compile --disable-pip-version-check \
    -r requirements.txt

# Copy application code (most frequently changing layer)
COPY . .

# Create non-root user for security (UID 1000 for compatibility)
RUN groupadd -r appuser && useradd -m -r -g appuser -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Health check - validate service is responding
# Using curl instead of Python for smaller footprint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
