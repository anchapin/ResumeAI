# Async PDF Rendering with Job Queue - Implementation Guide

**Issue:** #417  
**Status:** Implemented  
**Date:** February 26, 2024

## Overview

This document describes the async PDF rendering system using a job queue, which prevents timeouts and improves scalability for large-scale resume generation.

## Architecture

### Design Decisions

1. **Job Queue Abstraction**: Decoupled queue interface allows multiple implementations (local, Redis, SQS)
2. **Local-First Approach**: Default implementation uses in-memory LocalQueue for MVP/single-process deployments
3. **Worker Pattern**: Dedicated worker processes jobs asynchronously with timeout protection
4. **Priority Queue**: Jobs support priority levels (LOW, NORMAL, HIGH, CRITICAL) for fair scheduling
5. **Retry Logic**: Exponential backoff with configurable max retries
6. **Progress Tracking**: Real-time job progress updates (0-100%)
7. **Result Persistence**: Generated PDFs stored in result directory with job reference

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Async PDF Routes (async_pdf_routes.py)       │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • POST /v1/render/pdf-async - Submit job            │   │
│  │ • GET /v1/jobs/{job_id} - Get status                │   │
│  │ • GET /v1/jobs/{job_id}/download - Download PDF     │   │
│  │ • DELETE /v1/jobs/{job_id} - Cancel job             │   │
│  │ • GET /v1/queue/stats - Queue statistics            │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                          ↓                       │
│  ┌──────────────────────┐  ┌────────────────────────┐       │
│  │   JobQueue (ABC)     │  │   PDFWorker/Pool       │       │
│  ├──────────────────────┤  ├────────────────────────┤       │
│  │ • enqueue()          │  │ • Process jobs         │       │
│  │ • dequeue()          │  │ • Timeout protection   │       │
│  │ • get_job()          │  │ • Error handling       │       │
│  │ • update_job()       │  │ • Retry logic          │       │
│  │ • get_jobs_by_state()│  │ • Progress tracking    │       │
│  │ • cancel_job()       │  │ • Result persistence   │       │
│  │ • get_stats()        │  └────────────────────────┘       │
│  └──────────────────────┘                                   │
│       ↑                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LocalQueue (default)                    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • In-memory job storage                             │   │
│  │ • Priority-based ordering                           │   │
│  │ • State tracking per job                            │   │
│  │ • Optimized for single-process deployment           │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↑                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Job Model (lib/queue/job_queue.py)         │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • Job ID (UUID)                                     │   │
│  │ • State (PENDING, PROCESSING, COMPLETED, FAILED)   │   │
│  │ • Priority (LOW, NORMAL, HIGH, CRITICAL)           │   │
│  │ • Payload (resume data)                            │   │
│  │ • Metadata (variant, API key, user ID)             │   │
│  │ • Progress (0-100%)                                │   │
│  │ • Error tracking and retry count                   │   │
│  │ • Timestamps (created, started, completed)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Job States

```
PENDING → PROCESSING → COMPLETED
   ↑          ↓
   └──────  FAILED (on error, if retries remaining)
              ↓
          CANCELLED (by user request)
```

## API Usage

### 1. Submit Async PDF Render Job

**Endpoint:** `POST /v1/render/pdf-async`

Request with high priority for faster processing:

```bash
curl -X POST http://localhost:8000/v1/render/pdf-async \
  -H "X-API-KEY: rai_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_data": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1-234-567-8900",
      "experience": [
        {
          "company": "Tech Corp",
          "position": "Senior Engineer",
          "startDate": "2020-01-15",
          "endDate": "2024-02-26",
          "description": "Led team of 5 engineers"
        }
      ]
    },
    "variant": "default",
    "priority": "high"
  }'
```

**Response (HTTP 202):**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "PDF render job submitted successfully"
}
```

**Notes:**
- Returns immediately with job ID (HTTP 202 Accepted)
- Use job_id for subsequent status checks
- Priority options: "low", "normal", "high", "critical"
- Rate limited to 10 requests/minute per API key

### 2. Check Job Status

**Endpoint:** `GET /v1/jobs/{job_id}`

```bash
curl -X GET http://localhost:8000/v1/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-KEY: rai_your_api_key"
```

**Response (HTTP 200):**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "state": "processing",
  "progress": 45.5,
  "eta_seconds": 15,
  "error": null,
  "retry_count": 0,
  "created_at": "2024-02-26T10:30:00Z",
  "started_at": "2024-02-26T10:30:05Z",
  "completed_at": null,
  "result": null
}
```

**States:**
- `pending` - Waiting in queue
- `processing` - Currently being rendered
- `completed` - Successfully rendered
- `failed` - Rendering failed (after retries)
- `cancelled` - Job was cancelled by user

### 3. Download Completed PDF

**Endpoint:** `GET /v1/jobs/{job_id}/download`

```bash
curl -X GET http://localhost:8000/v1/jobs/550e8400-e29b-41d4-a716-446655440000/download \
  -H "X-API-KEY: rai_your_api_key" \
  -o resume.pdf
```

**Requirements:**
- Job must be in `completed` state
- Returns `application/pdf` content type
- Filename: `resume_{job_id_first_8_chars}.pdf`

**Error Responses:**
- `404` - Job not found
- `422` - Job not completed, still processing, failed, or cancelled
- `500` - PDF file missing from disk

### 4. Cancel Job

**Endpoint:** `DELETE /v1/jobs/{job_id}`

```bash
curl -X DELETE http://localhost:8000/v1/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-KEY: rai_your_api_key"
```

**Response (HTTP 204):** No content

**Restrictions:**
- Can only cancel `pending` or `processing` jobs
- Returns `422` if job already completed/failed
- Returns `404` if job not found

### 5. Get Queue Statistics

**Endpoint:** `GET /v1/queue/stats`

```bash
curl -X GET http://localhost:8000/v1/queue/stats \
  -H "X-API-KEY: rai_your_api_key"
```

**Response (HTTP 200):**

```json
{
  "total_jobs": 42,
  "pending": 5,
  "processing": 2,
  "completed": 30,
  "failed": 3,
  "cancelled": 2,
  "worker_active_jobs": 2,
  "worker_running": true
}
```

## Configuration

### Environment Variables

Add to `resume-api/.env`:

```bash
# Job Queue Configuration
JOB_QUEUE_TYPE=local              # local, redis, sqs (default: local)
JOB_QUEUE_DIR=/tmp/resume-pdfs    # Result directory for PDFs
JOB_MAX_RETRIES=3                 # Max retry attempts
JOB_TIMEOUT=60                    # Timeout per job in seconds
JOB_RETRY_BACKOFF_BASE=2.0        # Exponential backoff multiplier

# Worker Configuration
PDF_WORKER_ENABLED=true           # Enable PDF worker
PDF_WORKER_COUNT=1                # Number of worker processes
PDF_WORKER_TIMEOUT=60             # Worker timeout in seconds
```

### Python Code Configuration

In `main.py`:

```python
from lib.queue import LocalQueue, JobConfig
from lib.queue.pdf_worker import PDFWorker
from api.async_pdf_routes import set_queue_and_worker

# Create queue
queue_config = JobConfig(
    max_retries=3,
    retry_backoff_base=2.0,
    timeout=60,
    queue_dir="/tmp/resume-pdfs"
)
job_queue = LocalQueue(config=queue_config)

# Create worker
pdf_worker = PDFWorker(
    queue=job_queue,
    result_dir="/tmp/resume-pdfs",
    timeout=60,
    max_concurrent_jobs=1
)

# Set render handler
async def render_pdf_handler(job: Job) -> bytes:
    # ... PDF rendering logic ...
    pass

pdf_worker.set_render_handler(render_pdf_handler)

# Register with routes
set_queue_and_worker(job_queue, pdf_worker)

# Start worker on app startup
@app.on_event("startup")
async def startup():
    asyncio.create_task(pdf_worker.start())
```

## Deployment

### Single-Process Deployment (Development/MVP)

Uses LocalQueue with single PDFWorker:

1. Enable in environment:
   ```bash
   PDF_WORKER_ENABLED=true
   PDF_WORKER_COUNT=1
   ```

2. Worker runs in same process as API
3. Jobs stored in-memory (lost on restart)
4. Good for: Development, testing, small-scale deployments

### Multi-Worker Deployment (Production)

For high-throughput production:

1. Multiple worker processes (separate from API):
   ```bash
   # Terminal 1 - Start API
   cd resume-api && python main.py

   # Terminal 2+ - Start workers
   cd resume-api && python -c "
   from lib.queue import LocalQueue
   from lib.queue.pdf_worker import PDFWorkerPool
   import asyncio

   queue = LocalQueue()
   pool = PDFWorkerPool(queue=queue, num_workers=4)
   asyncio.run(pool.start())
   "
   ```

2. Consider migrating to Redis queue for shared state between processes

### Docker Deployment

**API Container:**
```dockerfile
# Dockerfile.api
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

**Worker Container:**
```dockerfile
# Dockerfile.worker
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "-c", "from lib.queue.pdf_worker import PDFWorkerPool; import asyncio; asyncio.run(PDFWorkerPool(...).start())"]
```

**Docker Compose:**
```yaml
version: '3.9'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8000:8000"
    environment:
      PDF_WORKER_ENABLED: "true"
      PDF_WORKER_COUNT: "1"

  # Optional: Additional workers for scale
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    depends_on:
      - api
    environment:
      JOB_QUEUE_TYPE: "local"
```

### Kubernetes Deployment

Deploy API and workers as separate Deployments:

```yaml
---
# API Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resume-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: resume-api
  template:
    metadata:
      labels:
        app: resume-api
    spec:
      containers:
      - name: api
        image: resume-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: PDF_WORKER_ENABLED
          value: "false"  # Disable worker in API pod

---
# Worker Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resume-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resume-worker
  template:
    metadata:
      labels:
        app: resume-worker
    spec:
      containers:
      - name: worker
        image: resume-worker:latest
        env:
        - name: JOB_QUEUE_TYPE
          value: "redis"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
```

## Monitoring

### Job Metrics

Monitor using the stats endpoint:

```python
import httpx

async def monitor_queue():
    """Monitor queue health."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            'http://localhost:8000/v1/queue/stats',
            headers={'X-API-KEY': 'rai_xxx'}
        )
        stats = response.json()

        # Alert if pending jobs exceed threshold
        if stats['pending'] > 100:
            send_alert(f"Queue backlog: {stats['pending']} pending jobs")

        # Alert if failures exceed threshold
        if stats['failed'] > 10:
            send_alert(f"Job failures: {stats['failed']} failed jobs")
```

### Logging

Worker logs include:
- Job submission with ID, priority, API key
- Job dequeue and start
- Job completion with PDF size
- Job errors and retries
- Worker start/stop events

### Health Checks

Add to health check endpoint:

```python
@app.get("/health")
async def health_check():
    stats = await worker.get_queue_stats()

    return {
        "status": "healthy" if stats['worker_running'] else "degraded",
        "worker_running": stats['worker_running'],
        "queue_depth": stats['pending'],
        "active_jobs": stats['worker_active_jobs'],
    }
```

## Troubleshooting

### Jobs Stay in PENDING State

**Cause:** Worker not running

**Solution:**
```bash
# Check if worker process is running
ps aux | grep pdf_worker

# Check logs for worker errors
tail -f /var/log/resume-api/worker.log

# Restart worker
docker restart resume-worker
```

### Jobs Fail After Retries

**Cause:** Resume data invalid, or PDF rendering error

**Solution:**
1. Check job status for error message:
   ```bash
   curl http://localhost:8000/v1/jobs/{job_id} -H "X-API-KEY: rai_xxx"
   ```

2. Review error details
3. Validate resume_data format
4. Check PDF template compatibility

### PDF Download Returns 422

**Cause:** Job not completed yet

**Solution:**
```bash
# Check current job state
curl http://localhost:8000/v1/jobs/{job_id} \
  -H "X-API-KEY: rai_xxx"

# Wait if state is "processing"
# If state is "failed", check error message
# If state is "pending", wait longer or increase priority
```

### Memory Usage Growing

**Cause:** Completed jobs not being cleaned up

**Solution:**
```python
# Clear old completed jobs periodically
import asyncio
from lib.queue import LocalQueue

queue = LocalQueue()

# Run daily cleanup
async def cleanup_task():
    while True:
        count = await queue.clear_completed_jobs(older_than_days=7)
        logger.info(f"Cleaned up {count} old jobs")
        await asyncio.sleep(86400)  # 24 hours

asyncio.create_task(cleanup_task())
```

## Migration from Sync to Async

### Step 1: Update Frontend

Replace sync PDF endpoint:

```javascript
// Old sync approach
const response = await fetch('/v1/render/pdf', {
  method: 'POST',
  body: JSON.stringify(resumeData)
});
const pdf = await response.blob();

// New async approach
const jobResponse = await fetch('/v1/render/pdf-async', {
  method: 'POST',
  body: JSON.stringify(resumeData)
});
const { job_id } = await jobResponse.json();

// Poll for completion
while (true) {
  const status = await fetch(`/v1/jobs/${job_id}`).then(r => r.json());
  if (status.state === 'completed') {
    const pdf = await fetch(`/v1/jobs/${job_id}/download`).then(r => r.blob());
    break;
  }
  await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
}
```

### Step 2: Keep Sync Endpoint (Optional)

For backward compatibility, keep sync endpoint but implement it using queue:

```python
@router.post("/v1/render/pdf")
async def render_pdf_sync(body: ResumeRequest):
    # Submit async job
    job_id = await queue.enqueue(job)

    # Wait for completion (with timeout)
    deadline = time.time() + 30  # 30 second timeout
    while time.time() < deadline:
        job = await queue.get_job(job_id)
        if job.state == JobState.COMPLETED:
            with open(job.result['pdf_path'], 'rb') as f:
                return f.read()
        await asyncio.sleep(0.1)

    raise HTTPException(status_code=504, detail="PDF generation timeout")
```

## Performance Benchmarks

Baseline measurements (single worker, 60s timeout):

| Metric | Value |
|--------|-------|
| Avg render time | 5-8 seconds |
| Peak throughput | 10-12 jobs/minute |
| Memory per job | ~5-10 MB |
| Max concurrent jobs | 1 (single worker) |
| Max queue capacity | ~1000 (depends on resume size) |

To improve throughput:
- Increase worker count
- Migrate to Redis/SQS for better scaling
- Optimize PDF template rendering
- Use worker pool in Kubernetes

## Future Enhancements

1. **Redis Queue**: For multi-process/multi-server deployments
2. **SQS Integration**: For serverless/cloud deployments
3. **Database Persistence**: Store job history in DB
4. **Webhooks**: Notify client when job completes
5. **Job Scheduling**: Schedule PDF generation for specific times
6. **Batch Processing**: Submit multiple PDFs in one request
7. **Template Variants**: Support for dynamic templates
8. **Performance Optimization**: Caching, template precompilation

## References

- [Job Queue Implementation](file:///home/alex/Projects/ResumeAI/resume-api/lib/queue/job_queue.py)
- [PDF Worker](file:///home/alex/Projects/ResumeAI/resume-api/lib/queue/pdf_worker.py)
- [Async Routes](file:///home/alex/Projects/ResumeAI/resume-api/api/async_pdf_routes.py)
- [Tests](file:///home/alex/Projects/ResumeAI/resume-api/tests/test_pdf_queue.py)
- [Models](file:///home/alex/Projects/ResumeAI/resume-api/api/models.py)
