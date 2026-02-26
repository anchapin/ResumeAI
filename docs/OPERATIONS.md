# ResumeAI Operations Runbook

**Last Updated:** February 26, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [Incident Response Procedures](#incident-response-procedures)
2. [Common Alert Runbooks](#common-alert-runbooks)
3. [Deployment Procedures](#deployment-procedures)
4. [Rollback Procedures](#rollback-procedures)
5. [Maintenance Windows](#maintenance-windows)
6. [Escalation Path](#escalation-path)

---

## Incident Response Procedures

### Overview

This section outlines the process for identifying, responding to, and resolving production incidents affecting ResumeAI services.

### Incident Severity Levels

| Severity          | Duration Impact         | User Impact         | Response Time | Escalation                               |
| ----------------- | ----------------------- | ------------------- | ------------- | ---------------------------------------- |
| **Critical (P1)** | Service completely down | All users affected  | 15 minutes    | On-call + Lead engineer + VP Engineering |
| **High (P2)**     | Intermittent/degraded   | Subset of users     | 30 minutes    | On-call + Lead engineer                  |
| **Medium (P3)**   | Degraded performance    | Feature unavailable | 2 hours       | Engineering team                         |
| **Low (P4)**      | Minimal impact          | Minor feature issue | 24 hours      | Standard review                          |

### Incident Response Steps

#### 1. Detection & Alerting

**Automated Monitoring:**

- Prometheus metrics scraped every 15 seconds
- AlertManager evaluates rules and routes notifications
- Grafana dashboards provide real-time visibility
- See [Common Alert Runbooks](#common-alert-runbooks) for specific alert handling

**Manual Detection:**

- Customer reports via Slack/email
- Team member notices anomalies
- Dashboard review during on-call rotation

#### 2. Initial Response (First 5 Minutes)

```
1. Acknowledge the alert in Slack #incidents channel
2. Open incident in incident tracking system with timestamp
3. Link to relevant Grafana dashboard
4. Check application logs:
   docker logs -f resume-api
5. Verify API health: GET /health
```

#### 3. Assessment Phase (5-15 Minutes)

**For Each Incident:**

- [ ] Determine severity level (P1-P4)
- [ ] Identify affected service(s)
- [ ] Check recent deployments (git log --oneline -10)
- [ ] Review error logs and metrics
- [ ] Identify blast radius:
  - Single user or multiple?
  - Single feature or entire service?
  - Database, API, or external service?
- [ ] Notify stakeholders if P1/P2

**Key Commands:**

```bash
# View recent deployments
git log --oneline -10

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# View Redis status
redis-cli ping

# Check disk/memory usage
docker stats resume-api

# View recent errors
docker logs resume-api | grep -i error | tail -20
```

#### 4. Mitigation Phase (Parallel to Investigation)

**Immediate Actions (if applicable):**

| Issue                | Action                      | Escalate?          |
| -------------------- | --------------------------- | ------------------ |
| High error rate      | Restart service             | If persists >2 min |
| Database overload    | Check slow queries          | Yes, immediately   |
| Memory leak          | Restart service             | After restart      |
| External API failure | Enable fallback/cache       | No (automatic)     |
| OAuth flow broken    | Check OAuth provider status | Yes, to Lead Eng   |

#### 5. Investigation Phase

**Use Monitoring Dashboards:**

- **Service Health**: http://localhost:3000/d/resume-api-health
- **Request Latency**: http://localhost:3000/d/resume-api-latency
- **Error Tracking**: http://localhost:3000/d/resume-api-errors
- **Resource Usage**: http://localhost:3000/d/resume-api-resources
- **Database Metrics**: http://localhost:3000/d/postgres-metrics

**Investigation Checklist:**

- [ ] Review metrics in 1-hour window before incident
- [ ] Check for correlated deployments or config changes
- [ ] Examine error stack traces
- [ ] Check for resource exhaustion
- [ ] Review external service dependencies (OAuth, GitHub API, etc.)
- [ ] Check for data/schema issues

#### 6. Resolution & Documentation

**After Mitigation:**

1. Root cause identified → Document in incident ticket
2. Temporary mitigation applied → Plan permanent fix
3. Code changes needed → Create PR, follow [Deployment Procedures](#deployment-procedures)
4. Post-incident review → Schedule within 24 hours

**Post-Incident Review (Blameless):**

- What was the root cause?
- How did we detect it?
- How long was the incident?
- What could have prevented this?
- What can we automate?
- Update runbooks/dashboards as needed

### Incident Communication Template

**Slack notification format:**

```
:warning: [P2] API Latency Spike

Status: INVESTIGATING
Severity: High
Affected: Resume PDF generation
Impact: Users experiencing 30-60s delays

Timeline:
- 14:32 UTC: Alert triggered (p99 latency 2.5s → 35s)
- 14:33 UTC: Investigating database connection pool
- [Updates every 5-10 minutes]

Current mitigation: N/A
ETA to resolution: TBD

Lead: @on-call-engineer
Dashboard: [Grafana link]
```

---

## Common Alert Runbooks

See [MONITORING_PROMETHEUS_GRAFANA.md](./MONITORING_PROMETHEUS_GRAFANA.md) for complete alert definitions and metrics.

### Alert: HighErrorRate

**Threshold:** Error rate > 5% for 2 minutes  
**Severity:** P2

**Investigation Steps:**

1. Check error types in logs:

   ```bash
   docker logs resume-api | grep ERROR | tail -50 | sort | uniq -c
   ```

2. Look for patterns:
   - Specific endpoints affected?
   - Specific user IDs affected?
   - Authentication vs application errors?

3. Check recent deployments:

   ```bash
   git log --oneline -5
   # If recent changes, consider rollback
   ```

4. If database-related errors:
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
   ```

**Resolution:**

- If deployment-related: [Rollback Procedures](#rollback-procedures)
- If code bug: Create fix PR, follow [Deployment Procedures](#deployment-procedures)
- If database: Optimize query or add index

---

### Alert: HighLatency

**Threshold:** p99 latency > 1s for 5 minutes  
**Severity:** P2

**Investigation Steps:**

1. Identify slow endpoints:

   ```bash
   # Check Grafana: Request Latency dashboard
   # Filter by high p99/p95 percentiles
   ```

2. Check resource usage:

   ```bash
   docker stats resume-api
   # Look for: CPU >80%, Memory >85%
   ```

3. Database performance:

   ```bash
   psql $DATABASE_URL << EOF
   SELECT query, calls, mean_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 5;
   EOF
   ```

4. Check external API calls:
   - OAuth provider latency?
   - GitHub API response times?
   - View in Prometheus: `http_request_duration_seconds{endpoint="/api/oauth/callback"}`

**Resolution:**

- High CPU: Restart service, investigate code changes
- High Memory: Check for memory leaks in recent code
- Slow DB queries: Add index or optimize query
- External API slowness: Enable request caching, implement timeouts

---

### Alert: DatabaseConnectionError

**Threshold:** Connection pool exhaustion or connection failures  
**Severity:** P1

**Investigation Steps:**

1. Check connection pool status:

   ```bash
   psql $DATABASE_URL -c "
   SELECT datname, usename, state, count(*)
   FROM pg_stat_activity
   GROUP BY datname, usename, state;"
   ```

2. Check for long-running queries:

   ```bash
   psql $DATABASE_URL -c "
   SELECT pid, usename, application_name, state, query_start, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   AND query_start < now() - interval '1 minute';"
   ```

3. Kill idle connections if needed:
   ```bash
   psql $DATABASE_URL -c "
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND query_start < now() - interval '10 minutes';"
   ```

**Resolution:**

- If pool exhausted: Restart application service
- If database down: Check database service logs
- If network issue: Check connectivity, firewall rules
- If too many connections: Reduce pool size, kill idle connections

---

### Alert: DiskSpaceHigh

**Threshold:** >85% utilization  
**Severity:** P2

**Investigation Steps:**

1. Check disk usage:

   ```bash
   df -h
   du -sh /var/lib/postgresql/*
   du -sh /app/logs/*
   ```

2. Identify largest files:

   ```bash
   find / -type f -size +1G 2>/dev/null
   ```

3. Check database size:
   ```bash
   psql $DATABASE_URL -c "
   SELECT datname, pg_size_pretty(pg_database_size(datname))
   FROM pg_database
   ORDER BY pg_database_size(datname) DESC;"
   ```

**Resolution:**

- Clean up old logs: `docker logs --since 30d resume-api > /dev/null`
- Archive old data: Archive logs, run database maintenance
- Vacuum database: `psql $DATABASE_URL -c "VACUUM ANALYZE;"`
- Consider disk expansion if approaching P1

---

### Alert: OutOfMemory (OOM)

**Threshold:** Memory usage >95% or OOM kill detected  
**Severity:** P1

**Investigation Steps:**

1. Check current memory usage:

   ```bash
   free -h
   docker stats resume-api
   ```

2. Check for memory leaks:

   ```bash
   # Review app logs for leak patterns
   docker logs resume-api | grep -i "memory\|leak"
   ```

3. Check recent code changes:
   ```bash
   git log --oneline -20
   # Look for caching, connection pool, or buffer changes
   ```

**Resolution:**

- Immediate: Restart service
- Investigate: Code review of recent changes
- Monitor: Watch memory usage for 1 hour after restart
- Fix: Deploy fix if memory leak identified

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing: `pytest tests/`
- [ ] Code review approved
- [ ] Changelog updated
- [ ] Database migrations tested on staging
- [ ] Configuration validated
- [ ] Team notified in #deployments channel
- [ ] Rollback plan documented

### Deployment Process

#### 1. Create Feature Branch

```bash
git checkout -b feature/description
# Make changes
git commit -m "feat: description"
git push origin feature/description
```

#### 2. Open Pull Request

- Link to GitHub issue
- Add description of changes
- Specify testing approach
- Tag reviewers

#### 3. Code Review & Testing

- [ ] Minimum 2 approvals
- [ ] All CI checks passing
- [ ] Test coverage maintained
- [ ] No performance regressions
- [ ] Documentation updated

#### 4. Merge to Main

```bash
git checkout main
git pull origin main
git merge feature/description
git push origin main
```

CI/CD Pipeline triggers automatically:

- Runs full test suite
- Builds Docker image
- Pushes to staging environment
- Runs staging tests

#### 5. Staging Validation (30 minutes)

```bash
# Verify deployment
curl -s http://staging-api:8000/health | jq .

# Run smoke tests
pytest tests/api_integration_tests/ -v

# Check monitoring
# Visit Grafana staging dashboard

# User acceptance testing
# Manual testing of critical flows
```

#### 6. Production Deployment

**Timing Considerations:**

- Deploy during business hours (9 AM - 5 PM UTC)
- Not during known high-traffic periods
- At least 2 team members available
- No critical features being launched elsewhere

**Deployment Command:**

```bash
# Update deployment manifest
kubectl set image deployment/resume-api \
  resume-api=resumeai/resume-api:${GIT_SHA} \
  --namespace=production

# Or with ArgoCD:
argocd app sync resume-ai-prod

# Verify rollout
kubectl rollout status deployment/resume-api -n production

# Monitor for 15 minutes
watch -n 5 'kubectl get pods -n production | grep resume-api'
```

#### 7. Post-Deployment Verification

```bash
# Check service health
curl -s http://api.resumeai.com/health | jq .

# Verify API endpoints
curl -s http://api.resumeai.com/api/v1/templates | jq '.count'

# Check metrics in Grafana
# Visit: https://monitoring.resumeai.com/d/resume-api-health

# Monitor error rates for 30 minutes
# If error rate increases >2%, consider rollback

# Announce in Slack
# Message: "✅ Production deployment complete. Release v1.2.3 live."
```

### Deployment Checklist (During Deployment)

| Step                         | Owner | Time       | Notes                             |
| ---------------------------- | ----- | ---------- | --------------------------------- |
| Pre-deployment verification  | Eng   | 5 min      | Health checks, test results       |
| Notify team                  | Lead  | 1 min      | Slack #deployments                |
| Deploy to production         | Eng   | 2 min      | kubectl/ArgoCD                    |
| Verify rollout               | Eng   | 2 min      | Pod status, logs                  |
| Run smoke tests              | Eng   | 5 min      | API endpoints, core flows         |
| Monitor metrics              | Eng   | 15 min     | Error rate, latency, success rate |
| Post-deployment notification | Lead  | 1 min      | Slack announcement                |
| **Total**                    |       | **30 min** |                                   |

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback Required:**

- Error rate >10%
- Service unavailable (500s on main endpoints)
- Data corruption detected
- Security vulnerability introduced
- Critical feature broken

**Safe to Monitor/Fix Forward:**

- Error rate 2-5%
- Minor UI bugs
- Single endpoint performance degradation
- Non-critical feature broken

### Quick Rollback

#### Option 1: Kubernetes Rollout (Fastest)

```bash
# Check previous deployment
kubectl rollout history deployment/resume-api -n production

# Rollback to previous version
kubectl rollout undo deployment/resume-api -n production

# Verify rollback
kubectl get pods -n production | grep resume-api
kubectl logs -f deployment/resume-api -n production

# Monitor metrics
watch -n 5 'curl http://api.resumeai.com/health'
```

#### Option 2: Git Revert

```bash
# Find problematic commit
git log --oneline -10

# Revert the commit
git revert <commit-sha>
git push origin main

# Wait for CI/CD pipeline to deploy
# Monitor same as post-deployment
```

#### Option 3: Manual Rollback to Known Good

```bash
# Identify last known good commit
git log --oneline | grep "✅ Verified"

# Checkout that version
git checkout <commit-sha>
docker build -t resumeai/resume-api:rollback-$(date +%s) .
docker push resumeai/resume-api:rollback-$(date +%s)

# Update deployment
kubectl set image deployment/resume-api \
  resume-api=resumeai/resume-api:rollback-<timestamp> \
  -n production
```

### Post-Rollback Process

1. **Acknowledge Rollback**

   ```
   :warning: PRODUCTION ROLLBACK

   Version: v1.2.3 → v1.2.2
   Reason: Error rate spike (5% → 15%)
   Time: 2026-02-26 14:35 UTC
   Lead: @on-call-engineer
   ```

2. **Root Cause Analysis**
   - Why did CI not catch this?
   - What tests are missing?
   - Code review gap?

3. **Fix & Re-Deploy**
   - Create hotfix branch
   - Fix the issue
   - Test thoroughly
   - Re-deploy following [Deployment Procedures](#deployment-procedures)

4. **Post-Mortem**
   - Schedule within 24 hours
   - Document findings
   - Update deployment procedures if needed

---

## Maintenance Windows

### Planned Maintenance

#### Database Maintenance

**Frequency:** Weekly (Sundays 2-3 AM UTC)

```bash
# Maintenance tasks
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER $DB_NAME << EOF

-- Analyze query performance
ANALYZE;

-- Reclaim disk space
VACUUM FULL;

-- Update table statistics
REINDEX DATABASE resumeai;

-- Check for issues
SELECT schemaname, tablename, last_vacuum, last_autovacuum
FROM pg_stat_user_tables;

EOF

# Verify database health
SELECT pg_database_size('resumeai');
```

**Backup Before Maintenance:**

```bash
# Full backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  gzip > /backups/resumeai-$(date +%Y%m%d-%H%M%S).sql.gz

# Verify backup
gunzip -t /backups/resumeai-*.sql.gz
```

#### Cache Invalidation

**Frequency:** As needed or monthly

```bash
# Redis cleanup
redis-cli FLUSHDB

# Verify
redis-cli DBSIZE
redis-cli PING
```

**Procedure:**

1. Notify users of cache refresh
2. Stop application services
3. Flush caches
4. Restart services
5. Verify health

#### Log Rotation & Cleanup

**Frequency:** Daily

```bash
# Rotate logs
docker logs resume-api > logs/archive/resumeai-$(date +%Y%m%d).log

# Clean old logs (>30 days)
find logs/archive -mtime +30 -delete

# Compress recent logs (>7 days)
find logs/archive -mtime +7 -exec gzip {} \;
```

### Scheduled Maintenance Window Example

```
⏰ SCHEDULED MAINTENANCE WINDOW

Date: Sunday, March 5, 2026
Time: 2:00 AM - 3:00 AM UTC (1 hour)

Affected Services:
- Resume API (resumeai.com)
- PDF Generation Service
- Authentication Service

Expected Impact:
- ~5 minutes of unavailability during database maintenance
- Slow requests for up to 30 minutes during index rebuild
- Cache will be emptied (first requests will be slower)

Tasks:
1. Database VACUUM & ANALYZE (5 min)
2. Index rebuild (10 min)
3. Cache invalidation (2 min)
4. Verification & monitoring (15 min)

User Communication:
- Email announcement: 48 hours before
- Slack notice: 24 hours before
- In-app banner: 1 hour before
- Status page update (before & after)
```

### Emergency Maintenance

**For Critical Issues:** No notice required

**Procedure:**

1. Declare emergency maintenance
2. Notify all stakeholders immediately
3. Put service in maintenance mode
4. Fix the issue
5. Verify and bring service back online
6. Post-mortem to prevent recurrence

---

## Escalation Path

### Escalation Levels

```
┌─────────────────────────────────┐
│ User / Customer Report          │
└────────────┬────────────────────┘
             │
       ┌─────▼──────┐
       │ Monitoring │ (Alert from Prometheus/Grafana)
       └─────┬──────┘
             │
     ┌───────┴───────────────┐
     │                       │
  ┌──▼───┐              ┌───▼──┐
  │ P3/4 │              │ P1/2 │
  │ Wait │              │ STAT │
  └──┬───┘              └───┬──┘
     │                      │
  ┌──▼──────────────────┐   │
  │ On-Call Engineer    │◄──┘
  │ (15 min response)   │
  └──┬──────────────────┘
     │
  ┌──▼──────────────────┐
  │ Lead Engineer       │ (30 min)
  │ (if not resolved)   │
  └──┬──────────────────┘
     │
  ┌──▼──────────────────┐
  │ VP Engineering      │ (1 hour)
  │ (if P1, ongoing)    │
  └─────────────────────┘
```

### On-Call Rotation

**Schedule:** Published 1 week in advance  
**Duration:** 1 week (Monday - Sunday UTC)  
**Handoff:** Monday 9 AM UTC

**On-Call Responsibilities:**

- Primary responder for all P1/P2 incidents
- 15-minute response time target
- Update status in Slack #incidents channel
- Escalate when needed
- Document incidents

**On-Call Resources:**

- Runbook (this document)
- Grafana dashboards
- Slack commands for quick diagnostics
- Direct access to all systems

### Escalation Decision Tree

```
Alert Triggered
    │
    ├─→ Check severity level
    │
    ├─→ P4: Log issue, assign for next review
    │
    ├─→ P3: Page on-call (2 hour response target)
    │
    ├─→ P2: Page on-call (30 min response target)
    │   ├─→ If not resolved in 10 min: Page lead engineer
    │   ├─→ If not resolved in 20 min: Page VP Engineering
    │   └─→ Escalate to customer success
    │
    └─→ P1: Page on-call + lead engineer IMMEDIATELY
        ├─→ Conference call within 5 minutes
        ├─→ Customer communication within 10 minutes
        ├─→ VP Engineering update within 15 minutes
        └─→ Press release within 30 minutes (if public impact)
```

### Contact Information

| Role             | Name     | Phone           | Email                | Slack             |
| ---------------- | -------- | --------------- | -------------------- | ----------------- |
| VP Engineering   | [Name]   | +1 XXX-XXX-XXXX | [email]              | @vp-eng           |
| Lead Engineer    | [Name]   | +1 XXX-XXX-XXXX | [email]              | @lead-eng         |
| On-Call Engineer | Rotating | See Schedule    | [See Slack]          | @on-call          |
| Customer Success | Team     | +1 XXX-XXX-XXXX | support@resumeai.com | #customer-support |
| DevOps Team      | Team     | +1 XXX-XXX-XXXX | devops@resumeai.com  | #devops           |

### Escalation Communication Template

**When escalating to Lead Engineer:**

```
@lead-engineer

P2 Incident - Escalation

Issue: [Brief description]
Duration: [Time since start]
Current status: [What on-call has tried]
Suspected cause: [Theory if any]
Additional context: [Logs, metrics, etc.]

Need: [Specific help needed]
```

**When escalating to VP Engineering (P1 only):**

```
@vp-eng

🚨 P1 INCIDENT ESCALATION

Issue: [Critical description]
Start time: [UTC timestamp]
Current impact: [User impact, scale]
Cause: [Root cause if known]
Actions taken: [What's been done]
ETA to resolution: [Estimate]

Status dashboard: [Grafana link]
Incident channel: [Slack #incidents link]
```

---

## Appendix: Quick Reference

### Health Check Command

```bash
# All systems
curl -s http://api.resumeai.com/health | jq .

# Expected response
{
  "status": "healthy",
  "version": "1.2.3",
  "timestamp": "2026-02-26T14:35:00Z",
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "oauth": "available"
  }
}
```

### Critical Dashboards

| Dashboard        | URL                                                    | Purpose                 |
| ---------------- | ------------------------------------------------------ | ----------------------- |
| Service Health   | https://monitoring.resumeai.com/d/resume-api-health    | Overall health metrics  |
| Request Metrics  | https://monitoring.resumeai.com/d/resume-api-metrics   | Latency, throughput     |
| Error Tracking   | https://monitoring.resumeai.com/d/resume-api-errors    | Error rates by endpoint |
| Resources        | https://monitoring.resumeai.com/d/resume-api-resources | CPU, memory, disk       |
| Database         | https://monitoring.resumeai.com/d/postgres-metrics     | DB performance          |
| OAuth Monitoring | https://monitoring.resumeai.com/d/oauth-flow           | Auth metrics            |

### Common Commands

**View logs:**

```bash
docker logs -f resume-api --tail=100
```

**Restart service:**

```bash
kubectl rollout restart deployment/resume-api -n production
```

**Check metrics:**

```bash
curl -s http://localhost:8000/metrics | grep http_requests_total
```

**SSH to pod:**

```bash
kubectl exec -it deployment/resume-api -n production -- /bin/bash
```

**Scale replicas:**

```bash
kubectl scale deployment/resume-api --replicas=5 -n production
```

---

## Document History

| Date       | Author      | Changes                      |
| ---------- | ----------- | ---------------------------- |
| 2026-02-26 | DevOps Team | Initial version - Issue #403 |

## Related Documentation

- [PRODUCTION_DEPLOYMENT_GUIDE.md](../PRODUCTION_DEPLOYMENT_GUIDE.md)
- [MONITORING_PROMETHEUS_GRAFANA.md](./MONITORING_PROMETHEUS_GRAFANA.md)
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)

---

**Last Reviewed:** February 26, 2026  
**Next Review:** March 26, 2026 (Monthly)  
**Owner:** DevOps Team  
**On-Call:** See Slack #on-call-schedule
