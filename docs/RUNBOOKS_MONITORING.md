# Monitoring and Logging Runbook

**Last Updated:** March 9, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [Monitoring Overview](#monitoring-overview)
2. [Key Metrics](#key-metrics)
3. [Alert Management](#alert-management)
4. [Log Analysis](#log-analysis)
5. [Dashboards](#dashboards)
6. [Troubleshooting with Metrics](#troubleshooting-with-metrics)

---

## Monitoring Overview

ResumeAI uses the following monitoring stack:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **AlertManager**: Alert routing
- **Loki**: Log aggregation

**Infrastructure:**
- API: `http://api.resumeai.com`
- Prometheus: `http://prometheus.monitoring:9090`
- Grafana: `http://grafana.monitoring:3000`
- Loki: `http://loki.monitoring:3100`

---

## Key Metrics

### Application Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `http_requests_total` | Total HTTP requests | > 1000/min | > 5000/min |
| `http_request_duration_seconds` | Request latency p95 | > 1s | > 5s |
| `http_5xx_errors_total` | Server errors | > 1% | > 5% |
| `active_users` | Concurrent users | > 100 | > 500 |
| `pdf_generation_duration` | PDF generation time | > 30s | > 60s |

### Database Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `pg_stat_activity_count` | Active connections | > 50 | > 80 |
| `pg_stat_activity_idle` | Idle connections | > 100 | > 200 |
| `pg_stat_statements_mean_exec_time` | Avg query time | > 100ms | > 500ms |
| `pg_database_size_bytes` | Database size | > 10GB | > 50GB |

### Redis Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `redis_memory_used_bytes` | Memory used | > 1.5GB | > 1.9GB |
| `redis_connected_clients` | Client connections | > 100 | > 200 |
| `redis_keyspace_hits_total` | Cache hit rate | < 80% | < 60% |
| `redis_evicted_keys_total` | Evicted keys | > 1000/min | > 10000/min |

### Celery/Queue Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `celery_queue_length` | Queue size | > 50 | > 200 |
| `celery_active_tasks` | Active tasks | > 20 | > 50 |
| `celery_task_duration` | Task duration | > 60s | > 300s |
| `celery_failed_tasks_total` | Failed tasks | > 10/hr | > 50/hr |

---

## Alert Management

### View Active Alerts

```bash
# In Prometheus
ALERTS{alertstate="firing"}

# In AlertManager
curl -s http://alertmanager.monitoring:9093/api/v1/alerts | jq .

# In Grafana
# View alerting panel
```

### Acknowledge Alert

```bash
# Using amtool (AlertManager CLI)
amtool alert ack alertname <alert-name> --alertmanager.url=http://alertmanager.monitoring:9093

# Or in Grafana UI
# Navigate to Alerting > Alert rules > Find alert > Acknowledge
```

### Silence Alert

```bash
# Create silence
amtool silence add \
  --alertname "HighLatency" \
  --duration "1h" \
  --author "oncall@resumeai.com" \
  --comment "Known issue, investigating" \
  --alertmanager.url=http://alertmanager.monitoring:9093

# List silences
amtool silence ls --alertmanager.url=http://alertmanager.monitoring:9093

# Expire silence
amtool silence expire <silence-id> --alertmanager.url=http://alertmanager.monitoring:9093
```

### Common Alerts

#### High CPU Usage

```bash
# Check pod CPU
kubectl top pods -n production

# Check node CPU
kubectl top nodes

# View process
kubectl exec -it deployment/resume-api -n production -- top

# Resolution: Scale up or optimize
kubectl scale deployment/resume-api --replicas=5 -n production
```

#### High Memory Usage

```bash
# Check pod memory
kubectl top pods -n production

# Check oomkills
kubectl get events -n production | grep OOMKilled

# View memory usage in pod
kubectl exec -it deployment/resume-api -n production -- free -h

# Resolution: Increase memory limit or optimize
kubectl set resources deployment/resume-api -n production \
  --requests=memory=1Gi \
  --limits=memory=2Gi
```

#### Disk Space Warning

```bash
# Check disk
kubectl exec -it statefulset/postgres -n production -- df -h

# Check PVC
kubectl get pvc -n production

# Find large files
kubectl exec -it deployment/resume-api -n production -- du -sh /var/log/*

# Resolution: Clean up logs or expand storage
kubectl exec -it deployment/resume-api -n production -- rm -rf /var/log/*.gz
```

---

## Log Analysis

### View Logs

```bash
# Kubernetes logs
kubectl logs -n production deployment/resume-api --tail=100
kubectl logs -n production deployment/resume-api -f

# Previous container logs
kubectl logs -n production deployment/resume-api --previous

# Specific pod
kubectl logs -n production pod/resume-api-xxx --tail=100
```

### Query Logs with Loki

```bash
# Using logcli
logcli query '{job="resume-api"}' --limit=100

# Search for errors
logcli query '{job="resume-api"} |= "error"' --limit=100

# Search for specific user
logcli query '{job="resume-api"}' | grep "user_id=12345"

# Time range
logcli query '{job="resume-api"}' --since=1h
```

### Structured Logging

```bash
# JSON logs
kubectl logs -n production deployment/resume-api | jq .

# Filter by level
kubectl logs -n production deployment/resume-api | jq '.level | if . == "error" then . else empty end'

# Search in JSON
kubectl logs -n production deployment/resume-api | jq 'select(.msg | contains("login"))'
```

### Common Log Patterns

```bash
# Find authentication errors
kubectl logs -n production deployment/resume-api | grep -i "auth\|login\|unauthorized"

# Find database errors
kubectl logs -n production deployment/resume-api | grep -i "database\|postgres\|sql"

# Find slow queries
kubectl logs -n production deployment/resume-api | grep -i "slow\|timeout"

# Find OAuth errors
kubectl logs -n production deployment/resume-api | grep -i "oauth\|github\|linkedin"

# Find rate limiting
kubectl logs -n production deployment/resume-api | grep -i "rate\|limit\|429"
```

### Debug Mode

```bash
# Enable debug logging
kubectl set env deployment/resume-api LOG_LEVEL=DEBUG -n production

# Restart to apply
kubectl rollout restart deployment/resume-api -n production

# View debug logs
kubectl logs -n production deployment/resume-api | grep -i debug

# Disable when done
kubectl set env deployment/resume-api LOG_LEVEL=INFO -n production
kubectl rollout restart deployment/resume-api -n production
```

---

## Dashboards

### Key Grafana Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| API Overview | `/d/api-overview` | API health and performance |
| Database | `/d/database` | PostgreSQL metrics |
| Redis | `/d/redis` | Cache performance |
| Celery | `/d/celery` | Queue and worker status |
| OAuth | `/d/oauth` | Authentication metrics |
| User Activity | `/d/users` | User engagement |

### Access Grafana

```bash
# Port forward to Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Get admin credentials
kubectl get secret grafana -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

### Create Custom Dashboard

```json
{
  "dashboard": {
    "title": "ResumeAI Custom",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph", 
        "targets": [
          {
            "expr": "rate(http_5xx_errors_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## Troubleshooting with Metrics

### High Latency

**Diagnosis:**

```bash
# Check overall latency
curl -s http://prometheus.monitoring:9090/api/v1/query?query='histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))'

# Find slowest endpoints
curl -s http://prometheus.monitoring:9090/api/v1/query?query='topk(10,histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m])) by (route))'

# Check database contribution
curl -s http://prometheus.monitoring:9090/api/v1/query?query='rate(pg_stat_statements_mean_exec_time[5m])'
```

**Resolution:**

1. Database optimization:
   ```sql
   -- Add indexes
   CREATE INDEX CONCURRENTLY idx_resumes_user_id ON resumes(user_id);
   
   -- Analyze table
   ANALYZE resumes;
   ```

2. Scale horizontally:
   ```bash
   kubectl scale deployment/resume-api --replicas=5 -n production
   ```

### High Error Rate

**Diagnosis:**

```bash
# Check error rate by type
curl -s http://prometheus.monitoring:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m])'

# Check error messages
kubectl logs -n production deployment/resume-api | grep -i "error\|exception" | tail -100

# Check specific endpoint errors
curl -s http://prometheus.monitoring:9090/api/v1/query?query='rate(http_requests_total{route="/api/resumes",status="500"}[5m])'
```

**Resolution:**

1. Check deployment:
   ```bash
   # View recent deployments
   kubectl rollout history deployment/resume-api -n production
   
   # Rollback if needed
   kubectl rollout undo deployment/resume-api -n production
   ```

2. Check dependencies:
   ```bash
   # Database
   curl -s http://api.resumeai.com/health | jq .dependencies.database
   
   # Redis
   curl -s http://api.resumeai.com/health | jq .dependencies.redis
   ```

### Database Connection Pool Exhausted

**Diagnosis:**

```bash
# Check connection count
curl -s http://prometheus.monitoring:9090/api/v1/query?query='pg_stat_activity_count'

# Check waiting queries
curl -s http://prometheus.monitoring:9090/api/v1/query?query='pg_stat_activity_waiting'

# Check for locks
psql $DATABASE_URL -c "
SELECT * FROM pg_locks WHERE NOT granted;"
```

**Resolution:**

1. Kill idle connections:
   ```bash
   psql $DATABASE_URL -c "
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND query_start < now() - interval '10 minutes';"
   ```

2. Increase pool size:
   ```bash
   kubectl set env deployment/resume-api DATABASE_POOL_SIZE=20 -n production
   kubectl rollout restart deployment/resume-api -n production
   ```

3. Add read replica:
   ```bash
   kubectl apply -f database-replica.yaml
   ```

---

## Quick Reference

### Common Queries

```bash
# Request rate
rate(http_requests_total[5m])

# Error rate  
rate(http_requests_total{status=~"5.."}[5m])

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active connections
pg_stat_activity_count

# Cache hit rate
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))

# Queue length
celery_queue_length{name="pdf_generation"}
```

### Useful Links

- Prometheus: http://prometheus.monitoring:9090
- Grafana: http://grafana.monitoring:3000
- AlertManager: http://alertmanager.monitoring:9093
- Loki: http://loki.monitoring:3100

---

## Related Documentation

- [RUNBOOKS.md](./RUNBOOKS.md) - Main runbook
- [MONITORING_SETUP.md](../MONITORING_SETUP.md) - Monitoring setup
- [MONITORING_PROMETHEUS_GRAFANA.md](../MONITORING_PROMETHEUS_GRAFANA.md) - Prometheus/Grafana
- [oauth-monitoring-runbook.md](./oauth-monitoring-runbook.md) - OAuth monitoring
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting

---

**Last Reviewed:** March 9, 2026  
**Next Review:** April 9, 2026 (Monthly)  
**Owner:** DevOps Team
