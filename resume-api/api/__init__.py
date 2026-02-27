"""
API Routes for Resume API
"""

from .routes import router
from .interview_routes import router as interview_router
from .models import ResumeRequest, TailorRequest, VariantsResponse

__all__ = [
    "router",
    "interview_router",
    "ResumeRequest",
    "TailorRequest",
    "VariantsResponse",
]
