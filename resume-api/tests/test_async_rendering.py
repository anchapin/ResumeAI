import asyncio
import time
import pytest
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
import sys
from pathlib import Path

# Add resume-api to path
resume_api_path = Path(__file__).parent.parent
sys.path.insert(0, str(resume_api_path))

from main import app
from config.dependencies import get_api_key

# Sample resume data for testing
SAMPLE_RESUME_DATA = {
    "basics": {
        "name": "John Doe",
        "label": "Programmer",
        "email": "john@example.com",
        "phone": "(912) 555-4321",
        "summary": "A summary...",
    },
    "work": [],
    "education": [],
    "skills": [],
}


@pytest.mark.asyncio
async def test_render_pdf_concurrency():
    """
    Test that concurrent requests to render_pdf are processed asynchronously.

    This test simulates a slow, blocking PDF generation process (1.0s) and sends
    two concurrent requests.

    - If the implementation is blocking (synchronous), the total time would be ~2.0s.
    - If the implementation is non-blocking (asyncio.to_thread), the total time should be ~1.0s.

    We assert that the total duration is less than 1.5s, proving parallel execution.
    """

    # Mock the generate_pdf method to be slow (blocking)
    def slow_generate_pdf(*args, **kwargs):
        time.sleep(1.0)  # Block for 1 second
        return b"%PDF-1.4 Mock PDF"

    # Override authentication dependency
    app.dependency_overrides[get_api_key] = lambda: "valid-test-key"

    # Patch the ResumeGenerator.generate_pdf method
    with patch("lib.cli.generator.ResumeGenerator.generate_pdf", side_effect=slow_generate_pdf):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:

            # Prepare requests
            payload = {"resume_data": SAMPLE_RESUME_DATA, "variant": "base"}
            headers = {"X-API-KEY": "valid-test-key"}

            start_time = time.time()

            # Send 2 concurrent requests
            # We use gather to send them effectively at the same time
            task1 = asyncio.create_task(
                ac.post("/api/v1/render/pdf", json=payload, headers=headers)
            )
            task2 = asyncio.create_task(
                ac.post("/api/v1/render/pdf", json=payload, headers=headers)
            )

            responses = await asyncio.gather(task1, task2)

            end_time = time.time()
            duration = end_time - start_time

    # Clean up overrides
    app.dependency_overrides = {}

    # Verify responses
    for response in responses:
        assert response.status_code == 200
        assert response.content == b"%PDF-1.4 Mock PDF"

    # Verify performance (should be parallel)
    # Expected: slightly more than 1.0s (due to overhead), but much less than 2.0s
    print(f"Total duration for 2 requests: {duration:.2f}s")
    assert duration < 1.5, f"Requests took {duration:.2f}s, expected < 1.5s (parallel execution)"

    return duration


if __name__ == "__main__":
    # Run the test manually if needed
    loop = asyncio.new_event_loop()
    loop.run_until_complete(test_render_pdf_concurrency())
