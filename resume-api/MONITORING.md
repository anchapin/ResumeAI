# Monitoring & Observability

This document describes the monitoring, logging, and analytics system for ResumeAI API.

## Overview

The ResumeAI API includes comprehensive monitoring and observability features:

- **Structured Logging**: JSON-formatted logs with context tracking
- **Metrics Collection**: Prometheus metrics for HTTP requests, errors, and business metrics
- **Health Checks**: Multiple health check endpoints for monitoring system status
- **Usage Analytics**: Track user engagement and API usage patterns
- **Error Tracking**: Integration with Sentry for error monitoring
- **Alerting**: Configurable alert rules for critical issues

## Configuration

Monitoring features are configured via environment variables in `.env`:

```bash
# Logging Configuration
LOG_LEVEL=INFO                    # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FORMAT=json                   # json (production) or console (development)
LOG_FILE=/var/log/resume-api.log  # Optional: log file path (None = stdout)

# Metrics Configuration
ENABLE_METRICS=true               # Enable/disable metrics collection
METRICS_PATH=/metrics             # Prometheus metrics endpoint path

# Sentry (Error Tracking) Configuration
ENABLE_SENTRY=false               # Enable Sentry error tracking
SENTRY_DSN=https://...            # Sentry DSN
SENTRY_ENVIRONMENT=production     # Environment name (development, staging, production)
SENTRY_TRACES_SAMPLE_RATE=0.1     # Sample rate for performance monitoring (0.0-1.0)

# Alerting Configuration
ENABLE_ALERTING=true              # Enable/disable alerting
ALERT_ERROR_RATE_THRESHOLD=0.05   # Error rate threshold (5%)
ALERT_SLOW_RESPONSE_THRESHOLD=5.0 # Slow response threshold in seconds
ALERT_CHECK_INTERVAL=300          # Alert check interval in seconds (5 minutes)

# Analytics Configuration
ENABLE_ANALYTICS=true             # Enable/disable analytics
ANALYTICS_RETENTION_DAYS=90       # Analytics data retention period
```

## Monitoring Endpoints

### Health Checks

#### GET /health
Basic health check endpoint. Returns minimal health status.

**Response:**
```json
{
  "healthy": true,
  "timestamp": "2026-02-14T12:00:00Z",
  "version": "1.0.0"
}
```

#### GET /health/detailed
Detailed health check with all component status.

**Response:**
```json
{
  "healthy": true,
  "timestamp": "2026-02-14T12:00:00Z",
  "checks": {
    "database": true,
    "ai_provider": true,
    "disk_space": true,
    "memory_usage": true
  },
  "details": {
    "database": {
      "healthy": true,
      "duration_ms": 10.0
    },
    "ai_provider": {
      "healthy": true,
      "provider": "openai",
      "duration_ms": 0.5
    },
    "disk_space": {
      "healthy": true,
      "available_mb": 1024,
      "threshold_mb": 100
    },
    "memory_usage": {
      "healthy": true,
      "used_percent": 45.0,
      "threshold_percent": 90.0
    }
  }
}
```

#### GET /health/ready
Readiness probe for orchestration systems (Kubernetes, Cloud Run, etc.).

**Response:**
```json
{
  "ready": true,
  "timestamp": "2026-02-14T12:00:00Z"
}
```

### Metrics

#### GET /metrics
Prometheus metrics endpoint for scraping metrics.

**Response:** Prometheus text format metrics (not human-readable)

**Example Metrics:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",endpoint="/v1/render/pdf",status_code="200"} 123

# HELP http_request_duration_seconds HTTP latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",endpoint="/v1/render/pdf",le="0.1"} 50
http_request_duration_seconds_bucket{method="POST",endpoint="/v1/render/pdf",le="0.5"} 100
...

# HELP http_errors_total Total HTTP errors
# TYPE http_errors_total counter
http_errors_total{method="POST",endpoint="/v1/render/pdf",status_code="500"} 5

# HELP pdfs_generated_total Total PDFs generated
# TYPE pdfs_generated_total counter
pdfs_generated_total{variant="modern"} 45

# HELP resumes_tailored_total Total resumes tailored
# TYPE resumes_tailored_total counter
resumes_tailored_total{ai_provider="openai"} 78

# HELP ai_requests_total Total AI requests
# TYPE ai_requests_total counter
ai_requests_total{provider="openai",model="gpt-4o",status="success"} 80

# HELP db_connections_active Active DB connections
# TYPE db_connections_active gauge
db_connections_active 10
```

### Analytics

#### GET /analytics/summary
Get usage analytics summary for a specified time period.

**Query Parameters:**
- `hours` (optional, default: 24) - Time period in hours

**Response:**
```json
{
  "total_requests": 1234,
  "success_requests": 1180,
  "failed_requests": 54,
  "success_rate": 95.6,
  "avg_duration_ms": 450.2,
  "unique_users": 45,
  "period_hours": 24
}
```

#### GET /analytics/endpoints
Get most popular endpoints for a specified time period.

**Query Parameters:**
- `hours` (optional, default: 24) - Time period in hours
- `limit` (optional, default: 10) - Maximum number of results

**Response:**
```json
[
  {
    "endpoint": "/v1/render/pdf",
    "request_count": 450,
    "avg_duration_ms": 520.3,
    "success_rate": 98.2
  },
  {
    "endpoint": "/v1/tailor",
    "request_count": 320,
    "avg_duration_ms": 380.5,
    "success_rate": 96.5
  }
]
```

## Logging

### Log Format

In production (LOG_FORMAT=json), logs are JSON-formatted with structured fields:

```json
{
  "timestamp": "2026-02-14T12:00:00.123456Z",
  "level": "info",
  "event": "request_completed",
  "request_id": "abc123",
  "method": "POST",
  "path": "/v1/render/pdf",
  "status_code": 200,
  "duration_ms": 456.78,
  "client_ip": "192.168.1.1"
}
```

In development (LOG_FORMAT=console), logs are human-readable with colors:

```
12:00:00 INFO  request_started method=POST path=/v1/render/pdf
12:00:00 INFO  request_completed method=POST path=/v1/render/pdf status_code=200 duration_ms=456.78
```

### Request Context

All logs include request context:
- `request_id`: Unique identifier for each request
- `method`: HTTP method
- `path`: Request path
- `client_ip`: Client IP address
- `user_id`: Hashed API key (when authenticated)

### Request IDs

Each request gets a unique ID assigned by the monitoring middleware. The request ID is:
- Included in all logs for that request
- Added to the response headers as `X-Request-ID`

This allows tracing a request through logs across multiple services.

## Sentry Integration

Sentry can be configured for error tracking and performance monitoring.

### Setup

1. Create a Sentry project at https://sentry.io
2. Get your DSN (Data Source Name)
3. Add to `.env`:
   ```bash
   ENABLE_SENTRY=true
   SENTRY_DSN=https://your-dsn@sentry.io/12345
   SENTRY_ENVIRONMENT=production
   SENTRY_TRACES_SAMPLE_RATE=0.1  # Sample 10% of requests for performance monitoring
   ```

### What Sentry Captures

- Unhandled exceptions
- Stack traces
- Request context (method, path, headers)
- User information (hashed API key)
- Performance traces (when tracing is enabled)

## Prometheus Integration

### Setup Prometheus

1. Install Prometheus: https://prometheus.io/download/
2. Configure Prometheus to scrape the metrics endpoint:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'resume-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8000']
```

3. Start Prometheus:
   ```bash
   prometheus --config.file=prometheus.yml
   ```

### Setting up Grafana Dashboards

1. Install Grafana: https://grafana.com/grafana/download/
2. Add Prometheus as a data source
3. Import or create dashboards for:
   - Request rate and latency
   - Error rate
   - Business metrics (PDFs generated, resumes tailored)
   - AI provider metrics
   - Database metrics

## Alerting

### Alert Rules

The alerting system checks for:

- **High Error Rate**: When error rate exceeds `ALERT_ERROR_RATE_THRESHOLD` (default: 5%)
- **Slow Responses**: When response time exceeds `ALERT_SLOW_RESPONSE_THRESHOLD` (default: 5 seconds)
- **Disk Space**: When available disk space falls below threshold
- **Memory Usage**: When memory usage exceeds threshold

### Alert Handlers

Alerts are logged by default. You can add custom handlers for:

- Email notifications
- Slack/webhook notifications
- PagerDuty integration

Example: Add a Slack webhook handler

```python
from monitoring.alerting import alert_manager

def slack_alert_handler(alert):
    import requests
    webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    payload = {
        "text": f"Alert: {alert.message}\nSeverity: {alert.severity}"
    }
    requests.post(webhook_url, json=payload)

alert_manager.add_handler(slack_alert_handler)
```

## Monitoring in Development

During development, you may want to adjust settings for better visibility:

```bash
# .env for development
LOG_LEVEL=DEBUG
LOG_FORMAT=console          # Human-readable logs
ENABLE_METRICS=true        # Still track metrics
ENABLE_ALERTING=false      # Disable alerts in development
ENABLE_ANALYTICS=false     # Disable analytics in development
```

## Troubleshooting

### High Error Rate

1. Check `/health/detailed` for component issues
2. Review logs for error messages
3. Check Sentry for error details
4. Verify AI provider credentials

### Slow Response Times

1. Check metrics endpoint for latency histograms
2. Review slow requests in Sentry
3. Check database connection pool
4. Verify AI provider performance

### Disk Space Issues

1. Check `/health/detailed` for disk usage
2. Review log file rotation
3. Clean up temporary files
4. Configure log retention

### Metrics Not Appearing

1. Verify `ENABLE_METRICS=true`
2. Check `/metrics` endpoint is accessible
3. Verify Prometheus configuration
4. Check firewall rules

## Dashboard Metrics

Key metrics to monitor:

### System Health
- Request rate (per endpoint)
- Error rate (per endpoint)
- Response time (p50, p95, p99)
- Active connections

### Business Metrics
- PDFs generated (total, per variant)
- Resumes tailored (total, per AI provider)
- Unique users
- Requests per user

### Infrastructure
- Disk space available
- Memory usage
- Database connections
- AI provider latency

## Next Steps

- [ ] Set up Prometheus for metrics collection
- [ ] Configure Grafana dashboards
- [ ] Enable Sentry for production environment
- [ ] Set up alert notifications
- [ ] Configure log aggregation (ELK, Splunk, etc.)
- [ ] Review and tune alert thresholds
- [ ] Set up automated backups for analytics data
