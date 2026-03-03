"""
WebSocket authentication and security tests.

Tests WebSocket authentication, heartbeat, timeout, rate limiting,
and connection management features.
"""

import sys
from pathlib import Path
from unittest.mock import patch
import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path("resume-api").absolute()))

from main import app
from config.jwt_utils import create_access_token
from api.websocket import ws_rate_limiter
from config import settings


class TestWebSocketAuthentication:
    """Test WebSocket authentication."""

    @pytest.mark.asyncio
    async def test_websocket_requires_token(self):
        """Test WebSocket connection requires JWT token."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            # Try to connect without token
            with pytest.raises(Exception):
                await client.websocket_connect("/api/v1/ws/resumes/test-resume-1")

    @pytest.mark.asyncio
    async def test_websocket_with_valid_token(self, test_user):
        """Test WebSocket connection with valid token."""
        # Create access token
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            # Connect with valid token
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Should receive room_state message
                    data = await websocket.receive_json()
                    assert data["type"] == "room_state"
                    assert data["room_id"] == "test-resume-1"

    @pytest.mark.asyncio
    async def test_websocket_with_invalid_token(self):
        """Test WebSocket connection with invalid token."""
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            # Try to connect with invalid token
            with pytest.raises(Exception):
                async with client.websocket_connect(
                    "/api/v1/ws/resumes/test-resume-1?token=invalid-token"
                ):
                    pass

    @pytest.mark.asyncio
    async def test_websocket_with_expired_token(self, test_user):
        """Test WebSocket connection with expired token."""
        # Create expired token (by setting negative expiration)
        from datetime import datetime, timedelta, timezone

        expired_time = datetime.now(timezone.utc) - timedelta(hours=1)

        with patch("config.jwt_utils.datetime") as mock_datetime:
            mock_datetime.now.return_value = expired_time
            mock_datetime.timezone = timezone
            token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            # Try to connect with expired token
            with pytest.raises(Exception):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ):
                    pass


class TestWebSocketHeartbeat:
    """Test WebSocket heartbeat/ping-pong mechanism."""

    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self, test_user):
        """Test WebSocket ping-pong mechanism."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                with patch.object(settings, "ws_heartbeat_interval", 2):
                    async with client.websocket_connect(
                        f"/api/v1/ws/resumes/test-resume-1?token={token}"
                    ) as websocket:
                        # Send ping
                        await websocket.send_json({"type": "ping"})

                        # Should receive pong
                        data = await websocket.receive_json(timeout=5)
                        assert data["type"] == "pong"

    @pytest.mark.asyncio
    async def test_websocket_server_ping(self, test_user):
        """Test WebSocket server sends periodic pings."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                with patch.object(settings, "ws_heartbeat_interval", 2):
                    async with client.websocket_connect(
                        f"/api/v1/ws/resumes/test-resume-1?token={token}"
                    ) as websocket:
                        # Skip room_state
                        await websocket.receive_json()

                        # Wait for server ping
                        data = await websocket.receive_json(timeout=5)
                        assert data["type"] == "ping"

                        # Respond with pong
                        await websocket.send_json({"type": "pong"})


class TestWebSocketTimeout:
    """Test WebSocket connection timeout."""

    @pytest.mark.asyncio
    async def test_websocket_inactivity_timeout(self, test_user):
        """Test WebSocket closes after inactivity."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                with patch.object(settings, "ws_heartbeat_interval", 2):
                    with patch.object(settings, "ws_connection_timeout", 3):
                        async with client.websocket_connect(
                            f"/api/v1/ws/resumes/test-resume-1?token={token}"
                        ) as websocket:
                            # Skip room_state
                            await websocket.receive_json()

                            # Don't respond to pings, wait for timeout
                            with pytest.raises(Exception):
                                # Should receive close or error
                                await websocket.receive_json(timeout=10)


class TestWebSocketRateLimiting:
    """Test WebSocket connection rate limiting."""

    @pytest.mark.asyncio
    async def test_websocket_rate_limit_enforced(self, test_user):
        """Test WebSocket rate limiting prevents rapid reconnections."""
        create_access_token({"sub": str(test_user.id)})
        user_id = str(test_user.id)

        # Set low rate limit
        with patch.object(settings, "ws_rate_limit_connections", "2/minute"):
            # First connection should succeed
            assert ws_rate_limiter.can_connect(user_id)
            ws_rate_limiter.record_attempt(user_id)

            # Second connection should succeed
            assert ws_rate_limiter.can_connect(user_id)
            ws_rate_limiter.record_attempt(user_id)

            # Third connection should be rate limited
            assert not ws_rate_limiter.can_connect(user_id)

    @pytest.mark.asyncio
    async def test_websocket_rate_limit_resets_after_minute(self, test_user):
        """Test WebSocket rate limit resets after time window."""
        create_access_token({"sub": str(test_user.id)})
        user_id = str(test_user.id)

        with patch.object(settings, "ws_rate_limit_connections", "2/minute"):
            # Exhaust rate limit
            assert ws_rate_limiter.can_connect(user_id)
            ws_rate_limiter.record_attempt(user_id)
            assert ws_rate_limiter.can_connect(user_id)
            ws_rate_limiter.record_attempt(user_id)
            assert not ws_rate_limiter.can_connect(user_id)

            # Wait and check if reset (simulated by clearing old attempts)
            from datetime import datetime, timedelta

            old_time = datetime.utcnow() - timedelta(minutes=2)
            ws_rate_limiter._attempts[user_id] = [old_time, old_time]

            # Should allow connections again
            assert ws_rate_limiter.can_connect(user_id)


class TestWebSocketConnectionLimit:
    """Test WebSocket concurrent connection limits."""

    @pytest.mark.asyncio
    async def test_websocket_max_connections_per_user(self, test_user):
        """Test WebSocket limits concurrent connections per user."""
        token = create_access_token({"sub": str(test_user.id)})
        str(test_user.id)

        # Set low connection limit
        with patch.object(settings, "ws_max_connections_per_user", 2):
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://testserver"
                ) as client:
                    # Create first connection
                    ws1 = await client.websocket_connect(
                        f"/api/v1/ws/resumes/resume-1?token={token}"
                    )
                    await ws1.receive_json()  # Skip room_state

                    # Create second connection
                    ws2 = await client.websocket_connect(
                        f"/api/v1/ws/resumes/resume-2?token={token}"
                    )
                    await ws2.receive_json()  # Skip room_state

                    # Third connection should be rejected
                    with pytest.raises(Exception):
                        await client.websocket_connect(
                            f"/api/v1/ws/resumes/resume-3?token={token}"
                        )

                    # Cleanup
                    await ws1.close()
                    await ws2.close()


class TestWebSocketMessages:
    """Test WebSocket message handling."""

    @pytest.mark.asyncio
    async def test_websocket_cursor_update(self, test_user):
        """Test WebSocket cursor update message."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Skip room_state
                    await websocket.receive_json()

                    # Send cursor update
                    await websocket.send_json(
                        {
                            "type": "cursor_update",
                            "cursor_position": {"x": 100, "y": 200},
                        }
                    )

                    # Verify connection is still alive
                    await websocket.send_json({"type": "ping"})
                    response = await websocket.receive_json()
                    assert response["type"] == "pong"

    @pytest.mark.asyncio
    async def test_websocket_resume_update(self, test_user):
        """Test WebSocket resume update message."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Skip room_state
                    await websocket.receive_json()

                    # Send resume update
                    await websocket.send_json(
                        {
                            "type": "resume_update",
                            "resume_data": {"title": "Test Resume"},
                        }
                    )

                    # Verify connection is still alive
                    await websocket.send_json({"type": "ping"})
                    response = await websocket.receive_json()
                    assert response["type"] == "pong"

    @pytest.mark.asyncio
    async def test_websocket_unknown_message_type(self, test_user):
        """Test WebSocket handles unknown message types."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Skip room_state
                    await websocket.receive_json()

                    # Send unknown message type
                    await websocket.send_json({"type": "unknown_type"})

                    # Should receive error
                    response = await websocket.receive_json()
                    assert response["type"] == "error"
                    assert "Unknown message type" in response["message"]

    @pytest.mark.asyncio
    async def test_websocket_invalid_json(self, test_user):
        """Test WebSocket handles invalid JSON."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Skip room_state
                    await websocket.receive_json()

                    # Send invalid JSON
                    await websocket.send_text("invalid json")

                    # Should receive error
                    response = await websocket.receive_json()
                    assert response["type"] == "error"
                    assert "Invalid JSON" in response["message"]


class TestWebSocketPresence:
    """Test WebSocket user presence and room management."""

    @pytest.mark.asyncio
    async def test_websocket_user_joined_notification(self, test_user):
        """Test WebSocket notifies when user joins room."""
        token = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Receive room_state which includes users list
                    data = await websocket.receive_json()
                    assert data["type"] == "room_state"
                    assert "users" in data
                    assert len(data["users"]) >= 1

    @pytest.mark.asyncio
    async def test_websocket_multiple_users(self, test_user):
        """Test WebSocket handles multiple users in same room."""
        token1 = create_access_token({"sub": str(test_user.id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                async with client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token1}"
                ) as ws1:
                    await ws1.receive_json()  # Skip room_state

                    # Create another connection (simulating another user with same token for testing)
                    async with client.websocket_connect(
                        f"/api/v1/ws/resumes/test-resume-1?token={token1}"
                    ) as ws2:
                        await ws2.receive_json()  # Skip room_state

                        # Both connections should receive user_joined notification
                        # ws1 should see ws2 join
                        data1 = await ws1.receive_json()
                        assert data1["type"] in ["user_joined", "room_state"]
