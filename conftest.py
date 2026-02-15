"""
Configuration for pytest tests.
"""

import sys
import os
from pathlib import Path

# Set environment variables for testing BEFORE importing the app
os.environ.setdefault("TESTING", "True")
os.environ.setdefault(
    "REQUIRE_API_KEY", "False"
)  # Disable API key requirement for tests
os.environ.setdefault(
    "ENABLE_RATE_LIMITING", "False"
)  # Disable rate limiting for tests

# Add the resume-api directory to the path so tests can import the app
resume_api_path = Path(__file__).parent / "resume-api"
sys.path.insert(0, str(resume_api_path))

# Also add the parent directory to path
parent_dir = Path(__file__).parent
sys.path.insert(0, str(parent_dir))
