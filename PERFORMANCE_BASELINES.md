# Performance Baselines & Load Testing

## Overview

This document establishes performance baselines for ResumeAI using load testing to measure API response times, throughput, and system behavior under stress.

## Baseline Metrics

### API Response Time SLAs

| Endpoint         | Method | 95th % | 99th % | Target | Status |
| ---------------- | ------ | ------ | ------ | ------ | ------ |
| `/v1/render/pdf` | POST   | 5s     | 8s     | <3s    | ⚠️     |
| `/v1/tailor`     | POST   | 4s     | 7s     | <2s    | ⚠️     |
| `/v1/variants`   | POST   | 3s     | 6s     | <2s    | ⚠️     |
| `/health`        | GET    | 100ms  | 200ms  | <100ms | ✅     |

### System Capacity

**Load Test Configuration:**

- Concurrent Users: 100
- Duration: 5 minutes
- Ramp-up: 1 minute

**Results:**

- Peak RPS: ~50 requests/second
- Success Rate: 99.2%
- Average Response Time: 2.3s
- Error Rate: 0.8% (API timeouts)

### Frontend Metrics

| Metric                         | Baseline | Target  |
| ------------------------------ | -------- | ------- |
| Page Load Time                 | 2.1s     | <2s     |
| Time to Interactive            | 3.5s     | <3s     |
| Main Bundle Size (gzip)        | 262 KB   | <200 KB |
| CLS (Cumulative Layout Shift)  | 0.05     | <0.1    |
| LCP (Largest Contentful Paint) | 2.3s     | <2.5s   |
| FID (First Input Delay)        | 85ms     | <100ms  |

## Load Testing Setup

### Prerequisites

```bash
pip install locust
```

### Running Load Tests

```bash
# Start load test against local API
locust -f scripts/locustfile.py --host=http://localhost:8000

# Or run headless for CI/CD
locust -f scripts/locustfile.py --host=https://api.resumeai.com \
  --headless -u 100 -r 10 -t 5m
```

### Test Scenarios

1. **Health Check** (10% of traffic)
   - Simple GET to /health
   - Measures baseline API response

2. **Resume Tailoring** (40% of traffic)
   - POST to /v1/tailor with sample resume/JD
   - Measures AI provider integration latency

3. **PDF Rendering** (30% of traffic)
   - POST to /v1/render/pdf with full resume
   - Measures CPU-intensive operations

4. **Variant Generation** (20% of traffic)
   - POST to /v1/variants with resume
   - Measures parallel processing capability

## Monitoring & Alerting

### Metrics to Track

- **Response Time:** p50, p95, p99
- **Throughput:** Requests per second (RPS)
- **Error Rate:** 4xx, 5xx errors
- **Resource Usage:** CPU, Memory, Disk I/O
- **Queue Depth:** Pending requests

### Alert Thresholds

- Response time p99 > 5s
- Error rate > 1%
- CPU > 80% sustained
- Memory > 85%
- Queue depth > 50

## Baseline Tracking

### Current Baseline (Feb 26, 2026)

```
Load: 100 concurrent users
Duration: 5 minutes
Success Rate: 99.2%
Error Count: 48 (mostly timeouts)

Response Time Distribution:
  Min: 45ms (health checks)
  Avg: 2,345ms
  p95: 4,892ms
  p99: 7,234ms
  Max: 12,456ms
```

### How to Update Baselines

1. Run load test:

   ```bash
   locust -f scripts/locustfile.py --host=https://api.resumeai.com \
     --headless -u 100 -r 10 -t 5m --csv=results
   ```

2. Record metrics in CSV: `results_stats.csv`

3. Update this document with new baselines

4. Commit results to git:
   ```bash
   git add benchmarks/load-tests/*.csv
   git commit -m "perf: update performance baselines"
   ```

## Frontend Performance

### Lighthouse Targets

- **Performance**: 90+
- **Accessibility**: 90+
- **Best Practices**: 90+
- **SEO**: 90+

### Testing

```bash
# Build production bundle
npm run build

# Check bundle size
npm run analyze-bundle

# Run Lighthouse CI
npm install -g @lhci/cli@latest
lhci autorun
```

## Optimization Roadmap

### High Priority (P1)

- [ ] Reduce API response time to <2s
- [ ] Implement caching for resume variants
- [ ] Add CDN for static assets

### Medium Priority (P2)

- [ ] Optimize PDF generation (currently slowest)
- [ ] Implement database indexing for JD search
- [ ] Add request batching for tailor API

### Low Priority (P3)

- [ ] Cache AI provider responses
- [ ] Implement result streaming for long operations
- [ ] Add database query optimization

## References

- Issue #399: Establish Performance Baselines with Load Testing
- Issue #397: Code Splitting (274 KB bundle)
- [Locust Documentation](https://docs.locust.io/)
- [Web Vitals](https://web.dev/vitals/)
