"""
Tests for Request Signing Middleware
"""

import pytest
import time
from unittest.mock import MagicMock, AsyncMock
from fastapi import Request, HTTPException
from starlette.datastructures import URL

from middleware.request_signing import (
    compute_signature,
    NonceCache,
    RequestSigningMiddleware,
)


class TestComputeSignature:
    def test_compute_signature_returns_consistent_results(self):
        secret_key = "test-secret"
        method = "POST"
        path = "/api/v1/auth/login"
        timestamp = "1234567890"
        nonce = "abc123"
        body = '{"email": "test@example.com"}'

        sig1 = compute_signature(
            secret_key, method, path, timestamp, nonce, body.encode()
        )
        sig2 = compute_signature(
            secret_key, method, path, timestamp, nonce, body.encode()
        )

        assert sig1 == sig2

    def test_compute_signature_different_inputs_produce_different_outputs(self):
        secret_key = "test-secret"
        method = "POST"
        path = "/api/v1/auth/login"
        timestamp1 = "1234567890"
        timestamp2 = "1234567891"
        nonce = "abc123"
        body = b'{"email": "test@example.com"}'

        sig1 = compute_signature(secret_key, method, path, timestamp1, nonce, body)
        sig2 = compute_signature(secret_key, method, path, timestamp2, nonce, body)

        assert sig1 != sig2


class TestNonceCache:
    def test_nonce_cache_add_returns_true_for_new_nonce(self):
        cache = NonceCache()
        result = cache.add("unique-nonce-123")
        assert result is True

    def test_nonce_cache_add_returns_false_for_duplicate_nonce(self):
        cache = NonceCache()
        cache.add("unique-nonce-123")
        result = cache.add("unique-nonce-123")
        assert result is False

    def test_nonce_cache_clear(self):
        cache = NonceCache()
        cache.add("nonce-1")
        cache.add("nonce-2")
        cache.clear()
        assert cache.add("nonce-1") is True


class TestRequestSigningMiddleware:
    @pytest.fixture
    def mock_app(self):
        app = MagicMock()
        return app

    @pytest.fixture
    def middleware(self, mock_app):
        return RequestSigningMiddleware(mock_app, secret_key="test-secret")

    @pytest.mark.asyncio
    async def test_skip_exempt_paths(self, middleware, mock_app):
        request = AsyncMock(spec=Request)
        request.url = URL("/health")
        request.method = "GET"
        request.headers = {}
        request.cookies = {}

        mock_response = MagicMock()
        call_next = AsyncMock(return_value=mock_response)

        response = await middleware.dispatch(request, call_next)

        call_next.assert_called_once()
        assert response == mock_response

    @pytest.mark.asyncio
    async def test_skip_safe_methods(self, middleware, mock_app):
        request = AsyncMock(spec=Request)
        request.url = URL("/api/v1/auth/me")
        request.method = "GET"
        request.headers = {}
        request.cookies = {}

        mock_response = MagicMock()
        call_next = AsyncMock(return_value=mock_response)

        await middleware.dispatch(request, call_next)

        call_next.assert_called_once()

    @pytest.mark.asyncio
    async def test_require_signature_headers(self, middleware, mock_app):
        request = AsyncMock(spec=Request)
        request.url = URL("/api/v1/auth/login")
        request.method = "POST"
        request.headers = {}
        request.cookies = {}
        request.body = AsyncMock(return_value=b'{"email": "test@example.com"}')

        call_next = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await middleware._process_signed_request(request, call_next)

        assert exc_info.value.status_code == 401
        assert "Request signing headers required" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_expired_timestamp(self, middleware, mock_app):
        old_timestamp = str(int(time.time()) - 600)

        request = AsyncMock(spec=Request)
        request.url = URL("/api/v1/auth/login")
        request.method = "POST"
        request.headers = {
            "X-Timestamp": old_timestamp,
            "X-Nonce": "test-nonce-123",
            "X-Signature": "invalid",
        }
        request.cookies = {}
        request.body = AsyncMock(return_value=b'{"email": "test@example.com"}')

        call_next = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await middleware._process_signed_request(request, call_next)

        assert exc_info.value.status_code == 401
        assert "timestamp expired" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_valid_signature(self, middleware, mock_app):
        timestamp = str(int(time.time()))
        nonce = "test-nonce-456"
        body = b'{"email": "test@example.com"}'

        signature = compute_signature(
            secret_key="test-secret",
            method="POST",
            path="/api/v1/auth/login",
            timestamp=timestamp,
            nonce=nonce,
            body=body,
        )

        request = AsyncMock(spec=Request)
        request.url = URL("/api/v1/auth/login")
        request.method = "POST"
        request.headers = {
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature,
        }
        request.cookies = {}
        request.body = AsyncMock(return_value=body)

        mock_response = MagicMock()
        call_next = AsyncMock(return_value=mock_response)

        response = await middleware._process_signed_request(request, call_next)

        call_next.assert_called_once()
        assert response.headers.get("X-Signed") == "true"
