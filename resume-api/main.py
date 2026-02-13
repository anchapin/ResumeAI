"""
Resume API - Main Application

FastAPI service for generating and tailoring professional resumes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import router
from config import settings
from config.dependencies import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Initialize FastAPI app
app = FastAPI(
    title="Resume API",
    description="API service for generating and tailoring professional resumes using LaTeX templates and AI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiting state
app.state.limiter = limiter

# Register rate limit exception handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    print("Resume API starting up...")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    print("Resume API shutting down...")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
