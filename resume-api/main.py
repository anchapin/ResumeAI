"""
Resume API - Main Application

FastAPI service for generating and tailoring professional resumes.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from api import router
from api.websocket import handle_websocket_connection
from config import settings
from config.dependencies import limiter, rate_limit_exceeded_handler
from database import create_db_and_tables
from middleware.monitoring import MonitoringMiddleware
from monitoring import logging_config, health, alerting, analytics
from slowapi.errors import RateLimitExceeded

# Import new feature routes
from routes.interviews import router as interviews_router
from routes.salary import router as salary_router
from routes.linkedin import router as linkedin_router
from routes.billing import router as billing_router
from routes.auth import router as auth_router

# Get logger
logger = logging_config.get_logger(__name__)


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


def setup_sentry():
    """Initialize Sentry error tracking if enabled."""
    if settings.enable_sentry and settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.sentry_environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            send_default_pii=False,
        )
        logger.info("sentry_initialized", environment=settings.sentry_environment)


def setup_prometheus(app: FastAPI):
    """Initialize Prometheus metrics instrumentation if enabled."""
    if settings.enable_metrics:
        try:
            instrumentator = Instrumentator(
                should_group_status_codes=False,
                should_ignore_untemplated=True,
                should_group_untemplated=True,
                should_instrument_requests_inprogress=True,
                excluded_handlers=["/metrics"],
                env_var_name="OTEL_SERVICE_NAME",
                inprogress_name="fastapi_inprogress",
                inprogress_labels=True,
            )

            instrumentator.instrument(app).expose(
                app,
                endpoint=settings.metrics_path,
                should_gzip=True,
                include_in_schema=False,
            )

            logger.info("prometheus_initialized", metrics_path=settings.metrics_path)
        except ImportError:
            logger.warning("prometheus_fastapi_instrumentator not available")


# Define lifespan to handle startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup
    logger.info("application_startup", version=settings.app_version)

    # Initialize database tables
    await create_db_and_tables()
    logger.info("Database initialized")

    # Set up Sentry error tracking
    setup_sentry()

    # Set up Prometheus metrics
    setup_prometheus(app)

    # Set up alerting in background
    if settings.enable_alerting:
        asyncio.create_task(alert_manager_task())
        logger.info("Alerting enabled")

    yield

    # Shutdown
    logger.info("application_shutdown")
    alerting.alert_manager.stop()


# Global alert manager task
async def alert_manager_task():
    """Background task for alert manager."""
    try:
        await alerting.alert_manager.start()
    except Exception as e:
        logger.error("Alert manager task failed", error=str(e))


# Create FastAPI application
app = FastAPI(
    title="Resume API",
    description=(
        "API service for generating and tailoring professional resumes "
        "using LaTeX templates and AI"
    ),
    version=settings.app_version,
    docs_url="/docs",
    lifespan=lifespan,
    redoc_url="/redoc",
)

# Add rate limiting state
app.state.limiter = limiter

# Register rate limit exception handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add monitoring middleware (must be added before security middleware)
app.add_middleware(MonitoringMiddleware)

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


# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}


@app.get("/health/detailed", tags=["Health"])
async def health_check_detailed():
    """Detailed health check with all components."""
    return await health.get_health_status(detailed=True)


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Readiness check for orchestration systems."""
    return await health.get_readiness_status()


# Analytics endpoints
@app.get("/analytics/summary", tags=["Analytics"])
async def analytics_summary(hours: int = 24):
    """Get analytics summary for the specified time period."""
    return await analytics.get_analytics_summary(hours=hours)


@app.get("/analytics/endpoints", tags=["Analytics"])
async def endpoint_popularity(hours: int = 24, limit: int = 10):
    """Get most popular endpoints."""
    return await analytics.get_endpoint_popularity(hours=hours, limit=limit)


# Include API routes
app.include_router(router)

# Include new feature routes
app.include_router(interviews_router)
app.include_router(salary_router)
app.include_router(linkedin_router)
<<<<<<< HEAD
app.include_router(billing_router)
=======
app.include_router(auth_router)


# WebSocket endpoint for real-time collaboration
@app.websocket("/ws/resumes/{resume_id}")
async def websocket_resume(websocket, resume_id: str, user_id: str = None):
    """
    WebSocket endpoint for real-time collaboration on resumes.

    Connect to collaborate on a specific resume:
    ws://host/ws/resumes/{resume_id}?user_id=optional_user_id

    Message types:
    - cursor_update: Broadcast cursor position
    - resume_update: Broadcast resume data changes
    - typing_start: User started typing
    - typing_stop: User stopped typing
    - ping: Keep-alive ping
    """
    await handle_websocket_connection(websocket, resume_id, user_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host=settings.host, port=settings.port, reload=settings.debug
    )
