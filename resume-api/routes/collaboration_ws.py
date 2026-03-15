"""
Real-time Collaboration WebSocket handlers.

Provides:
- Presence tracking (who's viewing/editing)
- Cursor position broadcasting
- Section locking during editing
- Real-time content synchronization
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, Any, List
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from monitoring import logging_config

logger = logging_config.get_logger(__name__)


class CollaborationMessageType(str):
    """Collaboration-specific message types."""

    PRESENCE = "presence"
    PRESENCE_UPDATE = "presence_update"
    CURSOR_MOVE = "cursor_move"
    CURSOR_UPDATE = "cursor_update"
    SECTION_LOCK = "section_lock"
    SECTION_UNLOCK = "section_unlock"
    CONTENT_CHANGE = "content_change"
    CONTENT_UPDATE = "content_update"
    SAVE_REQUEST = "save_request"
    SAVE_COMPLETE = "save_complete"


class PresenceInfo:
    """User presence information."""

    def __init__(
        self,
        user_id: str,
        user_name: str,
        connection_id: str,
        resume_id: int,
    ):
        self.user_id = user_id
        self.user_name = user_name
        self.connection_id = connection_id
        self.resume_id = resume_id
        self.cursor_position: Optional[Dict[str, Any]] = None
        self.active_section: Optional[str] = None
        self.is_editing = False
        self.last_activity = datetime.now()
        self.color = self._generate_color(user_id)

    @staticmethod
    def _generate_color(user_id: str) -> str:
        """Generate a consistent color for a user based on their ID."""
        colors = [
            "#3b82f6",  # blue
            "#10b981",  # green
            "#f59e0b",  # yellow
            "#ef4444",  # red
            "#8b5cf6",  # purple
            "#ec4899",  # pink
            "#06b6d4",  # cyan
            "#f97316",  # orange
        ]
        hash_val = sum(ord(c) for c in user_id) % len(colors)
        return colors[hash_val]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "user_name": self.user_name,
            "connection_id": self.connection_id,
            "resume_id": self.resume_id,
            "cursor_position": self.cursor_position,
            "active_section": self.active_section,
            "is_editing": self.is_editing,
            "color": self.color,
            "last_activity": self.last_activity.isoformat(),
        }


class SectionLock:
    """Represents a locked section being edited."""

    def __init__(self, resume_id: int, section: str, user_id: str, user_name: str):
        self.resume_id = resume_id
        self.section = section
        self.user_id = user_id
        self.user_name = user_name
        self.locked_at = datetime.now()
        self.expires_at = self.locked_at + timedelta(minutes=5)

    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "resume_id": self.resume_id,
            "section": self.section,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "locked_at": self.locked_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
        }


class CollaborationManager:
    """Manages real-time collaboration state."""

    def __init__(self):
        # resume_id -> set of user presences
        self.resume_presences: Dict[int, Dict[str, PresenceInfo]] = {}
        # resume_id -> section -> SectionLock
        self.section_locks: Dict[int, Dict[str, SectionLock]] = {}
        self.lock = asyncio.Lock()

    async def join_resume(self, presence: PresenceInfo) -> List[PresenceInfo]:
        """
        User joins a resume editing session.

        Returns list of other users currently present.
        """
        async with self.lock:
            if presence.resume_id not in self.resume_presences:
                self.resume_presences[presence.resume_id] = {}

            self.resume_presences[presence.resume_id][presence.connection_id] = presence

            # Return other users' presences
            others = [
                p for cid, p in self.resume_presences[presence.resume_id].items()
                if cid != presence.connection_id
            ]
            return others

    async def leave_resume(self, resume_id: int, connection_id: str) -> List[PresenceInfo]:
        """
        User leaves a resume editing session.

        Returns list of remaining users.
        """
        async with self.lock:
            if resume_id in self.resume_presences:
                self.resume_presences[resume_id].pop(connection_id, None)

                if not self.resume_presences[resume_id]:
                    del self.resume_presences[resume_id]

                # Return remaining users
                return list(self.resume_presences.get(resume_id, {}).values())
            return []

    async def update_cursor(
        self,
        resume_id: int,
        connection_id: str,
        cursor_position: Dict[str, Any],
        active_section: Optional[str] = None,
    ) -> List[PresenceInfo]:
        """
        Update user's cursor position.

        Returns list of other users to notify.
        """
        async with self.lock:
            if resume_id not in self.resume_presences:
                return []

            presence = self.resume_presences[resume_id].get(connection_id)
            if not presence:
                return []

            presence.cursor_position = cursor_position
            presence.active_section = active_section
            presence.is_editing = active_section is not None
            presence.last_activity = datetime.now()

            # Return other users
            return [
                p for cid, p in self.resume_presences[resume_id].items()
                if cid != connection_id
            ]

    async def lock_section(
        self,
        resume_id: int,
        section: str,
        user_id: str,
        user_name: str,
        connection_id: str,
    ) -> tuple[bool, Optional[SectionLock]]:
        """
        Attempt to lock a section for editing.

        Returns (success, existing_lock_if_any).
        """
        async with self.lock:
            if resume_id not in self.section_locks:
                self.section_locks[resume_id] = {}

            # Check if section is already locked
            existing_lock = self.section_locks[resume_id].get(section)

            if existing_lock:
                if existing_lock.is_expired():
                    # Lock expired, allow takeover
                    new_lock = SectionLock(resume_id, section, user_id, user_name)
                    self.section_locks[resume_id][section] = new_lock
                    return True, None
                elif existing_lock.user_id == user_id:
                    # User already has the lock, extend it
                    existing_lock.expires_at = datetime.now() + timedelta(minutes=5)
                    return True, None
                else:
                    # Section is locked by another user
                    return False, existing_lock

            # Create new lock
            new_lock = SectionLock(resume_id, section, user_id, user_name)
            self.section_locks[resume_id][section] = new_lock
            return True, None

    async def unlock_section(self, resume_id: int, section: str, user_id: str) -> bool:
        """
        Unlock a section.

        Returns True if successfully unlocked.
        """
        async with self.lock:
            if resume_id not in self.section_locks:
                return False

            lock = self.section_locks[resume_id].get(section)
            if lock and lock.user_id == user_id:
                del self.section_locks[resume_id][section]
                return True
            return False

    async def get_active_locks(self, resume_id: int) -> List[SectionLock]:
        """Get all active locks for a resume."""
        async with self.lock:
            locks = self.section_locks.get(resume_id, {}).values()
            return [lock for lock in locks if not lock.is_expired()]

    async def cleanup_expired_locks(self):
        """Remove expired section locks."""
        async with self.lock:
            for resume_id in list(self.section_locks.keys()):
                self.section_locks[resume_id] = {
                    section: lock
                    for section, lock in self.section_locks[resume_id].items()
                    if not lock.is_expired()
                }
                if not self.section_locks[resume_id]:
                    del self.section_locks[resume_id]


# Global collaboration manager
collaboration_manager = CollaborationManager()


async def handle_collaboration_message(
    websocket: WebSocket,
    message: Dict[str, Any],
    user_id: str,
    user_name: str,
    connection_id: str,
    db: AsyncSession,
):
    """Handle collaboration-specific WebSocket messages."""
    msg_type = message.get("type")
    data = message.get("data", {})

    if msg_type == CollaborationMessageType.PRESENCE:
        # User joining a resume
        resume_id = data.get("resume_id")
        if not resume_id:
            return

        presence = PresenceInfo(user_id, user_name, connection_id, resume_id)
        others = await collaboration_manager.join_resume(presence)

        # Send current presences to the joining user
        await websocket.send_json({
            "type": CollaborationMessageType.PRESENCE_UPDATE,
            "data": {
                "action": "joined",
                "presences": [p.to_dict() for p in others],
            },
        })

        # Notify others that user joined
        broadcast_message = {
            "type": CollaborationMessageType.PRESENCE_UPDATE,
            "data": {
                "action": "joined",
                "presence": presence.to_dict(),
            },
        }
        await broadcast_to_resume(resume_id, broadcast_message, exclude=connection_id)

    elif msg_type == CollaborationMessageType.CURSOR_MOVE:
        # User moved cursor
        resume_id = data.get("resume_id")
        cursor_position = data.get("cursor_position")
        active_section = data.get("active_section")

        if not resume_id or not cursor_position:
            return

        others = await collaboration_manager.update_cursor(
            resume_id, connection_id, cursor_position, active_section
        )

        # Broadcast cursor update to others
        broadcast_message = {
            "type": CollaborationMessageType.CURSOR_UPDATE,
            "data": {
                "user_id": user_id,
                "user_name": user_name,
                "connection_id": connection_id,
                "cursor_position": cursor_position,
                "active_section": active_section,
            },
        }
        await broadcast_to_resume(resume_id, broadcast_message, exclude=connection_id)

    elif msg_type == CollaborationMessageType.SECTION_LOCK:
        # User wants to lock a section
        resume_id = data.get("resume_id")
        section = data.get("section")

        if not resume_id or not section:
            return

        success, existing_lock = await collaboration_manager.lock_section(
            resume_id, section, user_id, user_name, connection_id
        )

        if success:
            await websocket.send_json({
                "type": CollaborationMessageType.SECTION_LOCK,
                "data": {
                    "success": True,
                    "section": section,
                    "locked_by": user_name,
                },
            })

            # Notify others
            await broadcast_to_resume(resume_id, {
                "type": CollaborationMessageType.SECTION_LOCK,
                "data": {
                    "section": section,
                    "locked_by": user_name,
                    "user_id": user_id,
                },
            }, exclude=connection_id)
        else:
            await websocket.send_json({
                "type": CollaborationMessageType.SECTION_LOCK,
                "data": {
                    "success": False,
                    "section": section,
                    "locked_by": existing_lock.user_name if existing_lock else None,
                    "expires_at": existing_lock.expires_at.isoformat() if existing_lock else None,
                },
            })

    elif msg_type == CollaborationMessageType.SECTION_UNLOCK:
        # User releasing a section lock
        resume_id = data.get("resume_id")
        section = data.get("section")

        if not resume_id or not section:
            return

        await collaboration_manager.unlock_section(resume_id, section, user_id)

        # Notify others
        await broadcast_to_resume(resume_id, {
            "type": CollaborationMessageType.SECTION_UNLOCK,
            "data": {
                "section": section,
                "user_id": user_id,
            },
        }, exclude=connection_id)

    elif msg_type == CollaborationMessageType.CONTENT_CHANGE:
        # Real-time content change (for future OT/CRDT implementation)
        resume_id = data.get("resume_id")
        changes = data.get("changes")

        if not resume_id or not changes:
            return

        # Broadcast changes to others
        await broadcast_to_resume(resume_id, {
            "type": CollaborationMessageType.CONTENT_UPDATE,
            "data": {
                "user_id": user_id,
                "user_name": user_name,
                "changes": changes,
            },
        }, exclude=connection_id)


async def broadcast_to_resume(
    resume_id: int,
    message: Dict[str, Any],
    exclude: Optional[str] = None,
):
    """Broadcast a message to all users editing a resume."""
    # This would need access to the WebSocket connection pool
    # For now, this is a placeholder for the actual implementation
    # that would integrate with the existing connection_pool in websocket.py
    pass


async def cleanup_task():
    """Periodically clean up expired locks."""
    while True:
        await asyncio.sleep(60)  # Run every minute
        await collaboration_manager.cleanup_expired_locks()


# Start cleanup task on module load
cleanup_task = asyncio.create_task(cleanup_task()) if asyncio.get_event_loop().is_running() else None
