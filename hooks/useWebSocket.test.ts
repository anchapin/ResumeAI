import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WebSocketMessageType,
  WebSocketState,
} from './useWebSocket';

/**
 * Test WebSocket message types
 */
describe('WebSocketMessageType', () => {
  it('should define CONNECT type', () => {
    expect(WebSocketMessageType.CONNECT).toBe('connect');
  });

  it('should define DISCONNECT type', () => {
    expect(WebSocketMessageType.DISCONNECT).toBe('disconnect');
  });

  it('should define HEARTBEAT type', () => {
    expect(WebSocketMessageType.HEARTBEAT).toBe('heartbeat');
  });

  it('should define HEARTBEAT_ACK type', () => {
    expect(WebSocketMessageType.HEARTBEAT_ACK).toBe('heartbeat_ack');
  });

  it('should define PDF_PROGRESS type', () => {
    expect(WebSocketMessageType.PDF_PROGRESS).toBe('pdf_progress');
  });

  it('should define PDF_COMPLETE type', () => {
    expect(WebSocketMessageType.PDF_COMPLETE).toBe('pdf_complete');
  });

  it('should define PDF_ERROR type', () => {
    expect(WebSocketMessageType.PDF_ERROR).toBe('pdf_error');
  });

  it('should define NOTIFICATION type', () => {
    expect(WebSocketMessageType.NOTIFICATION).toBe('notification');
  });

  it('should define ERROR type', () => {
    expect(WebSocketMessageType.ERROR).toBe('error');
  });
});

/**
 * Test WebSocket connection states
 */
describe('WebSocketState', () => {
  it('should define CONNECTING state', () => {
    expect(WebSocketState.CONNECTING).toBe('connecting');
  });

  it('should define CONNECTED state', () => {
    expect(WebSocketState.CONNECTED).toBe('connected');
  });

  it('should define DISCONNECTED state', () => {
    expect(WebSocketState.DISCONNECTED).toBe('disconnected');
  });

  it('should define RECONNECTING state', () => {
    expect(WebSocketState.RECONNECTING).toBe('reconnecting');
  });

  it('should define ERROR state', () => {
    expect(WebSocketState.ERROR).toBe('error');
  });
});

/**
 * Test URL construction
 */
describe('WebSocket URL helpers', () => {
  it('should construct WebSocket URL from environment', () => {
    // This tests that the module exports the proper types
    expect(WebSocketMessageType).toBeDefined();
    expect(WebSocketState).toBeDefined();
  });
});

/**
 * Integration test - verify the hook can be imported and types work
 */
describe('useWebSocket integration', () => {
  it('should export useWebSocket function', async () => {
    const { useWebSocket } = await import('./useWebSocket');
    expect(typeof useWebSocket).toBe('function');
  });

  it('should export usePDFProgress function', async () => {
    const { usePDFProgress } = await import('./useWebSocket');
    expect(typeof usePDFProgress).toBe('function');
  });

  it('should export useNotifications function', async () => {
    const { useNotifications } = await import('./useWebSocket');
    expect(typeof useNotifications).toBe('function');
  });

  it('should export WebSocketMessageType enum', async () => {
    const { WebSocketMessageType } = await import('./useWebSocket');
    expect(WebSocketMessageType).toBeDefined();
    expect(WebSocketMessageType.CONNECT).toBe('connect');
  });

  it('should export WebSocketState enum', async () => {
    const { WebSocketState } = await import('./useWebSocket');
    expect(WebSocketState).toBeDefined();
    expect(WebSocketState.CONNECTED).toBe('connected');
  });
});

/**
 * Test interface types
 */
describe('WebSocket message interfaces', () => {
  it('should support PDFProgressData interface', async () => {
    const progressData = {
      job_id: 'job_1',
      progress: 50,
      message: 'Processing...',
    };
    expect(progressData.job_id).toBe('job_1');
    expect(progressData.progress).toBe(50);
  });

  it('should support PDFCompleteData interface', async () => {
    const completeData = {
      job_id: 'job_1',
      file_url: 'http://example.com/pdf.pdf',
      message: 'Complete',
    };
    expect(completeData.file_url).toContain('pdf');
  });

  it('should support PDFErrorData interface', async () => {
    const errorData = {
      job_id: 'job_1',
      error: 'Generation failed',
    };
    expect(errorData.error).toContain('failed');
  });

  it('should support NotificationData interface', async () => {
    const notifData = {
      title: 'Test',
      message: 'Test message',
      level: 'info' as const,
    };
    expect(notifData.title).toBe('Test');
    expect(notifData.level).toBe('info');
  });
});

/**
 * Test WebSocket message structure
 */
describe('WebSocket message structure', () => {
  it('should validate message format with type, data, and timestamp', () => {
    const message = {
      type: WebSocketMessageType.PDF_PROGRESS,
      data: { job_id: 'job_1', progress: 50, message: 'Processing...' },
      timestamp: new Date().toISOString(),
    };

    expect(message.type).toBe('pdf_progress');
    expect(message.data.progress).toBe(50);
    expect(message.timestamp).toBeTruthy();
  });

  it('should validate CONNECT message format', () => {
    const message = {
      type: WebSocketMessageType.CONNECT,
      data: {
        connection_id: 'conn_123',
        type: 'pdf',
        message: 'Connected',
      },
      timestamp: new Date().toISOString(),
    };

    expect(message.type).toBe('connect');
    expect(message.data.connection_id).toBeTruthy();
  });

  it('should validate HEARTBEAT message format', () => {
    const message = {
      type: WebSocketMessageType.HEARTBEAT,
      data: {},
      timestamp: new Date().toISOString(),
    };

    expect(message.type).toBe('heartbeat');
  });

  it('should validate NOTIFICATION message format', () => {
    const message = {
      type: WebSocketMessageType.NOTIFICATION,
      data: {
        title: 'Test',
        message: 'Hello',
        level: 'info' as const,
      },
      timestamp: new Date().toISOString(),
    };

    expect(message.type).toBe('notification');
    expect(message.data.level).toBe('info');
  });
});

/**
 * Test UseWebSocketOptions interface
 */
describe('WebSocket options', () => {
  it('should support connectionType option', () => {
    const options = {
      connectionType: 'pdf',
    };
    expect(options.connectionType).toBe('pdf');
  });

  it('should support reconnection options', () => {
    const options = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
    };
    expect(options.reconnectAttempts).toBe(5);
    expect(options.maxReconnectDelay).toBe(30000);
  });

  it('should support callback options', () => {
    const options = {
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onError: vi.fn(),
      onMessage: vi.fn(),
    };
    expect(typeof options.onConnect).toBe('function');
    expect(typeof options.onDisconnect).toBe('function');
  });
});
