# Deployment Runbook

## Prerequisites

- Docker installed
- Access to container registry
- Valid deployment credentials

## Deployment Steps

### 1. Backend Deployment

```bash
cd resume-api

# Build the Docker image
docker build -t resume-api:latest .

# Run the container
docker run -d -p 8000:8000 --env-file .env resume-api:latest
```

### 2. Frontend Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### 3. Verify Deployment

```bash
# Check backend health
curl https://api.resumeai.com/api/v1/health

# Check frontend
curl https://resumeai.com
```

## Troubleshooting

### Backend Won't Start

1. Check environment variables
2. Verify database connection
3. Check port availability

### Frontend Build Fails

1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check for TypeScript errors: `npx tsc --noEmit`
