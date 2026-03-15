import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_csp_header_no_unsafe_eval():
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    csp_header = response.headers.get("Content-Security-Policy")
    assert csp_header is not None
    assert "unsafe-eval" not in csp_header
    assert "script-src 'self' 'unsafe-inline';" in csp_header
