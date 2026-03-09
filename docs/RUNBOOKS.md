# ResumeAI Runbooks

**Last Updated:** March 9, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [Database Operations](#database-operations)
2. [Backup and Recovery](#backup-and-recovery)
3. [Scaling Operations](#scaling-operations)
4. [SSL/TLS Certificate Management](#ssltls-certificate-management)
5. [Performance Troubleshooting](#performance-troubleshooting)
6. [Security Incident Response](#security-incident-response)
7. [Data Export and Import](#data-export-and-import)
8. [Service Restart Procedures](#service-restart-procedures)
9. [Cache Management](./RUNBOOKS_CACHE.md) - Redis cache operations
10. [Queue and Worker Management](./RUNBOOKS_QUEUE.md) - Celery queue operations
11. [Authentication Troubleshooting](./RUNBOOKS_AUTH.md) - Auth and OAuth issues
12. [File Upload Troubleshooting](./RUNBOOKS_FILE_UPLOAD.md) - Upload and storage issues
13. [Data Recovery](./RUNBOOKS_DATA_RECOVERY.md) - Partial data recovery procedures
14. [Monitoring and Logging](./RUNBOOKS_MONITORING.md) - Metrics and log analysis

---

## Database Operations

### Database Connection Issues

**Symptoms:**
- Users unable to access application
- API returns 500 errors with database connection messages
- Health check reports database as disconnected

**Diagnosis:**

```bash
# Check database connection
curl -s http://api.resumeai.com/health | jq '.dependencies.database'

# Test direct database connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool status
psql $DATABASE_URL -c "
SELECT datname, usename, state, count(*)
FROM pg_stat_activity
GROUP BY datname, usename, state;"
```

**Resolution:**

1. If connection pool exhausted:
   ```bash
   # Kill idle connections
   psql $DATABASE_URL -c "
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND query_start < now() - interval '5 minutes';"
   ```

2. If database is down:
   ```bash
   # Check database pod status
   kubectl get pods -n production -l app=database

   # Restart database if needed
   kubectl rollout restart statefulset/postgres -n production
   ```

3. Verify application can connect:
   ```bash
   curl -s http://api.resumeai.com/health | jq .
   ```

---

### Database Performance Issues

**Symptoms:**
- Slow API response times
- High database CPU usage
- Slow query execution

**Diagnosis:**

```bash
# Check for slow queries
psql $DATABASE_URL -c "
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"

# Check for locks
psql $DATABASE_URL -c "
SELECT * FROM pg_locks WHERE NOT granted;"

# Check table sizes
psql $DATABASE_URL -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

**Resolution:**

1. For slow queries:
   ```bash
   # Analyze query to update statistics
   psql $DATABASE_URL -c "ANALYZE;"

   # If query still slow, add index
   CREATE INDEX CONCURRENTLY idx_table_column ON table(column);
   ```

2. For locks:
   ```bash
   # Identify blocking query
   SELECT blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query AS blocked_statement,
          blocking_activity.query AS blocking_statement
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_locks.pid = blocked_activity.pid
   JOIN pg_catalog.pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_locks.pid = blocking_activity.pid
   WHERE NOT blocked_locks.granted;
   ```

3. For large tables:
   ```bash
   # Archive old data
   psql $DATABASE_URL -c "
   INSERT INTO archived_table SELECT * FROM main_table WHERE created_at < now() - interval '1 year';"
   
   # Delete old data
   DELETE FROM main_table WHERE created_at < now() - interval '1 year';
   ```

---

## Backup and Recovery

### Automated Backup Verification

**Frequency:** Daily

```bash
# List recent backups
ls -la /backups/

# Verify backup integrity
gunzip -t /backups/resumeai-$(date +%Y%m%d).sql.gz

# Check backup size (should be > 0)
ls -lh /backups/resumeai-$(date +%Y%m%d).sql.gz
```

**Verification Steps:**

1. Check backup file exists and is not empty
2. Verify compression is valid
3. Confirm backup timestamp is recent
4. Review backup logs for errors

---

### Database Restore Procedure

**Warning:** This procedure will overwrite the current database. Use with caution.

**Prerequisites:**
- Backup file available
- Application in maintenance mode
- Sufficient disk space

**Procedure:**

```bash
# 1. Put application in maintenance mode
kubectl scale deployment/resume-api --replicas=0 -n production

# 2. Drop existing database (if recreating)
psql $DATABASE_URL -c "DROP DATABASE IF EXISTS resumeai;"
psql $DATABASE_URL -c "CREATE DATABASE resumeai;"

# 3. Restore from backup
gunzip -c /backups/resumeai-20260307.sql.gz | psql $DATABASE_URL

# 4. Run necessary migrations
kubectl exec -it deployment/resume-api -n production -- python manage.py migrate

# 5. Verify restore
psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# 6. Bring application back
kubectl scale deployment/resume-api --replicas=3 -n production

# 7. Verify health
curl -s http://api.resumeai.com/health
```

**Rollback Plan:**

If restore fails:
1. Keep old database container if possible
2. Contact database team immediately
3. Prepare to restore from previous backup

---

### Point-in-Time Recovery

**Use when:** Need to restore to specific timestamp (e.g., before data corruption)

**Procedure:**

```bash
# 1. Find the backup closest to target time
ls -la /backups/ | grep resumeai

# 2. Restore base backup
gunzip -c /backups/resumeai-20260306.sql.gz | psql $DATABASE_URL

# 3. Apply WAL segments to point-in-time
# Note: Requires WAL archiving to be enabled
pg_restore -h $DB_HOST -U $DB_USER -d resumeai --target-time="2026-03-07 10:00:00" /path/to/wal

# 4. Verify data
psql $DATABASE_URL -c "SELECT * FROM users ORDER BY updated_at DESC LIMIT 5;"
```

---

## Scaling Operations

### Horizontal Scaling (API Pods)

**Current Configuration:** 3 replicas (production)

**Scale Up:**

```bash
# Scale up to handle increased load
kubectl scale deployment/resume-api --replicas=6 -n production

# Verify new pods are running
kubectl get pods -n production -l app=resume-api

# Monitor load after scaling
kubectl top pods -n production
```

**Scale Down:**

```bash
# Scale down after peak load
kubectl scale deployment/resume-api --replicas=3 -n production

# Verify pods are terminating gracefully
kubectl get pods -n production -l app=resume-api
```

**Auto-Scaling Configuration:**

```yaml
# HorizontalPodAutoscaler configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: resume-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: resume-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

### Database Read Replicas

**Use when:** Read operations are slow due to load

**Add Read Replica:**

```bash
# 1. Create read replica
kubectl apply -f database-replica.yaml

# 2. Verify replica is syncing
psql $DATABASE_URL -c "SELECT * FROM pg_stat_replication;"

# 3. Update application config to use replica for reads
# (Requires application support for read/write splitting)
```

**Failover to Replica:**

```bash
# 1. Promote replica to primary
kubectl exec -it postgres-replica-0 -- pg_ctl promote -D /var/lib/postgresql/data

# 2. Update connection string to point to new primary
kubectl set env deployment/resume-api DATABASE_URL="postgres://..." -n production

# 3. Verify application
curl -s http://api.resumeai.com/health
```

---

## SSL/TLS Certificate Management

### Certificate Renewal

**Automated:** Cert-manager handles automatic renewal

**Manual Renewal (if needed):**

```bash
# 1. Check certificate status
kubectl get certificates -n production

# 2. If expiring soon, manually trigger renewal
kubectl delete certificate resumeai-tls -n production

# 3. Verify new certificate
kubectl get certificate resumeai-tls -n production

# 4. Check secret
kubectl get secret resumeai-tls -n production -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -dates
```

---

### SSL Certificate Installation

**For new domain:**

```bash
# 1. Create Certificate resource
cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: resumeai-new-domain-tls
  namespace: production
spec:
  secretName: resumeai-new-domain-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - new-domain.resumeai.com
EOF

# 2. Verify certificate is issued
kubectl get certificate resumeai-new-domain-tls -n production

# 3. Update Ingress to use new certificate
kubectl annotate ingress resumeai-ingress \
  cert-manager.io/cluster-issuer=letsencrypt-prod \
  -n production
```

---

## Performance Troubleshooting

### High Memory Usage

**Symptoms:**
- OOM kills observed
- Application becomes unresponsive
- Memory metric > 85%

**Diagnosis:**

```bash
# Check memory usage
kubectl top pods -n production

# Check for memory leaks in logs
kubectl logs -n production deployment/resume-api | grep -i "memory\|oom" | tail -20

# Check heap dumps (if enabled)
kubectl exec -it deployment/resume-api -n production -- ls -la /heap dumps/
```

**Resolution:**

1. Immediate (if OOM):
   ```bash
   # Restart pods to clear memory
   kubectl rollout restart deployment/resume-api -n production
   ```

2. Long-term:
   - Profile application for memory leaks
   - Increase memory limits
   - Review data structures for memory efficiency

---

### High CPU Usage

**Symptoms:**
- Slow API responses
- High CPU utilization > 80%
- Throttling observed

**Diagnosis:**

```bash
# Check CPU usage
kubectl top pods -n production

# Check for runaway processes
kubectl exec -it deployment/resume-api -n production -- top

# View CPU profiles (if enabled)
kubectl logs -n production deployment/resume-api | grep -i "cpu\|slow"
```

**Resolution:**

1. Identify CPU-intensive endpoints:
   ```bash
   # Check Prometheus for high CPU endpoints
   rate(process_cpu_seconds_total[5m])
   ```

2. Optimize or scale:
   ```bash
   # If specific endpoint, optimize code
   # If general load, scale horizontally
   kubectl scale deployment/resume-api --replicas=5 -n production
   ```

---

### API Latency Issues

**Diagnosis:**

```bash
# Check latency metrics
curl -s http://api.resumeai.com/metrics | grep http_request_duration

# Identify slow endpoints
kubectl logs -n production deployment/resume-api | grep -i "slow\|latency" | tail -50

# Check database query times
psql $DATABASE_URL -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 5;"
```

**Resolution:**

1. Database optimization:
   ```bash
   # Add missing indexes
   CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
   
   # Analyze tables
   psql $DATABASE_URL -c "ANALYZE users;"
   ```

2. Caching:
   ```bash
   # Check Redis cache hit rate
   redis-cli INFO stats | grep hit_rate
   
   # Clear and warm cache if needed
   redis-cli FLUSHDB
   ```

3. Scale services:
   ```bash
   kubectl scale deployment/resume-api --replicas=5 -n production
   ```

---

## Security Incident Response

### Compromised Credentials

**Symptoms:**
- Unauthorized access detected
- Suspicious API activity
- Unusual login patterns

**Immediate Actions:**

```bash
# 1. Revoke all user sessions
redis-cli KEYS "session:*" | xargs redis-cli DEL

# 2. Force password reset for affected users
psql $DATABASE_URL -c "
UPDATE users 
SET password_hash = 'FORCE_RESET_' || password_hash 
WHERE id IN (SELECT user_id FROM suspicious_logins);"

# 3. Rotate API keys
kubectl get secrets -n production -o yaml > secrets-backup.yaml
kubectl create secret generic resume-api-secrets-v2 \
  --from-literal=API_KEY=$(openssl rand -hex 32) \
  -n production

# 4. Check for unauthorized changes
git log --since="24 hours ago" --oneline
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
```

**Communication:**

- Notify affected users immediately
- Document incident timeline
- Report to security team

---

### DDoS Attack Mitigation

**Symptoms:**
- Unusual traffic spike
- API responding slowly or not at all
- 5xx error rate increase

**Immediate Actions:**

```bash
# 1. Check current traffic
kubectl top pods -n production
curl -s http://api.resumeai.com/metrics | grep http_requests_total

# 2. Enable rate limiting if not already
kubectl scale deployment/resume-api --replicas=10 -n production

# 3. Block suspicious IPs (work with cloud provider)
# Example for cloudflare:
curl -X POST "https://api.cloudflare.com/client/v4/user/firewall/access_rules/rules" \
  -H "X-Auth-Email: $CF_EMAIL" \
  -H "X-Auth-Key: $CF_KEY" \
  -d '{"mode":"block","configuration":{"target":"ip","value":"ATTACKER_IP"}}'

# 4. Enable emergency caching
kubectl annotate ingress resumeai-ingress \
  nginx.ingress.kubernetes.io/proxy-buffering="on" \
  -n production
```

**Escalation:**

- Contact cloud provider for additional DDoS protection
- Consider enabling WAF rules
- Notify leadership

---

### Data Breach Response

**Symptoms:**
- Unauthorized data access detected
- Sensitive data in logs
- Database compromise suspected

**Immediate Actions:**

```bash
# 1. Isolate affected systems
kubectl scale deployment/resume-api --replicas=0 -n production

# 2. Preserve evidence
kubectl get pods -n production -o yaml > pods-backup.yaml
kubectl get events -n production > events-backup.txt

# 3. Check for data exfiltration
kubectl logs -n production deployment/resume-api | grep -i "select.*password\|select.*email"

# 4. Secure backups
ls -la /backups/
chmod 600 /backups/*

# 5. Contact security team
# Do NOT attempt to fix without security team involvement
```

**Recovery:**

1. Wait for security team assessment
2. Rebuild infrastructure if needed
3. Restore from known-good backup
4. Conduct post-incident review

---

## Data Export and Import

### User Data Export

**Use when:** User requests their data or for GDPR compliance

```bash
# Export user data
psql $DATABASE_URL << EOF > user_data_$(date +%Y%m%d).json
SELECT json_build_object(
  'user', row_to_json(users),
  'resumes', (SELECT json_agg(row_to_json(resumes)) FROM resumes WHERE user_id = users.id),
  'profiles', (SELECT json_agg(row_to_json(profiles)) FROM profiles WHERE user_id = users.id)
)
FROM users 
WHERE email = 'user@example.com';
EOF

# Verify export
cat user_data_20260307.json | jq .
```

---

### Bulk Data Import

**Use when:** Importing data from external source

```bash
# 1. Validate data format
python3 -c "
import json
with open('data.json') as f:
    data = json.load(f)
    print(f'Valid JSON with {len(data)} records')"

# 2. Dry run (validate without importing)
python3 manage.py import_data --dry-run --file data.json

# 3. Execute import
python3 manage.py import_data --file data.json

# 4. Verify import
psql $DATABASE_URL -c "SELECT count(*) FROM imported_table;"
```

---

## Service Restart Procedures

### Rolling Restart

**Use when:** Deploying updates or restarting for maintenance

```bash
# 1. Check current state
kubectl get pods -n production -l app=resume-api

# 2. Perform rolling restart
kubectl rollout restart deployment/resume-api -n production

# 3. Monitor rollout
kubectl rollout status deployment/resume-api -n production

# 4. Verify health
curl -s http://api.resumeai.com/health
```

---

### Emergency Restart

**Use when:** Service is unresponsive and needs immediate restart

```bash
# 1. Quick restart
kubectl delete pods -n production -l app=resume-api

# 2. Verify new pods
kubectl get pods -n production -l app=resume-api -w

# 3. Check logs for errors
kubectl logs -n production deployment/resume-api --tail=100
```

---

## Quick Reference Commands

### Health Checks

```bash
# Full health check
curl -s http://api.resumeai.com/health | jq .

# Database health
curl -s http://api.resumeai.com/health | jq '.dependencies.database'

# Redis health
curl -s http://api.resumeai.com/health | jq '.dependencies.redis'
```

### Logs

```bash
# View recent errors
kubectl logs -n production deployment/resume-api --tail=200 | grep -i error

# Follow logs in real-time
kubectl logs -n production deployment/resume-api -f

# Search for specific user
kubectl logs -n production deployment/resume-api | grep "user_id=12345"
```

### Metrics

```bash
# View all metrics
curl -s http://api.resumeai.com/metrics

# View specific metrics
curl -s http://api.resumeai.com/metrics | grep http_requests_total
curl -s http://api.resumeai.com/metrics | grep oauth_
curl -s http://api.resumeai.com/metrics | grep error_rate
```

---

## Escalation Contacts

| Role             | Contact          | Response Time |
| ---------------- | ---------------- | ------------- |
| On-Call Engineer | [Phone]          | 15 minutes   |
| Lead Engineer    | [Phone]          | 30 minutes   |
| VP Engineering   | [Phone]          | 1 hour       |
| Security Team    | security@resumeai.com | 15 minutes |

---

## Document History

| Date       | Author      | Changes                      |
| ---------- | ----------- | ---------------------------- |
| 2026-03-07 | DevOps Team | Initial version - Issue #821 |
| 2026-03-09 | DevOps Team | Added runbooks documentation - Issue #918 |

## Related Documentation

- [OPERATIONS.md](./OPERATIONS.md) - General operations and incident response
- [oauth-monitoring-runbook.md](./oauth-monitoring-runbook.md) - OAuth-specific runbook
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Deployment procedures
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
- [RUNBOOKS_CACHE.md](./RUNBOOKS_CACHE.md) - Cache management
- [RUNBOOKS_QUEUE.md](./RUNBOOKS_QUEUE.md) - Queue and worker management
- [RUNBOOKS_AUTH.md](./RUNBOOKS_AUTH.md) - Authentication troubleshooting
- [RUNBOOKS_FILE_UPLOAD.md](./RUNBOOKS_FILE_UPLOAD.md) - File upload troubleshooting
- [RUNBOOKS_DATA_RECOVERY.md](./RUNBOOKS_DATA_RECOVERY.md) - Data recovery procedures
- [RUNBOOKS_MONITORING.md](./RUNBOOKS_MONITORING.md) - Monitoring and logging

---

**Last Reviewed:** March 9, 2026  
**Next Review:** April 9, 2026 (Monthly)  
**Owner:** DevOps Team
