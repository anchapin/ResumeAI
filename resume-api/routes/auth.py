"""
Authentication routes placeholder.

For now, these are stubs. The actual authentication is handled
via API key middleware in config/dependencies.py.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/auth/health")
async def auth_health():
    """Auth health check endpoint."""
    return {"status": "ok"}
