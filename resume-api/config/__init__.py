"""
Configuration for Resume API.
"""

from pathlib import Path
from typing import Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


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
    api_keys: Optional[str] = None  # Comma-separated list from env

    # CORS Configuration
    cors_origins: list[str] = ["*"]

    @field_validator("api_keys", mode="before")
    @classmethod
    def parse_api_keys(cls, v: Union[str, None]) -> Optional[list[str]]:
        """Parse comma-separated API keys string into list."""
        if v is None:
            return None
        return [key.strip() for key in v.split(",") if key.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
