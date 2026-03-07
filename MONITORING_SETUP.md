# Monitoring & Alerting Setup

## Overview

Comprehensive monitoring and alerting strategy to track application health, performance, and capacity for proactive issue detection.

## Metrics to Monitor

### API Performance

| Metric              | Type    | Warning | Critical | Query                                             |
| ------------------- | ------- | ------- | -------- | ------------------------------------------------- |
| Response Time (p95) | Gauge   | 2s      | 5s       | `histogram_quantile(0.95, api_response_duration)` |
| Response Time (p99) | Gauge   | 3s      | 8s       | `histogram_quantile(0.99, api_response_duration)` |
| Requests/sec        | Counter | -       | -        | `rate(http_requests_total[1m])`                   |
| Error Rate          | Gauge   | 0.5%    | 2%       | `rate(http_requests_total{status=~"5.."}[1m])`    |
| Request Queue Depth | Gauge   | 10      | 50       | `queue_depth`                                     |

### Infrastructure

| Metric           | Type  | Warning | Critical |
| ---------------- | ----- | ------- | -------- |
| CPU Usage        | Gauge | 70%     | 85%      |
| Memory Usage     | Gauge | 75%     | 90%      |
| Disk Usage       | Gauge | 80%     | 95%      |
| Network I/O      | Gauge | -       | -        |
| Open Connections | Gauge | 100     | 200      |

### Business Metrics

| Metric                 | Type    | Target |
| ---------------------- | ------- | ------ |
| API Uptime             | %       | 99.9%  |
| Error Budget (monthly) | minutes | 43     |
| P95 Latency            | seconds | <2s    |
| User Session Duration  | seconds | >300s  |

## Alert Rules

### High Priority

```yaml
# API Response Time Too High
alert: APIResponseTimeTooHigh
  expr: histogram_quantile(0.95, api_response_duration) > 3
  for: 5m
  action: page

# High Error Rate
alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 5m
  action: page

# API Unreachable
alert: APIUnreachable
  expr: up{job="api"} == 0
  for: 1m
  action: page + sms
```

### Medium Priority

```yaml
# CPU Usage High
alert: HighCPUUsage
  expr: cpu_usage > 0.8
  for: 10m
  action: email

# Memory Usage High
alert: HighMemoryUsage
  expr: memory_usage > 0.85
  for: 10m
  action: email

# Database Slow Queries
alert: SlowDatabaseQueries
  expr: histogram_quantile(0.95, db_query_duration) > 1
  for: 15m
  action: email
```

### Low Priority

```yaml
# Disk Usage High
alert: HighDiskUsage
  expr: disk_usage > 0.8
  for: 1h
  action: log

# SSL Certificate Expiring
alert: SSLCertificateExpiring
  expr: days_until_cert_expiry < 30
  for: 1h
  action: email
```

## Dashboard Layouts

### Main Dashboard (Real-time Overview)

- **Top Section:**
  - API Status (green/red indicator)
  - Current RPS
  - Error Rate (%)
  - Uptime (99.x%)

- **Middle Section:**
  - Response Time (p50, p95, p99 trends)
  - Error Rate Breakdown (by endpoint, error type)
  - Requests by Endpoint (top 10)
  - Active Users / Concurrent Requests

- **Bottom Section:**
  - CPU/Memory/Disk Utilization
  - Network I/O (in/out)
  - Database Connections
  - Recent Alerts

### Performance Dashboard

- Response Time Distribution (histogram)
- Slow Endpoints (top 10)
- Request Latency by Region
- Error Rate Trends (24h, 7d, 30d)
- Request Size Distribution

### Infrastructure Dashboard

- Server Health (CPU, Memory, Disk for each)
- Network Traffic
- Database Metrics
  - Query Count
  - Slow Queries
  - Connection Pool Usage
- Cache Hit Rate (Redis)
- Queue Depth (SQS/RabbitMQ)

### Business Dashboard

- Daily Active Users
- API Calls by Service
- Error Budget Remaining
- Revenue Impact of Downtime
- Customer Impact Estimate

## Implementation

### Option 1: Prometheus + Grafana (Open Source)

**Setup:**

```bash
# Install Prometheus
docker run -d \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Install Grafana
docker run -d \
  -p 3000:3000 \
  grafana/grafana
```

**Prometheus Config:**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:8000']

  - job_name: 'database'
    static_configs:
      - targets: ['localhost:5432']
```

**Grafana Dashboards:**

- Pre-built dashboards available at grafana.com/dashboards
- Import dashboard IDs: 12114 (Node.js), 6417 (PostgreSQL)

### Option 2: DataDog (SaaS)

**Setup:**

```bash
# Install DataDog agent
DD_AGENT_MAJOR_VERSION=7 \
DD_API_KEY=your_api_key \
DD_SITE="datadoghq.com" \
bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_mac_os.sh)"

# Configure for Python
export DD_SERVICE=resumeai
export DD_TRACE_ANALYTICS_ENABLED=true
```

**Benefits:**

- Automatic APM
- Log aggregation
- Better incident correlation
- Better UI/UX

**Drawbacks:**

- Cost: ~$15-30 per host/month

### Option 3: New Relic (SaaS)

**Setup:**

```bash
# Install Python agent
pip install newrelic

# Configure
NEW_RELIC_CONFIG_FILE=newrelic.ini \
newrelic-admin run-program python main.py
```

**Benefits:**

- Excellent Python support
- Built-in error tracking
- Real user monitoring (RUM)

**Drawbacks:**

- Cost: ~$10-20 per host/month

## Incident Response

### Alert Escalation

```
1. Alert triggered (PagerDuty)
   ↓
2. On-call engineer paged (SMS + phone call)
   ↓
3. If not acknowledged in 5min, escalate to team lead
   ↓
4. If not resolved in 15min, page backup on-call engineer
```

### Runbooks

**High Error Rate:**

1. Check recent deployments
2. Check API logs for errors
3. Check AI provider status
4. Rollback if recent deploy
5. Scale up if capacity issue

**High Response Time:**

1. Check CPU/memory usage
2. Check database slow queries
3. Check network latency
4. Check AI provider latency
5. Scale up if needed

**API Unreachable:**

1. Check server status
2. Check load balancer health
3. Check DNS resolution
4. Check firewall rules
5. Failover to backup region

## SLA & Error Budget

### SLA Targets

| Service   | Availability | Monthly Downtime |
| --------- | ------------ | ---------------- |
| API       | 99.9%        | 43 minutes       |
| Website   | 99.5%        | 3.6 hours        |
| Dashboard | 99.0%        | 7.2 hours        |

### Error Budget

- Monthly error budget: 43 minutes
- Weekly budget: ~10 minutes
- Daily budget: ~2 minutes

Deployment strategy:

- Only deploy when error budget is healthy
- Pause deployments if error budget exhausted
- Post-incident reviews required

## Reporting

### Daily Report

- Uptime %
- Error count
- Peak RPS
- Slowest endpoint
- Error budget remaining

### Weekly Report

- Availability %
- Top 5 errors
- Performance trends
- Capacity metrics
- Incidents & resolutions

### Monthly Report

- SLA compliance
- Trend analysis
- Capacity planning
- Cost analysis
- Roadmap updates

## Tools & Services

### Self-Hosted

- Prometheus (metrics)
- Grafana (visualization)
- AlertManager (alerting)
- ELK Stack (logs)
- Jaeger (tracing)

### SaaS

- DataDog (APM + logging)
- New Relic (APM + RUM)
- PagerDuty (incident management)
- CloudFlare (CDN + security)

## Configuration

### Environment Variables

```bash
# Monitoring
METRICS_ENABLED=true
METRICS_PORT=8001
PROMETHEUS_NAMESPACE=resumeai

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
SENTRY_DSN=https://...@sentry.io/...

# Alerting
ALERT_EMAIL=ops@resumeai.com
PAGERDUTY_API_KEY=...
```

### Endpoints

- Metrics: `http://localhost:8001/metrics` (Prometheus)
- Health: `http://localhost:8000/api/v1/health`
- Ready: `http://localhost:8000/ready`

## Structured Logging

The application uses `structlog` for structured logging with JSON output for production environments.

### Configuration

Logging is configured in `resume-api/monitoring/logging_config.py`:

```python
# Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Log format: "json" for production, "console" for development
LOG_FORMAT=json
```

### Log Output Format

JSON format example:
```json
{"method": "GET", "path": "/api/v1/resumes", "status_code": 200, "duration_ms": 50.5, "event": "request_completed", "level": "info", "timestamp": "2026-03-06T23:24:32.245107"}
```

### Request Context

The monitoring middleware automatically adds contextual information:
- `request_id`: Unique request identifier
- `method`: HTTP method
- `path`: Request path
- `client_ip`: Client IP address
- `user_id`: User identifier (if authenticated)
- `duration_ms`: Request duration

### Log Aggregation

#### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

Configure Filebeat to ship JSON logs:

```yaml
# filebeat.yml
filebeat.inputs:
  - type: json
    paths:
      - /var/log/resumeai/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.logstash:
  hosts: ["localhost:5044"]
```

#### Option 2: Loki (Grafana Labs)

Configure Promtail to scrape logs:

```yaml
# promtail.yml
scrape_configs:
  - job_name: resumeai
    static_configs:
      - targets:
          - localhost
        labels:
          job: resumeai
          __path__: /var/log/resumeai/*.log
```

#### Option 3: Cloud Services

- **AWS CloudWatch**: Use CloudWatch Agent
- **GCP Cloud Logging**: Use Logging Agent
- **Azure Monitor**: Use Azure Log Analytics

### Structured Logging Best Practices

1. Use JSON format in production for log aggregation
2. Include request IDs for tracing
3. Add user IDs when available (respecting privacy)
4. Use appropriate log levels:
   - `DEBUG`: Detailed debugging information
   - `INFO`: General operational events
   - `WARNING`: Warning conditions
   - `ERROR`: Error conditions
   - `CRITICAL`: Critical conditions

### Integration with Sentry

Sentry is configured for error tracking:

```python
import sentry_sdk
from sentry_sdk.integrations.structlog import StructlogIntegration

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    integrations=[StructlogIntegration()],
    traces_sample_rate=0.1,
)
```

## Testing Alerts

```bash
# Test alert firing
curl -X POST http://localhost:8000/debug/trigger-error

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test webhook
curl -X POST http://alertmanager:9093/api/v1/alerts \
  -d '[{"status":"firing","labels":{"alertname":"TestAlert"}}]'
```

## References

- Prometheus Docs: https://prometheus.io/docs/
- Grafana Docs: https://grafana.com/docs/
- DataDog Docs: https://docs.datadoghq.com/
- SLO Best Practices: https://slo.dev/
- Incident Response: https://www.pagerduty.com/
