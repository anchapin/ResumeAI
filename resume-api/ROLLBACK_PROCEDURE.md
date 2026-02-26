# Rollback Procedure

## Overview

This document provides detailed step-by-step procedures for rolling back ResumeAI deployments at various levels, from simple feature flag disabling to complete system rollback. Choose the appropriate procedure based on the severity and scope of the issue.

## Table of Contents

1. [Rollback Levels](#rollback-levels)
2. [Feature Flag Rollback](#feature-flag-rollback)
3. [Container Rollback](#container-rollback)
4. [Database Rollback](#database-rollback)
5. [Complete System Rollback](#complete-system-rollback)
6. [Rollback Verification](#rollback-verification)
7. [Post-rollback Procedures](#post-rollback-procedures)
8. [Rollback Troubleshooting](#rollback-troubleshooting)

## Rollback Levels

| Level | Scope           | Time to Execute | Risk     | Use When                         |
| ----- | --------------- | --------------- | -------- | -------------------------------- |
| 1     | Feature Flag    | < 1 minute      | Very Low | Specific feature has issues      |
| 2     | Container       | 2-5 minutes     | Low      | Application code or config issue |
| 3     | Database        | 5-30 minutes    | Medium   | Data consistency issues          |
| 4     | Complete System | 10-60 minutes   | High     | Multiple component failures      |

## Feature Flag Rollback

**Use this when a newly enabled feature is causing issues.**

### Prerequisites

- Feature flag management dashboard or API access
- Appropriate API credentials
- Knowledge of which feature flag to disable

### Procedure

#### Step 1: Identify Problematic Feature

```bash
# Check feature flag status
curl -X GET http://localhost:8000/v1/health/features \
  -H "X-API-KEY: $MASTER_API_KEY"

# Output example:
# {
#   "oauth": true,
#   "storage_quota": true,
#   "token_encryption": true,
#   "retry_logic": true,
#   "new_api_endpoint": true  ← Problem flag
# }
```

#### Step 2: Disable Feature Flag

**Option A: Environment Variable (Recommended for Container-based deployments)**

```bash
# Update environment variable
export FEATURE_FLAG_NEW_API_ENDPOINT=false

# For Docker containers
docker update --env-file .env resume-api
docker restart resume-api
```

**Option B: Configuration File**

```bash
# Edit feature flags configuration
nano config/feature_flags.yml

# Set the problematic feature to false
new_api_endpoint: false
```

**Option C: API Endpoint (if implemented)**

```bash
# Disable via API
curl -X POST http://localhost:8000/v1/admin/feature-flags/disable \
  -H "X-API-KEY: $MASTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "feature": "new_api_endpoint",
    "reason": "Causing high error rate in production"
  }'
```

#### Step 3: Verify Feature is Disabled

```bash
# Check feature status
curl -X GET http://localhost:8000/v1/health/features \
  -H "X-API-KEY: $MASTER_API_KEY"

# Verify health
curl http://localhost:8000/health

# Test affected endpoint (should now use fallback)
curl -X GET http://localhost:8000/v1/old-endpoint \
  -H "X-API-KEY: $MASTER_API_KEY"
```

#### Step 4: Monitor Metrics

```bash
# Watch error rate (should decrease)
watch -n 5 'curl -s http://localhost:8000/v1/metrics | jq ".error_rate"'

# Monitor response times
watch -n 5 'curl -s http://localhost:8000/v1/metrics | jq ".avg_response_time"'
```

#### Step 5: Communication

```bash
# Log the rollback action
echo "[$(date)] Rolled back feature flag: new_api_endpoint - Reason: High error rate" >> logs/rollback.log

# Notify team
# Send message to #deployments channel with:
# - Feature rolled back: new_api_endpoint
# - Reason: High error rate (XX% errors observed)
# - Time of rollback: YYYY-MM-DD HH:MM:SS
# - Status: All systems normal
```

## Container Rollback

**Use this when application code or configuration changes are causing issues.**

### Prerequisites

- Docker registry access
- Knowledge of previous stable image tag/version
- Container orchestration tool access (if using Kubernetes)

### Procedure

#### Step 1: Verify Current State

```bash
# Get current container image and version
docker ps -a --filter "name=resume-api" --format "table {{.Image}}\t{{.Status}}"

# Check current version
curl http://localhost:8000/v1/version

# Review recent deployments
docker image ls resume-api --format "table {{.Repository}}\t{{.Tag}}\t{{.Created}}"
```

#### Step 2: Identify Previous Stable Version

```bash
# List available versions (assuming semantic versioning)
docker image ls resume-api --format "table {{.Repository}}\t{{.Tag}}\t{{.Created}}"

# Example output:
# REPOSITORY   TAG        CREATED
# resume-api   1.2.3      2 days ago      ← CURRENT (BROKEN)
# resume-api   1.2.2      5 days ago      ← PREVIOUS (STABLE) ← USE THIS
# resume-api   1.2.1      10 days ago
# resume-api   latest     2 days ago
```

#### Step 3: Stop Current Container

```bash
# Graceful shutdown (30 second grace period)
docker stop resume-api

# Verify stopped
docker ps -a | grep resume-api

# If not stopped after 30s, force stop
docker kill resume-api
```

#### Step 4: Start Previous Version

```bash
# Start with previous stable version
docker run -d \
  --name resume-api-rollback \
  --env-file .env \
  -p 8000:8000 \
  --health-cmd='curl -f http://localhost:8000/health || exit 1' \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=3 \
  resume-api:1.2.2

# Or update existing container
docker run -d \
  --name resume-api \
  --replace \
  --env-file .env \
  -p 8000:8000 \
  resume-api:1.2.2
```

#### Step 5: Verify Health

```bash
# Wait for container to be healthy
sleep 5

# Check health status
curl http://localhost:8000/health

# Verify version matches
curl http://localhost:8000/v1/version

# Run smoke tests
python scripts/validate_deployment.py --smoke-test
```

#### Step 6: Monitor Service

```bash
# Monitor logs for errors
docker logs -f resume-api

# Check metrics return to normal
curl http://localhost:8000/v1/metrics

# Verify database connectivity
curl -X GET http://localhost:8000/v1/status/database \
  -H "X-API-KEY: $MASTER_API_KEY"
```

#### Step 7: Clean Up

```bash
# Remove broken image (optional)
docker rmi resume-api:1.2.3

# Or keep for root cause analysis
# Tag with date for analysis
docker tag resume-api:1.2.3 resume-api:1.2.3-broken-2024-02-26
```

### Kubernetes Rollback

If using Kubernetes:

```bash
# Check rollout history
kubectl rollout history deployment/resume-api

# Rollback to previous deployment
kubectl rollout undo deployment/resume-api

# Verify rollback status
kubectl rollout status deployment/resume-api

# Check pod status
kubectl get pods -l app=resume-api
```

## Database Rollback

**Use this when data changes are causing issues or migrations have introduced problems.**

### Prerequisites

- Database backup from before the problematic deployment
- Database access credentials
- Application downtime acceptable (or read-only mode enabled)
- Backup verification completed

### Procedure

#### Step 1: Identify Backup to Restore

```bash
# List available backups
ls -lh backups/

# Example output:
# -rw-r--r-- 1 root root 512M Feb 26 09:00 resumeai_20240226_090000.sql
# -rw-r--r-- 1 root root 512M Feb 26 02:00 resumeai_20240226_020000.sql ← USE THIS
# -rw-r--r-- 1 root root 510M Feb 25 02:00 resumeai_20240225_020000.sql

# Verify backup integrity
./scripts/verify_backup.sh backups/resumeai_20240226_020000.sql
```

#### Step 2: Enable Read-Only Mode (Optional but Recommended)

```bash
# Set application to read-only to prevent writes during restore
export READ_ONLY_MODE=true

# Restart application with read-only mode
docker restart resume-api

# Verify read-only mode active
curl -X POST http://localhost:8000/v1/resumes \
  -H "X-API-KEY: $MASTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'

# Should return: {"error": "Service is in read-only mode"}
```

#### Step 3: Create Safety Backup

```bash
# Create backup of current (broken) database state for analysis
./scripts/create_database_backup.sh --tag "broken-state-$(date +%s)"

# This preserves the problematic state for root cause analysis
```

#### Step 4: Stop Application

```bash
# Stop application to prevent conflicts
docker stop resume-api

# Verify stopped
docker ps | grep resume-api
```

#### Step 5: Restore Database

```bash
# Option A: Using restore script
./scripts/restore_backup.sh backups/resumeai_20240226_020000.sql

# Option B: Manual restoration
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD resumeai < backups/resumeai_20240226_020000.sql
```

#### Step 6: Verify Restored Data

```bash
# Verify database connectivity
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD resumeai -e "SELECT COUNT(*) FROM resumes;"

# Check schema integrity
./scripts/verify_schema.sh

# Validate data consistency
python scripts/validate_deployment.py --verify-data-integrity
```

#### Step 7: Restart Application

```bash
# Restart application with restored database
docker start resume-api

# Disable read-only mode
export READ_ONLY_MODE=false
docker restart resume-api

# Verify health
sleep 5
curl http://localhost:8000/health
```

#### Step 8: Post-Restore Validation

```bash
# Run comprehensive validation
python scripts/validate_deployment.py --post-restore-validation

# Smoke tests
python scripts/validate_deployment.py --smoke-test

# Test critical user workflows
# (automated or manual depending on availability)
```

#### Step 9: Monitor for Issues

```bash
# Watch logs for any post-restore errors
docker logs -f resume-api

# Monitor error rate
watch -n 10 'curl -s http://localhost:8000/v1/metrics | jq ".error_rate"'

# Check for data consistency issues
curl -X GET http://localhost:8000/v1/health/detailed \
  -H "X-API-KEY: $MASTER_API_KEY"
```

### Database Rollback with Active Users

If users are using the system during rollback:

```bash
# 1. Enable read-only mode FIRST
export READ_ONLY_MODE=true
docker restart resume-api

# 2. Wait for in-flight requests to complete (grace period)
sleep 30

# 3. Create backup of current state
./scripts/create_database_backup.sh --tag "rollback-$(date +%s)"

# 4. Perform restore
./scripts/restore_backup.sh backups/resumeai_20240226_020000.sql

# 5. Clear cache to ensure consistency
python -c "from lib.cache import clear_all; clear_all()"

# 6. Disable read-only mode and restart
export READ_ONLY_MODE=false
docker restart resume-api

# 7. Notify users of rollback
# "Service experienced a brief interruption. Please refresh your page."
```

## Complete System Rollback

**Use this when multiple components have failed or feature/container/database rollbacks are insufficient.**

### Prerequisites

- Previous stable deployment environment (blue/green setup)
- All component versions documented
- Team approval for complete rollback
- Estimated data loss acceptable to business

### Procedure

#### Step 1: Declare Incident

```bash
# Notify all stakeholders
# Send notifications with:
# - Incident severity: CRITICAL
# - Expected resolution: Complete system rollback
# - Estimated downtime: 30-60 minutes
# - RTO: YY minutes
# - RPO: YY minutes
```

#### Step 2: Save Current State for Analysis

```bash
# Backup everything for post-mortem analysis
mkdir -p incidents/$(date +%Y%m%d_%H%M%S)
cd incidents/$(date +%Y%m%d_%H%M%S)

# Save database state
./scripts/create_database_backup.sh --compress

# Save application logs
docker logs resume-api > app.log
docker logs resume-api-db > db.log

# Save configuration
docker inspect resume-api > container_config.json
env | grep -E "^(FEATURE_|DB_|AI_|OAUTH_)" > environment.txt

# Tar everything
cd ..
tar czf incident_$(date +%s).tar.gz $(date +%Y%m%d_%H%M%S)/
```

#### Step 3: Switch to Previous Environment (Blue-Green)

If using blue-green deployment:

```bash
# Identify current and previous environments
# Current: GREEN (broken)
# Previous: BLUE (stable)

# Route traffic to BLUE environment
# (Method depends on load balancer/proxy configuration)

# Option A: Update DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.resumeai.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$BLUE_ZONE_ID'",
          "DNSName": "'$BLUE_ELB'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'

# Option B: Update load balancer target group
aws elbv2 modify-target-group-attributes \
  --target-group-arn $BLUE_TARGET_GROUP_ARN \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30

# Wait for DNS propagation or load balancer update
sleep 30

# Verify traffic routing
curl http://localhost:8000/v1/version
```

#### Step 4: Verify Previous Environment Health

```bash
# Health check on BLUE environment
curl http://blue-api.resumeai.com/health

# Detailed health check
curl http://blue-api.resumeai.com/v1/health/detailed

# Smoke tests
python scripts/validate_deployment.py --smoke-test

# Verify database connectivity
curl -X GET http://blue-api.resumeai.com/v1/status/database \
  -H "X-API-KEY: $MASTER_API_KEY"
```

#### Step 5: Database Consistency Check

```bash
# If database was shared between environments
# Verify no data loss occurred

# Check row counts in critical tables
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD resumeai -e "
  SELECT 'users' as table_name, COUNT(*) FROM users UNION ALL
  SELECT 'resumes', COUNT(*) FROM resumes UNION ALL
  SELECT 'api_keys', COUNT(*) FROM api_keys;
"

# Compare with backup metadata
cat backups/manifest.txt | grep row_counts
```

#### Step 6: Monitor Stability

```bash
# Continuously monitor for 30+ minutes
while true; do
  echo "=== $(date) ==="
  curl -s http://localhost:8000/v1/health/detailed | jq .
  sleep 30
done

# Monitor error logs
tail -f logs/app.log | grep -E "ERROR|CRITICAL"

# Monitor metrics
curl http://localhost:8000/v1/metrics | jq .
```

#### Step 7: Notify Users

```bash
# Update status page
# Communicate resolution:
# "Service has been restored to stable version X.Y.Z
#  All user data is intact. Thank you for your patience."

# Send user notification if applicable
# Clear any error message banners from UI
```

#### Step 8: Post-Rollback Analysis

```bash
# Schedule incident post-mortem
# Collect timeline of events
# Document root cause
# Create action items to prevent recurrence

# Archive incident data
tar czf postmortem_$(date +%s).tar.gz incidents/
```

## Rollback Verification

### Verification Checklist

After any rollback, verify:

- [ ] Health check passing: `curl http://localhost:8000/health`
- [ ] Database connected and responsive
- [ ] Feature flags in expected state
- [ ] Error rate < 0.1%
- [ ] Response times within baseline
- [ ] No data loss detected
- [ ] All critical endpoints functional
- [ ] AI provider integration working
- [ ] Authentication/authorization functional
- [ ] User-facing features working

### Automated Verification

```bash
# Run comprehensive verification script
python scripts/validate_deployment.py --post-rollback-verification

# Expected output:
# ✓ Health check passed
# ✓ Database integrity verified
# ✓ Feature flags configured
# ✓ Error rate acceptable
# ✓ Response times normal
# ✓ All endpoints responding
# ✓ No critical errors in logs
```

### User-Facing Verification

Test in staging or use canary users:

- [ ] Create a new resume
- [ ] Edit existing resume
- [ ] Generate PDF
- [ ] Tailor resume
- [ ] Create variant
- [ ] Test OAuth login
- [ ] Verify storage quota

## Post-rollback Procedures

### Immediate Actions (0-1 hour)

```bash
# 1. Monitor continuously
watch -n 30 'curl -s http://localhost:8000/v1/metrics | jq .'

# 2. Check for cascading issues
# (sometimes rollback exposes other problems)

# 3. Notify stakeholders of resolution
# Include:
# - Rollback completed successfully
# - Service restored to version X.Y.Z
# - No user data loss
# - Timeline of incident

# 4. Document what triggered the rollback
echo "Rollback triggered due to: [specific issue]" >> incidents/rollback_log.txt
```

### Short-term Actions (1-8 hours)

```bash
# 1. Root cause analysis
# - What changed in the problematic deployment?
# - Why wasn't it caught in testing?
# - What safeguards failed?

# 2. Identify fixes needed
# - Code fixes required
# - Configuration changes
# - Migration rollback

# 3. Plan remediation
# - Create fix branches
# - Schedule testing
# - Plan redeployment
```

### Long-term Actions (next few days)

```bash
# 1. Create incident post-mortem
# - Timeline of events
# - Root cause analysis
# - Impact assessment
# - Preventative measures

# 2. Improve safeguards
# - Enhanced testing
# - Better health checks
# - More comprehensive validations

# 3. Update documentation
# - Lessons learned
# - Updated deployment procedures
# - Enhanced rollback procedures

# 4. Team retrospective
# - What went well?
# - What could be improved?
# - Action items for next sprint
```

## Rollback Troubleshooting

### Container won't start after rollback

```bash
# Check logs
docker logs resume-api

# Common issues:
# 1. Environment variables missing
#    Solution: Ensure .env file is complete

# 2. Port already in use
#    Solution: docker kill $(docker ps -q)
#              docker run ... (with different port if needed)

# 3. Volume mounts issues
#    Solution: Verify volume paths: docker inspect resume-api

# 4. Image pull error
#    Solution: docker pull resume-api:1.2.2
```

### Database restore hangs

```bash
# Check database status
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SHOW PROCESSLIST;"

# Kill long-running queries
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "KILL <process_id>;"

# Check disk space
df -h

# If no disk space, cleanup and retry
```

### Health check still failing after rollback

```bash
# 1. Check detailed health
curl http://localhost:8000/v1/health/detailed

# 2. Identify which component is failing
# 3. Address the specific component issue:
#    - Database: Verify connection string, user, permissions
#    - AI Provider: Verify API key, rate limits
#    - Cache: Verify Redis/in-memory cache

# 4. Restart that specific component
```

### Users seeing stale data after rollback

```bash
# Clear all caches
python -c "from lib.cache import clear_all; clear_all()"

# Clear CDN cache if applicable
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

# Clear browser cache in UI (guide users to Ctrl+Shift+Delete)
```

## References

- [Deployment Safeguards](DEPLOYMENT_SAFEGUARDS.md)
- [Blue-Green Deployment](BLUE_GREEN_DEPLOYMENT.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

---

**Last Updated**: 2024-02-26
**Version**: 1.0
**Status**: Active
