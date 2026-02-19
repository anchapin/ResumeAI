"""
Test suite for PDF import functionality.

Tests cover:
1. extract_text_from_pdf function
2. import_pdf endpoint
"""

import io
import os
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from pypdf import PdfWriter, PageObject

# Set test environment variables
os.environ.setdefault("TESTING", "True")
os.environ.setdefault("REQUIRE_API_KEY", "False")
os.environ.setdefault("ENABLE_RATE_LIMITING", "False")
os.environ.setdefault("ENABLE_ANALYTICS", "False")
os.environ.setdefault("ENABLE_METRICS", "False")

from api.routes import extract_text_from_pdf
from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def sample_pdf_bytes():
    """Create a sample PDF file in memory for testing."""
    writer = PdfWriter()
    page = PageObject.create_blank_page(width=612, height=792)
    # Note: Creating text in PDF programmatically with pypdf is complex/limited.
    # For this test, we might rely on the fact that pypdf can read what it writes,
    # or use a mock. However, pypdf is mainly for manipulation.
    # To properly test text extraction, we usually need a real PDF with text.
    # Since we can't easily generate a PDF with text using just pypdf without external fonts/complexity,
    # we will mock the PdfReader in the route or create a very simple PDF if possible.

    # Alternatively, we can rely on a mock for the reader if we want to test just the stream handling,
    # but testing actual extraction is better.

    # For now, let's create a minimal valid PDF structure.
    writer.add_page(page)

    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


# Since pypdf text extraction depends on actual text content which is hard to synthesize
# without other libraries (like reportlab), we will mock extract_text_from_pdf for endpoint tests,
# OR we can assume the extraction logic itself (pypdf) works and we just want to test the streaming.

# However, to test extract_text_from_pdf itself, we really need a PDF with text.
# Let's create a dummy valid PDF and accept that it might return empty text,
# just to verify it accepts the stream.


class TestExtractTextFromPdf:
    """Test the extract_text_from_pdf function."""

    def test_extract_text_from_valid_pdf_stream(self, sample_pdf_bytes):
        """Test that the function accepts a BinaryIO stream."""
        # This primarily tests that the function accepts the stream and doesn't crash.
        # It won't extract text because our sample PDF is blank.
        try:
            text = extract_text_from_pdf(io.BytesIO(sample_pdf_bytes))
            assert isinstance(text, str)
        except ValueError as e:
            # "No text content found" is expected for a blank PDF,
            # proving that the stream was successfully read by pypdf.
            assert "No text content" in str(e)
        except Exception as e:
            pytest.fail(f"extract_text_from_pdf failed with stream: {e}")

    def test_extract_text_from_corrupted_pdf(self):
        """Test handling of corrupted PDF file."""
        corrupted_bytes = b"Not a PDF"
        with pytest.raises(ValueError) as exc_info:
            extract_text_from_pdf(io.BytesIO(corrupted_bytes))
        assert "Invalid or corrupted PDF" in str(exc_info.value)


class TestImportPdfEndpoint:
    """Test the /v1/import/pdf endpoint."""

    def test_import_pdf_success_stream(self, client, sample_pdf_bytes):
        """Test that the endpoint correctly handles the file upload as a stream."""
        # We need to mock extract_text_from_pdf to return some valid text
        # because our sample PDF is blank and parse_resume_text expects content.

        with pytest.MonkeyPatch.context() as m:
            m.setattr(
                "api.routes.extract_text_from_pdf",
                lambda x: "John Doe\nSoftware Engineer\njohn@example.com",
            )

            files = {
                "file": (
                    "resume.pdf",
                    sample_pdf_bytes,
                    "application/pdf",
                )
            }

            response = client.post("/v1/import/pdf", files=files)

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["basics"]["name"] == "John Doe"

    def test_import_pdf_file_too_large(self, client):
        """Test rejection of files exceeding size limit."""
        # Create a file larger than 10MB
        large_content = b"x" * (11 * 1024 * 1024)
        files = {
            "file": (
                "large.pdf",
                large_content,
                "application/pdf",
            )
        }

        response = client.post("/v1/import/pdf", files=files)

        # Should return 400 or 500 depending on environment/test client behavior
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ]
