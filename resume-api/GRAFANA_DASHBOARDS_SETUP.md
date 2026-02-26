# Grafana Dashboards Setup - Issue #401

This document describes the Prometheus metrics and Grafana dashboards implemented for GitHub Issue #401.

## Overview

The implementation provides comprehensive monitoring dashboards for the ResumeAI FastAPI backend, with a focus on:

- **HTTP Request Metrics**: Request rate and error rate by endpoint
- **Latency Metrics**: PDF generation, database queries, and AI provider latencies
- **Percentile Analysis**: p50, p95, p99 latency percentiles
- **Custom Histogram Buckets**: Optimized for accurate percentile calculation

## Dashboards

### 1. Request Metrics by Endpoint (`request-metrics.json`)

**Purpose**: Monitor HTTP request patterns and error rates across all API endpoints.

**Panels**:
- **HTTP Request Rate by Endpoint**: Shows requests/sec for each endpoint with mean, max, and last values
- **HTTP Error Rate by Endpoint**: Displays error rate (5xx, 4xx) broken down by endpoint and status code
- **Request Distribution by Method**: Pie chart showing request volume by HTTP method (GET, POST, PUT, DELETE)
- **Error Status Code Distribution**: Pie chart showing error breakdown by status code
- **Total Requests (5m)**: Stat panel showing total requests in the last 5 minutes
- **Total Errors (5m)**: Stat panel showing total errors in the last 5 minutes

**Refresh Rate**: 10 seconds
**Time Range**: Last 1 hour
**Datasource**: Prometheus

**Key Metrics**:
```promql
sum(rate(http_requests_total[5m])) by (endpoint)
sum(rate(http_errors_total[5m])) by (endpoint, status_code)
sum(increase(http_requests_total[5m])) by (method)
sum(increase(http_errors_total[5m])) by (status_code)
```

### 2. Latency Metrics & Percentiles (`latency-metrics.json`)

**Purpose**: Monitor application performance with detailed latency distribution and percentiles.

**Panels**:
- **PDF Generation Latency - Percentiles**: Shows p50, p95, p99 for PDF generation with thresholds
  - Green: < 3s
  - Yellow: 3-5s
  - Red: > 5s
- **Database Query Latency (p95)**: p95 latency by database operation (select, insert, update, delete)
  - Green: < 0.5s
  - Yellow: 0.5-1s
  - Red: > 1s
- **HTTP Request Latency by Endpoint**: p50 and p95 for all endpoints
- **Avg PDF Gen Latency**: Stat showing average PDF generation time
- **DB Query p95**: Stat showing 95th percentile database query latency
- **AI Provider Latency (p95)**: p95 latency for each AI provider integration

**Refresh Rate**: 10 seconds
**Time Range**: Last 1 hour
**Datasource**: Prometheus

**Key Metrics**:
```promql
# PDF Generation Percentiles
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{endpoint="/generate/pdf"}[5m])) by (le))
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{endpoint="/generate/pdf"}[5m])) by (le))
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{endpoint="/generate/pdf"}[5m])) by (le))

# Database Query Percentiles
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (operation, le))

# AI Provider Latency
histogram_quantile(0.95, sum(rate(ai_request_duration_seconds_bucket[5m])) by (provider, le))
```

## Metrics Reference

### Request Metrics

#### `http_requests_total` (Counter)
- **Labels**: `method`, `endpoint`, `status_code`
- **Unit**: Count
- **Description**: Total HTTP requests received
- **Used in**: Request Metrics Dashboard

#### `http_request_duration_seconds` (Histogram)
- **Labels**: `method`, `endpoint`
- **Unit**: Seconds
- **Buckets**: `0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0`
- **Description**: HTTP request latency distribution
- **Used in**: Request & Latency Dashboards
- **Supports**: p50, p95, p99 calculation

#### `http_errors_total` (Counter)
- **Labels**: `method`, `endpoint`, `status_code`
- **Unit**: Count
- **Description**: Total HTTP errors by endpoint
- **Used in**: Request Metrics Dashboard

### Database Metrics

#### `db_query_duration_seconds` (Histogram)
- **Labels**: `operation`
- **Unit**: Seconds
- **Buckets**: `0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0`
- **Description**: Database query latency by operation
- **Used in**: Latency Metrics Dashboard
- **Supports**: p50, p95, p99 calculation
- **Operations**: `select`, `insert`, `update`, `delete`

#### `db_queries_total` (Counter)
- **Labels**: `operation`
- **Unit**: Count
- **Description**: Total database queries by operation
- **Used in**: System Health Dashboard

#### `db_connections_active` (Gauge)
- **Unit**: Count
- **Description**: Current active database connections
- **Used in**: System Health Dashboard

### AI Provider Metrics

#### `ai_request_duration_seconds` (Histogram)
- **Labels**: `provider`, `model`
- **Unit**: Seconds
- **Buckets**: `0.5, 1, 2.5, 5, 10, 30, 60, 120`
- **Description**: AI provider request latency
- **Used in**: Latency Metrics Dashboard
- **Supports**: p50, p95, p99 calculation
- **Providers**: `openai`, `anthropic`, `gemini`

#### `ai_requests_total` (Counter)
- **Labels**: `provider`, `model`, `status`
- **Unit**: Count
- **Description**: Total AI requests
- **Used in**: Business Metrics Dashboard

### OAuth Metrics

#### `oauth_connection_success_total` (Counter)
- **Labels**: `provider`
- **Description**: Successful OAuth connections
- **Providers**: `github`, `linkedin`

#### `oauth_connection_failure_total` (Counter)
- **Labels**: `provider`, `error_type`
- **Description**: Failed OAuth connections

## Histogram Buckets Configuration

Histogram buckets have been carefully configured to support accurate percentile calculations:

### HTTP Request Latency
Buckets: `0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0` seconds
- Supports p50, p95, p99 across typical request latencies
- Optimized for sub-second and multi-second requests

### Database Query Latency
Buckets: `0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0` seconds
- Microsecond-level precision for fast queries
- Supports detection of slow query thresholds

### AI Provider Latency
Buckets: `0.5, 1, 2.5, 5, 10, 30, 60, 120` seconds
- Covers typical AI API response times
- Supports long-running requests up to 2 minutes

## Accessing the Dashboards

### Prerequisites

1. Start the monitoring stack:
```bash
docker-compose -f docker-compose-monitoring.yml up -d
```

2. Access Grafana:
- URL: `http://localhost:3000`
- Username: `admin`
- Password: `admin`

### Navigate to Dashboards

1. In Grafana, click the **Dashboards** icon (grid icon) on the left sidebar
2. Select **Browse** to see all dashboards
3. Available dashboards:
   - **Request Metrics by Endpoint** - HTTP request patterns and errors
   - **Latency Metrics & Percentiles** - Performance metrics with percentiles
   - **API Performance** - Overall API health metrics
   - **Business Metrics** - PDF generation and tailoring statistics
   - **System Health** - Database and system-level metrics

### Dashboard Navigation

Each dashboard includes:
- **Refresh Rate**: Auto-refresh every 10 seconds
- **Time Range Selector**: Top-right corner to adjust time window
- **Legend**: Click legend items to toggle series on/off
- **Zoom**: Click and drag on graph to zoom into time period
- **Tooltip**: Hover over data points to see detailed values

## Testing Metrics Population

### Run Integration Tests

```bash
cd resume-api
pytest tests/test_prometheus_metrics_issue_401.py -v
```

**Test Coverage**:
- ✅ All metrics are registered and accessible
- ✅ Histogram buckets are properly configured
- ✅ Labels support Grafana filtering
- ✅ Metrics can be observed without errors
- ✅ Data types follow Prometheus conventions

### Manual Testing

1. Generate load on the API:
```bash
# From root directory
python benchmarks/server_perf.py
# or use locust
cd resume-api
locust -f locustfile.py
```

2. Check metrics endpoint:
```bash
curl http://localhost:8000/metrics
```

3. Query Prometheus:
- URL: `http://localhost:9090`
- Try queries like:
  ```promql
  # Request rate
  rate(http_requests_total[5m])
  
  # Error rate
  rate(http_errors_total[5m])
  
  # PDF generation p95
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{endpoint="/generate/pdf"}[5m]))
  
  # Database query latency
  histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
  ```

## Grafana Dashboard Import/Export

### Export Dashboard

1. Open a dashboard
2. Click dashboard title → Settings (gear icon)
3. Select "Export" → "Export for sharing externally"
4. Save JSON file

### Import Dashboard

1. In Grafana, click "+" → "Import"
2. Upload JSON file or paste JSON content
3. Select Prometheus as datasource
4. Click "Import"

## Performance Thresholds

Recommended alert thresholds based on dashboard metrics:

| Metric | Warning | Critical |
|--------|---------|----------|
| PDF Generation (p95) | > 5s | > 10s |
| DB Query (p95) | > 0.5s | > 1s |
| HTTP Error Rate | > 5% | > 10% |
| AI Provider (p95) | > 30s | > 60s |
| Active DB Connections | > 20 | > 30 |

## Common Queries

### Request Analysis

```promql
# Top endpoints by request volume
topk(5, sum(rate(http_requests_total[5m])) by (endpoint))

# Error rate by endpoint
sum(rate(http_errors_total[5m])) by (endpoint) / sum(rate(http_requests_total[5m])) by (endpoint)

# Requests by status code
sum(increase(http_requests_total[5m])) by (status_code)
```

### Latency Analysis

```promql
# PDF generation p95 over 1 hour
histogram_quantile(0.95, avg(rate(http_request_duration_seconds_bucket{endpoint="/generate/pdf"}[1h])) by (le))

# DB query percentiles by operation
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (operation, le))

# AI provider latency comparison
histogram_quantile(0.95, sum(rate(ai_request_duration_seconds_bucket[5m])) by (provider, le))
```

## Troubleshooting

### Metrics Not Appearing

1. **Check if Prometheus is scraping**:
   - Visit `http://localhost:9090/targets`
   - Verify resume-api is "UP"

2. **Check if app is exporting metrics**:
   ```bash
   curl http://localhost:8000/metrics | grep http_requests_total
   ```

3. **Verify ENABLE_METRICS=true** in environment

### Histogram Quantile Returns Empty

1. Need sufficient data:
   - Run load test first
   - Wait for data accumulation
   - Buckets need observations above quantile

2. Verify query syntax:
   ```promql
   # Correct
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
   
   # Wrong (missing _bucket suffix)
   histogram_quantile(0.95, rate(http_request_duration_seconds[5m]))
   ```

## Files Changed

- `resume-api/monitoring/metrics.py` - Enhanced histogram buckets
- `resume-api/dashboards/request-metrics.json` - New dashboard for request metrics
- `resume-api/dashboards/latency-metrics.json` - New dashboard for latency metrics
- `resume-api/tests/test_prometheus_metrics_issue_401.py` - Comprehensive test suite
- `resume-api/GRAFANA_DASHBOARDS_SETUP.md` - This documentation

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Histogram Quantiles](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile)
- [prometheus-fastapi-instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator)
