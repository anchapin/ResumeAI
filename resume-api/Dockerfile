# Multi-stage build for optimized Docker image
# Stage 1: Builder - install texlive and dependencies
FROM python:3.11-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-xetex \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/share/texmf* \
    && apt-get clean

# Stage 2: Runtime - minimal image with necessary tools
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app:/usr/local/lib/python3.11/site-packages \
    PORT=8000

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy texlive from builder (already compiled)
COPY --from=builder /usr/share/texmf-dist /usr/share/texmf-dist
COPY --from=builder /usr/local/texlive /usr/local/texlive
COPY --from=builder /etc/texmf /etc/texmf

# Update PATH for texlive
ENV PATH="/usr/local/texlive/2024/bin/x86_64-linux:${PATH}"

WORKDIR /app

# Copy requirements first for better layer caching
COPY resume-api/requirements.txt .

# Install Python dependencies with minimal overhead
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# Copy application code
COPY resume-api/ .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check using httpx
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8000/health', timeout=10); r.raise_for_status(); exit(0 if r.json().get('status') == 'healthy' else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
