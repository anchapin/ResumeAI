"""
Configuration for Resume API.
"""

import os
from pathlib import Path
from typing import Optional

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

    # CORS Configuration
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
