"""
Resume API - Main Application

FastAPI service for generating and tailoring professional resumes.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from api import router
from config import settings
from config.dependencies import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from database import create_db_and_tables
from routes.auth import router as auth_router
from routes.resumes import router as resumes_router


# Security middleware to add security headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Add security headers
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self'"
        )
        response.headers["Content-Security-Policy"] = csp

        return response


# Define lifespan to handle startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup
    print("Resume API starting up...")
    create_db_and_tables()  # Initialize database tables
    yield
    # Shutdown
    print("Resume API shutting down...")


app = FastAPI(
    title="Resume API",
    description="API service for generating and tailoring professional resumes using LaTeX templates and AI",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan,
    redoc_url="/redoc",
)

# Add rate limiting state
app.state.limiter = limiter

# Register rate limit exception handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Add additional security for CORS
    allow_origin_regex=(
        settings.cors_origin_regex if hasattr(settings, "cors_origin_regex") else None
    ),
)

# Include API routes
app.include_router(router)
app.include_router(auth_router)
app.include_router(resumes_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
