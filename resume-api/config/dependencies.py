"""
Configuration dependencies and settings.
"""

import os
from typing import Annotated

from fastapi import Header, HTTPException, status, Depends
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

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


def get_request_identifier(request):
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        return api_key
    return get_remote_address(request)


limiter = Limiter(key_func=get_request_identifier)


async def get_api_key(x_api_key: str = Header(None)) -> str:
    if not settings.require_api_key:
        return "anonymous"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is required"
        )
    if settings.master_api_key and x_api_key == settings.master_api_key:
        return x_api_key
    if settings.api_keys and x_api_key in settings.api_keys:
        return x_api_key
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid API key"
    )


AuthorizedAPIKey = Annotated[str, Depends(get_api_key)]


async def rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Rate limit exceeded",
            "detail": str(exc.detail),
            "retry_after": 60,
        },
    )
