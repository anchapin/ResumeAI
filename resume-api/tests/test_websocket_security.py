"""
WebSocket security tests for Resume API.
"""

import sys
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_async_session
from config.jwt_utils import create_access_token
from api.websocket import ws_rate_limiter
from config import settings

sys.path.insert(0, str(Path("resume-api").absolute()))


@pytest.fixture
def test_client(test_db_session):
    """Create TestClient for testing."""

    def override_get_async_session():
        yield test_db_session

    app.dependency_overrides[get_async_session] = override_get_async_session
    ws_rate_limiter._local_attempts.clear()
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


class TestWebSocketAuthentication:
    """Test WebSocket authentication."""

    def test_websocket_requires_token(self, test_client):
        """Test WebSocket connection requires JWT token."""
        # Try to connect without token
        with pytest.raises(Exception):
            with test_client.websocket_connect("/api/v1/ws/resumes/test-resume-1"):
                pass

    def test_websocket_with_valid_token(self, test_user, test_client):
        """Test WebSocket connection with valid token."""
        # Create access token
        token = create_access_token({"sub": str(test_user.id)})

        # Connect with valid token
        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token}"
            ) as websocket:
                # Should receive room_state message
                data = websocket.receive_json()
                assert data["type"] == "room_state"
                assert data["room_id"] == "test-resume-1"

    def test_websocket_with_invalid_token(self, test_client):
        """Test WebSocket connection with invalid token."""
        # Try to connect with invalid token
        with pytest.raises(Exception):
            with test_client.websocket_connect(
                "/api/v1/ws/resumes/test-resume-1?token=invalid-token"
            ):
                pass

    def test_websocket_with_expired_token(self, test_user, test_client):
        """Test WebSocket connection with expired token."""
        from datetime import timedelta

        # Create expired token
        token = create_access_token(
            {"sub": str(test_user.id)}, expires_delta=timedelta(minutes=-10)
        )

        # Try to connect with expired token
        with pytest.raises(Exception):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token}"
            ):
                pass


class TestWebSocketHeartbeat:
    """Test WebSocket heartbeat/ping-pong mechanism."""

    def test_websocket_ping_pong(self, test_user, test_client):
        """Test WebSocket ping-pong mechanism."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with patch.object(settings, "ws_heartbeat_interval", 2):
                with test_client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Skip room_state
                    websocket.receive_json()

                    # Send ping
                    websocket.send_json({"type": "ping"})

                    # Should receive pong
                    data = websocket.receive_json()
                    assert data["type"] == "pong"

    def test_websocket_server_ping(self, test_user, test_client):
        """Test WebSocket server sends periodic pings."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with patch.object(settings, "ws_heartbeat_interval", 2):
                with test_client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token}"
                ) as websocket:
                    # Skip room_state
                    websocket.receive_json()

                    # Wait for server ping
                    data = websocket.receive_json()
                    assert data["type"] == "ping"

                    # Respond with pong
                    websocket.send_json({"type": "pong"})

    @pytest.mark.asyncio
    async def test_websocket_inactivity_timeout(self, test_user, test_client):
        """Test WebSocket closes after inactivity."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with patch.object(settings, "ws_heartbeat_interval", 2):
                with patch.object(settings, "ws_connection_timeout", 3):
                    with test_client.websocket_connect(
                        f"/api/v1/ws/resumes/test-resume-1?token={token}"
                    ) as websocket:
                        # Skip room_state
                        websocket.receive_json()

                        # Wait for timeout to occur
                        import asyncio

                        await asyncio.sleep(5)

                        # Should receive close or error
                        with pytest.raises(Exception):
                            websocket.receive_json()


class TestWebSocketRateLimiting:
    """Test WebSocket connection rate limiting."""

    @pytest.mark.asyncio
    async def test_websocket_rate_limit_enforced(self, test_user):
        """Test WebSocket rate limit is enforced."""
        user_id = str(test_user.id)
        ws_rate_limiter._local_attempts.clear()

        # Set low rate limit
        with patch.object(settings, "ws_rate_limit_connections", "2/minute"):
            # First connection should succeed
            assert await ws_rate_limiter.can_connect(user_id)
            await ws_rate_limiter.record_attempt(user_id)

            # Second connection should succeed
            assert await ws_rate_limiter.can_connect(user_id)
            await ws_rate_limiter.record_attempt(user_id)

            # Third connection should be rate limited
            assert not await ws_rate_limiter.can_connect(user_id)

    @pytest.mark.asyncio
    async def test_websocket_rate_limit_resets_after_minute(self, test_user):
        """Test WebSocket rate limit resets after time window."""
        create_access_token({"sub": str(test_user.id)})
        user_id = str(test_user.id)
        ws_rate_limiter._local_attempts.clear()

        with patch.object(settings, "ws_rate_limit_connections", "2/minute"):
            # Exhaust rate limit
            assert await ws_rate_limiter.can_connect(user_id)
            await ws_rate_limiter.record_attempt(user_id)
            assert await ws_rate_limiter.can_connect(user_id)
            await ws_rate_limiter.record_attempt(user_id)
            assert not await ws_rate_limiter.can_connect(user_id)

            # Wait and check if reset (simulated by clearing old attempts)
            from datetime import datetime, timedelta

            old_time = datetime.utcnow() - timedelta(minutes=2)
            ws_rate_limiter._local_attempts[user_id] = [old_time]

            assert await ws_rate_limiter.can_connect(user_id)


class TestWebSocketConnectionLimit:
    """Test WebSocket concurrent connection limits."""

    def test_websocket_max_connections_per_user(self, test_user, test_client):
        """Test WebSocket limits concurrent connections per user."""
        token = create_access_token({"sub": str(test_user.id)})

        # Set low connection limit
        with patch.object(settings, "ws_max_connections_per_user", 2):
            with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
                # Create first connection
                with test_client.websocket_connect(
                    f"/api/v1/ws/resumes/resume-1?token={token}"
                ) as ws1:
                    ws1.receive_json()  # Skip room_state

                    # Create second connection
                    with test_client.websocket_connect(
                        f"/api/v1/ws/resumes/resume-2?token={token}"
                    ) as ws2:
                        ws2.receive_json()  # Skip room_state

                        # Third connection should be rejected
                        with pytest.raises(Exception):
                            with test_client.websocket_connect(
                                f"/api/v1/ws/resumes/resume-3?token={token}"
                            ):
                                pass


class TestWebSocketMessages:
    """Test WebSocket message handling."""

    def test_websocket_cursor_update(self, test_user, test_client):
        """Test WebSocket cursor update message."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token}"
            ) as websocket:
                # Skip room_state
                websocket.receive_json()

                # Send cursor update
                websocket.send_json(
                    {
                        "type": "cursor_update",
                        "cursor_position": {"x": 100, "y": 200},
                    }
                )

                # Verify connection is still alive
                websocket.send_json({"type": "ping"})
                response = websocket.receive_json()
                assert response["type"] == "pong"

    def test_websocket_resume_update(self, test_user, test_client):
        """Test WebSocket resume update message."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token}"
            ) as websocket:
                # Skip room_state
                websocket.receive_json()

                # Send resume update
                websocket.send_json(
                    {
                        "type": "resume_update",
                        "resume_data": {"title": "Test Resume"},
                    }
                )

                # Verify connection is still alive
                websocket.send_json({"type": "ping"})
                response = websocket.receive_json()
                assert response["type"] == "pong"

    def test_websocket_unknown_message_type(self, test_user, test_client):
        """Test WebSocket handles unknown message types."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token}"
            ) as websocket:
                # Skip room_state
                websocket.receive_json()

                # Send unknown message type
                websocket.send_json({"type": "unknown_type"})

                # Should receive error
                response = websocket.receive_json()
                assert response["type"] == "error"
                assert "Unknown message type" in response["message"]

    def test_websocket_invalid_json(self, test_user, test_client):
        """Test WebSocket handles invalid JSON."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token}"
            ) as websocket:
                # Skip room_state
                websocket.receive_json()

                # Send invalid JSON
                websocket.send_text("invalid json")

                # Should receive error
                response = websocket.receive_json()
                assert response["type"] == "error"
                assert "Invalid JSON" in response["message"]


class TestWebSocketPresence:
    """Test WebSocket user presence and room management."""

    def test_websocket_user_joined_notification(self, test_user, test_client):
        """Test WebSocket notifies when user joins room."""
        token = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token}"
            ) as websocket:
                # Receive room_state which includes users list
                data = websocket.receive_json()
                assert data["type"] == "room_state"
                assert "users" in data
                assert len(data["users"]) >= 1

    def test_websocket_multiple_users(self, test_user, test_client):
        """Test WebSocket handles multiple users in same room."""
        token1 = create_access_token({"sub": str(test_user.id)})

        with patch.object(settings, "ws_rate_limit_connections", "10/minute"):
            with test_client.websocket_connect(
                f"/api/v1/ws/resumes/test-resume-1?token={token1}"
            ) as ws1:
                ws1.receive_json()  # Skip room_state

                # Create another connection
                with test_client.websocket_connect(
                    f"/api/v1/ws/resumes/test-resume-1?token={token1}"
                ) as ws2:
                    ws2.receive_json()  # Skip room_state

                    # Both connections should receive user_joined notification
                    # ws1 should see ws2 join
                    data1 = ws1.receive_json()
                    assert data1["type"] == "user_joined"
                    assert data1["user_id"] == str(test_user.id)
