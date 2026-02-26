# Capacity Planning Report

## Executive Summary

Based on load testing results from 100 concurrent users, ResumeAI can sustainably handle approximately **100-200 concurrent users** on current infrastructure. Scaling to 500+ users requires architectural changes and infrastructure investments.

## Current Capacity Baseline

### Load Test Results (100 Concurrent Users)

**Test Configuration:**
- Duration: 5 minutes
- Ramp-up: 10 users/second
- Total Requests: 24,891
- Success Rate: 99.2%

**Performance Metrics:**
| Metric | Value | Status |
|--------|-------|--------|
| Peak RPS | 50 | Baseline |
| Response Time (avg) | 2.3s | Acceptable |
| Response Time (p95) | 4.8s | Warning |
| Response Time (p99) | 7.2s | Critical |
| Memory Usage | 2.0 GB | Moderate |
| CPU Usage | 60% | Moderate |
| Error Rate | 0.8% | Low |

### Bottlenecks Identified

1. **PDF Rendering (35% of errors)**
   - Endpoint: `/v1/render/pdf`
   - Response Time: 5-12 seconds
   - Cause: CPU-intensive LaTeX compilation
   - Impact: High

2. **Resume Tailoring (40% of errors)**
   - Endpoint: `/v1/tailor`
   - Response Time: 4-8 seconds
   - Cause: OpenAI/Anthropic API latency
   - Impact: High

3. **Variant Generation (15% of errors)**
   - Endpoint: `/v1/variants`
   - Response Time: 3-6 seconds
   - Cause: Parallel API calls
   - Impact: Medium

4. **Database Queries (5% of errors)**
   - Operations: Resume history, profile
   - Response Time: 100-500ms
   - Cause: Missing indexes
   - Impact: Low

## Capacity Projections

### Growth Scenarios

#### Scenario A: Conservative Growth (100 → 200 users)

**Infrastructure:**
- Single server: t3.medium EC2 instance
- 4 GB RAM
- 2 vCPU
- SSD storage

**Configuration:**
- App processes: 2 (gunicorn workers)
- Database: Single PostgreSQL instance
- Cache: No Redis needed
- CDN: CloudFlare basic

**Expected Performance:**
- RPS: 100-150
- p95 Response Time: 2-3s
- Success Rate: 99%+
- Monthly Cost: ~$50-100

#### Scenario B: Moderate Growth (200 → 500 users)

**Infrastructure:**
- Load balancer: AWS ALB
- App servers: 2x t3.small
- Database: RDS t3.small with 1 read replica
- Cache: Redis t3.micro
- CDN: CloudFlare Pro

**Configuration:**
- App processes: 4 total (2 per server)
- Connection pooling: 20-30 per app
- Cache TTL: 5 minutes (resume variants)
- Database indexes: Added for common queries

**Expected Performance:**
- RPS: 250-400
- p95 Response Time: 1-2s
- Success Rate: 99.5%+
- Monthly Cost: ~$200-300

**Required Changes:**
- [ ] Implement session affinity in load balancer
- [ ] Add Redis for cache
- [ ] Optimize database queries
- [ ] Add read replicas
- [ ] Implement circuit breaker (AI providers)
- [ ] Add request queuing for PDF generation

#### Scenario C: Aggressive Growth (500 → 1000+ users)

**Infrastructure:**
- Load balancer: AWS NLB (higher throughput)
- App servers: 4-6x t3.small
- Database: RDS t3.large with 2 read replicas
- Cache: ElastiCache Redis (cluster mode)
- Message Queue: SQS for async operations
- CDN: CloudFlare Enterprise
- Static Hosting: S3 + CloudFront

**Configuration:**
- App processes: 8-12 total
- Connection pooling: 50+ per app
- Async jobs: PDF rendering, AI tailoring
- Database: Sharding by user ID
- Cache: Multi-layer (app + distributed)

**Expected Performance:**
- RPS: 800-1200
- p95 Response Time: <1s
- Success Rate: 99.9%+
- Monthly Cost: ~$1000-1500

**Required Changes:**
- [ ] Implement message queue (SQS/RabbitMQ)
- [ ] Move PDF rendering to async workers
- [ ] Move AI API calls to async workers
- [ ] Database sharding
- [ ] Distributed caching
- [ ] Service mesh (optional)
- [ ] Auto-scaling policies

## Optimization Roadmap

### Phase 1: Stabilize (0-3 months, 100-200 users)

**Priority: High**

- [x] Establish baseline metrics
- [ ] Fix database query performance
  - Add indexes to `resumes`, `users`, `job_descriptions`
  - Estimate time: 4 hours
  - Expected improvement: 30-40% faster queries

- [ ] Implement caching
  - Cache resume variants (Redis)
  - Cache job descriptions
  - Estimate time: 8 hours
  - Expected improvement: 50% faster tailor requests

- [ ] Optimize PDF rendering
  - Add request timeout (10s)
  - Implement job queue
  - Estimate time: 12 hours
  - Expected improvement: Reduce timeouts by 80%

**Cost:** 24 dev hours, $0 infrastructure

### Phase 2: Scale Up (3-6 months, 200-500 users)

**Priority: Medium**

- [ ] Load balancing setup
  - AWS ALB configuration
  - Health checks
  - Sticky sessions
  - Estimate time: 6 hours

- [ ] Database optimization
  - Read replicas
  - Query optimization
  - Connection pooling
  - Estimate time: 12 hours
  - Expected improvement: 2x throughput

- [ ] Async job processing
  - SQS for PDF rendering
  - Worker pool (Celery)
  - Estimate time: 16 hours
  - Expected improvement: Reduce API response time by 40%

**Cost:** 34 dev hours, ~$200/month infrastructure

### Phase 3: Scale Out (6-12 months, 500+ users)

**Priority: Low-Medium**

- [ ] Database sharding
  - Shard by user_id
  - Shard key selection
  - Estimate time: 32 hours

- [ ] Service mesh
  - Istio or Linkerd
  - Service-to-service communication
  - Circuit breaker, retry logic
  - Estimate time: 24 hours

- [ ] Advanced caching
  - Distributed cache (ElastiCache)
  - Cache coherence strategy
  - Estimate time: 16 hours

**Cost:** 72 dev hours, ~$1000/month infrastructure

## Cost Analysis

### Monthly Infrastructure Costs

| User Count | Current | Phase 1 | Phase 2 | Phase 3 |
|------------|---------|---------|---------|---------|
| 100-200 | $30 | $50 | $150 | $500 |
| 200-500 | N/A | N/A | $200 | $800 |
| 500-1000 | N/A | N/A | N/A | $1200 |

### Cost per User (Monthly)

| User Count | Cost/User |
|------------|-----------|
| 100 | $0.30 |
| 200 | $0.25 |
| 500 | $0.40 |
| 1000 | $1.20 |

## Recommendations

### Immediate Actions (This Quarter)

1. **Run load tests weekly** to track performance degradation
2. **Add database indexes** (4 hours, high ROI)
3. **Implement basic caching** (8 hours)
4. **Set up monitoring & alerting**
   - Response time: Alert if p95 > 3s
   - Error rate: Alert if > 1%
   - CPU: Alert if > 80%

### Short-term (Next Quarter)

1. **Implement async PDF rendering** (12 hours)
2. **Add load balancer** for reliability
3. **Set up read replicas** for database
4. **Establish auto-scaling policies**

### Long-term (6+ months)

1. **Service architecture redesign**
2. **Database sharding strategy**
3. **Advanced caching layer**
4. **Global CDN integration**

## Monitoring & Alerts

### Key Metrics to Track

```yaml
Alerts:
  - Response Time p95 > 3s
  - Error Rate > 1%
  - CPU > 80%
  - Memory > 85%
  - Queue Depth > 50
  - AI Provider Timeout > 10%

Dashboards:
  - Real-time RPS
  - Response time percentiles
  - Error rate by endpoint
  - Resource utilization
  - User growth
```

### Tools

- **Monitoring:** Prometheus + Grafana
- **Alerting:** PagerDuty
- **Logging:** ELK stack
- **APM:** New Relic or DataDog (optional)

## Success Criteria

- [ ] Can handle 100-200 concurrent users sustainably
- [ ] p95 response time < 3 seconds
- [ ] Error rate < 1%
- [ ] 99%+ success rate
- [ ] Auto-scaling works correctly
- [ ] Cost per user remains < $1/month

## Next Steps

1. **Schedule weekly load tests** (Mondays 9am)
2. **Create monitoring dashboard** (this week)
3. **Implement Phase 1 optimizations** (next 4 weeks)
4. **Measure impact** and iterate

## References

- Load Testing Results: [PERFORMANCE_BASELINES.md](./PERFORMANCE_BASELINES.md)
- Load Testing Guide: [LOAD_TESTING_GUIDE.md](./LOAD_TESTING_GUIDE.md)
- Issue #414: Create Load Testing Suite
- Issue #399: Establish Performance Baselines
