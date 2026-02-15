"""
WebSocket handlers for real-time collaboration.

This module provides WebSocket endpoints for real-time collaboration features
including live cursor positions, presence indicators, and resume data synchronization.
"""

import asyncio
import json
import uuid
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from datetime import datetime


class ConnectionManager:
    """Manages WebSocket connections for collaboration rooms."""
    
    def __init__(self):
        # room_id -> {connection_id -> WebSocket}
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        # connection_id -> {room_id, user_id, cursor_position, last_seen}
        self.connections: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None):
        """Add a new WebSocket connection to a room."""
        await websocket.accept()
        
        connection_id = str(uuid.uuid4())
        
        # Initialize room if needed
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        
        # Add connection to room
        self.rooms[room_id][connection_id] = websocket
        
        # Store connection metadata
        self.connections[connection_id] = {
            "room_id": room_id,
            "user_id": user_id or f"user_{connection_id[:8]}",
            "cursor_position": None,
            "last_seen": datetime.utcnow().isoformat(),
            "connected_at": datetime.utcnow().isoformat(),
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
        await websocket.send_json({
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
        })
        
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
        
        # Remove connection metadata
        del self.connections[connection_id]
        
        return room_id, user_id
    
    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific WebSocket."""
        try:
            await websocket.send_json(message)
        except Exception:
            pass  # Connection might be closed
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_connection: str = None):
        """Broadcast a message to all users in a room."""
        if room_id not in self.rooms:
            return
        
        for connection_id, websocket in self.rooms[room_id].items():
            if connection_id != exclude_connection:
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass  # Connection might be closed
    
    async def broadcast_resume_update(self, room_id: str, resume_data: dict, connection_id: str):
        """Broadcast resume data updates to all users in a room."""
        if room_id not in self.rooms:
            return
        
        for conn_id, websocket in self.rooms[room_id].items():
            if conn_id != connection_id:
                try:
                    await websocket.send_json({
                        "type": "resume_update",
                        "resume_data": resume_data,
                        "from_connection_id": connection_id,
                        "timestamp": datetime.utcnow().isoformat(),
                    })
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
                    users.append({
                        "connection_id": connection_id,
                        "user_id": self.connections[connection_id]["user_id"],
                        "cursor_position": self.connections[connection_id]["cursor_position"],
                        "last_seen": self.connections[connection_id]["last_seen"],
                    })
        return users


# Global connection manager
manager = ConnectionManager()


async def handle_websocket_connection(websocket: WebSocket, room_id: str, user_id: str = None):
    """
    Handle a WebSocket connection for real-time collaboration.
    
    Args:
        websocket: The WebSocket connection
        room_id: The room/resume ID to join
        user_id: Optional user identifier
    """
    connection_id = None
    
    try:
        # Connect to room
        connection_id = await manager.connect(websocket, room_id, user_id)
        
        # Handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
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
                await manager.broadcast_resume_update(room_id, resume_data, connection_id)
            
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
                # Respond to ping
                await websocket.send_json({"type": "pong"})
            
            else:
                # Unknown message type
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}",
                })
    
    except WebSocketDisconnect:
        pass  # Normal disconnect
    except json.JSONDecodeError:
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid JSON message",
            })
        except Exception:
            pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except Exception:
            pass
    finally:
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
