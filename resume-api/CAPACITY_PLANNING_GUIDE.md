# Capacity Planning Guide for ResumeAI

Infrastructure sizing recommendations for different user loads.

## Quick Reference

| Concurrent Users | Instance Type        | CPU | RAM   | Status     |
| ---------------- | -------------------- | --- | ----- | ---------- |
| 0-50             | t3.small             | 2   | 2GB   | MVP        |
| 51-200           | c5.large             | 2   | 4GB   | Production |
| 201-500          | c5.xlarge            | 4   | 8GB   | Growth     |
| 501-1000         | 2-3 x c5.large       | 8+  | 12GB+ | Scale      |
| 1000+            | Auto-scaling cluster | 12+ | 24GB+ | Enterprise |

---

## Small Deployment (0-50 concurrent users)

**Target**: MVP, beta testing

**Infrastructure**:

- Instance: t3.small (2 vCPU, 2GB RAM)
- Database: Single PostgreSQL instance
- Cache: Optional Redis

**Cost**: ~$85/month

---

## Medium Deployment (51-200 concurrent users)

**Target**: Production launch

**Infrastructure**:

- Load Balancer: ALB
- API Instances: 2x c5.large
- Database: Multi-AZ PostgreSQL with read replicas
- Cache: Redis cluster (2 nodes)

**Cost**: ~$230/month

---

## Large Deployment (201-500 concurrent users)

**Target**: Growing product

**Infrastructure**:

- Load Balancer: ALB with multiple AZs
- API Instances: 4x c5.large + auto-scaling
- Database: Aurora PostgreSQL with 3 read replicas
- Cache: Redis cluster (6 nodes)
- Background Workers: 2-4 instances

**Cost**: ~$540/month

---

## Endpoint-Specific Scaling

### PDF Rendering (`/v1/render/pdf`)

- **Impact**: High CPU/Memory
- **Workers**: 4 per 100 users
- **Optimization**: Caching, async processing

### Resume Tailoring (`/v1/tailor`)

- **Impact**: High latency (external API)
- **Queue Size**: 100 per 100 users
- **Optimization**: Request queuing, timeout limits (30s)

### Variant Generation (`/v1/variants`)

- **Impact**: Medium CPU/Memory
- **Workers**: 2 per 100 users
- **Optimization**: Parallel processing, streaming

---

## Database Sizing

**Storage Estimation**:

- Year 1: 100GB
- Year 2: 250GB
- Year 3: 500GB+

**Connection Pool**:

- Small: 20 connections
- Medium: 40-80 connections
- Large: 100-150 connections

---

## Monitoring Alerts

- CPU > 80%: Scale up
- Memory > 85%: Investigate/Scale
- P95 Response Time > 2s: Investigate
- Error Rate > 2%: Alert
- DB Connections > 80%: Scale

---

## Migration Path

1. **Week 1-2**: Deploy single instance with monitoring
2. **Week 3-4**: Add load balancer and 2nd instance
3. **Month 2**: Multi-AZ setup with failover
4. **Month 3+**: Enterprise setup with advanced scaling

See LOAD_TESTING_README.md for detailed testing procedures.
