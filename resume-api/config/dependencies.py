"""
Configuration dependencies and settings.
"""

import os
from datetime import timedelta
from . import settings

# Secret key for JWT tokens - should be set in environment variables
SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resumeai.db")

# Other configurations
DEBUG = settings.debug

# Application settings
APP_NAME = settings.app_name
APP_VERSION = settings.app_version
