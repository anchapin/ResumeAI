# OAuth Monitoring Setup Guide

## Quick Start

### 1. Files Already Created

✅ `resume-api/monitoring/oauth_monitor.py` - Core monitoring engine
✅ `resume-api/api/metrics_routes.py` - REST API endpoints
✅ `resume-api/test_oauth_monitoring.py` - Test suite
✅ `resume-api/validate_oauth_monitoring.py` - Validation script
✅ `resume-api/OAUTH_MONITORING_INTEGRATION.md` - Integration guide
✅ `OAUTH_MONITORING_IMPLEMENTATION.md` - Full documentation
✅ `OAUTH_MONITORING_PR_SUMMARY.md` - PR summary

### 2. Steps to Complete Integration

#### Step 1: Update `main.py`

Add metrics router import (around line 40):

```python
from api.metrics_routes import router as metrics_router
```

Register metrics router (after line 282):

```python
app.include_router(metrics_router)
```

**File**: `/home/alex/Projects/ResumeAI/resume-api/main.py`

#### Step 2: Update `routes/github.py`

Add imports after existing imports (around line 10):

```python
import time
from monitoring.oauth_monitor import oauth_monitor, OAuthEvent
```

Add helper functions after logger definition (around line 30):

```python
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

**File**: `/home/alex/Projects/ResumeAI/resume-api/routes/github.py`

#### Step 3: Instrument GitHub OAuth Endpoints

Update function: `exchange_code_for_token()` (around line 54)

Replace:

```python
async def exchange_code_for_token(code: str) -> dict:
```

With:

```python
async def exchange_code_for_token(code: str, request: Optional[Request] = None) -> dict:
    start_time = time.time()
```

In error handling (around line 84):

```python
if response.status_code != 200:
    logger.error("github_token_exchange_failed", status=response.status_code)
    monitoring_metrics.increment_oauth_connection_failure(
        provider="github", error_type="token_exchange_failed"
    )
    # Add monitoring
    _record_oauth_event(
        event_type="token_exchange",
        status="failure",
        error_code=str(response.status_code),
        error_message="HTTP error from GitHub",
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
    raise HTTPException(...)
```

In success path (after line 107):

```python
        return token_data

    # Add monitoring on success
    _record_oauth_event(
        event_type="token_exchange",
        status="success",
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
```

#### Step 4: Update `fetch_github_user()` (around line 110)

Add at function start:

```python
async def fetch_github_user(token: str, request: Optional[Request] = None) -> dict:
    start_time = time.time()
```

In error handling (around line 132):

```python
        if response.status_code != 200:
            logger.error("github_user_fetch_failed", status=response.status_code)
            monitoring_metrics.increment_oauth_connection_failure(
                provider="github", error_type="user_fetch_failed"
            )
            # Add monitoring
            _record_oauth_event(
                event_type="user_fetch",
                status="failure",
                error_code=str(response.status_code),
                duration_ms=(time.time() - start_time) * 1000,
                request=request,
            )
            raise HTTPException(...)
```

Before return (around line 142):

```python
        return await response.json()

    # Add monitoring on success
    _record_oauth_event(
        event_type="user_fetch",
        status="success",
        duration_ms=(time.time() - start_time) * 1000,
        request=request,
    )
    return user_data
```

#### Step 5: Update `github_oauth_callback()` (around line 196)

Add at function start:

```python
async def github_oauth_callback(
    request: Request,
    code: Annotated[str, Query(description="Authorization code from GitHub")],
    state: Annotated[str, Query(description="OAuth state parameter")],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """..."""
    start_time = time.time()
```

Add success monitoring before redirect (around line 400):

```python
        # Record success
        _record_oauth_event(
            event_type="callback",
            status="success",
            user_id=str(connection.user_id) if connection else None,
            duration_ms=(time.time() - start_time) * 1000,
            request=request,
        )

        frontend_url = settings.frontend_url
        return Response(
            status_code=302,
            headers={"Location": f"{frontend_url}?status=success"},
        )
```

Add failure monitoring in error handlers:

```python
        # Record failure for invalid state
        _record_oauth_event(
            event_type="callback",
            status="failure",
            error_code="invalid_state",
            duration_ms=(time.time() - start_time) * 1000,
            request=request,
        )
        logger.warning("github_oauth_invalid_state", state=state)
```

#### Step 6: Update `github_connect()` (around line 538)

Add monitoring at end before return:

```python
    logger.info(
        "github_oauth_authorize",
        user_id=user_id,
        state=state,
    )

    # Record connect event
    _record_oauth_event(
        event_type="connect",
        status="success",
        user_id=str(user_id),
        request=request,
    )

    return {
        "success": True,
        "authorization_url": github_auth_url,
        "state": state,
        "expires_in": 600,
    }
```

#### Step 7: Update `disconnect_github()` (around line 665)

Add monitoring after deletion:

```python
    # If connection exists, revoke the token with GitHub API and delete from database
    if connection:
        # ... existing code ...

        logger.info(
            "github_disconnect_success",
            user_id=user_id,
            connection_id=connection.id,
            github_username=connection.github_username,
        )

        # Record disconnect event
        _record_oauth_event(
            event_type="disconnect",
            status="success",
            user_id=str(user_id),
            request=request,
        )
```

#### Step 8: Update `github_status()` (around line 450)

Add monitoring after checking connection:

```python
            if connection:
                logger.info(
                    "github_oauth_connected",
                    user_id=current_user.id,
                    github_username=connection.github_username,
                )

                # Record status check
                _record_oauth_event(
                    event_type="status_check",
                    status="success",
                    user_id=str(current_user.id),
                    request=request,
                )

                return GitHubStatusResponse(...)
```

### 3. Validation

#### Install Dependencies

```bash
cd resume-api
pip install -r requirements.txt
```

#### Run Validation Script

```bash
python3 validate_oauth_monitoring.py
```

Expected output:

```
============================================================
OAuth Monitoring System Validation
============================================================

[TEST 1] Event Recording
✓ Recorded event: connect (success)
✓ Event stored in monitor
...
[TEST 8] Metrics Data Export
✓ Snapshot data exportable: True
  {...}

============================================================
ALL TESTS PASSED ✓
============================================================
```

#### Run Test Suite

```bash
python -m pytest test_oauth_monitoring.py -v
```

Expected: All tests pass ✓

### 4. Start the API and Test Endpoints

```bash
cd resume-api
python main.py
```

In another terminal:

#### Test 1: OAuth Health

```bash
curl http://localhost:8000/metrics/oauth/health | jq .
```

Expected response:

```json
{
  "status": "success",
  "data": {
    "provider": "github",
    "healthy": true,
    "short_term": {
      "window_minutes": 5,
      "total_events": 0,
      "success_rate": 0,
      "avg_response_time_ms": 0,
      "rate_limit_events": 0,
      "token_expiration_events": 0
    },
    "anomalies": []
  }
}
```

#### Test 2: Get Metrics

```bash
curl "http://localhost:8000/metrics/oauth/metrics?provider=github&window_minutes=5" | jq .
```

#### Test 3: Check Anomalies

```bash
curl http://localhost:8000/metrics/oauth/anomalies | jq .
```

#### Test 4: Prometheus Export

```bash
curl http://localhost:8000/metrics/prometheus
```

#### Test 5: Endpoint Health

```bash
curl http://localhost:8000/metrics/oauth/endpoint-health | jq .
```

## Integration Checklist

Use this checklist to track your progress:

```
OAuth Monitoring Integration Checklist:

File Updates:
  [ ] main.py - Added metrics router import
  [ ] main.py - Registered metrics router
  [ ] routes/github.py - Added monitoring imports
  [ ] routes/github.py - Added helper functions

Endpoint Instrumentation:
  [ ] exchange_code_for_token() - Added monitoring
  [ ] fetch_github_user() - Added monitoring
  [ ] github_oauth_callback() - Added monitoring
  [ ] github_connect() - Added monitoring
  [ ] disconnect_github() - Added monitoring
  [ ] github_status() - Added monitoring

Testing & Validation:
  [ ] Dependencies installed
  [ ] validate_oauth_monitoring.py passes
  [ ] test_oauth_monitoring.py passes
  [ ] /metrics/oauth/health endpoint works
  [ ] /metrics/oauth/metrics endpoint works
  [ ] /metrics/oauth/anomalies endpoint works
  [ ] /metrics/oauth/suspicious-activity endpoint works
  [ ] /metrics/prometheus endpoint works

Deployment:
  [ ] Code committed to feature branch
  [ ] PR created for review
  [ ] Code review completed
  [ ] PR merged to main
  [ ] Deployed to development
  [ ] Deployed to staging
  [ ] Deployed to production
```

## Troubleshooting

### Issue: "Module not found: monitoring.oauth_monitor"

**Solution**: Ensure `PYTHONPATH` includes `/app` or `resume-api` directory

### Issue: Metrics endpoints return 404

**Solution**: Check that metrics router was registered in `main.py`

### Issue: Events not being recorded

**Solution**: Verify helper functions are defined in `routes/github.py`

### Issue: High memory usage

**Solution**: Run cleanup endpoint or increase cleanup frequency:

```bash
curl -X POST http://localhost:8000/metrics/oauth/cleanup?max_age_hours=24 \
  -H "Authorization: Bearer <token>"
```

### Issue: Tests fail with import errors

**Solution**: Install dependencies:

```bash
pip install prometheus-client sqlalchemy fastapi
```

## Performance Tuning

### Reduce Event Retention

In `oauth_monitor.py`, modify cleanup schedule:

```python
# Run cleanup every hour instead of 24 hours
import asyncio
asyncio.create_task(cleanup_task())

async def cleanup_task():
    while True:
        oauth_monitor.cleanup_old_events(max_age_hours=1)
        await asyncio.sleep(3600)  # 1 hour
```

### Adjust Anomaly Thresholds

In `oauth_monitor.py`:

```python
oauth_monitor.failure_rate_threshold = 0.20  # 20% instead of 15%
oauth_monitor.rate_limit_hit_threshold = 10  # 10 instead of 5
```

### Enable Prometheus Scraping

Set in `.env`:

```bash
ENABLE_METRICS=true
METRICS_PATH=/metrics/prometheus
```

## Monitoring the Monitor

### Health Checks

```bash
# Check if monitoring is working
curl http://localhost:8000/metrics/oauth/health

# Get comprehensive dashboard
curl http://localhost:8000/metrics/health/dashboard | jq .
```

### Log Monitoring

```bash
# Look for oauth monitoring logs
tail -f logs/app.log | grep oauth_monitor
```

### Alert Setup

Configure webhooks in `config/settings.py`:

```python
ALERTING_WEBHOOK_URL = "https://hooks.slack.com/services/..."
ENABLE_ALERTING = True
```

## Next Steps

1. ✅ **Review Documentation**: Read `OAUTH_MONITORING_IMPLEMENTATION.md`
2. ✅ **Follow Integration Steps**: Use checklist above
3. ✅ **Run Validation**: Execute `validate_oauth_monitoring.py`
4. ✅ **Test Endpoints**: Verify all endpoints working
5. ✅ **Monitor Production**: Set up alerts and dashboards
6. ✅ **Tune Thresholds**: Adjust based on real data
7. ✅ **Document Runbooks**: Create alert response procedures

## Support

For help:

1. Check `OAUTH_MONITORING_INTEGRATION.md` for code examples
2. Review `test_oauth_monitoring.py` for usage patterns
3. Run `validate_oauth_monitoring.py` to verify setup
4. Check logs for error messages

---

**Last Updated**: February 25, 2026
**Status**: Ready for Integration
**Estimated Time to Complete**: 30-45 minutes
