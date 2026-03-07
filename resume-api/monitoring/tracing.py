"""
Distributed Tracing Configuration using OpenTelemetry.

This module provides tracing capabilities for the Resume API,
enabling distributed tracing across microservices.
"""

import os
from typing import Optional

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    ConsoleSpanExporter,
)
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as OTLPSpanExporterHTTP
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor


class TracingConfig:
    """Configuration for distributed tracing."""

    def __init__(
        self,
        service_name: str = "resume-api",
        otlp_endpoint: Optional[str] = None,
        sample_rate: float = 1.0,
        enable_console_exporter: bool = False,
    ):
        self.service_name = service_name
        self.otlp_endpoint = otlp_endpoint
        self.sample_rate = sample_rate
        self.enable_console_exporter = enable_console_exporter
        self._tracer: Optional[trace.Tracer] = None

    def setup(self):
        """Set up the tracing provider and exporters."""
        # Create a resource with service name
        resource = Resource(attributes={SERVICE_NAME: self.service_name})

        # Create tracer provider
        provider = TracerProvider(resource=resource)

        # Set the global tracer provider
        trace.set_tracer_provider(provider)

        # Get a tracer
        self._tracer = trace.get_tracer(__name__)

        # Add console exporter for debugging (optional)
        if self.enable_console_exporter:
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

        # Add OTLP exporter if endpoint is configured
        if self.otlp_endpoint:
            try:
                # Try gRPC first, fall back to HTTP
                try:
                    otlp_exporter = OTLPSpanExporter(
                        endpoint=self.otlp_endpoint,
                        insecure=True,
                    )
                except Exception:
                    # Fall back to HTTP if gRPC fails
                    otlp_exporter = OTLPSpanExporterHTTP(
                        endpoint=self.otlp_endpoint,
                    )

                provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            except Exception as e:
                # Log warning but don't fail if OTLP export fails
                import logging
                logging.warning(f"Failed to set up OTLP exporter: {e}")

    def instrument_fastapi(self, app):
        """Instrument FastAPI application with OpenTelemetry."""
        try:
            FastAPIInstrumentor.instrument_app(app)
        except Exception as e:
            import logging
            logging.warning(f"Failed to instrument FastAPI: {e}")

    def instrument_httpx(self):
        """Instrument HTTPX client with OpenTelemetry."""
        try:
            HTTPXClientInstrumentor().instrument()
        except Exception as e:
            import logging
            logging.warning(f"Failed to instrument HTTPX: {e}")

    def get_tracer(self) -> trace.Tracer:
        """Get the tracer instance."""
        if self._tracer is None:
            self._tracer = trace.get_tracer(self.service_name)
        return self._tracer


# Global tracing configuration instance
_tracing_config: Optional[TracingConfig] = None


def setup_tracing(
    service_name: str = "resume-api",
    otlp_endpoint: Optional[str] = None,
    sample_rate: float = 1.0,
    enable_console: bool = False,
) -> TracingConfig:
    """
    Set up distributed tracing for the application.

    Args:
        service_name: Name of the service for tracing
        otlp_endpoint: OTLP collector endpoint (e.g., "http://localhost:4317")
        sample_rate: Sample rate for traces (0.0 to 1.0)
        enable_console: Enable console exporter for debugging

    Returns:
        TracingConfig: The configured tracing instance
    """
    global _tracing_config

    config = TracingConfig(
        service_name=service_name,
        otlp_endpoint=otlp_endpoint,
        sample_rate=sample_rate,
        enable_console_exporter=enable_console,
    )

    config.setup()
    _tracing_config = config

    return config


def get_tracing_config() -> Optional[TracingConfig]:
    """Get the global tracing configuration."""
    return _tracing_config


def get_tracer(name: str = "resume-api") -> trace.Tracer:
    """
    Get a tracer for manual instrumentation.

    Args:
        name: Name for the tracer

    Returns:
        trace.Tracer: The tracer instance
    """
    return trace.get_tracer(name)


def create_span(
    name: str,
    attributes: Optional[dict] = None,
    kind: trace.SpanKind = trace.SpanKind.INTERNAL,
):
    """
    Create a new span for manual instrumentation.

    Args:
        name: Name of the span
        attributes: Optional attributes for the span
        kind: Kind of span (INTERNAL, CLIENT, SERVER, etc.)

    Returns:
        The created span (use with 'with' statement)
    """
    tracer = get_tracer()
    return tracer.start_span(name, kind=kind, attributes=attributes or {})
