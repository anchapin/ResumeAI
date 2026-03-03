"""
Resume routes placeholder.

Basic resume routes are now in api/advanced_routes.py.
This file is kept for backward compatibility.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.get("/resumes/health")
async def resumes_health():
    """Resumes health check endpoint."""
    return {"status": "ok"}
