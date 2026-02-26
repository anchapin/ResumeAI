"""
Sentry error tracking configuration for Resume AI.

Integrates Sentry for both backend (FastAPI) and frontend (JavaScript/React) error monitoring.
Issue #402: Set up Sentry for frontend error tracking.
"""

from typing import Optional
from config import settings


class SentryConfig:
    """Configuration for Sentry error tracking."""

    # Backend DSN (for FastAPI)
    BACKEND_DSN = settings.sentry_dsn

    # Frontend DSN (for React/JavaScript)
    # In production, use a separate frontend DSN for better source map management
    FRONTEND_DSN = settings.sentry_dsn  # Can be overridden with separate frontend DSN

    # Environment
    ENVIRONMENT = settings.sentry_environment

    # Sample rates
    TRACES_SAMPLE_RATE = settings.sentry_traces_sample_rate  # Backend traces: 10%
    FRONTEND_TRACES_SAMPLE_RATE = 0.1  # Frontend traces: 10%

    # Event sample rate (for errors not captured by traces)
    FRONTEND_ERROR_SAMPLE_RATE = 1.0  # Capture 100% of frontend errors

    # Enable/disable
    ENABLED = settings.enable_sentry

    # Release identifier (set from environment or package.json)
    RELEASE = settings.get("SENTRY_RELEASE", "resumeai@unknown")

    @staticmethod
    def get_frontend_config() -> dict:
        """
        Get Sentry configuration for frontend JavaScript/React integration.
        
        Returns a dictionary suitable for Sentry.init() in the browser.
        
        Returns:
            dict: Sentry frontend configuration
        """
        if not SentryConfig.ENABLED or not SentryConfig.FRONTEND_DSN:
            return {}

        return {
            "dsn": SentryConfig.FRONTEND_DSN,
            "environment": SentryConfig.ENVIRONMENT,
            "tracesSampleRate": SentryConfig.FRONTEND_TRACES_SAMPLE_RATE,
            "release": SentryConfig.RELEASE,
            "integrations": [
                # React Router integration for page transitions
                "Sentry.replayIntegration()",
            ],
            "replaysSessionSampleRate": 0.1,  # Session replays: 10%
            "replaysOnErrorSampleRate": 1.0,  # Always capture replays for errors
            # Ignore known third-party errors
            "ignoreErrors": [
                # Browser extensions
                "top.GLOBALS",
                "chrome-extension://",
                "moz-extension://",
                # Common third-party errors
                "gapi.iframes",
                r"_\/",
            ],
            # Normalize URLs (remove sensitive data from URLs)
            "beforeSend": None,  # Can be set to a function that filters events
            "denyUrls": [
                # Ignore errors from browser extensions
                r"/extensions\//i",
                r"/^chrome:\/\//i",
            ],
        }

    @staticmethod
    def get_backend_integrations() -> list:
        """
        Get Sentry integrations for FastAPI backend.
        
        Returns:
            list: Sentry integration instances
        """
        import sentry_sdk

        integrations = [
            sentry_sdk.integrations.fastapi.FastApiIntegration(),
            sentry_sdk.integrations.starlette.StarletteIntegration(),
            sentry_sdk.integrations.sqlalchemy.SqlalchemyIntegration(),
            sentry_sdk.integrations.redis.RedisIntegration(),
            sentry_sdk.integrations.httpx.HttpxIntegration(),
        ]

        return integrations
