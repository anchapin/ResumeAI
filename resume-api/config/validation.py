"""
Secrets and environment validation module.

Validates required environment variables at startup to prevent runtime errors
from missing configuration.
"""

import os
import sys
from typing import List, Set


class MissingSecretError(Exception):
    """Raised when required environment variable is missing."""

    pass


class SecretValidator:
    """Validates required secrets and environment variables."""

    # Required variables that must be set in production
    REQUIRED_IN_PRODUCTION = {
        "MASTER_API_KEY",
        "SECRET_KEY",
        "OPENAI_API_KEY",  # At least one AI provider required
    }

    # Required variables in development
    REQUIRED_IN_DEVELOPMENT = {
        "OPENAI_API_KEY",  # At least one AI provider required
    }

    # Variables that should never be logged or printed
    SENSITIVE_VARS = {
        # AI Provider Keys
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GEMINI_API_KEY",
        # Authentication & Encryption
        "MASTER_API_KEY",
        "SECRET_KEY",
        "JWT_SECRET",
        "TOKEN_ENCRYPTION_KEY",
        # OAuth Secrets
        "GITHUB_CLIENT_SECRET",
        "GITHUB_CLIENT_ID",  # Can be public but often kept secret
        "LINKEDIN_CLIENT_SECRET",
        "LINKEDIN_CLIENT_ID",
        # Payment Processing
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        # Infrastructure
        "SMTP_PASSWORD",
        "REDIS_PASSWORD",
        "DATABASE_URL",
        "DATABASE_REPLICA_URLS",
        # Monitoring & Error Tracking
        "SENTRY_DSN",
    }

    @staticmethod
    def validate() -> None:
        """
        Validate required environment variables.

        Raises MissingSecretError if required variables are missing.
        """
        debug = os.getenv("DEBUG", "false").lower() == "true"
        required = SecretValidator.REQUIRED_IN_DEVELOPMENT

        if not debug:
            required = SecretValidator.REQUIRED_IN_PRODUCTION

        missing: List[str] = []
        for var in required:
            if not os.getenv(var):
                missing.append(var)

        # Check for at least one AI provider
        ai_providers = {
            "OPENAI_API_KEY": "OpenAI",
            "ANTHROPIC_API_KEY": "Anthropic",
            "GEMINI_API_KEY": "Google Gemini",
        }

        has_provider = any(os.getenv(var) for var in ai_providers.keys())
        if not has_provider:
            missing.extend(ai_providers.keys())

        if missing:
            raise MissingSecretError(
                f"Missing required environment variables: {', '.join(missing)}\n"
                f"Please set these in .env or environment.\n"
                f"See .env.example for documentation."
            )

    @staticmethod
    def sanitize_dict(data: dict) -> dict:
        """
        Remove sensitive values from dictionary before logging.

        Args:
            data: Dictionary potentially containing sensitive values

        Returns:
            Dictionary with sensitive values redacted
        """
        sanitized = {}
        for key, value in data.items():
            if key in SecretValidator.SENSITIVE_VARS:
                if value:
                    # Show only first 4 chars + *
                    sanitized[key] = value[:4] + "***" if len(str(value)) > 4 else "***"
                else:
                    sanitized[key] = "(not set)"
            else:
                sanitized[key] = value
        return sanitized

    @staticmethod
    def log_loaded_config() -> None:
        """Log loaded configuration (without sensitive values)."""
        import logging

        logger = logging.getLogger(__name__)

        config = {
            "DEBUG": os.getenv("DEBUG", "false"),
            "PORT": os.getenv("PORT", "8000"),
            "HOST": os.getenv("HOST", "0.0.0.0"),
            "AI_PROVIDER": os.getenv("AI_PROVIDER", "openai"),
            "AI_MODEL": os.getenv("AI_MODEL", "gpt-4o"),
            "REQUIRE_API_KEY": os.getenv("REQUIRE_API_KEY", "true"),
        }

        # Add sensitive vars status (loaded or not)
        for var in SecretValidator.SENSITIVE_VARS:
            config[var] = "[LOADED]" if os.getenv(var) else "[NOT SET]"

        logger.info("Configuration loaded: %s", config)


def startup_validation() -> None:
    """Run all startup validations. Called when app starts."""
    try:
        SecretValidator.validate()
        SecretValidator.log_loaded_config()
    except MissingSecretError as e:
        print(f"FATAL: {e}", file=sys.stderr)
        sys.exit(1)
