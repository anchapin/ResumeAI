# Grafana Dashboards Setup - Issue #401

Prometheus Metrics & Grafana Dashboards implementation.

## Overview

Comprehensive monitoring dashboards for the ResumeAI FastAPI backend with:

- **HTTP Request Metrics**: Request rate and error rate by endpoint
- **Latency Metrics**: PDF generation, database queries, and AI provider latencies
- **Percentile Analysis**: p50, p95, p99 latency percentiles
- **Custom Histogram Buckets**: Optimized for accurate percentile calculation

## Dashboards

### 1. Request Metrics by Endpoint

**Panels**:
- HTTP Request Rate by Endpoint (requests/sec)
- HTTP Error Rate by Endpoint (errors/sec)
- Request Distribution by Method (pie chart)
- Error Status Code Distribution (pie chart)

### 2. Latency Metrics & Percentiles

**Panels**:
- PDF Generation Latency - Percentiles (p50, p95, p99)
- Database Query Latency (p95)
- HTTP Request Latency by Endpoint
- Average PDF Generation Latency
- Database Query p95 Latency
- AI Provider Latency (p95)

## Key Metrics

### HTTP Request Metrics
- `http_requests_total` - Total requests by endpoint
- `http_request_duration_seconds` - Request latency (Buckets: 0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0)
- `http_errors_total` - Error count by endpoint/status

### Database Metrics
- `db_query_duration_seconds` - Query latency (Buckets: 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0)
- `db_queries_total` - Query count by operation
- `db_connections_active` - Active connections

### AI Provider Metrics
- `ai_request_duration_seconds` - AI latency (Buckets: 0.5, 1, 2.5, 5, 10, 30, 60, 120)
- `ai_requests_total` - Total AI requests

## Accessing Dashboards

1. Start monitoring stack:
```bash
docker-compose -f docker-compose-monitoring.yml up -d
```

2. Access Grafana: http://localhost:3000 (admin/admin)

3. Dashboards → Browse → Select dashboard

## Testing

Run validation script:
```bash
python3 validate_issue_401.py
```

## Files Created

- `dashboards/request-metrics.json` - Request metrics dashboard
- `dashboards/latency-metrics.json` - Latency metrics dashboard
- `tests/test_prometheus_metrics_issue_401.py` - Test suite
- `GRAFANA_DASHBOARDS_SETUP.md` - This documentation
- `monitoring/metrics.py` - Enhanced with optimized histogram buckets

## Performance Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| PDF Generation (p95) | > 5s | > 10s |
| DB Query (p95) | > 0.5s | > 1s |
| Error Rate | > 5% | > 10% |

## Common Queries

### Request Rate
```promql
sum(rate(http_requests_total[5m])) by (endpoint)
```

### PDF Generation Percentiles
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{endpoint="/generate/pdf"}[5m])) by (le))
```

### Database Query Latency
```promql
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (operation, le))
```

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Histogram Quantiles](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile)
