# Queue and Worker Management Runbook

**Last Updated:** March 9, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [Queue System Overview](#queue-system-overview)
2. [Monitoring Queues](#monitoring-queues)
3. [Worker Management](#worker-management)
4. [Queue Maintenance](#queue-maintenance)
5. [Troubleshooting](#troubleshooting)
6. [Disaster Recovery](#disaster-recovery)

---

## Queue System Overview

ResumeAI uses a queue system for:
- PDF generation (async processing)
- Email notifications
- Data exports
- Background jobs
- Webhook deliveries

**Queue Configuration:**
- Broker: Redis
- Backend: Celery with Redis result backend
- Queues: `pdf_generation`, `notifications`, `exports`, `webhooks`

---

## Monitoring Queues

### Check Queue Status

```bash
# Check Celery worker status
celery -A resume_api inspect active
celery -A resume_api inspect stats

# Check queue length
redis-cli LLEN celery

# Check specific queue
redis-cli LLEN celery pdf_generation
redis-cli LLEN celery notifications
redis-cli LLEN celery exports

# View queue contents
redis-cli LRANGE celery 0 10
```

### View Active Tasks

```bash
# List active tasks
celery -A resume_api inspect active_queues

# List scheduled tasks
celery -A resume_api inspect scheduled

# List reserved tasks
celery -A resume_api inspect reserved

# List revoked tasks
celery -A resume_api inspect revoked
```

### Monitor Task Status

```bash
# Check task result
celery -A resume_api result <task_id>

# View worker stats
celery -A resume_api inspect stats

# Check worker memory
celery -A resume_api inspect mem
```

### Key Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| Queue Length (pdf_generation) | > 50 | > 200 |
| Queue Length (notifications) | > 100 | > 500 |
| Average Wait Time | > 60s | > 300s |
| Failed Tasks (24h) | > 10 | > 50 |
| Worker Memory | > 1GB | > 2GB |

---

## Worker Management

### Start Workers

```bash
# Start PDF generation worker
celery -A resume_api worker -Q pdf_generation -c 4 --loglevel=info -n pdf_worker@%h

# Start notification worker
celery -A resume_api worker -Q notifications -c 2 --loglevel=info -n notification_worker@%h

# Start all workers
celery -A resume_api worker -Q pdf_generation,notifications,exports,webhooks -c 8 --loglevel=info
```

### Stop Workers

```bash
# Graceful shutdown (wait for tasks to complete)
celery -A resume_api control shutdown --hostname=pdf_worker@*

# Force shutdown (cancel pending tasks)
celery -A resume_api control shutdown --hostname=pdf_worker@%n --force
```

### Restart Workers

```bash
# Rolling restart
celery -A resume_api control beat --stop
celery -A resume_api control beat --start

# Or use Kubernetes
kubectl rollout restart deployment/celery-worker -n production
```

### Scale Workers

```bash
# Scale PDF worker (Kubernetes)
kubectl scale deployment/celery-pdf-worker --replicas=5 -n production

# Scale notification worker
kubectl scale deployment/celery-notification-worker --replicas=3 -n production

# Verify scaling
kubectl get pods -n production -l app=celery
```

---

## Queue Maintenance

### Purge Failed Tasks

```bash
# Purge all tasks from queue
celery -A resume_api purge

# Purge specific queue
celery -A resume_api purge -Q pdf_generation

# Purge by time
redis-cli --scan --pattern "celery*" | xargs redis-cli DEL
```

### Retry Failed Tasks

```bash
# Retry specific task
celery -A resume_api inspect retry <task_id>

# Retry all failed tasks
celery -A resume_api control revoke --expired

# Manually retry from database
psql $DATABASE_URL -c "
SELECT * FROM celery_taskmeta 
WHERE status = 'FAILURE'
LIMIT 100;"
```

### Clear Stale Tasks

```bash
# Find stale tasks (running > 1 hour)
psql $DATABASE_URL -c "
SELECT * FROM celery_taskmeta 
WHERE status = 'STARTED' 
AND date_submitted < now() - interval '1 hour';"

# Update stale tasks to failure
psql $DATABASE_URL -c "
UPDATE celery_taskmeta 
SET status = 'FAILURE', result = 'Task timed out'
WHERE status = 'STARTED' 
AND date_submitted < now() - interval '1 hour';"
```

### Monitor Dead Tasks

```bash
# List tasks with errors
psql $DATABASE_URL -c "
SELECT task_id, task_name, status, date_done, result
FROM celery_taskmeta
WHERE status = 'FAILURE'
ORDER BY date_done DESC
LIMIT 20;"
```

---

## Troubleshooting

### Tasks Not Processing

**Symptoms:**
- Queue length increasing
- Tasks stuck in pending

**Diagnosis:**

```bash
# Check if workers are running
celery -A resume_api inspect active

# Check worker logs
kubectl logs -n production deployment/celery-pdf-worker --tail=50

# Check queue configuration
celery -A resume_api inspect active_queues
```

**Resolution:**

1. Check worker status:
   ```bash
   # Restart workers
   kubectl rollout restart deployment/celery-worker -n production
   ```

2. Check queue binding:
   ```bash
   # Verify queue exists
   redis-cli LRANGE celery 0 0
   ```

3. Check task signature:
   ```bash
   # View task definition
   celery -A resume_api inspect query_task <task_name>
   ```

### High Memory Usage

**Symptoms:**
- Worker using > 2GB memory
- OOM kills

**Diagnosis:**

```bash
# Check worker memory
celery -A resume_api inspect mem

# Check specific worker
kubectl top pods -n production -l app=celery
```

**Resolution:**

1. Reduce concurrency:
   ```bash
   # Edit worker command
   # -c 4 instead of -c 8
   ```

2. Add memory limits:
   ```yaml
   # kubernetes deployment
   resources:
     limits:
       memory: "2Gi"
     requests:
       memory: "1Gi"
   ```

3. Restart worker:
   ```bash
   kubectl delete pod -n production celery-pdf-worker-xxx
   ```

### Task Timeout

**Symptoms:**
- Tasks failing with timeout error

**Diagnosis:**

```bash
# Check task timeout settings
celery -A resume_api inspect stats | grep timeout

# View task logs
kubectl logs -n production deployment/celery-pdf-worker | grep <task_id>
```

**Resolution:**

1. Increase timeout in task:
   ```python
   @app.task(
       soft_time_limit=300,  # 5 minutes
       time_limit=360        # 6 minutes
   )
   def generate_pdf(resume_id):
       # Task code
       pass
   ```

2. Or update global config:
   ```python
   # celeryconfig.py
   task_soft_time_limit = 300
   task_time_limit = 360
   ```

### Duplicate Tasks

**Symptoms:**
- Same task running multiple times
- Duplicate results

**Diagnosis:**

```bash
# Check active tasks
celery -A resume_api inspect active

# Check task IDs
celery -A resume_api inspect scheduled
```

**Resolution:**

1. Enable task idempotency:
   ```python
   @app.task(bind=True, max_retries=3)
   def generate_pdf(self, resume_id):
       # Check if already running
       lock = redis.lock(f"pdf_lock:{resume_id}", timeout=3600)
       if not lock.acquire(blocking=False):
           return "Already processing"
       
       try:
           # Task code
           pass
       finally:
           lock.release()
   ```

2. Use task tracking:
   ```python
   @app.task(task_acks_late=True, reject_on_worker_lost=True)
   def generate_pdf(resume_id):
       # Task code
       pass
   ```

---

## Disaster Recovery

### Worker Pod Failure

**Symptoms:**
- Pods in CrashLoopBackOff
- Tasks not processing

**Resolution:**

```bash
# 1. Check pod status
kubectl get pods -n production -l app=celery

# 2. View pod logs
kubectl logs -n production deployment/celery-pdf-worker --previous

# 3. Restart workers
kubectl rollout restart deployment/celery-worker -n production

# 4. Verify workers are running
celery -A resume_api inspect active
```

### Queue Backlog

**Symptoms:**
- Queue length > 1000
- Tasks waiting > 10 minutes

**Resolution:**

```bash
# 1. Scale up workers
kubectl scale deployment/celery-pdf-worker --replicas=10 -n production

# 2. Monitor progress
watch 'redis-cli LLEN celery'

# 3. After clearing backlog, scale down
kubectl scale deployment/celery-pdf-worker --replicas=3 -n production
```

### Complete Queue Failure

**Symptoms:**
- All workers down
- Queue not processing

**Resolution:**

```bash
# 1. Check Redis
redis-cli ping

# 2. Check worker pods
kubectl get pods -n production -l app=celery

# 3. Start workers
kubectl rollout restart deployment/celery-worker -n production

# 4. Verify
celery -A resume_api inspect active
```

---

## Quick Reference

### Common Commands

```bash
# Check queue status
celery -A resume_api inspect active

# Get worker stats
celery -A resume_api inspect stats

# Purge all tasks
celery -A resume_api purge

# Revoke task
celery -A resume_api control revoke <task_id>

# View results
celery -A resume_api result <task_id>

# Monitor in flower
celery -A resume_api flower --port=5555
```

---

## Related Documentation

- [RUNBOOKS.md](./RUNBOOKS.md) - Main runbook
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
- [MONITORING_SETUP.md](../MONITORING_SETUP.md) - Monitoring configuration
- [ASYNC_PDF_RENDERING_GUIDE.md](../ASYNC_PDF_RENDERING_GUIDE.md) - PDF generation

---

**Last Reviewed:** March 9, 2026  
**Next Review:** April 9, 2026 (Monthly)  
**Owner:** DevOps Team
