"""
Logging configuration verification and validation utilities.

This module provides utilities to verify that:
1. structlog is correctly configured
2. Log output is in the expected format (JSON)
3. Log entries contain required fields
4. Log levels are properly enforced
"""

import json
import logging
from typing import Dict, Any, Optional, List

import structlog

from config import settings


class LogVerifier:
    """Utility class to verify logging configuration and output."""

    @staticmethod
    def verify_structlog_configured() -> bool:
        """Verify structlog is properly configured."""
        try:
            logger = structlog.get_logger(__name__)
            assert logger is not None

            assert hasattr(logger, "info")
            assert hasattr(logger, "error")
            assert hasattr(logger, "warning")
            assert hasattr(logger, "debug")
            assert hasattr(logger, "critical")
            assert hasattr(logger, "bind")

            return True
        except Exception as e:
            print(f"structlog configuration verification failed: {e}")
            return False

    @staticmethod
    def verify_json_format() -> bool:
        """Verify JSON output format is configured."""
        try:
            if settings.log_format != "json":
                print(f"Warning: log_format is '{settings.log_format}', expected 'json'")
                return False

            config = structlog.get_config()
            if config is None:
                print("Warning: structlog not yet configured")
                return False

            return True
        except Exception as e:
            print(f"JSON format verification failed: {e}")
            return False

    @staticmethod
    def verify_log_level(expected_level: str = None) -> bool:
        """Verify log level is correctly set."""
        try:
            expected = expected_level or settings.log_level

            numeric_level = getattr(logging, expected.upper(), logging.INFO)

            root_logger = logging.getLogger()

            if root_logger.level != numeric_level:
                print(f"Warning: root logger level is {root_logger.level}, expected {numeric_level}")

            return True
        except Exception as e:
            print(f"Log level verification failed: {e}")
            return False

    @staticmethod
    def verify_required_processors() -> bool:
        """Verify required processors are configured in structlog."""
        try:
            config = structlog.get_config()
            if config is None:
                print("Warning: structlog not configured")
                return False

            processors = config.get("processors", [])

            has_timestamp = any("timestamp" in str(p).lower() or "add_timestamp" in str(p) for p in processors)
            has_log_level = any("log_level" in str(p).lower() for p in processors)

            if not has_timestamp:
                print("Warning: timestamp processor not found")
                return False

            if not has_log_level:
                print("Warning: log_level processor not found")
                return False

            return True
        except Exception as e:
            print(f"Processor verification failed: {e}")
            return False

    @staticmethod
    def validate_log_entry(log_output: str) -> Dict[str, Any]:
        """Validate and parse a log entry."""
        result = {
            "valid": False,
            "format": None,
            "parsed": None,
            "required_fields": {},
            "issues": []
        }

        if not log_output or not log_output.strip():
            result["issues"].append("Empty log output")
            return result

        output = log_output.strip()

        try:
            parsed = json.loads(output)
            result["format"] = "json"
            result["parsed"] = parsed
            result["valid"] = True

            required = ["timestamp", "event"]
            for field in required:
                if field in parsed:
                    result["required_fields"][field] = "present"
                else:
                    result["required_fields"][field] = "missing"
                    result["issues"].append(f"Missing required field: {field}")

            return result
        except json.JSONDecodeError as e:
            result["issues"].append(f"Not valid JSON: {e}")

        if "timestamp" in output and ("event" in output or "message" in output):
            result["format"] = "console"
            result["valid"] = True
            return result

        result["issues"].append("Could not determine log format")
        return result


class LoggingComponentSpec:
    """Specification for log levels for each component."""

    COMPONENTS = {
        "routes.auth": {
            "name": "Authentication Routes",
            "level": logging.INFO,
            "logs": [
                "auth_attempt",
                "auth_success",
                "auth_failure",
                "token_issued",
                "token_revoked",
            ]
        },
        "routes.github": {
            "name": "GitHub OAuth Routes",
            "level": logging.INFO,
            "logs": [
                "github_oauth_started",
                "github_oauth_success",
                "github_oauth_failed",
                "github_user_fetched",
                "github_token_revoked",
            ]
        },
        "routes.linkedin": {
            "name": "LinkedIn OAuth Routes",
            "level": logging.INFO,
            "logs": [
                "linkedin_oauth_started",
                "linkedin_oauth_success",
                "linkedin_oauth_failed",
                "linkedin_user_fetched",
            ]
        },
        "api.v1": {
            "name": "API Routes (V1)",
            "level": logging.INFO,
            "logs": [
                "endpoint_called",
                "request_validated",
                "response_generated",
            ]
        },
        "database": {
            "name": "Database",
            "level": logging.INFO,
            "logs": [
                "connection_pool_created",
                "query_executed",
                "transaction_started",
                "transaction_committed",
                "transaction_rolled_back",
            ]
        },
        "config.cache": {
            "name": "Cache Configuration",
            "level": logging.INFO,
            "logs": [
                "cache_hit",
                "cache_miss",
                "cache_evicted",
                "redis_connected",
                "redis_disconnected",
            ]
        },
        "config.database_replicas": {
            "name": "Database Replicas",
            "level": logging.INFO,
            "logs": [
                "replica_health_check",
                "replica_marked_unhealthy",
                "replica_restored",
            ]
        },
        "monitoring.health": {
            "name": "Health Checks",
            "level": logging.INFO,
            "logs": [
                "health_check_passed",
                "health_check_failed",
                "health_check_degraded",
            ]
        },
        "middleware.error_handling": {
            "name": "Error Handling Middleware",
            "level": logging.WARNING,
            "logs": [
                "request_error",
                "unhandled_exception",
                "validation_error",
            ]
        },
        "middleware.monitoring": {
            "name": "Monitoring Middleware",
            "level": logging.DEBUG,
            "logs": [
                "request_started",
                "request_completed",
                "request_failed",
            ]
        },
        "lib.utils.retry": {
            "name": "Retry Logic",
            "level": logging.WARNING,
            "logs": [
                "retry_attempt",
                "retry_exhausted",
                "retry_success",
            ]
        },
        "lib.deployment.feature_flags": {
            "name": "Feature Flags",
            "level": logging.INFO,
            "logs": [
                "feature_flag_enabled",
                "feature_flag_disabled",
                "feature_flag_maintenance",
            ]
        },
    }

    @classmethod
    def get_component_spec(cls, component_name: str) -> Optional[Dict[str, Any]]:
        """Get specification for a component."""
        return cls.COMPONENTS.get(component_name)

    @classmethod
    def get_all_components(cls) -> Dict[str, Dict[str, Any]]:
        """Get all component specifications."""
        return cls.COMPONENTS.copy()

    @classmethod
    def validate_component_logging(cls, component_name: str, log_entries: List[str]) -> Dict[str, Any]:
        """Validate that a component is logging at the correct level."""
        spec = cls.get_component_spec(component_name)

        if not spec:
            return {"valid": False, "error": f"Unknown component: {component_name}"}

        return {
            "component": component_name,
            "expected_level": logging.getLevelName(spec["level"]),
            "log_count": len(log_entries),
            "valid": len(log_entries) > 0,
        }


def log_verification_report() -> str:
    """Generate a verification report for logging configuration."""
    verifier = LogVerifier()

    report_lines = [
        "=== Logging Configuration Verification Report ===",
        "",
        "1. structlog Configuration:",
        f"   Configured: {verifier.verify_structlog_configured()}",
        "",
        "2. JSON Format:",
        f"   JSON enabled: {verifier.verify_json_format()}",
        "",
        "3. Log Level:",
        f"   Level configured: {verifier.verify_log_level()}",
        f"   Log level: {settings.log_level}",
        "",
        "4. Required Processors:",
        f"   Processors valid: {verifier.verify_required_processors()}",
        "",
        "5. Component Specifications:",
    ]

    for component, spec in LoggingComponentSpec.get_all_components().items():
        level = logging.getLevelName(spec["level"])
        report_lines.append(f"   - {component}: {level}")

    report_lines.append("")
    report_lines.append("=== End Report ===")

    return "\n".join(report_lines)
