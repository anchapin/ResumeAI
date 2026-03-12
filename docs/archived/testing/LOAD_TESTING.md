# Load Testing Suite for ResumeAI

This document describes the load testing setup using Locust framework.

## Overview

The load testing suite simulates realistic user behavior with:

- 100 concurrent users (configurable)
- Realistic task distribution
- Baseline performance metrics
- Capacity planning insights

## Installation

Load testing dependencies are included in `requirements.txt`. Install with:

```bash
pip install -r requirements.txt
```

Or install just Locust:

```bash
pip install locust==2.20.0
```

## Running Load Tests

### Start the Backend

```bash
cd resume-api
python main.py
# Or run with uvicorn:
uvicorn main:app --reload --port 8000
```

### Run Locust with 100 concurrent users

```bash
# Interactive mode (opens web UI on http://localhost:8089)
locust -f benchmarks/locustfile.py

# Headless mode with 100 users, 10 spawn rate, 60 second duration
locust -f benchmarks/locustfile.py --headless -u 100 -r 10 -t 60s --csv=benchmarks/results
```

### Command-line Options

- `-u, --users`: Number of concurrent users (default: 1)
- `-r, --spawn-rate`: Users per second to spawn (default: 1)
- `-t, --run-time`: Duration to run test (default: unbounded)
- `--csv`: Output CSV results to file prefix
- `-H, --host`: Base URL (default: http://localhost:8000)

## Test Scenarios

### ResumeAPIUser (80% of traffic)

Simulates regular users:

- **Health Check** (1/9): API availability check
- **List Resumes** (3/9): Retrieve user's resume list
- **Get Resume** (2/9): View resume details
- **Analyze Resume** (2/9): AI resume analysis
- **Generate Cover Letter** (1/9): Cover letter generation

### AdminUser (20% of traffic)

Simulates admin/monitoring:

- **Check Metrics**: View system metrics
- **View Analytics**: Analytics dashboard

## Baseline Metrics

Target performance baselines (100 concurrent users, 60 seconds):

| Endpoint                        | Target Response Time | Target Success Rate |
| ------------------------------- | -------------------- | ------------------- |
| GET /api/health                 | < 50ms               | 100%                |
| GET /api/resumes                | < 200ms              | 99%                 |
| GET /api/resumes/{id}           | < 300ms              | 99%                 |
| POST /api/analyze               | < 2000ms             | 95%                 |
| POST /api/generate/cover-letter | < 3000ms             | 95%                 |
| GET /api/admin/metrics          | < 500ms              | 99%                 |

## Analyzing Results

### CSV Output

Locust generates CSV files when using `--csv` option:

- `results_stats.csv`: Statistics per endpoint
- `results_failures.csv`: Failed requests
- `results_stats_history.csv`: Time-series metrics

### Key Metrics

1. **Response Time**: P50, P95, P99 percentiles
2. **Success Rate**: Percentage of successful requests
3. **Throughput**: Requests per second
4. **Error Rate**: Percentage of failed requests

## Identifying Bottlenecks

### High Response Times

1. Check database query performance
2. Review slow API endpoints with database profiling
3. Check CPU/memory usage during test
4. Look for N+1 query problems

### High Error Rates

1. Check backend logs for errors
2. Look for rate limiting or quota issues
3. Check database connection limits
4. Review memory/disk usage

## Scaling Recommendations

Based on baseline metrics, here are scaling recommendations:

### For 1000 concurrent users:

- Scale backend to 4+ instances
- Use load balancer (nginx/HAProxy)
- Add database connection pooling
- Consider Redis caching layer

### For 10,000+ concurrent users:

- Horizontal scaling with Kubernetes
- Distributed caching (Redis cluster)
- Database replication/sharding
- CDN for static assets
- API rate limiting

## Continuous Integration

To run load tests in CI/CD:

```yaml
- name: Run Load Tests
  run: |
    locust -f benchmarks/locustfile.py --headless \
      -u 50 -r 5 -t 30s --csv=results
```

## Advanced Configuration

### Custom Task Weights

Modify `benchmarks/locustfile.py` to change task weights:

```python
@task(5)  # This task runs 5x more often than @task(1)
def health_check(self):
    ...
```

### Authentication

For authenticated endpoints, add token retrieval:

```python
def on_start(self):
    # Login and store token
    r = self.client.post("/api/v1/auth/login", json={...})
    self.auth_token = r.json()["token"]
```

## Troubleshooting

### Connection Errors

- Ensure backend is running on correct port
- Check firewall/network connectivity
- Increase connection pool size in backend

### Out of Memory

- Reduce number of concurrent users
- Reduce test duration
- Check for memory leaks in backend

### Low Throughput

- Check if backend is CPU-bound or I/O-bound
- Look for database bottlenecks
- Profile slow endpoints

## References

- [Locust Documentation](https://docs.locust.io/)
- [Python Type Hints for Load Testing](https://www.python-httpx.org/)
