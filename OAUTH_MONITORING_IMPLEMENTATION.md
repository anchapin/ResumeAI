# OAuth Monitoring & Alerting Implementation - Issue #294

## Summary

Comprehensive monitoring and alerting system for OAuth-related issues has been implemented for the ResumeAI backend. This ensures production reliability by tracking endpoint health, failure rates, token lifecycle issues, and detecting suspicious activity.

## What Was Implemented

### 1. Core Monitoring System (`resume-api/monitoring/oauth_monitor.py`)

**Key Features:**
- **OAuthEvent**: Data class for recording OAuth operations
  - Timestamp, provider, event type, status
  - User ID, error codes, error messages
  - Response time, IP address tracking

- **OAuthMonitor**: Main monitoring engine
  - Real-time event tracking with thread-safe recording
  - Metrics aggregation across time windows (5, 15, 60 minutes)
  - Anomaly detection with configurable thresholds
  - Suspicious activity detection (brute force attempts)
  - Event cleanup and memory management

**Metrics Tracked:**
- Success/failure/rate-limit/token-expiration events
- Average response times
- Error code aggregation and breakdown
- Provider-specific metrics

**Anomaly Detection:**
- High failure rates (>15% threshold)
- Rate limiting hits (5+ threshold)
- Token expiration spikes (3+ threshold)
- Suspicious IPs with multiple failures (5+ attempts)

### 2. Metrics REST API (`resume-api/api/metrics_routes.py`)

**Endpoints:**

1. **OAuth Health** (`GET /metrics/oauth/health`)
   - Overall health status
   - Success/failure rates
   - Token lifecycle metrics
   - Performance metrics
   - Anomalies list

2. **OAuth Metrics** (`GET /metrics/oauth/metrics?provider=github&window_minutes=5`)
   - Time-windowed metrics snapshot
   - Event counts by status
   - Error breakdown
   - Top errors

3. **Anomaly Detection** (`GET /metrics/oauth/anomalies?provider=github`)
   - Detected anomalies categorized by type and severity
   - Anomaly details and thresholds
   - Window information

4. **Suspicious Activity** (`GET /metrics/oauth/suspicious-activity?window_minutes=5`)
   - IP addresses with multiple failed attempts
   - Attempt counts and thresholds
   - Brute force detection results

5. **Endpoint Health** (`GET /metrics/oauth/endpoint-health`)
   - Per-endpoint status (callback, connect, status, disconnect)
   - Availability percentages
   - Response times

6. **Health Dashboard** (`GET /metrics/health/dashboard`)
   - Comprehensive system health
   - Database, OAuth, AI provider status
   - System resources

7. **Prometheus Export** (`GET /metrics/prometheus`)
   - Standard Prometheus metrics format
   - Compatible with Prometheus/Grafana
   - Ready for monitoring infrastructure

8. **Performance Summary** (`GET /metrics/performance/summary?hours=24`)
   - Aggregated performance metrics
   - Request rates and latencies
   - Error tracking

### 3. Alert Rules (`resume-api/monitoring/alerting.py` - Enhanced)

Existing alert rules now include comprehensive OAuth monitoring:

1. **OAuth Authentication Failure Rule**
   - Triggers when failure rate exceeds 10%
   - Tracks success/failure counts
   - Details about error types

2. **OAuth Rate Limiting Rule**
   - Triggers on 10+ rate limit hits
   - Warns about rate limit exhaustion

3. **OAuth Token Expiration Rule**
   - Triggers on 5+ expiration events
   - Indicates token lifecycle issues

4. **OAuth Storage Error Rule**
   - Triggers on 3+ storage errors
   - High severity alert

### 4. Integration Guide (`resume-api/OAUTH_MONITORING_INTEGRATION.md`)

Comprehensive guide for integrating monitoring into existing GitHub OAuth routes:

**Helper Functions Needed:**
- `_get_client_ip()` - Extract IP from request
- `_record_oauth_event()` - Record events to monitor

**Integration Points:**
1. `exchange_code_for_token()` - Track token exchange
2. `fetch_github_user()` - Track user profile fetches
3. `github_oauth_callback()` - Track callback processing
4. `github_connect()` - Track OAuth initiation
5. `disconnect_github()` - Track disconnections
6. `github_status()` - Track status checks

**Implementation Pattern:**
```python
start_time = time.time()
try:
    # ... existing code ...
    _record_oauth_event(
        event_type="callback",
        status="success",
        user_id=user_id,
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
except Exception as e:
    _record_oauth_event(
        event_type="callback",
        status="failure",
        error_code="error_type",
        error_message=str(e),
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
    raise
```

### 5. Test Suite (`resume-api/test_oauth_monitoring.py`)

Comprehensive test coverage including:

**Test Classes:**
- `TestOAuthEvent` - Event data structure tests
- `TestOAuthMonitor` - Core monitoring functionality
- `TestOAuthMonitorIntegration` - End-to-end scenarios

**Test Cases:**
- Event creation and recording
- Metrics snapshot generation
- Success rate calculation
- Error code aggregation
- Suspicious IP detection
- Anomaly detection (failure rates, rate limiting, token expiration)
- Health status calculation
- Event cleanup
- Monitor reset

**Test Data Scenarios:**
- Single event recording
- Multiple events with mixed status
- Error breakdown tracking
- Suspicious activity from same IP
- High failure rate scenarios
- Complete OAuth flow simulation

### 6. Validation Script (`resume-api/validate_oauth_monitoring.py`)

Standalone validation script for testing without pytest:
- Tests all core functionality
- Validates metrics calculation
- Checks anomaly detection
- Verifies cleanup operations
- Exports metrics data

## Key Metrics Exposed

### Time-Series Metrics
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `http_errors_total` - Error counts by status
- `oauth_connection_success_total` - Successful OAuth connections
- `oauth_connection_failure_total` - Failed OAuth connections
- `oauth_token_refresh_total` - Token refresh events
- `oauth_rate_limit_hits_total` - Rate limit hits
- `oauth_token_expiration_events` - Token expiration events
- `oauth_storage_errors_total` - Storage errors
- `oauth_active_connections_gauge` - Active connections

### Aggregated Metrics
- Success/failure rates with percentage
- Average response times
- Error code distributions
- Top errors by frequency
- Suspicious IP rankings
- Anomaly counts by severity

## Configuration

### Environment Variables (Optional)
```bash
# Alert checking interval
ALERT_CHECK_INTERVAL=30

# Enable alerting
ENABLE_ALERTING=true

# Webhook URL for alerts (e.g., Slack)
ALERTING_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Thresholds (Configurable in Code)
```python
oauth_monitor = OAuthMonitor()
oauth_monitor.failure_rate_threshold = 0.15  # 15%
oauth_monitor.rate_limit_hit_threshold = 5   # 5 hits
oauth_monitor.token_expiration_threshold = 3 # 3 events
oauth_monitor.failed_attempts_threshold = 5  # 5 attempts
oauth_monitor.suspicious_ip_window = 5       # 5 minutes
```

## Integration Checklist

- [x] Core monitoring module created
- [x] Metrics endpoints created
- [x] Alert rules updated
- [x] Integration guide written
- [x] Test suite created
- [x] Validation script created
- [ ] Integration with GitHub routes (manual, see guide)
- [ ] metrics_routes.py registered in main.py (needs file edit)
- [ ] GitHub OAuth routes instrumented (needs file edits)

## Next Steps to Complete Integration

### 1. Register Metrics Routes in `main.py`

Add import:
```python
from api.metrics_routes import router as metrics_router
```

Add to router registration:
```python
app.include_router(metrics_router)
```

### 2. Integrate Monitoring into GitHub Routes

Follow the integration guide in `OAUTH_MONITORING_INTEGRATION.md`:
- Add monitoring imports
- Add helper functions
- Insert event recording calls at key points
- Test with validation script

### 3. Deploy and Monitor

```bash
# Start the API
cd resume-api && python main.py

# Check health
curl http://localhost:8000/metrics/oauth/health | jq .

# Monitor anomalies
curl http://localhost:8000/metrics/oauth/anomalies | jq .

# Export Prometheus metrics
curl http://localhost:8000/metrics/prometheus
```

## Files Created

1. **resume-api/monitoring/oauth_monitor.py** (450+ lines)
   - Core monitoring engine
   - Event tracking and metrics aggregation
   - Anomaly and suspicious activity detection

2. **resume-api/api/metrics_routes.py** (400+ lines)
   - REST API endpoints for monitoring data
   - Prometheus-compatible export
   - Health dashboards

3. **resume-api/test_oauth_monitoring.py** (400+ lines)
   - Comprehensive test suite
   - Unit and integration tests
   - Validation scenarios

4. **resume-api/validate_oauth_monitoring.py** (200+ lines)
   - Standalone validation script
   - No external dependencies
   - Functional testing

5. **resume-api/OAUTH_MONITORING_INTEGRATION.md** (300+ lines)
   - Integration guide for developers
   - Code examples
   - Helper functions

6. **OAUTH_MONITORING_IMPLEMENTATION.md** (This file)
   - Complete implementation documentation
   - Feature overview
   - Configuration and deployment

## Architecture Decisions

### Event Storage
- **In-Memory List**: Fast recording, no DB overhead
- **Thread-Safe**: RLock for concurrent access
- **Auto-Cleanup**: Events older than 24 hours removed

### Metrics Calculation
- **Time Windows**: 5, 15, 60 minutes for different granularities
- **Lazy Calculation**: Snapshots generated on-demand
- **Caching Optional**: Can cache results for performance

### Anomaly Detection
- **Threshold-Based**: Configurable thresholds per rule
- **Multi-Window**: Checks multiple time windows
- **Composite**: Combines multiple signal types

### Alert Management
- **Cooldown Period**: 5-minute cooldown to prevent alert spam
- **Severity Levels**: HIGH, MEDIUM for proper routing
- **Extensible Handlers**: Supports logging, webhooks, etc.

## Performance Considerations

- **Event Recording**: O(1) append to list
- **Snapshot Generation**: O(n) where n = events in window
- **Anomaly Detection**: O(n) per rule evaluation
- **Cleanup**: O(n) for old event filtering
- **Memory**: ~1KB per event, ~1000 events/hour = ~24MB/day max

## Security Considerations

- **IP Tracking**: For suspicious activity detection
- **Rate Limiting**: Prevents brute force attacks
- **Token Encryption**: Existing in GitHub routes
- **Authentication**: Metrics endpoints need auth (except health checks)

## Monitoring Best Practices

1. **Set Alerts**: Configure webhook integration for high-severity alerts
2. **Regular Cleanup**: Run cleanup job weekly to free memory
3. **Dashboard**: Set up Grafana dashboard with Prometheus scraping
4. **Thresholds**: Tune thresholds based on actual production patterns
5. **Documentation**: Keep runbooks for common alert scenarios

## Future Enhancements

1. **Time-Series Database**: Store metrics in InfluxDB/TimescaleDB
2. **ML-Based Detection**: Use isolation forests for anomaly detection
3. **Multi-Provider Support**: Add LinkedIn, Google OAuth monitoring
4. **Token Rotation**: Automatic token refresh before expiration
5. **Rate Limit Recovery**: Auto-retry with exponential backoff
6. **Webhook Alerts**: Integration with Slack, PagerDuty, etc.
7. **Custom Thresholds**: Per-environment configuration
8. **Historical Analysis**: Trend analysis over days/weeks

## References

- OAuth 2.0 Specification: https://tools.ietf.org/html/rfc6749
- GitHub OAuth Documentation: https://docs.github.com/en/developers/apps/building-oauth-apps
- Prometheus Metrics: https://prometheus.io/docs/concepts/data_model/
- Alerting Best Practices: https://www.site24x7.com/learn/alert-management.html

## Support

For questions or issues with the monitoring system:
1. Check OAUTH_MONITORING_INTEGRATION.md for integration help
2. Review test_oauth_monitoring.py for usage examples
3. Check main.py for endpoint configuration
4. Validate setup with validate_oauth_monitoring.py

---

**Implementation Date**: February 25, 2026
**Status**: Ready for Integration
**Test Coverage**: Comprehensive (40+ test cases)
