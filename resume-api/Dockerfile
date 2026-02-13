# Resume API Dockerfile
# Phase 1.2: Dockerize the Resume API service with texlive

FROM python:3.11-slim

# Set environment variables for non-interactive package installation
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    # Set PORT for cloud deployments (Google Cloud Run, etc.)
    PORT=8000

# Install system dependencies including LaTeX for professional PDF generation
# Note: texlive is large (~2-4GB) but essential for high-quality PDF output
RUN apt-get update && apt-get install -y --no-install-recommends \
    # LaTeX dependencies for PDF generation
    texlive-xetex \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-lang-english \
    # Additional LaTeX packages for professional resumes
    texlive-science \
    texlive-pictures \
    # System utilities
    wget \
    curl \
    git \
    # Cleanup to reduce image size
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
# Note: This includes the vendored resume-cli code in lib/
COPY . .

# Verify xelatex installation (important for PDF generation)
RUN which xelatex && xelatex --version

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the API port
EXPOSE 8000

# Health check endpoint
# Uses python -m httpx instead of curl for consistency
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

# Run the application with uvicorn
# The PORT environment variable can be overridden by the platform
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
