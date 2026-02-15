"""
Structured logging configuration using structlog.
"""

import logging
import sys

import structlog
from colorama import Fore, Style, init

from config import settings

# Initialize colorama
init(autoreset=True)


# Custom timestamp processor for structlog
def add_timestamp(_, __, event_dict):
    """Add ISO format timestamp to log entry."""
    import datetime

    event_dict["timestamp"] = datetime.datetime.utcnow().isoformat()
    return event_dict


def setup_logging() -> None:
    """Configure structured logging for the application."""
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        add_timestamp,
        structlog.processors.UnicodeDecoder(),
    ]

    if settings.log_format == "json" or not settings.debug:
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(
                colors={
                    logging.DEBUG: Fore.CYAN,
                    logging.INFO: Fore.GREEN,
                    logging.WARNING: Fore.YELLOW,
                    logging.ERROR: Fore.RED,
                    logging.CRITICAL: Fore.RED + Style.BRIGHT,
                }
            ),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


class RequestContext:
    """Context manager for adding request-specific context to logs."""

    def __init__(self, **context):
        self.context = context
        self.token = None

    def __enter__(self):
        self.token = structlog.contextvars.bind_contextvars(**self.context)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.token:
            structlog.contextvars.unbind_contextvars(*self.context.keys())
        return False


def log_exception(logger: structlog.stdlib.BoundLogger, exc: Exception, **context):
    """Log an exception with full context."""
    logger.error(
        "exception_occurred",
        exception_type=type(exc).__name__,
        exception_message=str(exc),
        **context,
    )


def log_request(
    logger: structlog.stdlib.BoundLogger,
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    **context,
):
    """Log an HTTP request."""
    logger.info(
        "request_completed",
        method=method,
        path=path,
        status_code=status_code,
        duration_ms=round(duration_ms, 2),
        **context,
    )


setup_logging()
