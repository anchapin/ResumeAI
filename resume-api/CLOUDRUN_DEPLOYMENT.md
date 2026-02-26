# Google Cloud Run Deployment Guide

This guide explains how to deploy the Resume API service to Google Cloud Run.

## Prerequisites

1. **Google Cloud SDK (gcloud)** - Install from [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

2. **Google Cloud Project** - Create a project at [https://console.cloud.google.com](https://console.cloud.google.com)

3. **Enable APIs** - Run the following commands:

   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

4. **Artifact Registry** - Create a Docker repository:
   ```bash
   gcloud artifacts repositories create resume-api \
       --repository-format=docker \
       --location=us \
       --description="Resume API Docker images"
   ```

## Deployment Steps

### 1. Set Environment Variables

Create a `.env` file in the `resume-api/` directory:

```bash
# API Configuration
DEBUG=false

# AI Configuration
AI_PROVIDER=openai  # Options: openai, claude, gemini
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GEMINI_API_KEY=...

# API Authentication (IMPORTANT: Change MASTER_API_KEY in production!)
MASTER_API_KEY=rai_1234567890abcdef1234567890abcdef
API_KEYS=
REQUIRE_API_KEY=true

# Optional: CORS settings (comma-separated)
# CORS_ORIGINS=https://yourdomain.com,https://app.vercel.app
```

### 2. Set Google Cloud Project

```bash
gcloud config set project YOUR_PROJECT_ID
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

### 3. Deploy Using Script

The easiest way to deploy is using the provided script:

```bash
cd resume-api
./deploy-cloudrun.sh
```

### 4. Manual Deployment (Optional)

If you prefer to deploy manually:

```bash
# Set variables
PROJECT_ID=your-project-id
REGION=us-central1
SERVICE_NAME=resume-api
REPOSITORY=us-docker.pkg.dev/${PROJECT_ID}/resume-api

# Build image
docker build -t ${REPOSITORY}/resume-api:latest .

# Configure Docker auth
gcloud auth configure-docker us-docker.pkg.dev

# Push image
docker push ${REPOSITORY}/resume-api:latest

# Deploy to Cloud Run
gcloud run deploy resume-api \
    --image=${REPOSITORY}/resume-api:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --memory=2Gi \
    --cpu=2 \
    --timeout=600s \
    --min-instances=0 \
    --max-instances=10
```

## Configuration Options

The Cloud Run service is configured with:

- **Memory**: 2Gi (needed for LaTeX compilation)
- **CPU**: 2 (needed for faster PDF generation)
- **Timeout**: 600s (10 minutes for complex PDFs)
- **Min Instances**: 0 (scales to zero when idle - cost effective)
- **Max Instances**: 10 (auto-scales for traffic)

## Environment Variables

Set these via `--set-env-vars` in the deployment command or in the Cloud Console:

| Variable            | Description                          | Required              | Default  |
| ------------------- | ------------------------------------ | --------------------- | -------- |
| `DEBUG`             | Enable debug mode                    | No                    | `false`  |
| `AI_PROVIDER`       | AI provider (openai, claude, gemini) | Yes                   | `openai` |
| `OPENAI_API_KEY`    | OpenAI API key                       | If AI_PROVIDER=openai | -        |
| `ANTHROPIC_API_KEY` | Anthropic API key                    | If AI_PROVIDER=claude | -        |
| `GEMINI_API_KEY`    | Google AI API key                    | If AI_PROVIDER=gemini | -        |
| `MASTER_API_KEY`    | Master API key for frontend          | Yes                   | -        |
| `API_KEYS`          | Comma-separated additional API keys  | No                    | -        |
| `REQUIRE_API_KEY`   | Require API key authentication       | No                    | `true`   |

## Testing Deployment

After deployment, test the service:

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe resume-api \
    --region=us-central1 \
    --format="value(status.url)")

# Health check
curl ${SERVICE_URL}/health

# List variants (no auth required)
curl ${SERVICE_URL}/v1/variants

# Test PDF generation (requires API key)
curl -X POST ${SERVICE_URL}/v1/render/pdf \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: ${MASTER_API_KEY}" \
    -d '{"resume_data":{"basics":{"name":"Test"}},"variant":"base"}' \
    --output test.pdf
```

## Updating Deployment

To update the service with new code:

```bash
# Rebuild and redeploy
./deploy-cloudrun.sh
```

Or manually:

```bash
docker build -t ${REPOSITORY}/resume-api:latest .
docker push ${REPOSITORY}/resume-api:latest
gcloud run deploy resume-api --image=${REPOSITORY}/resume-api:latest --region=us-central1
```

## Monitoring and Logs

View logs:

```bash
gcloud logs tail resume-api --region=us-central1
```

View metrics in Cloud Console:

- Go to [Cloud Run](https://console.cloud.google.com/run)
- Select `resume-api` service

## Troubleshooting

### Out of Memory Errors

If you see "out of memory" errors during PDF generation:

1. Increase memory allocation:
   ```bash
   gcloud run deploy resume-api --memory=4Gi --region=us-central1
   ```

### Timeout Errors

For complex resumes that take longer to compile:

1. Increase timeout:
   ```bash
   gcloud run deploy resume-api --timeout=1200s --region=us-central1
   ```

### Cold Start Times

The service scales to zero when idle, causing cold starts (~10-20s). To eliminate cold starts:

1. Set minimum instances to 1:
   ```bash
   gcloud run deploy resume-api --min-instances=1 --region=us-central1
   ```
   Note: This will incur continuous costs.

### API Key Issues

If requests fail with 401/403:

1. Verify MASTER_API_KEY is set
2. Check logs: `gcloud logs tail resume-api --region=us-central1`
3. Test with curl:
   ```bash
   curl -H "X-API-KEY: YOUR_KEY" ${SERVICE_URL}/v1/variants
   ```

## Cost Estimate

Based on the default configuration (min-instances=0):

- **Compute**: ~$0.000040 per GB-second
- **Requests**: ~$0.40 per million requests
- **Networking**: ~$0.12 per GB egress

**Estimated monthly cost** (1000 PDF generations):

- Compute: 1000 _ 30s _ 2Gi = ~$0.0024
- Requests: 1000 \* $0.40 / 1M = ~$0.0004
- Networking: 1000 _ 1MB _ $0.12 / 1GB = ~$0.12
- **Total**: ~$0.13/month

With min-instances=1:

- Always-on: ~$30-50/month (2Gi, 2 CPU)

## Security Best Practices

1. **API Keys**: Never commit API keys to git
2. **Secret Manager**: For production, use Secret Manager:
   ```bash
   echo -n "YOUR_API_KEY" | gcloud secrets create MASTER_API_KEY --
   gcloud run deploy resume-api --set-secrets=MASTER_API_KEY=MASTER_API_KEY:latest
   ```
3. **Custom Domain**: Configure a custom domain for HTTPS and trust
4. **IAM**: Restrict who can deploy to Cloud Run

## Custom Domain (Optional)

To use a custom domain:

1. Verify domain ownership in Cloud Console
2. Map domain to service:
   ```bash
   gcloud run domain-mappings create \
       --service=resume-api \
       --domain=api.yourdomain.com \
       --region=us-central1
   ```
3. Update DNS records as instructed by Google

## Cleanup

To delete the service and resources:

```bash
# Delete Cloud Run service
gcloud run services delete resume-api --region=us-central1

# Delete images from Artifact Registry
gcloud artifacts docker images delete \
    us-docker.pkg.dev/YOUR_PROJECT_ID/resume-api/resume-api:latest
```
