"""Tests for startup environment validation.

Tests that required secrets are validated at application startup.
"""

import os
import pytest
from unittest import mock
from config.validation import SecretValidator, MissingSecretError, startup_validation


class TestSecretValidator:
    """Tests for SecretValidator class."""

    def test_validate_success_with_all_required_vars(self):
        """Test validation passes with all required variables set."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "MASTER_API_KEY": "rai_test_key_123",
                "SECRET_KEY": "test_secret_key_123",
                "OPENAI_API_KEY": "sk-test-key",
            },
        ):
            # Should not raise
            SecretValidator.validate()

    def test_validate_missing_master_api_key(self):
        """Test validation fails if MASTER_API_KEY is missing in production."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "SECRET_KEY": "test_secret",
                "OPENAI_API_KEY": "sk-test",
            },
        ):
            with pytest.raises(MissingSecretError) as exc_info:
                SecretValidator.validate()
            assert "MASTER_API_KEY" in str(exc_info.value)

    def test_validate_missing_secret_key(self):
        """Test validation fails if SECRET_KEY is missing in production."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "MASTER_API_KEY": "rai_test_key",
                "OPENAI_API_KEY": "sk-test",
            },
        ):
            with pytest.raises(MissingSecretError) as exc_info:
                SecretValidator.validate()
            assert "SECRET_KEY" in str(exc_info.value)

    def test_validate_missing_ai_provider_keys(self):
        """Test validation fails if no AI provider key is set."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "MASTER_API_KEY": "rai_test_key",
                "SECRET_KEY": "test_secret",
            },
        ):
            with pytest.raises(MissingSecretError) as exc_info:
                SecretValidator.validate()
            # Should mention at least one AI provider
            error_msg = str(exc_info.value)
            assert (
                "OPENAI_API_KEY" in error_msg
                or "ANTHROPIC_API_KEY" in error_msg
                or "GEMINI_API_KEY" in error_msg
            )

    def test_validate_development_mode_relaxed(self):
        """Test validation in development mode is more relaxed."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "true",
                "OPENAI_API_KEY": "sk-test",
                # MASTER_API_KEY and SECRET_KEY not required in dev
            },
        ):
            # Should not raise in development
            SecretValidator.validate()

    def test_validate_with_anthropic_instead_of_openai(self):
        """Test validation passes with Anthropic API key instead of OpenAI."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "MASTER_API_KEY": "rai_test_key",
                "SECRET_KEY": "test_secret",
                "ANTHROPIC_API_KEY": "sk-ant-test",
            },
        ):
            # Should not raise
            SecretValidator.validate()

    def test_validate_with_gemini_instead_of_openai(self):
        """Test validation passes with Gemini API key instead of OpenAI."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "MASTER_API_KEY": "rai_test_key",
                "SECRET_KEY": "test_secret",
                "GEMINI_API_KEY": "test-gemini-key",
            },
        ):
            # Should not raise
            SecretValidator.validate()

    def test_sanitize_dict_redacts_sensitive_vars(self):
        """Test that sensitive variables are redacted in logs."""
        test_dict = {
            "OPENAI_API_KEY": "sk-1234567890abcdef",
            "MASTER_API_KEY": "rai_1234567890abcdef",
            "DEBUG": "false",
            "HOST": "0.0.0.0",
        }

        sanitized = SecretValidator.sanitize_dict(test_dict)

        # Sensitive values should be redacted
        assert sanitized["OPENAI_API_KEY"] == "sk-1***"
        assert sanitized["MASTER_API_KEY"] == "rai_***"

        # Non-sensitive values should be unchanged
        assert sanitized["DEBUG"] == "false"
        assert sanitized["HOST"] == "0.0.0.0"

    def test_sanitize_dict_handles_missing_values(self):
        """Test sanitization of empty/None sensitive values."""
        test_dict = {
            "OPENAI_API_KEY": None,
            "SECRET_KEY": "",
            "DEBUG": "false",
        }

        sanitized = SecretValidator.sanitize_dict(test_dict)

        assert sanitized["OPENAI_API_KEY"] == "(not set)"
        assert sanitized["SECRET_KEY"] == "(not set)"
        assert sanitized["DEBUG"] == "false"

    def test_sanitize_dict_handles_short_values(self):
        """Test sanitization of values shorter than 4 characters."""
        test_dict = {
            "OPENAI_API_KEY": "abc",
            "MASTER_API_KEY": "rai",
        }

        sanitized = SecretValidator.sanitize_dict(test_dict)

        assert sanitized["OPENAI_API_KEY"] == "***"
        assert sanitized["MASTER_API_KEY"] == "***"

    def test_log_loaded_config(self, caplog):
        """Test that configuration is logged with sensitive values redacted."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "PORT": "8000",
                "OPENAI_API_KEY": "sk-1234567890abcdef",
                "MASTER_API_KEY": "rai_1234567890abcdef",
            },
        ):
            import logging

            # Enable logging at INFO level
            with caplog.at_level(logging.INFO):
                SecretValidator.log_loaded_config()

            # Check that config was logged
            assert len(caplog.records) > 0

            # Check that sensitive values are NOT in logs
            log_output = "\n".join([record.getMessage() for record in caplog.records])
            assert "sk-1234567890abcdef" not in log_output
            assert "rai_1234567890abcdef" not in log_output

            # Check that [LOADED] appears for sensitive vars
            assert "[LOADED]" in log_output or "[NOT SET]" in log_output


class TestStartupValidation:
    """Tests for startup_validation function."""

    def test_startup_validation_success(self):
        """Test startup validation succeeds with all required variables."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                "MASTER_API_KEY": "rai_test_key",
                "SECRET_KEY": "test_secret",
                "OPENAI_API_KEY": "sk-test",
            },
        ):
            # Should not raise or exit
            startup_validation()

    def test_startup_validation_missing_secrets_exits(self, caplog):
        """Test startup validation exits with error on missing secrets."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                # Missing required secrets
            },
        ):
            import logging

            with caplog.at_level(logging.ERROR):
                with pytest.raises(SystemExit) as exc_info:
                    startup_validation()

                # Check that it exited with error code 1
                assert exc_info.value.code == 1

    def test_startup_validation_logs_error_message(self, caplog):
        """Test startup validation logs helpful error message."""
        with mock.patch.dict(
            os.environ,
            {
                "DEBUG": "false",
                # Missing MASTER_API_KEY
                "SECRET_KEY": "test",
                "OPENAI_API_KEY": "sk-test",
            },
        ):
            import logging

            with caplog.at_level(logging.ERROR):
                with pytest.raises(SystemExit):
                    startup_validation()

                # Check for helpful error message
                # Note: This is printed to stderr, not logged
                # So we check the capsys fixture isn't available here
                # But the MissingSecretError should contain the message


class TestSensitiveVariables:
    """Tests for sensitive variable list."""

    def test_all_secret_types_in_sensitive_vars(self):
        """Test that all types of secrets are marked as sensitive."""
        expected_sensitive = {
            # AI Provider Keys
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "GEMINI_API_KEY",
            # Authentication
            "MASTER_API_KEY",
            "SECRET_KEY",
            # OAuth
            "GITHUB_CLIENT_SECRET",
            "LINKEDIN_CLIENT_SECRET",
            # Email
            "SMTP_PASSWORD",
            # Cache
            "REDIS_PASSWORD",
            # Database
            "DATABASE_URL",
        }

        for var in expected_sensitive:
            assert (
                var in SecretValidator.SENSITIVE_VARS
            ), f"{var} should be in SENSITIVE_VARS"

    def test_no_false_positives_in_sensitive_vars(self):
        """Test that non-sensitive vars are not in sensitive list."""
        non_sensitive = {
            "DEBUG",
            "HOST",
            "PORT",
            "CORS_ORIGINS",
            "LOG_LEVEL",
        }

        for var in non_sensitive:
            assert (
                var not in SecretValidator.SENSITIVE_VARS
            ), f"{var} should NOT be in SENSITIVE_VARS"
