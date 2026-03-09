# Structured Logging Guide

This document describes the structured logging implementation for ResumeAI.

## Overview

ResumeAI uses structured logging across both backend (Python) and frontend (TypeScript) to provide consistent, machine-parseable log output with rich context.

## Backend (Python)

The backend uses `structlog` for structured logging with JSON output in production.

### Configuration

Location: `resume-api/monitoring/logging_config.py`

**Features:**
- JSON output in production (`LOG_FORMAT=json`)
- Colorized console output in development (`DEBUG=true`)
- ISO 8601 timestamps
- Request context binding
- Exception tracking

### Usage

```python
from monitoring.logging_config import get_logger, RequestContext

logger = get_logger(__name__)

# Basic logging
logger.info("request_completed", method="GET", path="/api/v1/health", status_code=200)

# With request context
with RequestContext(request_id="req-123", user_id="user-456"):
    logger.info("processing_request", step="validation")

# Exception logging
try:
    risky_operation()
except Exception as e:
    logger.error("operation_failed", error=str(e))
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | INFO |
| `LOG_FORMAT` | Output format (json, console) | console |
| `DEBUG` | Enable debug mode | false |

## Frontend (TypeScript)

The frontend uses a custom structured logging utility.

### Usage

```typescript
import { logger } from '@/utils/logger';

// Basic logging
logger.info('component_mounted', { component: 'Dashboard' });
logger.warn('api_rate_limited', { endpoint: '/api/v1/resumes' });
logger.error('request_failed', { error: error.message, status: 400 });

// With user context
logger.setContext({ userId: 'user-123' });
logger.info('user_action', { action: 'export_pdf' });
```

### Log Levels

- `debug`: Detailed information for debugging
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages

## Log Format

### JSON Structure (Production)

```json
{
  "event": "request_completed",
  "level": "info",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "method": "GET",
  "path": "/api/v1/health",
  "status_code": 200,
  "duration_ms": 45.2
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| event | string | Log event/message |
| level | string | Log level (debug, info, warn, error) |
| timestamp | ISO 8601 | UTC timestamp |
| * | any | Additional context fields |

## Best Practices

1. **Use structured logging** - Always log with context fields, not string interpolation
2. **Include request IDs** - Bind request context for tracing
3. **Log errors with context** - Include relevant data for debugging
4. **Avoid PII** - Don't log sensitive user information
5. **Use appropriate levels** - Debug for development, info for important events, error for failures
