# Load Testing Baseline Metrics

Performance metrics for ResumeAI API under load.

## Test Configuration

- Duration: 5 minutes
- Concurrent Users: 100
- User Spawn Rate: 10 users/second
- Wait Time: 2-5 seconds between requests

## Endpoint Performance

### 1. Health Check (`/health`)

| Metric              | Value       |
| ------------------- | ----------- |
| Response Time (p50) | < 50ms      |
| Response Time (p95) | < 100ms     |
| Response Time (p99) | < 150ms     |
| Error Rate          | 0%          |
| Throughput          | 1000+ req/s |

---

### 2. PDF Rendering (`/v1/render/pdf`)

| Metric              | Value        |
| ------------------- | ------------ |
| Response Time (p50) | 800ms - 1.2s |
| Response Time (p95) | 1.5s - 2.5s  |
| Response Time (p99) | 2.5s - 3.5s  |
| Error Rate          | < 2%         |
| Throughput          | 5-10 req/s   |

**Optimization Focus**: Caching, thread pooling, resource management

---

### 3. Resume Tailoring (`/v1/tailor`)

| Metric              | Value     |
| ------------------- | --------- |
| Response Time (p50) | 2-4s      |
| Response Time (p95) | 5-8s      |
| Response Time (p99) | 8-12s     |
| Error Rate          | < 5%      |
| Throughput          | 2-5 req/s |

**Optimization Focus**: Request queuing, timeout management, caching patterns

---

### 4. Variant Generation (`/v1/variants`)

| Metric              | Value       |
| ------------------- | ----------- |
| Response Time (p50) | 1.5s - 2.5s |
| Response Time (p95) | 3s - 4s     |
| Response Time (p99) | 4s - 6s     |
| Error Rate          | < 2%        |
| Throughput          | 3-8 req/s   |

**Optimization Focus**: Parallel processing, caching, memory management

---

## Load Profiles

### Light Load (25 users)

- P95 response times: < 500ms (health), < 1.5s (PDF), < 4s (tailor)
- Error rate: < 1%

### Medium Load (100 users)

- P95 response times: < 100ms (health), < 2.5s (PDF), < 8s (tailor)
- Error rate: < 2%

### Heavy Load (250+ users)

- P95 response times: < 200ms (health), < 3.5s (PDF), < 12s (tailor)
- Error rate: < 5%

---

## Recommendations

1. **Immediate**: Add response caching for repeated requests
2. **Short-term**: Implement PDF generation worker pool
3. **Medium-term**: Queue system for AI tailoring endpoint
4. **Long-term**: Horizontal scaling with load balancer

See CAPACITY_PLANNING_GUIDE.md for detailed infrastructure sizing.
