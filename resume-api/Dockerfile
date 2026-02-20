# Resume API Dockerfile

FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONPATH=/app:/usr/local/lib/python3.11/site-packages \
    PORT=8000

# Install system dependencies including LaTeX for professional PDF generation
# Note: GitHub CLI (gh) is intentionally NOT installed.
# ResumeAI uses OAuth mode for GitHub authentication (GITHUB_AUTH_MODE=oauth).
# CLI mode (GITHUB_AUTH_MODE=cli) is deprecated and will be removed.
# OAuth provides per-user authentication, better security, and no shared credentials.
RUN apt-get update && apt-get install -y \
    # LaTeX dependencies (minimal xetex installation)
    texlive-xetex \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    # Additional useful packages
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for running the app
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8000/health', timeout=10); r.raise_for_status(); exit(0 if r.json().get('status') == 'healthy' else 1)"

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
