import { API_URL } from './config';

export interface PresenceInfo {
  user_id: string;
  user_name: string;
  connection_id: string;
  resume_id: number;
  cursor_position?: {
    line: number;
    column: number;
  } | null;
  active_section?: string | null;
  is_editing: boolean;
  color: string;
  last_activity: string;
}

export interface SectionLock {
  resume_id: number;
  section: string;
  user_id: string;
  user_name: string;
  locked_at: string;
  expires_at: string;
}

export interface CollaborationMessage {
  type: string;
  data: Record<string, unknown>;
}

export type CollaborationHandler = (message: CollaborationMessage) => void;

export interface UseCollaborationOptions {
  onResumeId?: number;
  userId?: string;
  userName?: string;
  onPresenceUpdate?: (presences: PresenceInfo[]) => void;
  onCursorUpdate?: (presence: PresenceInfo) => void;
  onSectionLock?: (lock: SectionLock) => void;
  onSectionUnlock?: (section: string) => void;
  onContentChange?: (changes: Record<string, unknown>) => void;
}

export interface UseCollaborationReturn {
  connect: () => void;
  disconnect: () => void;
  sendCursorMove: (cursorPosition: { line: number; column: number }, activeSection?: string) => void;
  lockSection: (section: string) => Promise<boolean>;
  unlockSection: (section: string) => void;
  sendContentChange: (changes: Record<string, unknown>) => void;
  presences: PresenceInfo[];
  activeLocks: SectionLock[];
  isConnected: boolean;
  error: string | null;
}

let ws: WebSocket | null = null;
const connectionHandlers: Set<CollaborationHandler> = new Set();
let currentPresences: PresenceInfo[] = [];
let currentLocks: SectionLock[] = [];

/**
 * Join a resume collaboration session.
 */
export function joinResume(
  resumeId: number,
  userId: string,
  userName: string
): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    connectToCollaboration();
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'presence',
      data: {
        resume_id: resumeId,
        user_id: userId,
        user_name: userName,
      },
    }));
  }
}

/**
 * Leave a resume collaboration session.
 */
export function leaveResume(resumeId: number): void {
  // Presence will be cleaned up automatically on disconnect
}

/**
 * Connect to the collaboration WebSocket.
 */
export function connectToCollaboration(): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  const wsUrl = API_URL.replace('http', 'ws') + '/ws/collaboration';
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Collaboration WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const message: CollaborationMessage = JSON.parse(event.data);
      handleCollaborationMessage(message);
    } catch (err) {
      console.error('Failed to parse collaboration message:', err);
    }
  };

  ws.onclose = () => {
    console.log('Collaboration WebSocket disconnected');
    // Attempt reconnection after 3 seconds
    setTimeout(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectToCollaboration();
      }
    }, 3000);
  };

  ws.onerror = (error) => {
    console.error('Collaboration WebSocket error:', error);
  };
}

/**
 * Disconnect from the collaboration WebSocket.
 */
export function disconnectFromCollaboration(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  connectionHandlers.clear();
  currentPresences = [];
  currentLocks = [];
}

/**
 * Handle incoming collaboration messages.
 */
function handleCollaborationMessage(message: CollaborationMessage): void {
  const { type, data } = message;

  switch (type) {
    case 'presence_update':
      if (data.action === 'joined' && Array.isArray(data.presences)) {
        currentPresences = data.presences as PresenceInfo[];
      } else if (data.presence) {
        // Update or add presence
        const presence = data.presence as PresenceInfo;
        const index = currentPresences.findIndex(p => p.connection_id === presence.connection_id);
        if (index >= 0) {
          currentPresences[index] = presence;
        } else {
          currentPresences.push(presence);
        }
      }
      // Notify handlers
      connectionHandlers.forEach(handler => handler(message));
      break;

    case 'cursor_update':
      // Update cursor position for a user
      connectionHandlers.forEach(handler => handler(message));
      break;

    case 'section_lock':
      if (data.section) {
        const lock: SectionLock = {
          resume_id: data.resume_id as number,
          section: data.section as string,
          user_id: data.user_id as string,
          user_name: data.user_name as string,
          locked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
        currentLocks.push(lock);
      }
      connectionHandlers.forEach(handler => handler(message));
      break;

    case 'section_unlock':
      if (data.section) {
        currentLocks = currentLocks.filter(l => l.section !== data.section);
      }
      connectionHandlers.forEach(handler => handler(message));
      break;

    case 'content_update':
      connectionHandlers.forEach(handler => handler(message));
      break;
  }
}

/**
 * Send cursor position update.
 */
export function sendCursorMove(
  resumeId: number,
  cursorPosition: { line: number; column: number },
  activeSection?: string
): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({
    type: 'cursor_move',
    data: {
      resume_id: resumeId,
      cursor_position: cursorPosition,
      active_section: activeSection,
    },
  }));
}

/**
 * Request to lock a section for editing.
 */
export async function lockSection(
  resumeId: number,
  section: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; lockedBy?: string }> {
  return new Promise((resolve) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ success: false });
      return;
    }

    const handler = (message: CollaborationMessage) => {
      if (message.type === 'section_lock' && message.data.section === section) {
        connectionHandlers.delete(handler);
        resolve({
          success: message.data.success as boolean,
          lockedBy: message.data.locked_by as string | undefined,
        });
      }
    };

    connectionHandlers.add(handler);

    ws.send(JSON.stringify({
      type: 'section_lock',
      data: {
        resume_id: resumeId,
        section,
        user_id: userId,
        user_name: userName,
      },
    }));

    // Timeout after 5 seconds
    setTimeout(() => {
      connectionHandlers.delete(handler);
      resolve({ success: false });
    }, 5000);
  });
}

/**
 * Release a section lock.
 */
export function unlockSection(resumeId: number, section: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({
    type: 'section_unlock',
    data: {
      resume_id: resumeId,
      section,
    },
  }));
}

/**
 * Send content change for real-time sync.
 */
export function sendContentChange(
  resumeId: number,
  changes: Record<string, unknown>
): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({
    type: 'content_change',
    data: {
      resume_id: resumeId,
      changes,
    },
  }));
}

/**
 * Get current presences.
 */
export function getPresences(): PresenceInfo[] {
  return [...currentPresences];
}

/**
 * Get active section locks.
 */
export function getActiveLocks(): SectionLock[] {
  return [...currentLocks];
}

/**
 * Subscribe to collaboration messages.
 */
export function subscribeToCollaboration(handler: CollaborationHandler): () => void {
  connectionHandlers.add(handler);
  return () => {
    connectionHandlers.delete(handler);
  };
}

/**
 * Check if connected to collaboration WebSocket.
 */
export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
