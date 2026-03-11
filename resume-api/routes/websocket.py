"""
WebSocket routes for real-time communication.

Features:
- Real-time PDF generation progress updates
- Connection management (connect/disconnect/broadcast)
- Event handlers for different message types
- Connection pool and heartbeat mechanism
- Automatic reconnection support
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Set, Optional, Any, Callable
from enum import Enum

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_session, User
from config.dependencies import get_current_user
from monitoring import logging_config

# Get logger
logger = logging_config.get_logger(__name__)

# Create router
router = APIRouter(prefix="/ws", tags=["websocket"])


class MessageType(str, Enum):
    """WebSocket message types."""

    CONNECT = "connect"
    DISCONNECT = "disconnect"
    HEARTBEAT = "heartbeat"
    HEARTBEAT_ACK = "heartbeat_ack"
    PDF_PROGRESS = "pdf_progress"
    PDF_COMPLETE = "pdf_complete"
    PDF_ERROR = "pdf_error"
    NOTIFICATION = "notification"
    ERROR = "error"


class ConnectionPool:
    """Manages WebSocket connections with connection pooling and broadcasting."""

    def __init__(self, max_connections: int = 1000, heartbeat_interval: float = 30.0):
        """
        Initialize connection pool.

        Args:
            max_connections: Maximum number of active connections
            heartbeat_interval: Seconds between heartbeat checks
        """
        self.max_connections = max_connections
        self.heartbeat_interval = heartbeat_interval
        self.active_connections: Dict[str, "WebSocketConnection"] = {}
        self.user_connections: Dict[str, Set[str]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, connection_id: str, websocket: WebSocket, user_id: str) -> None:
        """
        Register a new connection.

        Args:
            connection_id: Unique connection ID
            websocket: WebSocket connection
            user_id: User ID for this connection
        """
        async with self.lock:
            if len(self.active_connections) >= self.max_connections:
                raise RuntimeError(f"Connection pool full (max: {self.max_connections})")

            ws_conn = WebSocketConnection(
                connection_id=connection_id,
                websocket=websocket,
                user_id=user_id,
                connected_at=datetime.now(),
            )
            self.active_connections[connection_id] = ws_conn
            self.user_connections.setdefault(user_id, set()).add(connection_id)

        logger.info(
            f"WebSocket connected",
            extra={
                "connection_id": connection_id,
                "user_id": user_id,
                "total_connections": len(self.active_connections),
            },
        )

    async def disconnect(self, connection_id: str) -> Optional[str]:
        """
        Unregister a connection.

        Args:
            connection_id: Connection ID to disconnect

        Returns:
            User ID if found, None otherwise
        """
        async with self.lock:
            if connection_id not in self.active_connections:
                return None

            ws_conn = self.active_connections.pop(connection_id)
            user_id = ws_conn.user_id

            if user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]

        logger.info(
            f"WebSocket disconnected",
            extra={
                "connection_id": connection_id,
                "user_id": user_id,
                "total_connections": len(self.active_connections),
            },
        )
        return user_id

    async def broadcast_to_user(
        self, user_id: str, message_type: MessageType, data: Dict[str, Any]
    ) -> int:
        """
        Broadcast message to all connections for a user.

        Args:
            user_id: Target user ID
            message_type: Type of message
            data: Message data

        Returns:
            Number of connections message was sent to
        """
        if user_id not in self.user_connections:
            return 0

        message = {
            "type": message_type,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        }
        message_json = json.dumps(message)
        sent_count = 0

        connection_ids = list(self.user_connections[user_id])
        for connection_id in connection_ids:
            if connection_id in self.active_connections:
                try:
                    await self.active_connections[connection_id].send(message_json)
                    sent_count += 1
                except Exception as e:
                    logger.warning(
                        f"Failed to send message to connection",
                        extra={
                            "connection_id": connection_id,
                            "error": str(e),
                        },
                    )
                    await self.disconnect(connection_id)

        return sent_count

    async def broadcast_to_connection(
        self, connection_id: str, message_type: MessageType, data: Dict[str, Any]
    ) -> bool:
        """
        Send message to specific connection.

        Args:
            connection_id: Target connection ID
            message_type: Type of message
            data: Message data

        Returns:
            True if sent successfully, False otherwise
        """
        if connection_id not in self.active_connections:
            return False

        message = {
            "type": message_type,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        }
        message_json = json.dumps(message)

        try:
            await self.active_connections[connection_id].send(message_json)
            return True
        except Exception as e:
            logger.warning(
                f"Failed to send message to connection",
                extra={
                    "connection_id": connection_id,
                    "error": str(e),
                },
            )
            await self.disconnect(connection_id)
            return False

    async def close_user_connections(self, user_id: str) -> int:
        """
        Close all connections for a user.

        Args:
            user_id: User ID

        Returns:
            Number of connections closed
        """
        if user_id not in self.user_connections:
            return 0

        connection_ids = list(self.user_connections[user_id])
        closed_count = 0

        for connection_id in connection_ids:
            if await self.disconnect(connection_id):
                closed_count += 1

        return closed_count

    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.active_connections)

    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for a user."""
        return len(self.user_connections.get(user_id, set()))


class WebSocketConnection:
    """Represents a single WebSocket connection."""

    def __init__(
        self, connection_id: str, websocket: WebSocket, user_id: str, connected_at: datetime
    ):
        """
        Initialize WebSocket connection.

        Args:
            connection_id: Unique connection ID
            websocket: WebSocket connection
            user_id: User ID
            connected_at: Connection timestamp
        """
        self.connection_id = connection_id
        self.websocket = websocket
        self.user_id = user_id
        self.connected_at = connected_at
        self.last_heartbeat = datetime.now()

    async def send(self, message: str) -> None:
        """
        Send message through WebSocket.

        Args:
            message: JSON message to send
        """
        try:
            await self.websocket.send_text(message)
            logger.debug(
                f"WebSocket message sent",
                extra={"connection_id": self.connection_id},
            )
        except Exception as e:
            logger.error(
                f"Failed to send WebSocket message",
                extra={
                    "connection_id": self.connection_id,
                    "error": str(e),
                },
            )
            raise

    async def receive(self) -> str:
        """
        Receive message from WebSocket.

        Returns:
            Received message text

        Raises:
            WebSocketDisconnect: If connection is closed
        """
        return await self.websocket.receive_text()

    def update_heartbeat(self) -> None:
        """Update last heartbeat timestamp."""
        self.last_heartbeat = datetime.now()


# Global connection pool
connection_pool = ConnectionPool()


# ============================================================================
# WebSocket Endpoints
# ============================================================================


@router.websocket("/resume/{connection_type}")
async def websocket_resume_endpoint(websocket: WebSocket, connection_type: str):
    """
    WebSocket endpoint for real-time resume operations.

    Supported connection types:
    - pdf: PDF generation progress
    - tailor: Real-time resume tailoring
    - general: General updates

    Connection Flow:
    1. Client connects with WebSocket
    2. Server sends CONNECT confirmation
    3. Client can receive real-time updates
    4. Periodic HEARTBEAT messages keep connection alive
    5. Server sends specific updates (PDF_PROGRESS, PDF_COMPLETE, etc.)
    6. On disconnect, cleanup happens automatically
    """
    connection_id = str(uuid.uuid4())
    user_id = None

    try:
        await websocket.accept()
        logger.info(
            f"WebSocket connection accepted",
            extra={"connection_id": connection_id, "type": connection_type},
        )

        # Try to get authentication from query params or headers
        # For now, use a generic user ID (in production, verify token)
        user_id = "anonymous"
        if "user_id" in websocket.query_params:
            user_id = websocket.query_params["user_id"]

        # Register connection
        await connection_pool.connect(connection_id, websocket, user_id)

        # Send connection confirmation
        await connection_pool.broadcast_to_connection(
            connection_id,
            MessageType.CONNECT,
            {
                "connection_id": connection_id,
                "type": connection_type,
                "message": "Connected to WebSocket server",
            },
        )

        # Heartbeat task
        heartbeat_task = None

        async def send_heartbeat():
            """Send periodic heartbeat messages."""
            try:
                while True:
                    await asyncio.sleep(connection_pool.heartbeat_interval)
                    if connection_id in connection_pool.active_connections:
                        await connection_pool.broadcast_to_connection(
                            connection_id,
                            MessageType.HEARTBEAT,
                            {"timestamp": datetime.now().isoformat()},
                        )
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(
                    f"Heartbeat error",
                    extra={"connection_id": connection_id, "error": str(e)},
                )

        # Start heartbeat task
        heartbeat_task = asyncio.create_task(send_heartbeat())

        # Message handler loop
        try:
            while True:
                data = await websocket.receive_json()
                logger.debug(
                    f"WebSocket message received",
                    extra={
                        "connection_id": connection_id,
                        "message_type": data.get("type"),
                    },
                )

                message_type = data.get("type")
                payload = data.get("data", {})

                # Handle heartbeat ACK
                if message_type == MessageType.HEARTBEAT_ACK:
                    ws_conn = connection_pool.active_connections.get(connection_id)
                    if ws_conn:
                        ws_conn.update_heartbeat()

        except WebSocketDisconnect:
            logger.info(
                f"WebSocket disconnected",
                extra={"connection_id": connection_id},
            )
        finally:
            # Cancel heartbeat task
            if heartbeat_task:
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass

            # Cleanup
            await connection_pool.disconnect(connection_id)
            try:
                await websocket.close()
            except Exception:
                pass

    except Exception as e:
        logger.error(
            f"WebSocket error",
            extra={
                "connection_id": connection_id,
                "error": str(e),
            },
        )
        try:
            await websocket.close(code=status.WS_1011_SERVER_ERROR)
        except Exception:
            pass


# ============================================================================
# Helper Functions for Broadcasting
# ============================================================================


async def send_pdf_progress(user_id: str, job_id: str, progress: int, message: str) -> int:
    """
    Send PDF generation progress update.

    Args:
        user_id: Target user ID
        job_id: PDF generation job ID
        progress: Progress percentage (0-100)
        message: Progress message

    Returns:
        Number of connections notified
    """
    return await connection_pool.broadcast_to_user(
        user_id,
        MessageType.PDF_PROGRESS,
        {
            "job_id": job_id,
            "progress": max(0, min(100, progress)),
            "message": message,
        },
    )


async def send_pdf_complete(user_id: str, job_id: str, file_url: str) -> int:
    """
    Send PDF generation completion notification.

    Args:
        user_id: Target user ID
        job_id: PDF generation job ID
        file_url: URL to download generated PDF

    Returns:
        Number of connections notified
    """
    return await connection_pool.broadcast_to_user(
        user_id,
        MessageType.PDF_COMPLETE,
        {
            "job_id": job_id,
            "file_url": file_url,
            "message": "PDF generation complete",
        },
    )


async def send_pdf_error(user_id: str, job_id: str, error_message: str) -> int:
    """
    Send PDF generation error notification.

    Args:
        user_id: Target user ID
        job_id: PDF generation job ID
        error_message: Error description

    Returns:
        Number of connections notified
    """
    return await connection_pool.broadcast_to_user(
        user_id,
        MessageType.PDF_ERROR,
        {
            "job_id": job_id,
            "error": error_message,
        },
    )


async def send_notification(user_id: str, title: str, message: str, level: str = "info") -> int:
    """
    Send generic notification.

    Args:
        user_id: Target user ID
        title: Notification title
        message: Notification message
        level: Notification level (info/warning/error)

    Returns:
        Number of connections notified
    """
    return await connection_pool.broadcast_to_user(
        user_id,
        MessageType.NOTIFICATION,
        {
            "title": title,
            "message": message,
            "level": level,
        },
    )
