"""
Pytest configuration for monitoring tests.
"""

import sys
from pathlib import Path

# Add resume-api directory to Python path for imports
# Tests are run from project root, so we need to add resume-api to path
current_dir = Path(__file__).resolve()
resume_api_dir = current_dir.parent.parent
if str(resume_api_dir) not in sys.path:
    sys.path.insert(0, str(resume_api_dir))
