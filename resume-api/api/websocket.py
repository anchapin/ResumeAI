"""
WebSocket handlers for real-time collaboration.

This module provides WebSocket endpoints for real-time collaboration features
including live cursor positions, presence indicators, and resume data synchronization.
"""

import asyncio
import json
import uuid
from collections import defaultdict
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timedelta
from config import settings


class WebSocketRateLimiter:
    """Rate limiter for WebSocket connections."""

    def __init__(self):
        # Track connection attempts per user_id/IP
        self._attempts: Dict[str, list] = defaultdict(list)

    def can_connect(self, identifier: str) -> bool:
        """Check if identifier can create a new connection."""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)

        # Clean old attempts
        if identifier in self._attempts:
            self._attempts[identifier] = [
                t for t in self._attempts[identifier] if t > minute_ago
            ]

        # Check rate limit
        # Parse rate limit like "10/minute"
        rate_limit_str = settings.ws_rate_limit_connections
        max_attempts = int(rate_limit_str.split("/")[0])

        return len(self._attempts[identifier]) < max_attempts

    def record_attempt(self, identifier: str):
        """Record a connection attempt."""
        self._attempts[identifier].append(datetime.utcnow())


# Global rate limiter
ws_rate_limiter = WebSocketRateLimiter()


class ConnectionManager:
    """Manages WebSocket connections for collaboration rooms."""

    def __init__(self):
        # room_id -> {connection_id -> WebSocket}
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        # connection_id -> {room_id, user_id, cursor_position, last_seen, last_pong}
        self.connections: Dict[str, dict] = {}
        # user_id -> set of connection_ids (for connection limit)
        self.user_connections: Dict[str, set] = {}
        # Background task for connection monitoring
        self._monitor_task: Optional[asyncio.Task] = None
        self._running = False

    async def start_monitoring(self):
        """Start the background connection monitoring task."""
        if self._running:
            return

        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_connections())

    async def stop_monitoring(self):
        """Stop the background connection monitoring task."""
        self._running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass

    async def _monitor_connections(self):
        """Monitor connections for timeout and send heartbeats."""
        while self._running:
            try:
                await asyncio.sleep(settings.ws_heartbeat_interval)
                now = datetime.utcnow()
                timeout_threshold = timedelta(seconds=settings.ws_connection_timeout)

                connections_to_close = []

                for connection_id, conn_data in list(self.connections.items()):
                    last_pong = datetime.fromisoformat(conn_data["last_pong"])
                    if now - last_pong > timeout_threshold:
                        connections_to_close.append(connection_id)

                for connection_id in connections_to_close:
                    await self.close_connection(
                        connection_id, reason="inactivity_timeout"
                    )

            except asyncio.CancelledError:
                break
            except Exception:
                pass

    async def close_connection(self, connection_id: str, reason: str = "normal"):
        """Close a WebSocket connection with reason."""
        if connection_id not in self.connections:
            return

        websocket = None
        room_id = self.connections[connection_id]["room_id"]

        if room_id in self.rooms and connection_id in self.rooms[room_id]:
            websocket = self.rooms[room_id][connection_id]

        if websocket:
            try:
                await websocket.close(
                    code=1000 if reason == "normal" else 1001,
                    reason=f"Connection closed: {reason}",
                )
            except Exception:
                pass

        self.disconnect(connection_id)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None):
        """Add a new WebSocket connection to a room."""
        user_id = user_id or f"user_{str(uuid.uuid4())[:8]}"
        now = datetime.utcnow().isoformat()

        # Check rate limit
        if not ws_rate_limiter.can_connect(user_id):
            await websocket.close(code=1008, reason="Too many connection attempts")
            raise WebSocketDisconnect(code=1008, reason="Too many connection attempts")

        # Record connection attempt
        ws_rate_limiter.record_attempt(user_id)

        # Check connection limit per user
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()

        if len(self.user_connections[user_id]) >= settings.ws_max_connections_per_user:
            await websocket.close(code=1008, reason="Too many connections")
            raise WebSocketDisconnect(code=1008, reason="Too many connections")

        await websocket.accept()

        connection_id = str(uuid.uuid4())

        # Initialize room if needed
        if room_id not in self.rooms:
            self.rooms[room_id] = {}

        # Add connection to room
        self.rooms[room_id][connection_id] = websocket

        # Track user connections
        self.user_connections[user_id].add(connection_id)

        # Store connection metadata
        self.connections[connection_id] = {
            "room_id": room_id,
            "user_id": user_id,
            "cursor_position": None,
            "last_seen": now,
            "connected_at": now,
            "last_pong": now,
        }

        # Notify others in room about new user
        await self.broadcast_to_room(
            room_id,
            {
                "type": "user_joined",
                "user_id": self.connections[connection_id]["user_id"],
                "connection_id": connection_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
            exclude_connection=connection_id,
        )

        # Send current room state to new user
        await websocket.send_json(
            {
                "type": "room_state",
                "room_id": room_id,
                "connection_id": connection_id,
                "users": [
                    {
                        "connection_id": conn_id,
                        "user_id": conn_data["user_id"],
                        "cursor_position": conn_data["cursor_position"],
                    }
                    for conn_id, conn_data in self.connections.items()
                    if conn_data["room_id"] == room_id
                ],
            }
        )

        return connection_id

    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection."""
        if connection_id not in self.connections:
            return

        room_id = self.connections[connection_id]["room_id"]
        user_id = self.connections[connection_id]["user_id"]

        # Remove from room
        if room_id in self.rooms and connection_id in self.rooms[room_id]:
            del self.rooms[room_id][connection_id]

        # Clean up empty rooms
        if room_id in self.rooms and not self.rooms[room_id]:
            del self.rooms[room_id]

        # Remove from user connections tracking
        if (
            user_id in self.user_connections
            and connection_id in self.user_connections[user_id]
        ):
            self.user_connections[user_id].remove(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        # Remove connection metadata
        del self.connections[connection_id]

        return room_id, user_id

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific WebSocket."""
        try:
            await websocket.send_json(message)
        except Exception:
            pass  # Connection might be closed

    async def broadcast_to_room(
        self, room_id: str, message: dict, exclude_connection: str = None
    ):
        """Broadcast a message to all users in a room."""
        if room_id not in self.rooms:
            return

        for connection_id, websocket in self.rooms[room_id].items():
            if connection_id != exclude_connection:
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass  # Connection might be closed

    async def broadcast_resume_update(
        self, room_id: str, resume_data: dict, connection_id: str
    ):
        """Broadcast resume data updates to all users in a room."""
        if room_id not in self.rooms:
            return

        for conn_id, websocket in self.rooms[room_id].items():
            if conn_id != connection_id:
                try:
                    await websocket.send_json(
                        {
                            "type": "resume_update",
                            "resume_data": resume_data,
                            "from_connection_id": connection_id,
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    )
                except Exception:
                    pass

    def update_cursor(self, connection_id: str, cursor_position: dict):
        """Update cursor position for a connection."""
        if connection_id in self.connections:
            self.connections[connection_id]["cursor_position"] = cursor_position
            self.connections[connection_id]["last_seen"] = datetime.utcnow().isoformat()

    def get_room_users(self, room_id: str) -> list:
        """Get list of users in a room."""
        users = []
        if room_id in self.rooms:
            for connection_id in self.rooms[room_id]:
                if connection_id in self.connections:
                    users.append(
                        {
                            "connection_id": connection_id,
                            "user_id": self.connections[connection_id]["user_id"],
                            "cursor_position": self.connections[connection_id][
                                "cursor_position"
                            ],
                            "last_seen": self.connections[connection_id]["last_seen"],
                        }
                    )
        return users


# Global connection manager
manager = ConnectionManager()


async def handle_websocket_connection(
    websocket: WebSocket, room_id: str, user_id: str = None
):
    """
    Handle a WebSocket connection for real-time collaboration.

    Args:
        websocket: The WebSocket connection
        room_id: The room/resume ID to join
        user_id: Optional user identifier
    """
    connection_id = None
    heartbeat_task = None

    try:
        # Start monitoring if not already running
        await manager.start_monitoring()

        # Connect to room
        connection_id = await manager.connect(websocket, room_id, user_id)

        # Start heartbeat task
        heartbeat_task = asyncio.create_task(_heartbeat_loop(websocket, connection_id))

        # Handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Update last_seen timestamp
            if connection_id in manager.connections:
                manager.connections[connection_id]["last_seen"] = (
                    datetime.utcnow().isoformat()
                )

            message_type = message.get("type")

            if message_type == "cursor_update":
                # Update cursor position
                cursor_position = message.get("cursor_position")
                manager.update_cursor(connection_id, cursor_position)

                # Broadcast to others
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "cursor_update",
                        "connection_id": connection_id,
                        "user_id": manager.connections[connection_id]["user_id"],
                        "cursor_position": cursor_position,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    exclude_connection=connection_id,
                )

            elif message_type == "resume_update":
                # Broadcast resume data update
                resume_data = message.get("resume_data")
                await manager.broadcast_resume_update(
                    room_id, resume_data, connection_id
                )

            elif message_type == "typing_start":
                # User started typing
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "typing_start",
                        "connection_id": connection_id,
                        "user_id": manager.connections[connection_id]["user_id"],
                    },
                    exclude_connection=connection_id,
                )

            elif message_type == "typing_stop":
                # User stopped typing
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "typing_stop",
                        "connection_id": connection_id,
                        "user_id": manager.connections[connection_id]["user_id"],
                    },
                    exclude_connection=connection_id,
                )

            elif message_type == "ping":
                # Respond to ping and update last_pong
                if connection_id in manager.connections:
                    manager.connections[connection_id]["last_pong"] = (
                        datetime.utcnow().isoformat()
                    )
                await websocket.send_json({"type": "pong"})

            elif message_type == "pong":
                # Update last_pong on pong response
                if connection_id in manager.connections:
                    manager.connections[connection_id]["last_pong"] = (
                        datetime.utcnow().isoformat()
                    )

            else:
                # Unknown message type
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}",
                    }
                )

    except WebSocketDisconnect:
        pass  # Normal disconnect
    except json.JSONDecodeError:
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": "Invalid JSON message",
                }
            )
        except Exception:
            pass
    except Exception as e:
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": str(e),
                }
            )
        except Exception:
            pass
    finally:
        # Cancel heartbeat task
        if heartbeat_task:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

        # Clean up connection
        if connection_id:
            room_info = manager.disconnect(connection_id)
            if room_info:
                room_id, user_id = room_info
                # Notify others about user leaving
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "user_left",
                        "user_id": user_id,
                        "connection_id": connection_id,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )


async def _heartbeat_loop(websocket: WebSocket, connection_id: str):
    """
    Send heartbeat pings to client.

    This runs in a background task and sends periodic ping messages
    to detect connection health.
    """
    while True:
        try:
            await asyncio.sleep(settings.ws_heartbeat_interval)
            await websocket.send_json({"type": "ping"})
        except asyncio.CancelledError:
            break
        except Exception:
            # Connection likely closed
            break
