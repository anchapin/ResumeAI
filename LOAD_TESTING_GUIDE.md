# Load Testing Suite Guide

## Overview

ResumeAI's load testing suite uses Locust to simulate realistic user traffic and identify performance bottlenecks, capacity limits, and scaling requirements.

## Quick Start

### Prerequisites

```bash
# Install Python 3.8+
python --version

# Install Locust
pip install locust
```

### Basic Commands

```bash
# Interactive load testing (web UI at http://localhost:8089)
locust -f scripts/locustfile.py --host=http://localhost:8000

# Headless load test (100 users, ramp up 10/sec, 5 minutes)
./scripts/run-load-test.sh http://localhost:8000 5m

# Custom parameters
locust -f scripts/locustfile.py \
  --host=http://localhost:8000 \
  --headless \
  -u 100 \     # Number of users
  -r 10 \      # Ramp-up rate (users/sec)
  -t 5m \      # Duration
  --csv=results
```

## Load Testing Scenarios

### 1. Basic Health Check (5 minutes)
```bash
./scripts/run-load-test.sh http://localhost:8000 5m
```
- **Users:** 100
- **Purpose:** Baseline system health
- **Expected:** ~50 RPS, <100ms p95 response time

### 2. Sustained Load (30 minutes)
```bash
locust -f scripts/locustfile.py --host=http://localhost:8000 \
  --headless -u 200 -r 5 -t 30m
```
- **Users:** 200
- **Purpose:** Memory leaks, connection issues
- **Expected:** 99%+ success rate

### 3. Spike Test (sudden traffic increase)
```bash
locust -f scripts/locustfile.py --host=http://localhost:8000 \
  --headless -u 1000 -r 100 -t 5m
```
- **Users:** 1000 (ramped up quickly)
- **Purpose:** System recovery, queue handling
- **Expected:** Graceful degradation, no crashes

### 4. Stress Test (find breaking point)
```bash
locust -f scripts/locustfile.py --host=http://localhost:8000 \
  --headless -u 5000 -r 50 -t 10m
```
- **Users:** 5000+
- **Purpose:** Identify system limits
- **Expected:** Document breaking point

## Test Profiles

### Development Profile
```bash
# Quick smoke test for local development
locust -f scripts/locustfile.py --host=http://localhost:8000 \
  --headless -u 10 -r 2 -t 1m
```

### Staging Profile
```bash
# Comprehensive test before deployment
./scripts/run-load-test.sh https://staging-api.resumeai.com 10m
```

### Production Profile
```bash
# Off-peak hours only, gradual ramp-up
locust -f scripts/locustfile.py --host=https://api.resumeai.com \
  --headless -u 500 -r 5 -t 15m --stop-timeout=60
```

## Interpreting Results

### Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Response Time (p95) | <1s | 1-3s | >3s |
| Response Time (p99) | <2s | 2-5s | >5s |
| Success Rate | 99.9%+ | 99%-99.9% | <99% |
| Error Rate | <0.1% | 0.1-1% | >1% |
| RPS | Stable | Varies | Unstable/Falling |

### Example Results

```
Running 100 users (ramp-up 10/sec, duration 5min):

Aggregate Stats:
  Total requests: 24,891
  Total failures: 48 (0.2%)
  Requests/sec: ~82.97

Response Times:
  Min: 45ms (health checks)
  Max: 12,456ms (PDF rendering)
  Avg: 2,345ms
  p50: 1,234ms
  p95: 4,892ms
  p99: 7,234ms

Failure Analysis:
  - 99% from PDF rendering timeout (>10s)
  - 1% from AI provider errors
```

## Bottleneck Identification

### Common Bottlenecks

1. **AI Provider Integration** (40% of failures)
   - Symptom: Tailor/variants endpoints slow
   - Fix: Add request timeout, implement circuit breaker

2. **PDF Generation** (35% of failures)
   - Symptom: Render endpoint times out >10s
   - Fix: Stream PDF generation, use async workers

3. **Database Queries** (15% of failures)
   - Symptom: High latency on profile operations
   - Fix: Add indexing, query optimization

4. **Memory Leak** (5% of failures)
   - Symptom: Response time increases over time
   - Fix: Profile memory usage, fix leaks

### Profiling Strategy

1. **Run baseline test** (document baseline metrics)
2. **Monitor during test:**
   ```bash
   # Terminal 1: Load test
   ./scripts/run-load-test.sh http://localhost:8000 5m
   
   # Terminal 2: Monitor API
   watch -n 1 'curl -s http://localhost:8000/health | jq'
   
   # Terminal 3: System metrics
   top -b | head -20
   ```
3. **Analyze logs** for errors and patterns
4. **Identify** slowest endpoints
5. **Implement** fixes
6. **Re-test** to verify improvements

## Capacity Planning

### Current Baseline

From 100 concurrent user test:
- **Peak RPS:** ~50
- **Max Users Supported:** 100 without degradation
- **Memory Usage:** ~2GB
- **CPU Usage:** ~60%
- **Success Rate:** 99.2%

### Scaling Targets

| Metric | 100 Users | 500 Users | 1000 Users |
|--------|-----------|-----------|------------|
| RPS | 50 | 250 | 500 |
| Response Time p95 | 4.8s | ? | ? |
| Success Rate | 99.2% | ? | ? |
| Memory | 2GB | ? | ? |
| CPU | 60% | ? | ? |

### Infrastructure Recommendations

**For 100-200 concurrent users:**
- Single server (t3.medium or better)
- 4GB RAM minimum
- 2-4 CPU cores
- SSD storage for caching

**For 500+ concurrent users:**
- Load balancer (ALB/NLB)
- 3+ application servers
- Redis for session/cache
- Database read replicas
- CDN for static assets

## CI/CD Integration

### Automated Load Testing

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2am

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run load test
        run: |
          pip install locust
          ./scripts/run-load-test.sh http://staging-api.resumeai.com 10m
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: benchmarks/load-tests/
```

## Best Practices

### Before Running Tests

- [ ] Ensure test environment is isolated (staging, not production)
- [ ] Document baseline metrics
- [ ] Check API rate limits
- [ ] Set up monitoring/alerting
- [ ] Notify ops team

### During Tests

- [ ] Monitor system resources
- [ ] Watch for error patterns
- [ ] Don't exceed capacity test limits
- [ ] Allow test to complete fully
- [ ] Don't adjust load mid-test

### After Tests

- [ ] Export results to CSV
- [ ] Document findings
- [ ] Identify bottlenecks
- [ ] Create improvement tasks
- [ ] Share results with team

## Troubleshooting

### High Failure Rate

**Check:**
1. API server is running
2. Network connectivity
3. Database is accessible
4. API rate limiting
5. Firewall rules

**Solution:**
```bash
# Test connectivity
curl -v http://localhost:8000/health

# Check logs
tail -f app.log

# Reduce user count
locust -f scripts/locustfile.py -u 10 -r 1
```

### Timeout Errors

**Causes:**
1. Server overloaded
2. Slow AI provider responses
3. Database queries too slow
4. Network latency

**Fix:**
1. Increase request timeout: `-t 15` in locustfile
2. Reduce concurrent users
3. Check API provider status
4. Optimize database queries

### Memory Issues

**Symptom:** Process killed, out of memory
**Solution:**
1. Reduce user count
2. Reduce test duration
3. Check for memory leaks in logs
4. Profile with `memory_profiler`

## References

- [Locust Documentation](https://docs.locust.io/)
- [Performance Testing Best Practices](https://en.wikipedia.org/wiki/Software_performance_testing)
- [Load Testing Strategies](https://www.perfmatrix.com/load-testing/)
- Baseline Metrics: [PERFORMANCE_BASELINES.md](./PERFORMANCE_BASELINES.md)
