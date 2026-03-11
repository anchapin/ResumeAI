import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * WebSocket message types
 */
export enum WebSocketMessageType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_ACK = 'heartbeat_ack',
  PDF_PROGRESS = 'pdf_progress',
  PDF_COMPLETE = 'pdf_complete',
  PDF_ERROR = 'pdf_error',
  NOTIFICATION = 'notification',
  ERROR = 'error',
}

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * PDF progress message data
 */
export interface PDFProgressData {
  job_id: string;
  progress: number;
  message: string;
}

/**
 * PDF complete message data
 */
export interface PDFCompleteData {
  job_id: string;
  file_url: string;
  message: string;
}

/**
 * PDF error message data
 */
export interface PDFErrorData {
  job_id: string;
  error: string;
}

/**
 * Notification message data
 */
export interface NotificationData {
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

/**
 * WebSocket hook options
 */
export interface UseWebSocketOptions {
  url?: string;
  connectionType?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

/**
 * Get WebSocket URL from environment or construct from current location
 */
function getWebSocketUrl(): string {
  const wsUrl = import.meta.env.VITE_WS_URL;
  if (wsUrl) {
    return wsUrl;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_API_URL || `${window.location.hostname}:8000`;

  // Remove protocol from host if present
  const cleanHost = host.replace(/^https?:\/\//, '');

  return `${protocol}//${cleanHost}/ws/resume`;
}

/**
 * Get current user ID
 */
function getUserId(): string {
  try {
    const stored = localStorage.getItem('user_id');
    if (stored) {
      return stored;
    }
  } catch (_storageErr) {
    // localStorage might be blocked
  }

  return 'anonymous';
}

/**
 * Custom React hook for WebSocket connections with automatic reconnection.
 *
 * Features:
 * - Automatic connection establishment
 * - Exponential backoff reconnection
 * - Type-safe message handling
 * - Heartbeat support
 * - Error handling and recovery
 *
 * @param options WebSocket configuration options
 * @returns WebSocket state and methods
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    url = getWebSocketUrl(),
    connectionType = 'pdf',
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  // State
  const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
  const [wsError, setError] = useState<Error | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Map<WebSocketMessageType, (data: Record<string, unknown>) => void>>(
    new Map()
  );
  const connectRef = useRef<() => void>(() => {});

  /**
   * Clear all timeouts
   */
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  /**
   * Send heartbeat ACK
   */
  const sendHeartbeatAck = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: WebSocketMessageType.HEARTBEAT_ACK,
          data: {},
        })
      );
    }
  }, []);

  /**
   * Reset heartbeat timeout
   */
  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // Skip heartbeat timeout in test mode
    if (process.env.NODE_ENV !== 'test') {
      heartbeatTimeoutRef.current = setTimeout(() => {
        const error = new Error('WebSocket heartbeat timeout');
        setError(error);
        onError?.(error);
      }, 35000);
    }
  }, [onError]);

  /**
   * Calculate exponential backoff delay
   */
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay]);

  /**
   * Handle WebSocket connection
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(WebSocketState.CONNECTING);

    try {
      const wsUrl = `${url}/${connectionType}?user_id=${getUserId()}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setState(WebSocketState.CONNECTED);
        reconnectAttemptsRef.current = 0;
        setError(null);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          // Handle heartbeat
          if (message.type === WebSocketMessageType.HEARTBEAT) {
            sendHeartbeatAck();
            resetHeartbeatTimeout();
            return;
          }

          // Call global message handler
          onMessage?.(message);

          // Call type-specific handlers
          const handler = messageHandlersRef.current.get(message.type);
          handler?.(message.data);
        } catch (_parseErr) {
          const error = new Error(`Failed to parse WebSocket message: ${event.data}`);
          setError(error);
          onError?.(error);
        }
      };

      ws.onerror = () => {
        const error = new Error('WebSocket connection error');
        setError(error);
        setState(WebSocketState.ERROR);
        onError?.(error);
      };

      ws.onclose = () => {
        setState(WebSocketState.DISCONNECTED);
        onDisconnect?.();

        // Attempt reconnection
        if (reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setState(WebSocketState.RECONNECTING);

          const delay = getReconnectDelay();
          // Use connectRef to avoid circular dependency
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, delay);
        }
      };

      wsRef.current = ws;
      resetHeartbeatTimeout();
    } catch (_connectErr) {
      const error = _connectErr instanceof Error ? _connectErr : new Error('Failed to connect');
      setError(error);
      setState(WebSocketState.ERROR);
      onError?.(error);
    }
  }, [url, connectionType, reconnectAttempts, getReconnectDelay, onConnect, onDisconnect, onError, onMessage, sendHeartbeatAck, resetHeartbeatTimeout]);

  // Update connectRef when connect changes
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  /**
   * Send message
   */
  const send = useCallback(
    (type: WebSocketMessageType, data: Record<string, unknown> = {}) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        const error = new Error('WebSocket is not connected');
        setError(error);
        onError?.(error);
        return false;
      }

      try {
        wsRef.current.send(
          JSON.stringify({
            type,
            data,
          })
        );
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        setError(error);
        onError?.(error);
        return false;
      }
    },
    [onError]
  );

  /**
   * Register message handler
   */
  const onMessageType = useCallback(
    (type: WebSocketMessageType, handler: (data: Record<string, unknown>) => void) => {
      messageHandlersRef.current.set(type, handler);

      return () => {
        messageHandlersRef.current.delete(type);
      };
    },
    []
  );

  /**
   * Disconnect
   */
  const disconnect = useCallback(() => {
    clearTimeouts();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(WebSocketState.DISCONNECTED);
  }, [clearTimeouts]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, clearTimeouts]);

  return {
    state,
    error: wsError,
    send,
    disconnect,
    reconnect: connect,
    onMessageType,
    isConnected: state === WebSocketState.CONNECTED,
    isConnecting: state === WebSocketState.CONNECTING,
    isReconnecting: state === WebSocketState.RECONNECTING,
  };
};

/**
 * Hook for PDF progress tracking
 */
export const usePDFProgress = (jobId?: string) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const ws = useWebSocket({
    onError: (err: Error) => setPdfError(err.message),
  });

  useEffect(() => {
    const unsubProgress = ws.onMessageType(
      WebSocketMessageType.PDF_PROGRESS,
      (data) => {
        const progressData = data as unknown as PDFProgressData;
        if (!jobId || progressData.job_id === jobId) {
          setProgress(progressData.progress);
          setMessage(progressData.message);
        }
      }
    );

    const unsubComplete = ws.onMessageType(
      WebSocketMessageType.PDF_COMPLETE,
      (data) => {
        const completeData = data as unknown as PDFCompleteData;
        if (!jobId || completeData.job_id === jobId) {
          setProgress(100);
          setIsComplete(true);
        }
      }
    );

    const unsubError = ws.onMessageType(
      WebSocketMessageType.PDF_ERROR,
      (data) => {
        const errorData = data as unknown as PDFErrorData;
        if (!jobId || errorData.job_id === jobId) {
          setPdfError(errorData.error);
        }
      }
    );

    return () => {
      unsubProgress();
      unsubComplete();
      unsubError();
    };
  }, [ws, jobId]);

  return {
    progress,
    message,
    isComplete,
    pdfError,
    state: ws.state,
    send: ws.send,
    disconnect: ws.disconnect,
    reconnect: ws.reconnect,
    onMessageType: ws.onMessageType,
    isConnected: ws.isConnected,
    isConnecting: ws.isConnecting,
    isReconnecting: ws.isReconnecting,
  };
};

/**
 * Hook for notifications
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const ws = useWebSocket({});

  useEffect(() => {
    const unsubscribe = ws.onMessageType(
      WebSocketMessageType.NOTIFICATION,
      (data) => {
        const notifData = data as unknown as NotificationData;
        setNotifications((prev) => [...prev, notifData]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.slice(1));
        }, 5000);
      }
    );

    return unsubscribe;
  }, [ws]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    clearNotifications,
    ...ws,
  };
};
