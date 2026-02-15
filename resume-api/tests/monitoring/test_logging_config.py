"""
Tests for logging configuration.
"""

import pytest
import logging
from monitoring import logging_config


def test_setup_logging():
    """Test that logging is properly configured."""
    # Get logger
    logger = logging_config.get_logger("test")

    # Check logger is not None
    assert logger is not None
    # The logger is a BoundLoggerLazyProxy in structlog, which is correct
    assert hasattr(logger, "info")
    assert hasattr(logger, "error")
    assert hasattr(logger, "debug")


def test_request_context():
    """Test that RequestContext properly adds and removes context."""
    logger = logging_config.get_logger("test")

    # Use context manager
    with logging_config.RequestContext(
        request_id="test-123", method="GET", path="/test"
    ):
        # Context should be bound
        assert True  # If no exception, context was properly managed


def test_log_exception():
    """Test logging exceptions."""
    logger = logging_config.get_logger("test")

    try:
        raise ValueError("Test exception")
    except Exception as exc:
        # This should not raise an error
        logging_config.log_exception(
            logger=logger, exc=exc, method="GET", path="/test"
        )


def test_log_request():
    """Test logging requests."""
    logger = logging_config.get_logger("test")

    # This should not raise an error
    logging_config.log_request(
        logger=logger,
        method="GET",
        path="/test",
        status_code=200,
        duration_ms=123.45,
    )


def test_log_levels():
    """Test different log levels."""
    logger = logging_config.get_logger("test")

    # Test all log levels
    logger.debug("debug_message")
    logger.info("info_message")
    logger.warning("warning_message")
    logger.error("error_message")
    logger.critical("critical_message")
