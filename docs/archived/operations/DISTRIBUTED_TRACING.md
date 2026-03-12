# Distributed Tracing

This document describes the distributed tracing capabilities added to ResumeAI using OpenTelemetry.

## Overview

Distributed tracing enables tracking requests across multiple services, which is essential for debugging and monitoring microservices architectures. ResumeAI uses [OpenTelemetry](https://opentelemetry.io/) for tracing.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_TRACING` | Enable/disable tracing | `false` |
| `OTLP_ENDPOINT` | OTLP collector endpoint | `None` |
| `TRACE_SAMPLE_RATE` | Trace sample rate (0.0-1.0) | `1.0` |
| `SERVICE_NAME` | Service name for tracing | `resume-api` |

### Example Configuration

```bash
# Enable tracing with Jaeger
ENABLE_TRACING=true
OTLP_ENDPOINT=http://jaeger:4317
TRACE_SAMPLE_RATE=1.0
SERVICE_NAME=resume-api
```

## Backends

### Jaeger

The default tracing backend is [Jaeger](https://www.jaegertracing.io/). It's included in `docker-compose-monitoring.yml`.

```bash
# Start monitoring stack with Jaeger
docker-compose -f docker-compose-monitoring.yml up -d

# Access Jaeger UI
open http://localhost:16686
```

### Other Backends

OpenTelemetry supports multiple backends including:
- Zipkin
- Tempo
- DataDog
- CloudWatch

To use a different backend, update the `OTLP_ENDPOINT` environment variable.

## Usage

### Automatic Instrumentation

FastAPI and HTTPX are automatically instrumented when tracing is enabled. This includes:
- HTTP request/response headers
- Request duration
- Status codes

### Manual Instrumentation

For custom operations, use the tracing utilities:

```python
from monitoring.tracing import create_span, get_tracer
from monitoring.tracing_utils import async_trace, trace_sync, add_span_attribute

# Using context manager
with create_span("my_operation", {"key": "value"}):
    # ... do work ...

# Using async context manager
async with async_trace("async_operation"):
    # ... do work ...

# Adding attributes
add_span_attribute("user_id", user_id)
```

## Viewing Traces

1. Start the monitoring stack:
   ```bash
   docker-compose -f docker-compose-monitoring.yml up -d
   ```

2. Make some API requests to generate traces

3. Open Jaeger UI at http://localhost:16686

4. Select `resume-api` from the service dropdown and search for traces

## Integration with Existing Monitoring

The tracing system integrates with the existing Prometheus + Grafana stack:

- Jaeger UI: http://localhost:16686
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

## Performance Considerations

- **Sample Rate**: Adjust `TRACE_SAMPLE_RATE` to control the percentage of requests traced. A rate of `0.1` traces 10% of requests.
- **Span Attributes**: Keep span attributes concise to reduce overhead.
- **Batch Export**: Spans are exported in batches to reduce network overhead.

## Troubleshooting

### Traces not appearing in Jaeger

1. Check that `ENABLE_TRACING=true` is set
2. Verify `OTLP_ENDPOINT` is correct
3. Check Jaeger is running: `docker ps | grep jaeger`
4. Check logs: `docker-compose -f docker-compose-monitoring.yml logs jaeger`

### High trace volume

Reduce the sample rate:
```bash
TRACE_SAMPLE_RATE=0.1
```

### Missing spans

Ensure your code is running within a traced context (inside an HTTP request handler when using automatic instrumentation).
