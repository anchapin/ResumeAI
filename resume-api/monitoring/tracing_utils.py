"""
Manual tracing utilities for distributed tracing.

This module provides helpers for adding custom spans and tracing
to application code that isn't automatically instrumented.
"""

from contextlib import asynccontextmanager
from typing import Any, Optional

from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode


def get_tracer(name: str = "resume-api") -> trace.Tracer:
    """
    Get a tracer for manual instrumentation.

    Args:
        name: Name for the tracer

    Returns:
        trace.Tracer: The tracer instance
    """
    return trace.get_tracer(name)


@asynccontextmanager
async def async_trace(
    name: str, attributes: Optional[dict] = None, kind: SpanKind = SpanKind.INTERNAL
):
    """
    Async context manager for creating spans.

    Usage:
        async with async_trace("my_operation", {"key": "value"}):
            # ... do work ...
            pass

    Args:
        name: Name of the span
        attributes: Optional attributes for the span
        kind: Kind of span (INTERNAL, CLIENT, SERVER, etc.)

    Yields:
        The created span
    """
    tracer = get_tracer()
    with tracer.start_as_current_span(name, kind=kind, attributes=attributes or {}) as span:
        yield span


def trace_sync(name: str, attributes: Optional[dict] = None, kind: SpanKind = SpanKind.INTERNAL):
    """
    Sync context manager for creating spans.

    Usage:
        with trace_sync("my_operation", {"key": "value"}):
            # ... do work ...
            pass

    Args:
        name: Name of the span
        attributes: Optional attributes for the span
        kind: Kind of span (INTERNAL, CLIENT, SERVER, etc.)
    """
    tracer = get_tracer()
    with tracer.start_as_current_span(name, kind=kind, attributes=attributes or {}) as span:
        yield span


def add_span_attribute(key: str, value: Any):
    """
    Add an attribute to the current span.

    Args:
        key: Attribute key
        value: Attribute value
    """
    span = trace.get_current_span()
    if span:
        span.set_attribute(key, str(value))


def add_span_event(name: str, attributes: Optional[dict] = None):
    """
    Add an event to the current span.

    Args:
        name: Event name
        attributes: Optional event attributes
    """
    span = trace.get_current_span()
    if span:
        span.add_event(name, attributes=attributes or {})


def set_span_error(message: str, exception: Optional[Exception] = None):
    """
    Record an error on the current span.

    Args:
        message: Error message
        exception: Optional exception object
    """
    span = trace.get_current_span()
    if span:
        span.set_status(Status(StatusCode.ERROR, message))
        if exception:
            span.record_exception(exception)


def get_trace_id() -> Optional[str]:
    """
    Get the trace ID of the current span.

    Returns:
        Trace ID as hex string, or None if no span
    """
    span = trace.get_current_span()
    if span:
        return span.get_span_context().trace_id_hex
    return None


def get_span_id() -> Optional[str]:
    """
    Get the span ID of the current span.

    Returns:
        Span ID as hex string, or None if no span
    """
    span = trace.get_current_span()
    if span:
        return span.get_span_context().span_id_hex
    return None


class TracingContext:
    """
    Context manager for adding tracing context to operations.

    Usage:
        with TracingContext("operation_name", {"user_id": user_id}):
            # All spans created here will have the context
            pass
    """

    def __init__(self, name: str, attributes: Optional[dict] = None):
        self.name = name
        self.attributes = attributes or {}

    def __enter__(self):
        tracer = get_tracer()
        self.span = tracer.start_span(self.name, attributes=self.attributes)
        return self.span.__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
            self.span.record_exception(exc_val)
        return self.span.__exit__(exc_type, exc_val, exc_tb)

    async def __aenter__(self):
        tracer = get_tracer()
        self.span = tracer.start_span(self.name, attributes=self.attributes)
        return await self.span.__aenter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
            self.span.record_exception(exc_val)
        return await self.span.__aexit__(exc_type, exc_val, exc_tb)
