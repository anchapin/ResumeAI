"""
Resume API - Main Application

FastAPI service for generating and tailoring professional resumes.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import router
from config import settings
from config.dependencies import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Initialize FastAPI app


# Define lifespan to handle startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup
    print("Resume API starting up...")
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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
