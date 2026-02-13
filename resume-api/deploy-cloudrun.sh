#!/bin/bash
# Resume API - Google Cloud Run Deployment Script

set -e

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-your-project-id}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="resume-api"
IMAGE_NAME="resume-api"
REGISTRY="us-docker.pkg.dev"
REPOSITORY="${REGISTRY}/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed. Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    log_error "Not authenticated with Google Cloud. Run: gcloud auth login"
    exit 1
fi

# Get project ID if not set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    log_warn "GOOGLE_CLOUD_PROJECT not set. Using default project..."
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        log_error "No default project set. Please set GOOGLE_CLOUD_PROJECT environment variable or run: gcloud config set project PROJECT_ID"
        exit 1
    fi
    log_info "Using project: $PROJECT_ID"
fi

log_info "=== Resume API - Cloud Run Deployment ==="
log_info "Project: $PROJECT_ID"
log_info "Region: $REGION"
log_info "Service: $SERVICE_NAME"

# Step 1: Build Docker image
log_info "Step 1: Building Docker image..."
docker build -t ${REPOSITORY}/${IMAGE_NAME}:latest .

# Step 2: Configure Docker authentication for Artifact Registry
log_info "Step 2: Configuring Docker authentication..."
gcloud auth configure-docker ${REGISTRY} --quiet

# Step 3: Push image to Artifact Registry
log_info "Step 3: Pushing image to Artifact Registry..."
docker push ${REPOSITORY}/${IMAGE_NAME}:latest

# Step 4: Deploy to Cloud Run
log_info "Step 4: Deploying to Cloud Run..."

# Check if environment file exists
if [ -f .env ]; then
    log_info "Loading environment variables from .env..."
    source .env
else
    log_warn ".env file not found. Some environment variables may be missing."
fi

# Deploy with environment variables
gcloud run deploy ${SERVICE_NAME} \
    --image=${REPOSITORY}/${IMAGE_NAME}:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --memory=2Gi \
    --cpu=2 \
    --timeout=600s \
    --min-instances=0 \
    --max-instances=10 \
    --set-env-vars="DEBUG=${DEBUG:-false}" \
    --set-env-vars="AI_PROVIDER=${AI_PROVIDER:-openai}" \
    --set-env-vars="OPENAI_API_KEY=${OPENAI_API_KEY:-}" \
    --set-env-vars="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}" \
    --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY:-}" \
    --set-env-vars="MASTER_API_KEY=${MASTER_API_KEY:-}" \
    --set-env-vars="API_KEYS=${API_KEYS:-}" \
    --set-env-vars="REQUIRE_API_KEY=${REQUIRE_API_KEY:-true}"

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --format="value(status.url)")

log_info "=== Deployment Complete ==="
log_info "Service URL: ${SERVICE_URL}"
log_info "API Docs: ${SERVICE_URL}/docs"
log_info "Health Check: ${SERVICE_URL}/health"

log_info ""
log_info "To test the deployment:"
log_info "  curl ${SERVICE_URL}/health"
log_info "  curl ${SERVICE_URL}/v1/variants"
