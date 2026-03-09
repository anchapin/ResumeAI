"""
Tests for log scrubbing functionality.
"""

import pytest

from monitoring.log_scrubbing import (
    REDACTED,
    _is_sensitive_field_key,
    _scrub_string,
    scrub_log_entry,
    scrub_value,
    validate_log_entry,
)


class TestSensitiveFieldDetection:
    """Tests for detecting sensitive field keys."""

    def test_password_field(self):
        assert _is_sensitive_field_key("password")
        assert _is_sensitive_field_key("PASSWORD")
        assert _is_sensitive_field_key("user_password")
        assert _is_sensitive_field_key("password_hash")

    def test_token_field(self):
        assert _is_sensitive_field_key("token")
        assert _is_sensitive_field_key("access_token")
        assert _is_sensitive_field_key("refresh_token")
        assert _is_sensitive_field_key("session_token")
        assert _is_sensitive_field_key("jwt")

    def test_api_key_field(self):
        assert _is_sensitive_field_key("api_key")
        assert _is_sensitive_field_key("apiKey")
        assert _is_sensitive_field_key("apikey")
        assert _is_sensitive_field_key("client_secret")

    def test_email_field(self):
        assert _is_sensitive_field_key("email")
        assert _is_sensitive_field_key("user_email")
        assert _is_sensitive_field_key("email_address")

    def test_non_sensitive_field(self):
        assert not _is_sensitive_field_key("username")
        assert not _is_sensitive_field_key("user_id")
        assert not _is_sensitive_field_key("message")
        assert not _is_sensitive_field_key("request_id")


class TestStringScrubbing:
    """Tests for scrubbing sensitive patterns in strings."""

    def test_password_pattern(self):
        text = 'password="mysecretpassword"'
        result = _scrub_string(text)
        assert REDACTED in result or "password" not in result.lower()

    def test_api_key_pattern(self):
        text = "api_key=sk_live_abcdef123456"
        result = _scrub_string(text)
        assert REDACTED in result

    def test_bearer_token_pattern(self):
        text = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        result = _scrub_string(text)
        assert REDACTED in result

    def test_github_token(self):
        text = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"
        result = _scrub_string(text)
        assert REDACTED in result

    def test_private_key(self):
        text = "-----BEGIN RSA PRIVATE KEY-----"
        result = _scrub_string(text)
        assert REDACTED in result


class TestScrubValue:
    """Tests for scrub_value function."""

    def test_scrub_dict(self):
        data = {"username": "john", "password": "secret"}
        result = scrub_value(data)
        assert result["username"] == "john"
        assert result["password"] == REDACTED

    def test_scrub_nested_dict(self):
        data = {
            "user": {
                "name": "John",
                "password": "secret",
                "details": {"token": "abc123"},
            }
        }
        result = scrub_value(data)
        assert result["user"]["name"] == "John"
        assert result["user"]["password"] == REDACTED
        assert result["user"]["details"]["token"] == REDACTED

    def test_scrub_list(self):
        data = [{"password": "secret1"}, {"password": "secret2"}]
        result = scrub_value(data)
        assert result[0]["password"] == REDACTED
        assert result[1]["password"] == REDACTED

    def test_scrub_string(self):
        data = "password=secret"
        result = scrub_value(data)
        assert REDACTED in result


class TestScrubLogEntry:
    """Tests for scrub_log_entry processor."""

    def test_basic_scrubbing(self):
        event_dict = {
            "event": "user_login",
            "email": "user@example.com",
            "password": "secret123",
            "api_key": "sk_live_abc123",
        }
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["email"] == REDACTED
        assert result["password"] == REDACTED
        assert result["api_key"] == REDACTED

    def test_preserve_non_sensitive(self):
        event_dict = {
            "event": "user_login",
            "username": "john_doe",
            "user_id": "12345",
            "status": "success",
        }
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["username"] == "john_doe"
        assert result["user_id"] == "12345"
        assert result["status"] == "success"

    def test_scrub_nested_structures(self):
        event_dict = {
            "event": "api_request",
            "request": {"headers": {"Authorization": "Bearer token123"}},
        }
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["request"]["headers"]["Authorization"] == REDACTED

    def test_scrub_list_values(self):
        event_dict = {
            "event": "batch_operation",
            "items": [{"password": "secret1"}, {"api_key": "key1"}],
        }
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["items"][0]["password"] == REDACTED
        assert result["items"][1]["api_key"] == REDACTED


class TestValidateLogEntry:
    """Tests for validate_log_entry function."""

    def test_detect_sensitive_fields(self):
        event_dict = {
            "password": "secret",
            "username": "john",
        }
        warnings = validate_log_entry(event_dict)
        assert any("password" in w for w in warnings)

    def test_no_warnings_for_safe_data(self):
        event_dict = {
            "username": "john",
            "user_id": "123",
            "message": "Login successful",
        }
        warnings = validate_log_entry(event_dict)
        assert len(warnings) == 0

    def test_detect_sensitive_patterns(self):
        event_dict = {
            "message": "User logged in with password=secret123",
        }
        warnings = validate_log_entry(event_dict)
        assert len(warnings) > 0


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_none_value(self):
        event_dict = {"key": None}
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["key"] is None

    def test_numeric_value(self):
        event_dict = {"count": 42}
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["count"] == 42

    def test_empty_dict(self):
        event_dict = {}
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result == {}

    def test_empty_string(self):
        event_dict = {"key": ""}
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["key"] == ""

    def test_case_insensitive_field_names(self):
        event_dict = {"PASSWORD": "secret", "Password": "secret2"}
        result = scrub_log_entry(None, "info", event_dict.copy())
        assert result["PASSWORD"] == REDACTED
        assert result["Password"] == REDACTED
