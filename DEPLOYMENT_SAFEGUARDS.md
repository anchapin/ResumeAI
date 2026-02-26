# Deployment Safeguards

## Overview

This document describes safety mechanisms for production deployments to prevent outages and data loss.

## Pre-Deployment Checklist

### Code Quality Checks

- [ ] All unit tests passing: `npm run test` (frontend)
- [ ] All unit tests passing: `pytest` (backend)
- [ ] Test coverage >= 60%
- [ ] ESLint passing: `npm run lint`
- [ ] TypeScript type-check passing: `npm run type-check`
- [ ] No security vulnerabilities: `npm audit`, `pip-audit`
- [ ] No console.log or debugger statements
- [ ] No hardcoded credentials or secrets

### Documentation

- [ ] README.md updated with changes
- [ ] API documentation updated (/docs endpoint)
- [ ] Database migrations documented
- [ ] Configuration changes documented
- [ ] Breaking changes clearly documented
- [ ] Changelog updated (if applicable)

### Infrastructure

- [ ] Environment variables configured in GitHub Secrets
- [ ] Database migrations reviewed and tested
- [ ] Health checks configured and working
- [ ] Monitoring and alerting enabled
- [ ] Rollback procedure tested
- [ ] Disaster recovery plan reviewed

### Deployment Preparation

- [ ] Full backup created
- [ ] Staging deployment successful
- [ ] Smoke tests passing on staging
- [ ] Team notification sent
- [ ] On-call engineer assigned
- [ ] Incident response procedures reviewed

## Health Checks

### Endpoint: /health

Lightweight health check for load balancers and monitoring.

```bash
curl http://localhost:8000/health
{
  "status": "healthy",
  "timestamp": "2024-02-26T12:00:00Z"
}
```

### Endpoint: /health/ready

Detailed readiness check - used to verify all dependencies are up.

```bash
curl http://localhost:8000/health/ready
{
  "ready": true,
  "status": "healthy",
  "checks": {
    "database": {"status": "ok"},
    "redis": {"status": "ok"},
    "ai_provider": {"status": "ok"}
  }
}
```

### Health Check Integration

**Docker Compose:**

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
  interval: 30s
  timeout: 10s
  retries: 3
```

**Kubernetes:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
```

**Monitoring (Prometheus):**

```yaml
scrape_configs:
  - job_name: 'resumeai-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Database Migration Validation

### Pre-Migration Checklist

1. **Backup current database**

   ```bash
   pg_dump -U postgres resumeai > backup_$(date +%s).sql
   ```

2. **Test migration on staging**

   ```bash
   # Run migration on staging first
   ENVIRONMENT=staging python -m alembic upgrade head
   ```

3. **Verify data integrity**

   ```bash
   # Check row counts
   SELECT table_name, COUNT(*) FROM information_schema.tables GROUP BY table_name;
   ```

4. **Review rollback procedure**
   ```bash
   # Test downgrade path
   python -m alembic downgrade -1
   ```

### Migration Validation Rules

```python
# Only forward migrations should be merged
# Example: migrations/0001_initial_schema.py

class Migration:
    def up(self):
        """Upgrade: Add new columns, tables, indexes"""
        pass

    def down(self):
        """Downgrade: Safely revert changes"""
        pass

    def validate(self):
        """Check data consistency after migration"""
        pass
```

### Zero-Downtime Migrations

**Good migration pattern:**

```sql
-- 1. Add new column with default
ALTER TABLE users ADD COLUMN new_field VARCHAR(255) DEFAULT 'default_value';

-- 2. Backfill existing data
UPDATE users SET new_field = 'value' WHERE id > 0;

-- 3. Remove default (optional)
ALTER TABLE users ALTER COLUMN new_field DROP DEFAULT;

-- 4. Add constraint (if needed)
ALTER TABLE users ADD CONSTRAINT check_field CHECK (new_field IS NOT NULL);
```

**Bad migration pattern:**

```sql
-- DON'T: This blocks table for all users
ALTER TABLE users DROP COLUMN old_field;
ALTER TABLE users RENAME COLUMN new_field TO old_field;
```

## Deployment Strategies

### Blue-Green Deployment

**Safest approach for production:**

1. **Blue environment:** Current production version
2. **Green environment:** New version (deployed but not receiving traffic)
3. **Test green:** Run full test suite
4. **Switch traffic:** Load balancer switches to green (instant rollback possible)
5. **Monitor:** Check error rates, latency, logs
6. **Keep blue:** Retain for instant rollback

**Advantages:**

- ✅ Instant rollback (< 1 minute)
- ✅ Full testing before switch
- ✅ No downtime
- ✅ Easy to debug issues

**Implementation:**

```yaml
# docker-compose.prod.yml
services:
  api-blue:
    image: api:v1.0.0
    environment: ENVIRONMENT=production

  api-green:
    image: api:v1.1.0
    environment: ENVIRONMENT=production

  nginx:
    # Route 100% to blue initially
    # Switch to green after testing
    upstream api {
      server api-blue:8000;
      # server api-green:8000;  # Uncomment to switch
    }
```

### Canary Deployment

**Gradually increase traffic to new version:**

1. **Deploy:** New version alongside old version
2. **Route 5% traffic:** To new version
3. **Monitor:** Error rates, latency, logs
4. **Increase to 10%:** If metrics good
5. **Increase to 25%:** Continue monitoring
6. **Increase to 50%:** All good?
7. **Go to 100%:** Confident in stability
8. **Remove old:** After successful soak

**Advantages:**

- ✅ Detects issues with real traffic
- ✅ Graceful rollback possible
- ✅ User impact minimized (only %)

**Rollback at any stage:**

```bash
# If issues detected at 5%:
# 1. Set traffic back to 0% for new version
# 2. Investigate on new version servers
# 3. Route 100% back to old version
# 4. Fix and redeploy
```

### Feature Flags

**Disable problematic features without redeployment:**

```python
from enum import Enum

class Feature(str, Enum):
    VARIANT_GENERATION = "variant_generation"
    SOCIAL_LOGIN = "social_login"
    PDF_EXPORT = "pdf_export"

class FeatureFlags:
    _flags = {
        Feature.VARIANT_GENERATION: True,
        Feature.SOCIAL_LOGIN: True,
        Feature.PDF_EXPORT: False,  # Disabled temporarily
    }

    @staticmethod
    def is_enabled(feature: Feature) -> bool:
        return FeatureFlags._flags.get(feature, False)

# In API endpoint:
@app.get("/variants")
def generate_variants(resume_id: str):
    if not FeatureFlags.is_enabled(Feature.VARIANT_GENERATION):
        raise HTTPException(status_code=503, detail="Feature temporarily disabled")
    # ... generate variants
```

## Monitoring and Alerting

### Key Metrics to Monitor

**Application Metrics:**

- Request count (total, by endpoint)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Latency distribution

**Infrastructure Metrics:**

- CPU usage
- Memory usage
- Disk usage
- Network I/O

**Business Metrics:**

- Resumes generated (count)
- PDF exports (count)
- User errors reported

### Alert Thresholds

```yaml
alerts:
  - name: HighErrorRate
    condition: error_rate > 1%
    severity: critical
    action: Page on-call engineer

  - name: HighLatency
    condition: p99_latency > 5s
    severity: warning
    action: Investigate performance

  - name: DiskFull
    condition: disk_usage > 90%
    severity: critical
    action: Scale storage or cleanup

  - name: ApiDown
    condition: health_check_failed for 2 minutes
    severity: critical
    action: Trigger incident response
```

## Rollback Procedures

### Feature Flag Rollback (5 min)

**For minor bugs in new features:**

1. Open feature flag configuration
2. Set problematic feature to disabled
3. Verify old behavior restored
4. Monitor error rates
5. Time to rollback: < 5 minutes

### Blue-Green Rollback (1 min)

**For critical issues:**

1. Load balancer points to blue (old version)
2. Verify traffic shifted
3. Monitor error rates drop
4. Investigate on green environment
5. Time to rollback: < 1 minute

### Database Rollback (30 min)

**For migration issues:**

1. Stop application servers
2. Restore from backup: `psql < backup.sql`
3. Verify data integrity
4. Fix migration script
5. Restart application
6. Time to rollback: 15-30 minutes

### Full Rollback (1-2 hours)

**For catastrophic failures:**

1. Switch to backup environment
2. Restore last known good backup
3. Verify all systems operational
4. Post-incident review
5. Time to rollback: 1-2 hours

## Incident Response

### On-Call Duties

**Primary on-call responsibilities:**

- Respond to alerts within 5 minutes
- Triage severity (P1/P2/P3)
- Execute rollback if needed
- Post incident summary

### Incident Severity

**P1 - Critical:** Users cannot use service

- Action: Rollback immediately
- Notify: Engineering team + leadership
- Timeline: Respond < 5 min, Resolve < 30 min

**P2 - High:** Degraded service/significant feature broken

- Action: Investigate, rollback if needed
- Notify: Engineering team
- Timeline: Respond < 15 min, Resolve < 2 hours

**P3 - Medium:** Minor issues, workaround available

- Action: Investigate
- Notify: Team (no page)
- Timeline: Resolve < next business day

### Incident Response Steps

1. **Detect** - Alert fired, on-call paged
2. **Respond** - On-call checks status (< 5 min)
3. **Assess** - Severity determined, team assembled (< 15 min)
4. **Mitigate** - Rollback or apply fix (varies by severity)
5. **Verify** - Confirm issue resolved, monitoring normal
6. **Document** - Post-incident review, action items

## Testing Deployments

### Smoke Tests

**Quick validation after deployment:**

```bash
# Health check
curl http://localhost:8000/health

# API endpoint test
curl -H "X-API-KEY: $API_KEY" http://localhost:8000/v1/health

# Sample PDF generation
curl -X POST http://localhost:8000/v1/render/pdf \
  -H "X-API-KEY: $API_KEY" \
  -d @test_resume.json
```

### Staging Deployment

**Full testing before production:**

1. Deploy to staging
2. Run full test suite
3. Manual QA testing
4. Performance testing
5. Security scanning
6. If all pass → approved for production

## Deployment Automation

### GitHub Actions CI/CD

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Test
        run: npm run test && pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v2
      - name: Run health check
        run: curl http://staging:8000/health
      - name: Deploy to production
        run: |
          docker build -t api:${{ github.sha }} .
          docker push api:${{ github.sha }}
      - name: Verify deployment
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/api -n production
```

## References

- [12-Factor App: Backing Services](https://12factor.net/backing-services)
- [Google SRE Book: Release Engineering](https://sre.google/books/)
- [Blue-Green Deployments](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Database Migrations Best Practices](https://wiki.postgresql.org/wiki/Safely_renaming_a_table_or_column_in_PostgreSQL)
