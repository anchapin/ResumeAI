"""
Configuration for Resume API.
"""

import logging
import secrets
from pathlib import Path
from typing import Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    # API Configuration
    app_name: str = "Resume API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    # Paths
    lib_dir: Path = Path(__file__).parent.parent
    templates_dir: Path = Path(__file__).parent.parent / "templates"

    # AI Configuration
    ai_provider: str = "openai"  # openai, claude, gemini
    ai_model: Optional[str] = None

    # API Keys
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None

    # API Authentication
    require_api_key: bool = True
    master_api_key: Optional[str] = None
    api_keys: Optional[list[str]] = (
        None  # List of API keys (parsed from comma-separated env)
    )

    # CORS Configuration
    cors_origins: list[str] = ["*"]

    # JWT Configuration
    # Securely generate JWT secret if not provided
    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    # Rate Limiting Configuration
    enable_rate_limiting: bool = True
    rate_limit_pdf: str = "10/minute"  # PDF generation is expensive
    rate_limit_tailor: str = "30/minute"  # Tailoring is moderate
    rate_limit_variants: str = "60/minute"  # Listing variants is light

    # Logging Configuration
    log_level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    log_format: str = "json"  # json, console
    log_file: Optional[str] = None  # Path to log file, None for stdout

    # Metrics Configuration
    enable_metrics: bool = True
    metrics_path: str = "/metrics"

    # Sentry (Error Tracking) Configuration
    enable_sentry: bool = False
    sentry_dsn: Optional[str] = None
    sentry_environment: str = "production"
    sentry_traces_sample_rate: float = 0.1

    # Alerting Configuration
    enable_alerting: bool = True
    alert_error_rate_threshold: float = 0.05  # 5% error rate triggers alert
    alert_slow_response_threshold: float = 5.0  # Response time in seconds
    alert_check_interval: int = 300  # Check every 5 minutes

    # Analytics Configuration
    enable_analytics: bool = True
    analytics_retention_days: int = 90  # Keep analytics data for 90 days

    # Stripe Configuration
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_price_id_basic: Optional[str] = None  # Basic plan price ID
    stripe_price_id_premium: Optional[str] = None  # Premium plan price ID

    # GitHub Configuration
    github_client_id: Optional[str] = None  # GitHub OAuth App client ID
    github_client_secret: Optional[str] = None  # GitHub OAuth App client secret
    github_redirect_uri: Optional[str] = None  # OAuth redirect URI
    github_callback_url: Optional[str] = None  # Callback URL for OAuth
    frontend_url: str = "http://localhost:5173"

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """Validate JWT secret is secure."""
        insecure_defaults = [
            "your-secret-key-change-in-production",
            "your-super-secret-jwt-key-change-in-production",
        ]

        if v in insecure_defaults:
            logger = logging.getLogger("config")
            logger.critical(
                "SECURITY WARNING: Using insecure default JWT_SECRET! "
                "Generating a random temporary secret. "
                "Set JWT_SECRET environment variable in production."
            )
            return secrets.token_urlsafe(32)

        if len(v) < 32:
            logger = logging.getLogger("config")
            logger.warning(
                "SECURITY WARNING: JWT_SECRET is shorter than 32 characters. "
                "Consider using a longer secret for better security."
            )

        return v

    @field_validator("api_keys", mode="before")
    @classmethod
    def parse_api_keys(cls, v: Union[str, list, None]) -> Optional[list[str]]:
        """Parse comma-separated API keys string into list."""
        if v is None:
            return None
        if isinstance(v, list):
            return v
        return [key.strip() for key in str(v).split(",") if key.strip()]

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """Validate JWT secret and replace insecure default."""
        if v == "your-secret-key-change-in-production":
            new_secret = secrets.token_urlsafe(32)
            # Use standard logging as app logger might not be configured yet
            logging.warning(
                "SECURITY WARNING: Default JWT secret detected. "
                "Generated a temporary secure random secret. "
                "Set JWT_SECRET environment variable for persistence."
            )
            return new_secret
        return v

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


# Global settings instance
settings = Settings()
