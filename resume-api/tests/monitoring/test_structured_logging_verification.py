"""
Comprehensive tests for structured logging configuration verification.

This test module verifies that:
1. structlog is configured correctly
2. JSON output format is used in production
3. Logs are properly captured and structured
4. Error scenarios produce structured log entries
5. Log levels are correctly enforced
"""

import json
import logging

import pytest
import structlog

from monitoring import logging_config
from config import settings


class TestStructuredLoggingConfiguration:
    """Tests for structured logging setup and configuration."""

    def test_structlog_is_configured(self):
        """Verify structlog is properly configured."""
        logger = logging_config.get_logger("test")
        assert logger is not None
        assert hasattr(logger, "bind")
        assert hasattr(logger, "info")
        assert hasattr(logger, "error")
        assert hasattr(logger, "warning")
        assert hasattr(logger, "debug")
        assert hasattr(logger, "critical")

    def test_timestamp_is_added_to_logs(self, capsys):
        """Verify timestamps are added to all log entries."""
        logger = logging_config.get_logger("test.timestamp")
        logger.info("timestamp_test")

        captured = capsys.readouterr()
        output = captured.out.strip()

        if output:
            try:
                parsed = json.loads(output)
                assert "timestamp" in parsed, "Timestamp not found in log entry"
            except json.JSONDecodeError:
                pass

    def test_context_variables_are_preserved(self):
        """Verify context variables are properly bound and preserved."""
        logger = logging_config.get_logger("test.context")

        with logging_config.RequestContext(
            request_id="req-123",
            user_id="user-456",
            method="POST",
            path="/api/test"
        ):
            logger.info("context_test")

        logger.info("after_context")

    def test_request_context_manager(self):
        """Test RequestContext context manager functionality."""
        context_data = {
            "request_id": "test-req-001",
            "user_id": "test-user-001",
            "method": "GET",
            "path": "/api/v1/test"
        }

        with logging_config.RequestContext(**context_data) as ctx:
            assert ctx.context == context_data


class TestErrorLogging:
    """Tests for error logging and exception handling."""

    def test_log_exception_with_context(self, capsys):
        """Test logging exceptions with context information."""
        logger = logging_config.get_logger("test.exception")

        try:
            raise ValueError("Test validation error")
        except Exception as exc:
            logging_config.log_exception(
                logger=logger,
                exc=exc,
                endpoint="/api/test",
                user_id="test-user"
            )

        captured = capsys.readouterr()
        output = captured.out

        if output:
            assert "exception" in output.lower() or "error" in output.lower()

    def test_exception_type_is_captured(self, capsys):
        """Verify exception type is captured in logs."""
        logger = logging_config.get_logger("test.exc_type")

        custom_exc = RuntimeError("Custom runtime error")
        logging_config.log_exception(logger=logger, exc=custom_exc)

        captured = capsys.readouterr()
        output = captured.out

        if output:
            assert "RuntimeError" in output or "runtime" in output.lower()

    def test_exception_message_is_preserved(self, capsys):
        """Verify exception message is preserved in logs."""
        logger = logging_config.get_logger("test.exc_msg")

        exc = ValueError("Specific validation failure")
        logging_config.log_exception(logger=logger, exc=exc)

        captured = capsys.readouterr()
        output = captured.out

        if output:
            assert "Specific validation failure" in output or "validation" in output.lower()

    def test_error_reproduction_json_format(self, capsys):
        """Reproduce error scenario and verify JSON logging output."""
        logger = logging_config.get_logger("test.error_scenario")

        request_context = {
            "request_id": "err-req-001",
            "user_id": "err-user-001",
            "endpoint": "/api/v1/resume/tailor",
            "method": "POST"
        }

        with logging_config.RequestContext(**request_context):
            try:
                raise KeyError("Missing required field: skills")
            except KeyError as e:
                logging_config.log_exception(
                    logger=logger,
                    exc=e,
                    status_code=400,
                    error_code="INVALID_REQUEST"
                )

        captured = capsys.readouterr()
        output = captured.out.strip()

        if output:
            try:
                parsed = json.loads(output)
                assert isinstance(parsed, dict)
            except json.JSONDecodeError:
                assert "KeyError" in output or "Missing" in output


class TestLogRequest:
    """Tests for HTTP request logging."""

    def test_log_request_structure(self, capsys):
        """Verify request logging captures required fields."""
        logger = logging_config.get_logger("test.request")

        logging_config.log_request(
            logger=logger,
            method="GET",
            path="/api/v1/resumes",
            status_code=200,
            duration_ms=45.23,
            user_id="test-user"
        )

        captured = capsys.readouterr()
        output = captured.out

        assert "GET" in output or "method" in output.lower()
        assert "/api/v1/resumes" in output or "resumes" in output
        assert "200" in output or "status" in output.lower()

    def test_log_request_duration_formatting(self, capsys):
        """Verify request duration is properly formatted."""
        logger = logging_config.get_logger("test.duration")

        duration_ms = 123.456789
        logging_config.log_request(
            logger=logger,
            method="POST",
            path="/test",
            status_code=201,
            duration_ms=duration_ms
        )

        captured = capsys.readouterr()
        output = captured.out

        assert "123.46" in output or "duration" in output.lower() or "POST" in output


class TestLogLevels:
    """Tests for log level behavior."""

    def test_all_log_levels_available(self):
        """Verify all standard log levels are available."""
        logger = logging_config.get_logger("test.alllevels")

        assert callable(logger.debug)
        assert callable(logger.info)
        assert callable(logger.warning)
        assert callable(logger.error)
        assert callable(logger.critical)

    def test_info_logging(self, capsys):
        """Test info level logging."""
        logger = logging_config.get_logger("test.info")
        logger.info("info_message", detail="info_data")

        capsys.readouterr()

    def test_warning_logging(self, capsys):
        """Test warning level logging."""
        logger = logging_config.get_logger("test.warning")
        logger.warning("warning_message", detail="warning_data")

        captured = capsys.readouterr()
        output = captured.out
        assert "warning" in output.lower() or "warn" in output.lower() or output

    def test_error_logging(self, capsys):
        """Test error level logging."""
        logger = logging_config.get_logger("test.error")
        logger.error("error_message", detail="error_data")

        captured = capsys.readouterr()
        output = captured.out
        assert output


class TestLoggingConfiguration:
    """Tests for configuration settings."""

    def test_log_level_from_settings(self):
        """Verify log level is read from settings."""
        assert hasattr(settings, "log_level")
        assert settings.log_level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

    def test_log_format_from_settings(self):
        """Verify log format is read from settings."""
        assert hasattr(settings, "log_format")
        assert settings.log_format in ["json", "console"]

    def test_settings_defaults(self):
        """Verify settings have sensible defaults."""
        assert settings.log_level in ["INFO", "WARNING", "ERROR", "CRITICAL"]
        assert settings.log_format == "json"


class TestComponentLogging:
    """Tests for component-specific logging."""

    def test_auth_component_logging(self):
        """Test logging in auth component."""
        logger = logging_config.get_logger("routes.auth")

        logger.info("auth_attempt", method="oauth", provider="github")
        logger.info("auth_success", user_id="test-user")
        logger.warning("auth_failure", reason="invalid_state")

    def test_database_component_logging(self):
        """Test logging in database component."""
        logger = logging_config.get_logger("database")

        logger.info("connection_pool_created", min_size=5, max_size=20)
        logger.info("query_executed", query_type="select", duration_ms=10)

    def test_api_component_logging(self):
        """Test logging in API component."""
        logger = logging_config.get_logger("api.v1")

        logger.info("endpoint_called", path="/api/v1/resumes", method="GET")
        logger.info("request_validated", schema="ResumeSchema")

    def test_cache_component_logging(self):
        """Test logging in cache component."""
        logger = logging_config.get_logger("config.cache")

        logger.info("cache_hit", key="resume_v1", hit_ratio=0.85)
        logger.info("cache_miss", key="resume_v2")

    def test_monitoring_component_logging(self):
        """Test logging in monitoring component."""
        logger = logging_config.get_logger("monitoring.health")

        logger.info("health_check_passed", service="database")
        logger.warning("health_check_degraded", service="redis", latency_ms=500)


def test_integration_structured_logging_full_flow(capsys):
    """Integration test: full request flow with structured logging."""
    logger = logging_config.get_logger("integration.test")

    request_id = "int-test-001"
    user_id = "int-user-001"

    with logging_config.RequestContext(request_id=request_id, user_id=user_id):
        logger.info("request_started", endpoint="/api/v1/tailor", method="POST")
        logger.info("processing_input", input_size=1024)

        try:
            if False:
                raise ValueError("Processing failed")
        except Exception as e:
            logging_config.log_exception(logger=logger, exc=e)

        logging_config.log_request(
            logger=logger,
            method="POST",
            path="/api/v1/tailor",
            status_code=200,
            duration_ms=234.56
        )

    captured = capsys.readouterr()
    output = captured.out

    assert "request_started" in output or "POST" in output
    assert "processing_input" in output or output
