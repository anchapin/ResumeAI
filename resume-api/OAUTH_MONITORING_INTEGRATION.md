# OAuth Monitoring Integration Guide

This document describes how to integrate OAuth monitoring into the existing GitHub OAuth routes.

## Overview

The OAuth monitoring system tracks:
- OAuth endpoint health and uptime
- Success/failure rates and error patterns
- Token lifecycle (expiration, refresh)
- Suspicious activity (brute force, rate limiting)
- Performance metrics (response times)

## Components

### 1. OAuth Monitor (`monitoring/oauth_monitor.py`)
Core monitoring system with:
- Event tracking (`OAuthEvent`, `OAuthMonitor`)
- Metrics aggregation (time windows: 5min, 15min, 60min)
- Anomaly detection
- Suspicious activity detection

### 2. Metrics Routes (`api/metrics_routes.py`)
REST endpoints for monitoring data:
- `GET /metrics/oauth/health` - Overall health status
- `GET /metrics/oauth/metrics` - Time-windowed metrics
- `GET /metrics/oauth/anomalies` - Detected anomalies
- `GET /metrics/oauth/suspicious-activity` - Brute force detection
- `GET /metrics/prometheus` - Prometheus-format export
- More endpoints for health dashboards

### 3. Integration with Existing Routes

To integrate monitoring into `routes/github.py`, add these calls:

#### In `exchange_code_for_token()` function:
```python
start_time = time.time()
try:
    # ... existing code ...
    if response.status_code != 200:
        _record_oauth_event(
            event_type="token_exchange",
            status="failure",
            error_code=str(response.status_code),
            error_message="HTTP error from GitHub",
            duration_ms=(time.time() - start_time) * 1000,
            request=request,  # Add request parameter
        )
        # ... rest of error handling ...
except Exception as e:
    _record_oauth_event(
        event_type="token_exchange",
        status="failure",
        error_code="exception",
        error_message=str(e),
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
    raise
```

#### In `fetch_github_user()` function:
```python
start_time = time.time()
try:
    # ... existing code ...
    if response.status_code != 200:
        _record_oauth_event(
            event_type="user_fetch",
            status="failure",
            error_code=str(response.status_code),
            duration_ms=(time.time() - start_time) * 1000,
        )
    else:
        _record_oauth_event(
            event_type="user_fetch",
            status="success",
            duration_ms=(time.time() - start_time) * 1000,
        )
except Exception as e:
    _record_oauth_event(
        event_type="user_fetch",
        status="failure",
        error_code="exception",
        error_message=str(e),
        duration_ms=(time.time() - start_time) * 1000,
    )
    raise
```

#### In `github_oauth_callback()` function:
```python
start_time = time.time()
try:
    # ... validation and token exchange ...
    
    # Record success
    _record_oauth_event(
        event_type="callback",
        status="success",
        user_id=user.id if user else None,
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
    
except Exception as e:
    # Record failure
    _record_oauth_event(
        event_type="callback",
        status="failure",
        error_code="callback_error",
        error_message=str(e),
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
    # ... rest of error handling ...
```

#### In `github_connect()` function:
```python
_record_oauth_event(
    event_type="connect",
    status="success",
    user_id=user_id,
    request=request,
)
```

#### In `disconnect_github()` function:
```python
# Record before disconnect
_record_oauth_event(
    event_type="disconnect",
    status="success",
    user_id=user_id,
    request=request,
)
```

#### In `github_status()` function:
```python
if connection:
    _record_oauth_event(
        event_type="status_check",
        status="success",
        user_id=current_user.id,
        request=request,
    )
```

## Helper Functions

Add these to `routes/github.py`:

```python
import time

def _get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    if request.client:
        return request.client.host
    return "unknown"


def _record_oauth_event(
    event_type: str,
    status: str,
    provider: str = "github",
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
    duration_ms: float = 0.0,
) -> None:
    """Helper to record OAuth events to monitor."""
    from monitoring.oauth_monitor import oauth_monitor, OAuthEvent
    
    event = OAuthEvent(
        timestamp=datetime.now(timezone.utc),
        provider=provider,
        event_type=event_type,
        status=status,
        user_id=user_id,
        error_code=error_code,
        error_message=error_message,
        duration_ms=duration_ms,
        ip_address=_get_client_ip(request) if request else None,
    )
    oauth_monitor.record_event(event)
```

## Metrics Endpoint Registration

Update `main.py` to include metrics routes:

```python
from api.metrics_routes import router as metrics_router

# After other router includes:
app.include_router(metrics_router)
```

## Environment Configuration

No new environment variables required. Monitoring is enabled by default.

Optional configuration (in `.env`):
```bash
# Alert checking interval (seconds)
ALERT_CHECK_INTERVAL=30

# Enable alerting (default: true if ALERTING_WEBHOOK_URL is set)
ENABLE_ALERTING=true

# Webhook URL for alerts (optional)
ALERTING_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Alert Rules

The system automatically monitors and alerts on:

1. **High OAuth Failure Rate** (>15% failures)
   - Severity: HIGH
   - Window: 5 and 15 minutes
   - Tracks: Success/failure counts, top errors

2. **Rate Limiting** (5+ rate limit hits)
   - Severity: MEDIUM
   - Window: 5 minutes
   - Tracks: Provider rate limit exhaustion

3. **Token Expiration Spikes** (3+ expiration events)
   - Severity: MEDIUM
   - Window: 5 minutes
   - Tracks: Token lifecycle issues

4. **Suspicious Activity** (5+ failed attempts from same IP)
   - Severity: HIGH
   - Window: 5 minutes
   - Tracks: Potential brute force attacks

## Monitoring Dashboard

Access monitoring endpoints:

```bash
# OAuth health status
GET /metrics/oauth/health

# Time-windowed metrics
GET /metrics/oauth/metrics?provider=github&window_minutes=5

# Detected anomalies
GET /metrics/oauth/anomalies?provider=github

# Suspicious activity
GET /metrics/oauth/suspicious-activity?window_minutes=5

# Endpoint health
GET /metrics/oauth/endpoint-health

# Prometheus format
GET /metrics/prometheus

# System health dashboard
GET /metrics/health/dashboard
```

## Example Usage

### Check OAuth Health
```bash
curl http://localhost:8000/metrics/oauth/health | jq .
```

Response:
```json
{
  "status": "success",
  "data": {
    "provider": "github",
    "healthy": true,
    "short_term": {
      "window_minutes": 5,
      "total_events": 42,
      "success_rate": 0.95,
      "avg_response_time_ms": 234.5,
      "rate_limit_events": 0,
      "token_expiration_events": 0
    },
    "anomalies": []
  }
}
```

### Detect Anomalies
```bash
curl "http://localhost:8000/metrics/oauth/anomalies?provider=github" | jq .
```

### Check Suspicious Activity
```bash
curl "http://localhost:8000/metrics/oauth/suspicious-activity?window_minutes=5" | jq .
```

## Testing

Create a test file `resume-api/test_oauth_monitoring.py`:

```python
import pytest
from monitoring.oauth_monitor import oauth_monitor, OAuthEvent
from datetime import datetime, timezone

def test_oauth_event_recording():
    """Test OAuth event recording."""
    event = OAuthEvent(
        timestamp=datetime.now(timezone.utc),
        provider="github",
        event_type="connect",
        status="success",
        user_id="123",
        duration_ms=150.5,
    )
    
    oauth_monitor.record_event(event)
    metrics = oauth_monitor.get_metrics_snapshot("github", 5)
    
    assert metrics.total_events >= 1
    assert metrics.success_events >= 1

def test_metrics_aggregation():
    """Test metrics aggregation."""
    metrics = oauth_monitor.get_metrics_snapshot("github", 5)
    
    assert hasattr(metrics, 'success_rate')
    assert hasattr(metrics, 'avg_response_time_ms')
    assert hasattr(metrics, 'error_counts')

def test_anomaly_detection():
    """Test anomaly detection."""
    anomalies = oauth_monitor.detect_anomalies("github")
    
    assert isinstance(anomalies, list)
    for anomaly in anomalies:
        assert 'type' in anomaly
        assert 'severity' in anomaly

def test_suspicious_activity_detection():
    """Test suspicious activity detection."""
    suspicious = oauth_monitor.get_suspicious_ips(5)
    
    assert isinstance(suspicious, list)
```

Run tests:
```bash
cd resume-api && python -m pytest test_oauth_monitoring.py -v
```

## Prometheus Integration

The `/metrics/prometheus` endpoint exports metrics compatible with Prometheus:

```bash
# Add to prometheus.yml:
scrape_configs:
  - job_name: 'resume-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics/prometheus'
```

## Performance Considerations

- **Event Storage**: In-memory list, auto-cleanup of events >24 hours old
- **Lock Usage**: RLock for thread-safe access to event list
- **Metrics Calculation**: O(n) for snapshot generation, cached results recommended
- **Anomaly Detection**: O(n) per check, run periodically not on critical path

## Future Enhancements

1. **Time-Series Database**: Store metrics in InfluxDB/TimescaleDB
2. **Webhook Alerts**: Send alerts to Slack, PagerDuty, etc.
3. **ML-based Anomaly Detection**: Use isolation forests for anomaly detection
4. **Rate Limit Recovery**: Auto-retry with exponential backoff
5. **Token Rotation**: Automatic token refresh before expiration
6. **Multi-Provider Support**: Add LinkedIn, Google OAuth monitoring
