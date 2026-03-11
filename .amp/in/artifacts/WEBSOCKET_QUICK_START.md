# WebSocket Implementation Quick Start Guide

## For Issue #967: Add WebSocket support for real-time features

**PR**: [#995](https://github.com/anchapin/ResumeAI/pull/995)  
**Status**: ✅ Complete (50/50 tests passing)

---

## Quick Links

| Resource | Location |
|----------|----------|
| **PR** | https://github.com/anchapin/ResumeAI/pull/995 |
| **Backend Code** | `resume-api/routes/websocket.py` |
| **Backend Tests** | `resume-api/tests/test_websocket.py` |
| **Frontend Hook** | `hooks/useWebSocket.ts` |
| **Frontend Tests** | `hooks/useWebSocket.test.ts` |
| **Full Docs** | `.amp/in/artifacts/ISSUE_967_WEBSOCKET_IMPLEMENTATION.md` |

---

## Using WebSocket in Your Code

### 1. Basic Connection

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { status, error, send } = useWebSocket();
  
  // Connection status: 'connecting' | 'connected' | 'disconnected' | 'error'
  return <div>Status: {status}</div>;
}
```

### 2. Track PDF Progress

```typescript
import { usePDFProgress } from '@/hooks/useWebSocket';

function PDFEditor() {
  const jobId = 'job-123';
  const { progress, status, error } = usePDFProgress(jobId);
  
  return (
    <>
      <ProgressBar value={progress} max={100} />
      {error && <p style={{color: 'red'}}>{error}</p>}
    </>
  );
}
```

### 3. Receive Notifications

```typescript
import { useNotifications } from '@/hooks/useWebSocket';

function NotificationCenter() {
  const { notifications, removeNotification } = useNotifications();
  
  return (
    <div>
      {notifications.map(notif => (
        <Toast 
          key={notif.id} 
          title={notif.title}
          message={notif.message}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </div>
  );
}
```

### 4. Send Custom Messages

```typescript
const { send } = useWebSocket();

// Send a message
send('message', { 
  text: 'Hello',
  userId: '123'
});
```

### 5. Listen for Specific Events

```typescript
const { on, off } = useWebSocket();

useEffect(() => {
  const handlePDFComplete = (data) => {
    console.log('PDF ready:', data);
  };
  
  on('pdf_complete', handlePDFComplete);
  
  return () => off('pdf_complete', handlePDFComplete);
}, []);
```

---

## Backend Usage

### Broadcasting PDF Progress

```python
from routes.websocket import connection_pool

async def generate_resume_pdf(request: Request, job_id: str):
    user_id = request.user.id
    total_steps = 5
    
    for step in range(total_steps):
        # ... do work ...
        
        # Send progress
        await connection_pool.send_pdf_progress(
            user_id=user_id,
            job_id=job_id,
            progress=step + 1,
            total=total_steps
        )
    
    # Notify completion
    await connection_pool.broadcast_notification(
        title="Success",
        message="Your PDF is ready",
        level="success"
    )
    
    return {"status": "complete"}
```

### Broadcasting to All Users

```python
await connection_pool.broadcast_notification(
    title="System Update",
    message="Maintenance completed successfully",
    level="info"
)
```

### Sending Error Messages

```python
async def handle_pdf_error(websocket: WebSocket, error: Exception):
    await connection_pool.send_error(
        websocket=websocket,
        code="PDF_GENERATION_ERROR",
        message=str(error)
    )
```

---

## Architecture

### Connection States (Frontend)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  disconnected ──┐                                    │
│                 │                                    │
│            connect()                                 │
│                 │                                    │
│                 ▼                                    │
│          ┌──────────────┐                            │
│          │  connecting  │                            │
│          └──────────────┘                            │
│                 │                                    │
│        ┌────────┴────────┐                          │
│        │                 │                          │
│     success           failure                       │
│        │                 │                          │
│        ▼                 ▼                          │
│    connected         error                          │
│        │                 │                          │
│     disconnect          retry                       │
│        │                 │ (exponential backoff)    │
│        └─────────────────┘                          │
│
└──────────────────────────────────────────────────────┘
```

### Message Flow

```
Browser WebSocket        FastAPI WebSocket          Connection Pool
    │                          │                           │
    │──────── CONNECT ────────▶│                           │
    │                          │───── register ───────────▶│
    │                          │◀──── on_connect ──────────│
    │◀────── CONNECT ACK ──────│                           │
    │                          │                           │
    │──────── MESSAGE ────────▶│                           │
    │                          │───── broadcast ──────────▶│
    │◀────── RESPONSE ────────│◀───── to_all_clients ────│
    │                          │                           │
    │─────── HEARTBEAT ──────▶│                           │
    │◀────── HEARTBEAT ACK ──│                           │
    │                          │                           │
    │──────── DISCONNECT ────▶│                           │
    │                          │──── unregister ────────▶│
```

---

## Testing

### Run All Tests

```bash
# Frontend tests
npm test -- hooks/useWebSocket.test.ts --run

# Backend tests
pytest resume-api/tests/test_websocket.py -v

# Both
npm test && pytest resume-api/tests/
```

### Expected Results

```
Frontend: 31 tests passed ✓
Backend: 19 tests passed ✓
Coverage: >80% ✓
```

---

## Configuration

### Environment Variables (if needed)

```bash
# .env
VITE_WS_URL=ws://localhost:8000/api/v1/ws  # For dev
# Production: wss://api.example.com/api/v1/ws
```

### Backend Settings

From `config/settings.py`:
- Max concurrent connections: 1000
- Heartbeat interval: 30 seconds
- Heartbeat timeout: 30 seconds
- CORS origins: Configured in settings

---

## Troubleshooting

### WebSocket won't connect?

1. Check connection status: `const { status } = useWebSocket()`
2. Check browser console for errors
3. Verify backend is running: `curl http://localhost:8000/docs`
4. Check CORS settings in `config/settings.py`

### Connection drops frequently?

1. Check network connectivity
2. Verify heartbeat is working (30s intervals)
3. Check server logs for errors
4. Increase timeout if needed in `useWebSocket.ts`

### Messages not arriving?

1. Verify correct message type: `pdf_progress`, `notification`, etc.
2. Check WebSocket is connected: `status === 'connected'`
3. Check server-side broadcasting code
4. Verify event listener is registered: `on('message_type', handler)`

---

## Common Patterns

### Pattern: Progress Tracking

```typescript
function FileUploadWithProgress() {
  const { progress, status } = usePDFProgress('my-upload-id');
  
  if (status === 'processing') {
    return <ProgressBar value={progress} />;
  }
  
  if (status === 'error') {
    return <ErrorMessage />;
  }
  
  return <SuccessMessage />;
}
```

### Pattern: Real-time Notifications

```typescript
function NotificationListener() {
  useEffect(() => {
    const { on, off } = useWebSocket();
    
    const handleNotification = (data) => {
      // Show toast notification
      showToast(data.title, data.message);
    };
    
    on('notification', handleNotification);
    
    return () => off('notification', handleNotification);
  }, []);
}
```

### Pattern: Request-Response

```typescript
function SendCommand() {
  const { send, on, off } = useWebSocket();
  
  const handleClick = async () => {
    const messageId = Date.now();
    
    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.messageId === messageId) {
          resolve(data);
          off('response', handler);
        }
      };
      
      on('response', handler);
      send('command', { messageId, action: 'start' });
    });
  };
  
  return <button onClick={handleClick}>Send Command</button>;
}
```

---

## Performance Notes

- ✅ Connection pool: Up to 1000 concurrent connections
- ✅ Heartbeat: 30-second keep-alive to prevent timeouts
- ✅ Memory: Automatic cleanup on disconnect
- ✅ Reconnection: Exponential backoff (1s → 30s max)
- ✅ Serialization: JSON-only, no binary data

---

## Security

- ✅ CORS validation
- ✅ No credentials in messages
- ✅ HTTPS/WSS in production
- ✅ Connection authenticated via existing auth middleware
- ✅ Input validation on message types

---

## References

- **Full Implementation**: `ISSUE_967_WEBSOCKET_IMPLEMENTATION.md`
- **PR**: https://github.com/anchapin/ResumeAI/pull/995
- **FastAPI WebSocket Docs**: https://fastapi.tiangolo.com/advanced/websockets/
- **React Hooks Guide**: Existing `hooks/` directory examples

---

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the full implementation guide
3. Check PR #995 for discussion
4. Review test files for usage examples

