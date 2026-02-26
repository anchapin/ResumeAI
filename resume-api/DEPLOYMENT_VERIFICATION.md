# Deployment Verification Guide

## Overview

This guide provides comprehensive procedures for verifying that a deployment is successful and ready to serve production traffic. It covers pre-deployment validation, post-deployment verification, and monitoring setup.

## Table of Contents

1. [Pre-Deployment Validation](#pre-deployment-validation)
2. [Post-Deployment Verification](#post-deployment-verification)
3. [Health Check Verification](#health-check-verification)
4. [Feature Flag Verification](#feature-flag-verification)
5. [Database Integrity Verification](#database-integrity-verification)
6. [Performance Baseline Verification](#performance-baseline-verification)
7. [Smoke Tests](#smoke-tests)
8. [Rollback Verification](#rollback-verification)

## Pre-Deployment Validation

### 1. Code Quality Checks

```bash
# Frontend
npm run lint
npm run type-check
npm run test

# Backend
cd resume-api
python -m pytest tests/ -v --tb=short
python -m mypy lib/ config/ routes/ --ignore-missing-imports
```

### 2. Dependency Audit

```bash
# Frontend
npm audit
npm audit fix  # if needed

# Backend
pip-audit
bandit -r lib/ config/ routes/
```

### 3. Build Validation

```bash
# Frontend build
npm run build
test -d dist || exit 1

# Backend Docker build
cd resume-api && docker build -t resume-api:test . --no-cache
```

### 4. Configuration Validation

```bash
# Check all required environment variables are set
python resume-api/scripts/validate_deployment.py --check-config

# Verify API keys are configured
test -n "$MASTER_API_KEY" || exit 1
test -n "$AI_PROVIDER" || exit 1
test -n "$AI_MODEL" || exit 1
```

### 5. Database Migration Validation

```bash
# Check migration status
python resume-api/scripts/validate_deployment.py --check-migrations

# Verify schema is valid
curl -X POST http://localhost:8000/v1/deployment/database/validate-schema \
  -H "X-API-KEY: $MASTER_API_KEY"
```

### 6. Backup Verification

```bash
# Create fresh backup before deployment
pg_dump resumeai > backup_$(date +%s).sql

# Verify backup integrity
pg_restore -l backup_*.sql | head -20

# Store backup in safe location
aws s3 cp backup_*.sql s3://backups/resumeai/
```

## Post-Deployment Verification

### 1. Service Health Check

```bash
# Basic health check
curl -s http://localhost:8000/v1/deployment/health | jq '.'

# Expected response
{
  "status": "healthy",
  "healthy": true,
  "version": "1.0.0",
  "timestamp": "2024-02-26T12:00:00Z"
}
```

### 2. Readiness Check

```bash
# Check if service is ready for traffic
curl -s http://localhost:8000/v1/deployment/ready | jq '.'

# Expected response
{
  "ready": true,
  "timestamp": "2024-02-26T12:00:00Z"
}

# For Kubernetes
kubectl get pod resume-api-xyz -o custom-columns=READY:.status.conditions[?(@.type=="Ready")].status
```

### 3. Liveness Check

```bash
# Verify service process is running
curl -s http://localhost:8000/v1/deployment/live | jq '.'

# Expected response
{
  "alive": true,
  "version": "1.0.0",
  "timestamp": "2024-02-26T12:00:00Z"
}
```

### 4. Detailed Health Status

```bash
# Get comprehensive health status
curl -s http://localhost:8000/v1/deployment/health/detailed | jq '.checks'

# Expected output
{
  "database": true,
  "ai_provider": true,
  "disk_space": true,
  "memory_usage": true,
  "oauth": true
}

# If any check is false, investigate with:
curl -s http://localhost:8000/v1/deployment/health/detailed | jq '.details.database'
```

### 5. Deployment Verification

```bash
# Run comprehensive deployment verification
curl -X GET http://localhost:8000/v1/deployment/verify \
  -H "X-API-KEY: $MASTER_API_KEY" | jq '.'

# Expected response
{
  "verified": true,
  "timestamp": "2024-02-26T12:00:00Z",
  "checks": {
    "health": true,
    "features_configured": true,
    "database_healthy": true,
    "all_systems_operational": true
  }
}
```

## Health Check Verification

### Integration with Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resume-api
spec:
  containers:
    - name: api
      image: resume-api:1.0.0
      ports:
        - containerPort: 8000

      # Liveness probe - restart if container is dead
      livenessProbe:
        httpGet:
          path: /v1/deployment/live
          port: 8000
        initialDelaySeconds: 10
        periodSeconds: 30
        timeoutSeconds: 5
        failureThreshold: 3

      # Readiness probe - remove from load balancer if not ready
      readinessProbe:
        httpGet:
          path: /v1/deployment/ready
          port: 8000
        initialDelaySeconds: 5
        periodSeconds: 10
        timeoutSeconds: 3
        failureThreshold: 3
```

### Integration with Docker Compose

```yaml
version: '3.8'
services:
  api:
    image: resume-api:1.0.0
    ports:
      - '8000:8000'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/v1/deployment/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s # Time for service to start
```

### Integration with Load Balancers

**AWS Application Load Balancer (ALB):**

```bash
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --health-check-protocol HTTP \
  --health-check-path /v1/deployment/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2
```

**Nginx:**

```nginx
upstream resumeai {
  server localhost:8000;

  # Health check
  check interval=3000 rise=2 fall=5 timeout=1000 type=http;
  check_http_send "GET /v1/deployment/health HTTP/1.0\r\n\r\n";
  check_http_expect_alive http_2xx;
}

server {
  location / {
    proxy_pass http://resumeai;
  }
}
```

## Feature Flag Verification

### Verify All Flags Are Configured

```bash
# Get all feature flags
curl -X GET http://localhost:8000/v1/deployment/features \
  -H "X-API-KEY: $MASTER_API_KEY" | jq '.flags'

# Expected output
{
  "new_pdf_renderer": {
    "status": "disabled",
    "rollout_percentage": 0,
    "description": "New PDF rendering engine",
    "updated_at": "2024-02-26T10:00:00Z"
  },
  "ai_tailoring_v2": {
    "status": "disabled",
    "rollout_percentage": 0,
    "description": "Enhanced AI tailoring",
    "updated_at": "2024-02-26T10:00:00Z"
  },
  ...
}
```

### Enable Feature Flag with Gradual Rollout

```bash
# Start with 10% rollout
curl -X POST "http://localhost:8000/v1/deployment/features/ai_tailoring_v2/enable?rollout_percentage=10" \
  -H "X-API-KEY: $MASTER_API_KEY"

# Monitor metrics for 30 minutes
watch -n 60 'curl -s http://localhost:8000/metrics | jq ".requests_by_feature.ai_tailoring_v2"'

# Increase to 25% after 30 minutes
curl -X POST "http://localhost:8000/v1/deployment/features/ai_tailoring_v2/enable?rollout_percentage=25" \
  -H "X-API-KEY: $MASTER_API_KEY"

# Continue monitoring and increasing until 100%
```

### Emergency Disable

```bash
# If feature is causing issues, disable immediately
curl -X POST "http://localhost:8000/v1/deployment/features/ai_tailoring_v2/disable" \
  -H "X-API-KEY: $MASTER_API_KEY"

# Verify it's disabled
curl -X GET "http://localhost:8000/v1/deployment/features/ai_tailoring_v2" \
  -H "X-API-KEY: $MASTER_API_KEY" | jq '.status'
```

## Database Integrity Verification

### Validate Schema

```bash
# Verify all tables and columns exist
curl -X POST http://localhost:8000/v1/deployment/database/validate-schema \
  -H "X-API-KEY: $MASTER_API_KEY" | jq '.'

# Expected response
{
  "valid": true,
  "timestamp": "2024-02-26T12:00:00Z",
  "summary": {
    "passed": 45,
    "failed": 0
  },
  "details": [
    "✓ Table: users",
    "✓ Table: resumes",
    ...
  ],
  "warnings": []
}
```

### Validate Data Integrity

```bash
# Check for orphaned records and constraint violations
curl -X POST http://localhost:8000/v1/deployment/database/validate-integrity \
  -H "X-API-KEY: $MASTER_API_KEY" | jq '.'

# Expected response
{
  "valid": true,
  "timestamp": "2024-02-26T12:00:00Z",
  "summary": {
    "passed": 8,
    "failed": 0
  },
  "details": [
    "✓ Orphaned resumes check: No orphaned resumes found",
    "✓ Orphaned versions check: No orphaned versions found",
    ...
  ]
}
```

### Check Migration Readiness

```bash
# Before running migrations, verify database is ready
curl -X POST http://localhost:8000/v1/deployment/database/migration-ready \
  -H "X-API-KEY: $MASTER_API_KEY" | jq '.'

# Expected response
{
  "ready": true,
  "timestamp": "2024-02-26T12:00:00Z",
  "checks": {
    "schema_valid": true,
    "integrity_valid": true,
    "no_running_migrations": true,
    "disk_space_available": true,
    "backup_exists": true,
    "ready_for_migration": true
  }
}
```

## Performance Baseline Verification

### Measure Response Times

```bash
# Generate some traffic and measure response times
for i in {1..100}; do
  curl -s -o /dev/null -w "%{time_total}" http://localhost:8000/health
  echo " seconds"
done | sort -n | tail -10

# Expected: p99 response time < 1 second for /health
```

### Check Error Rates

```bash
# Monitor error rate for 5 minutes
for i in {1..300}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/v1/deployment/health
  sleep 1
done | grep -v "^200$" | wc -l

# Expected: error count < 6 (< 2% error rate)
```

### Compare with Baseline

```bash
# Get current performance metrics
curl -s http://localhost:8000/metrics | jq '.performance'

# Compare with known baseline
cat /var/deployments/baseline_metrics.json | jq '.performance'

# Calculate difference
# Should be within 10% of baseline
```

## Smoke Tests

### Test Core Functionality

```bash
#!/bin/bash
API_URL="http://localhost:8000"
API_KEY="$MASTER_API_KEY"

# Test health endpoint
echo "Testing health endpoint..."
curl -f "$API_URL/v1/deployment/health" || exit 1

# Test API key authentication
echo "Testing API key authentication..."
curl -f -H "X-API-KEY: $API_KEY" "$API_URL/v1/deployment/features" || exit 1

# Test invalid API key rejection
echo "Testing invalid API key rejection..."
if curl -f -H "X-API-KEY: invalid" "$API_URL/v1/deployment/features" 2>/dev/null; then
  echo "ERROR: Invalid API key was accepted!"
  exit 1
fi

# Test database connectivity
echo "Testing database connectivity..."
curl -f -H "X-API-KEY: $API_KEY" \
  -X POST "$API_URL/v1/deployment/database/validate-schema" || exit 1

# Test feature flag management
echo "Testing feature flag management..."
curl -f -H "X-API-KEY: $API_KEY" \
  -X GET "$API_URL/v1/deployment/features/new_pdf_renderer" || exit 1

echo "All smoke tests passed!"
```

### User-Facing Feature Tests

```bash
#!/bin/bash
API_URL="http://localhost:8000"
API_KEY="$MASTER_API_KEY"

# Create a test resume
echo "Testing resume creation..."
RESUME=$(curl -s -X POST "$API_URL/v1/resumes" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Resume", "data": {}}')

RESUME_ID=$(echo "$RESUME" | jq -r '.id')
test -n "$RESUME_ID" || exit 1

# Generate PDF
echo "Testing PDF generation..."
curl -f -X POST "$API_URL/v1/render/pdf?resume_id=$RESUME_ID" \
  -H "X-API-KEY: $API_KEY" || exit 1

# Test resume tailoring
echo "Testing resume tailoring..."
curl -f -X POST "$API_URL/v1/tailor" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"resume_id\": $RESUME_ID, \"job_description\": \"Test JD\"}" || exit 1

echo "All user-facing tests passed!"
```

## Rollback Verification

After deploying, monitor these metrics:

```bash
# Monitor error rate (should stay < 0.1%)
watch -n 10 'curl -s http://localhost:8000/metrics | jq ".error_rate"'

# Monitor response time p99 (should stay < 2 seconds)
watch -n 10 'curl -s http://localhost:8000/metrics | jq ".response_time_p99"'

# Monitor active connections (should stay stable)
watch -n 10 'curl -s http://localhost:8000/metrics | jq ".active_connections"'

# Monitor database connections (should stay < 80% of max)
watch -n 10 'curl -s http://localhost:8000/metrics | jq ".database_connections"'
```

If any metric exceeds thresholds:

```bash
# 1. Identify the issue
curl -s http://localhost:8000/v1/deployment/health/detailed | jq '.details'

# 2. Check which feature flag was recently enabled
curl -s -H "X-API-KEY: $MASTER_API_KEY" \
  http://localhost:8000/v1/deployment/features | jq '.flags[] | select(.updated_at > "2024-02-26T12:00:00Z")'

# 3. Disable problematic feature flag
curl -X POST "http://localhost:8000/v1/deployment/features/PROBLEM_FEATURE/disable" \
  -H "X-API-KEY: $MASTER_API_KEY"

# 4. Monitor metrics again to confirm recovery
watch -n 10 'curl -s http://localhost:8000/metrics | jq ".error_rate"'
```

## Deployment Checklist

- [ ] Pre-deployment validation passed
- [ ] Code quality checks passed (lint, type check, tests)
- [ ] Build validation successful
- [ ] Configuration validated
- [ ] Database backup created
- [ ] Database schema validated
- [ ] Post-deployment health checks passed
- [ ] Readiness probe responding
- [ ] Liveness probe responding
- [ ] Detailed health status all green
- [ ] Feature flags configured correctly
- [ ] Database integrity verified
- [ ] Performance baseline acceptable
- [ ] Smoke tests passed
- [ ] User-facing features tested
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment
- [ ] On-call engineer monitoring

---

**Last Updated**: 2024-02-26
**Version**: 1.0
**Status**: Production Ready
