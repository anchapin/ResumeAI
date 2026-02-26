# Structured Logging Configuration Guide

## Overview

The Resume API uses **structlog** for structured logging with JSON output in production. All logs are structured with consistent fields and context, making them easily parseable and monitorable.

## Configuration

### Log Format

- **Production**: JSON format (`LOG_FORMAT=json`)
- **Development**: Console format with colors (`LOG_FORMAT=console`)

### Environment Variables

```bash
# Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Log format (json or console)
LOG_FORMAT=json

# Optional: log file path (if not set, logs go to stdout)
LOG_FILE=/var/log/resume-api/app.log
```

## Log Levels by Component

### Authentication Routes (`routes.auth`) - INFO Level

Tracks authentication attempts, token operations, and session management.

**Common Events**:
- `auth_attempt`: Authentication attempt initiated
- `auth_success`: Successful authentication
- `auth_failure`: Failed authentication
- `token_issued`: New JWT token created
- `token_revoked`: Token revoked/invalidated
- `user_logged_out`: User session terminated

### GitHub OAuth Routes (`routes.github`) - INFO Level

Tracks GitHub OAuth flow and GitHub API interactions.

**Common Events**:
- `github_oauth_started`: OAuth flow initiated
- `github_oauth_success`: OAuth flow completed
- `github_oauth_failed`: OAuth flow failed
- `github_user_fetched`: User data retrieved
- `github_token_revoked`: Token revoked
- `github_pkce_verification_success`: PKCE verification passed
- `github_token_exchange_failed`: Token exchange failed
- `github_user_fetch_failed`: User fetch failed

### LinkedIn OAuth Routes (`routes.linkedin`) - INFO Level

Tracks LinkedIn OAuth flow and LinkedIn API interactions.

**Common Events**:
- `linkedin_oauth_started`: OAuth flow initiated
- `linkedin_oauth_success`: OAuth flow completed
- `linkedin_oauth_failed`: OAuth flow failed
- `linkedin_oauth_callback_failed`: Callback processing failed
- `linkedin_user_fetched`: User data retrieved
- `failed_to_fetch_experience`: Experience section fetch failed
- `failed_to_fetch_education`: Education section fetch failed

### API Routes (`api.v1`) - INFO Level

Tracks API endpoint calls and request processing.

**Common Events**:
- `endpoint_called`: Endpoint was called
- `request_validated`: Request passed validation
- `response_generated`: Response successfully generated
- `request_completed`: Request processing completed

### Database (`database`) - INFO Level

Tracks database connections, queries, and transactions.

**Common Events**:
- `connection_pool_created`: Connection pool initialized
- `connection_established`: New database connection opened
- `connection_closed`: Database connection closed
- `query_executed`: SQL query executed
- `transaction_started`: Database transaction started
- `transaction_committed`: Transaction successfully committed
- `transaction_rolled_back`: Transaction rolled back
- `query_slow`: Query exceeded timeout (WARNING level)

### Database Replicas (`config.database_replicas`) - INFO Level

Tracks database replica health and selection.

**Common Events**:
- `replica_initialized`: Replica pool initialized
- `replica_health_check`: Health check performed
- `replica_marked_unhealthy`: Replica marked unavailable
- `replica_restored`: Unhealthy replica recovered
- `no_healthy_replicas`: All replicas unavailable

### Cache Configuration (`config.cache`) - INFO Level

Tracks cache hits, misses, and evictions.

**Common Events**:
- `cache_hit`: Data found in cache
- `cache_miss`: Data not in cache
- `cache_evicted`: Cache entry removed (LRU)
- `redis_connected`: Connected to Redis
- `redis_disconnected`: Disconnected from Redis
- `redis_connection_failed`: Connection failed (WARNING level)

### Error Handling Middleware (`middleware.error_handling`) - WARNING Level

Tracks errors and exceptions in request processing.

**Common Events**:
- `request_error`: Request resulted in error (4xx)
- `request_failed`: Request failed (5xx)
- `unhandled_exception`: Unhandled exception occurred
- `validation_error`: Request validation failed
- `exception_occurred`: Exception with full context

### Monitoring Middleware (`middleware.monitoring`) - DEBUG Level

Tracks all requests for monitoring and metrics.

**Common Events**:
- `request_started`: Request processing started
- `request_completed`: Request completed successfully
- `request_failed`: Request failed
- `request_completed`: Request completed with timing

### Health Checks (`lib.deployment.health_checks`) - INFO Level

Tracks health check results and service status.

**Common Events**:
- `health_check_passed`: Health check passed
- `health_check_failed`: Health check failed (ERROR level)
- `health_check_degraded`: Partial health issue (WARNING level)
- `health_check_registered`: New health check registered

### Feature Flags (`lib.deployment.feature_flags`) - INFO Level

Tracks feature flag status changes.

**Common Events**:
- `feature_flag_enabled`: Feature flag enabled
- `feature_flag_disabled`: Feature flag disabled
- `feature_flag_maintenance`: Feature under maintenance
- `unknown_feature_flag`: Reference to unknown feature (WARNING level)

### Retry Logic (`lib.utils.retry`) - WARNING Level

Tracks retry attempts and exhaustion.

**Common Events**:
- `retry_attempt`: Attempting retry (WARNING level)
- `retry_exhausted`: Retries exhausted (ERROR level)
- `retry_success`: Request succeeded after retry

### AI Provider Manager (`lib.utils.ai_provider_manager`) - INFO Level

Tracks AI provider usage and fallback.

**Common Events**:
- `attempting_provider`: Attempting to use provider
- `provider_success`: Provider succeeded
- `provider_failed`: Provider failed (WARNING level)
- `circuit_opened`: Provider circuit breaker opened (ERROR level)
- `reset_circuit_breaker`: Circuit breaker reset

## Log Entry Structure

All log entries follow this standard structure:

```json
{
  "timestamp": "ISO 8601 UTC timestamp",
  "event": "event_name",
  "log_level": "DEBUG|INFO|WARNING|ERROR|CRITICAL",
  // ... additional context fields
}
```

### Standard Fields

- **timestamp**: ISO 8601 formatted UTC timestamp
- **event**: Event name (descriptive, snake_case)
- **log_level**: Severity level

### Context Fields (Examples)

- **request_id**: Unique request identifier
- **user_id**: Authenticated user ID
- **path**: HTTP path
- **method**: HTTP method (GET, POST, etc.)
- **status_code**: HTTP status code
- **duration_ms**: Operation duration in milliseconds
- **error**: Error message or exception details
- **exception_type**: Type of exception
- **provider**: Service/provider name
- **key**: Cache key
- **table**: Database table name

## Best Practices

### 1. Use Structured Context

```python
from monitoring import logging_config

logger = logging_config.get_logger(__name__)

# BAD: Unstructured string
logger.error("User authentication failed for user 123 with error invalid_token")

# GOOD: Structured context
logger.error("auth_failed", user_id="user-123", reason="invalid_token")
```

### 2. Use RequestContext for Request-Scoped Data

```python
from monitoring import logging_config

with logging_config.RequestContext(request_id="req-123", user_id="user-456"):
    logger.info("processing_request")  # request_id and user_id included
```

### 3. Use log_exception for Exception Handling

```python
from monitoring import logging_config

logger = logging_config.get_logger(__name__)

try:
    # some operation
    pass
except Exception as e:
    logging_config.log_exception(logger=logger, exc=e, context="operation_name")
```

### 4. Use log_request for HTTP Requests

```python
from monitoring import logging_config

logger = logging_config.get_logger(__name__)

logging_config.log_request(
    logger=logger,
    method="POST",
    path="/api/v1/resumes",
    status_code=201,
    duration_ms=123.45
)
```

### 5. Log at Appropriate Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: Informational messages about normal operation
- **WARNING**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for serious problems
- **CRITICAL**: Critical messages for very serious problems

## Monitoring and Debugging

### View JSON Logs

```bash
# Pretty-print JSON logs
tail -f app.log | jq .

# Filter by event type
tail -f app.log | jq 'select(.event == "auth_success")'

# Filter by log level
tail -f app.log | jq 'select(.log_level == "error")'

# Find slow requests (duration > 1000ms)
tail -f app.log | jq 'select(.duration_ms > 1000)'
```

### Verify Configuration

```python
from monitoring.logging_verification import log_verification_report

print(log_verification_report())
```

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` environment variable
2. Check `LOG_FORMAT` setting
3. Verify log file permissions if using `LOG_FILE`
4. Check stdout/stderr if logging to console

### Logs Not JSON Format

1. Check `LOG_FORMAT=json` in environment
2. Verify `debug=False` in production
3. Restart application after config changes

### Missing Context Fields

1. Use `RequestContext` manager for request-scoped data
2. Use `logger.bind()` for bound logger context
3. Verify context is bound before logging
