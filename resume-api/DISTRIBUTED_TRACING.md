# Distributed Tracing Implementation

This document describes the distributed tracing implementation for the ResumeAI API.

## Overview

Distributed tracing is implemented using [OpenTelemetry](https://opentelemetry.io/), which provides a vendor-agnostic approach to observability. This enables tracking requests across multiple services in a microservices architecture.

## Configuration

Distributed tracing is disabled by default. To enable it, set the following environment variables:

```bash
# Enable distributed tracing
ENABLE_TRACING=true

# OTLP endpoint (optional - if not set, only console exporter will be used)
# For gRPC: http://localhost:4317
# For HTTP: http://localhost:4318/v1/traces
OTLP_ENDPOINT=http://localhost:4317

# Service name for tracing (default: resume-api)
SERVICE_NAME=resume-api

# Trace sample rate (0.0 to 1.0, default: 1.0)
# Set to 0.1 for 10% of traces in production
TRACE_SAMPLE_RATE=1.0
```

## Features

### Automatic Instrumentation

- **FastAPI**: All HTTP requests to the API are automatically traced
- **HTTPX**: All HTTP client requests are automatically traced

### Manual Instrumentation

For custom operations, you can use the tracing utilities:

```python
from monitoring.tracing_utils import (
    async_trace,
    add_span_attribute,
    add_span_event,
    set_span_error,
    get_trace_id,
)

# Async context manager
async def my_async_operation():
    async with async_trace("my_operation", {"key": "value"}):
        # Your code here
        add_span_attribute("user_id", user_id)
        add_span_event("operation_started")

# Sync context manager
def my_sync_operation():
    with trace_sync("my_operation"):
        # Your code here
        pass
```

### Trace Context

To propagate trace context across services:

```python
from monitoring.tracing_utils import get_trace_id, get_span_id

# Get current trace/span IDs for propagation
trace_id = get_trace_id()  # Include in headers for downstream services
span_id = get_span_id()
```

## Trace Exporters

### Console Exporter (Debug Mode)

Enabled automatically when `DEBUG=true`. Outputs spans to stdout for development.

### OTLP Exporter

Configure an OTLP-compatible backend such as:
- [Jaeger](https://www.jaegertracing.io/)
- [Zipkin](https://zipkin.io/)
- [Tempo](https://grafana.com/oss/tempo/)
- [Honeycomb](https://www.honeycomb.io/)
- [Datadog](https://www.datadoghq.com/)

Example with Docker:

```bash
# Jaeger
docker run -d --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

Then set:
```bash
OTLP_ENDPOINT=http://localhost:6831
```

## Viewing Traces

### Jaeger

1. Run Jaeger container (see above)
2. Open http://localhost:16686
3. Select "resume-api" service

### Development Console

When `DEBUG=true`, spans are printed to the console:

```
Span: GET /api/v1/health
  Trace ID: abc123...
  Span ID: def456...
  Duration: 5.2ms
```

## Best Practices

1. **Use meaningful span names**: Name spans after the operation, e.g., `database.query` or `ai.tailor.resume`

2. **Add relevant attributes**: Include context like `user_id`, `request_id`, `operation_type`

3. **Set appropriate sample rates**: In production, use lower sample rates (0.1-0.2) to reduce volume

4. **Use span events for milestones**: Mark important points in your operation flow

5. **Record errors properly**: Use `set_span_error()` to mark failures

## Example: Tracing an API Endpoint

```python
from monitoring.tracing_utils import async_trace, add_span_attribute

async def tailor_resume_endpoint(request: Request, job_description: str):
    async with async_trace(
        "tailor_resume",
        {"job_description_length": len(job_description)},
        kind=SpanKind.SERVER
    ) as span:
        add_span_attribute("request_id", request.headers.get("X-Request-ID"))
        
        # Call resume tailoring service
        result = await tailor_resume(resume_data, job_description)
        
        add_span_attribute("result_variants", len(result.variants))
        return result
```

## Dependencies

The following packages are used:
- `opentelemetry-api`
- `opentelemetry-sdk`
- `opentelemetry-exporter-otlp`
- `opentelemetry-exporter-console`
- `opentelemetry-instrumentation-fastapi`
- `opentelemetry-instrumentation-httpx`
