# Deployment Safeguards - Quick Reference

**Issue #378** - Deployment Safeguards Implementation

## 🚀 Quick Start

### Check Service Health

```bash
# Basic health check
curl http://localhost:8000/v1/deployment/health

# Detailed health
curl http://localhost:8000/v1/deployment/health/detailed

# Kubernetes readiness
curl http://localhost:8000/v1/deployment/ready

# Kubernetes liveness
curl http://localhost:8000/v1/deployment/live
```

### Feature Flag Management

```bash
# List all flags
curl -H "X-API-KEY: $KEY" http://localhost:8000/v1/deployment/features

# Enable feature (full rollout)
curl -X POST -H "X-API-KEY: $KEY" \
  http://localhost:8000/v1/deployment/features/FEATURE/enable

# Enable feature (10% rollout)
curl -X POST -H "X-API-KEY: $KEY" \
  "http://localhost:8000/v1/deployment/features/FEATURE/enable?rollout_percentage=10"

# Disable feature (emergency)
curl -X POST -H "X-API-KEY: $KEY" \
  http://localhost:8000/v1/deployment/features/FEATURE/disable

# Maintenance mode (1 hour)
curl -X POST -H "X-API-KEY: $KEY" \
  "http://localhost:8000/v1/deployment/features/FEATURE/maintenance?duration_minutes=60"
```

### Database Validation

```bash
# Pre-deployment
python resume-api/scripts/validate_migrations.py --pre-migration

# Post-deployment
python resume-api/scripts/validate_migrations.py --post-migration

# Check integrity
python resume-api/scripts/validate_migrations.py --check-integrity

# Save report
python resume-api/scripts/validate_migrations.py --pre-migration --save-report
```

### Full Deployment Verification

```bash
# Comprehensive check
curl -H "X-API-KEY: $KEY" http://localhost:8000/v1/deployment/verify

# Status (no auth required)
curl http://localhost:8000/v1/deployment/status
```

## 📊 API Endpoints Reference

### Health Checks

| Endpoint                             | Auth | Purpose              |
| ------------------------------------ | ---- | -------------------- |
| `GET /v1/deployment/health`          | No   | Load balancer health |
| `GET /v1/deployment/health/detailed` | No   | Full diagnostics     |
| `GET /v1/deployment/ready`           | No   | K8s readiness probe  |
| `GET /v1/deployment/live`            | No   | K8s liveness probe   |

### Feature Flags

| Endpoint                                     | Method | Auth | Purpose          |
| -------------------------------------------- | ------ | ---- | ---------------- |
| `/v1/deployment/features`                    | GET    | Yes  | List all flags   |
| `/v1/deployment/features/{name}`             | GET    | Yes  | Get flag status  |
| `/v1/deployment/features/{name}/enable`      | POST   | Yes  | Enable flag      |
| `/v1/deployment/features/{name}/disable`     | POST   | Yes  | Disable flag     |
| `/v1/deployment/features/{name}/maintenance` | POST   | Yes  | Maintenance mode |

### Database

| Endpoint                                     | Method | Auth | Purpose             |
| -------------------------------------------- | ------ | ---- | ------------------- |
| `/v1/deployment/database/validate-schema`    | POST   | Yes  | Schema validation   |
| `/v1/deployment/database/validate-integrity` | POST   | Yes  | Data integrity      |
| `/v1/deployment/database/migration-ready`    | POST   | Yes  | Pre-migration check |

### Verification

| Endpoint                | Method | Auth | Purpose           |
| ----------------------- | ------ | ---- | ----------------- |
| `/v1/deployment/verify` | GET    | Yes  | Full verification |
| `/v1/deployment/status` | GET    | No   | Status page       |

## 📁 Files Created

### Code Files

```
resume-api/lib/deployment/migration_validator.py   (365 lines)
resume-api/lib/deployment/__init__.py               (31 lines)
resume-api/routes/deployment.py                     (330 lines)
resume-api/scripts/validate_migrations.py           (380 lines)
```

### Documentation Files

```
resume-api/DEPLOYMENT_VERIFICATION.md               (500+ lines)
ISSUE_378_IMPLEMENTATION_SUMMARY.md                 (comprehensive)
ISSUE_378_VERIFICATION_RESULTS.md                   (test results)
DEPLOYMENT_SAFEGUARDS_QUICK_REFERENCE.md            (this file)
```

## 🔄 Deployment Workflow

### 1. Pre-Deployment

```bash
# Code quality
npm run lint && npm run type-check && npm run test
cd resume-api && pytest tests/

# Database validation
python resume-api/scripts/validate_migrations.py --pre-migration

# Backup
pg_dump resumeai > backup_$(date +%s).sql
```

### 2. Deploy

```bash
# Frontend
npm run build

# Backend
cd resume-api && docker build -t resume-api:1.0.0 .
```

### 3. Post-Deployment

```bash
# Health check
curl http://localhost:8000/v1/deployment/health

# Readiness
curl http://localhost:8000/v1/deployment/ready

# Full verification
curl -H "X-API-KEY: $KEY" http://localhost:8000/v1/deployment/verify

# Database
python resume-api/scripts/validate_migrations.py --post-migration
```

### 4. Feature Rollout

```bash
# Start with 10%
curl -X POST -H "X-API-KEY: $KEY" \
  "http://localhost:8000/v1/deployment/features/FEATURE/enable?rollout_percentage=10"

# Monitor (30 mins)
watch -n 60 'curl -s http://localhost:8000/metrics | jq ".error_rate"'

# Increase to 25%
curl -X POST -H "X-API-KEY: $KEY" \
  "http://localhost:8000/v1/deployment/features/FEATURE/enable?rollout_percentage=25"

# Continue monitoring and increasing
```

## 🚨 Emergency Rollback

### Feature Flag Disabled (< 1 min)

```bash
curl -X POST -H "X-API-KEY: $KEY" \
  http://localhost:8000/v1/deployment/features/FEATURE/disable
```

### Container Rollback (2-5 min)

```bash
docker stop resume-api
docker run -d --name resume-api \
  --env-file .env -p 8000:8000 \
  resume-api:1.2.2  # Previous version
```

### Database Rollback (5-30 min)

```bash
psql resumeai < backup_*.sql
```

## 📈 Feature Flag Status Values

| Status      | Meaning                    | Use Case                 |
| ----------- | -------------------------- | ------------------------ |
| DISABLED    | Feature is off             | During development       |
| ENABLED     | Feature is on for 100%     | After successful rollout |
| ROLLOUT     | Feature is on for X%       | Gradual deployment       |
| MAINTENANCE | Feature is temporarily off | Maintenance/debugging    |

## 📊 Monitoring

### Health Metrics

```bash
# Monitor continuously
watch -n 30 'curl -s http://localhost:8000/v1/deployment/health | jq .'

# Check error rate
curl -s http://localhost:8000/metrics | jq ".error_rate"

# Check response time p99
curl -s http://localhost:8000/metrics | jq ".response_time_p99"
```

### Feature Flags

```bash
# Check which flags are enabled
curl -H "X-API-KEY: $KEY" \
  http://localhost:8000/v1/deployment/features | \
  jq '.flags[] | select(.status != "disabled")'

# Check flag rollout percentage
curl -H "X-API-KEY: $KEY" \
  "http://localhost:8000/v1/deployment/features/FEATURE" | \
  jq '.rollout_percentage'
```

## 🔐 Configuration

### Environment Variables

```bash
# Required
MASTER_API_KEY=rai_your_key_here
REQUIRE_API_KEY=true

# Optional feature flags
FEATURE_FLAG_NEW_PDF_RENDERER=disabled
FEATURE_FLAG_AI_TAILORING_V2=disabled
FEATURE_FLAG_ADVANCED_ANALYTICS=disabled
FEATURE_FLAG_REAL_TIME_COLLABORATION=disabled
```

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    image: resume-api:1.0.0
    environment:
      - MASTER_API_KEY=${MASTER_API_KEY}
      - REQUIRE_API_KEY=true
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/v1/deployment/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /v1/deployment/live
    port: 8000
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /v1/deployment/ready
    port: 8000
  periodSeconds: 10
```

## 🔍 Troubleshooting

### Health Check Fails

```bash
# Get detailed status
curl http://localhost:8000/v1/deployment/health/detailed

# Check specific component
curl http://localhost:8000/v1/deployment/health/detailed | jq '.details.database'

# Common issues:
# - Database not running: Check DB_HOST, DB_PORT, credentials
# - AI provider down: Check API key and provider status
# - Disk space low: Free up disk space
# - High memory: Check for memory leaks
```

### Feature Flag Not Working

```bash
# Verify flag exists
curl -H "X-API-KEY: $KEY" \
  "http://localhost:8000/v1/deployment/features/FEATURE"

# Check status
curl -H "X-API-KEY: $KEY" \
  "http://localhost:8000/v1/deployment/features/FEATURE" | jq '.status'

# Verify code uses flag
grep -r "feature_flag_manager.is_enabled" resume-api/
```

### Migration Validation Fails

```bash
# Run validation
python resume-api/scripts/validate_migrations.py --pre-migration

# Save report
python resume-api/scripts/validate_migrations.py --pre-migration --save-report

# Check report
cat migration_validation_report.json | jq '.errors'
```

## 📚 Full Documentation

- **Implementation Details**: [ISSUE_378_IMPLEMENTATION_SUMMARY.md](ISSUE_378_IMPLEMENTATION_SUMMARY.md)
- **Verification Results**: [ISSUE_378_VERIFICATION_RESULTS.md](ISSUE_378_VERIFICATION_RESULTS.md)
- **Deployment Guide**: [resume-api/DEPLOYMENT_VERIFICATION.md](resume-api/DEPLOYMENT_VERIFICATION.md)
- **Safeguards**: [resume-api/DEPLOYMENT_SAFEGUARDS.md](resume-api/DEPLOYMENT_SAFEGUARDS.md)
- **Rollback**: [resume-api/ROLLBACK_PROCEDURE.md](resume-api/ROLLBACK_PROCEDURE.md)
- **Blue-Green**: [resume-api/BLUE_GREEN_DEPLOYMENT.md](resume-api/BLUE_GREEN_DEPLOYMENT.md)

## ✅ Verification Checklist

Before deploying:

- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] `python resume-api/scripts/validate_migrations.py --pre-migration` passes
- [ ] Backup created: `pg_dump resumeai > backup.sql`
- [ ] Feature flags configured in `.env`

After deploying:

- [ ] `curl http://localhost:8000/v1/deployment/health` returns 200
- [ ] `curl http://localhost:8000/v1/deployment/ready` returns 200
- [ ] `curl http://localhost:8000/v1/deployment/live` returns 200
- [ ] `python resume-api/scripts/validate_migrations.py --post-migration` passes
- [ ] Feature flags responding: `curl -H "X-API-KEY: $KEY" http://localhost:8000/v1/deployment/features`
- [ ] Metrics normal: error rate < 0.1%, p99 latency < 2s

---

**Last Updated**: February 26, 2024
**Version**: 1.0
**Status**: Production Ready
