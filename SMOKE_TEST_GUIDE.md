# SSE Server Smoke Test Guide

## Overview
This guide walks through comprehensive smoke testing of the SSE `/events` endpoint and server, verifying the connection timeout fix (90s cleanup) is working properly.

## What Was Fixed
- **Issue**: `/events` endpoint hung when called again after first connection closed
- **Root Cause**: Dead clients remained in the `Set<http.ServerResponse>` because `close` event wasn't fired reliably on Railway's edge proxy
- **Solution**: Added 90-second connection timeout to forcefully clean up stalled clients
- **Code**: `backend/src/agent/sse-server.ts` lines 130-145

## Running the Smoke Tests

### Option 1: Automated Smoke Test Suite (Recommended)
The most comprehensive testing approach:

```bash
cd backend

# Start agent in background
npm start &
sleep 3  # Wait for server to start

# Run smoke test
npm run smoke-test:sse

# Stop agent
kill %1
```

**What it tests:**
1. ✅ Health endpoint (`/health`)
2. ✅ SSE connection establishment
3. ✅ Correct SSE headers (Content-Type, Cache-Control, Connection, X-Accel-Buffering)
4. ✅ **Reconnection after close** (the critical fix validation)
5. ✅ Multiple concurrent connections (5 simultaneous clients)
6. ✅ Health check with active connections (verifies client tracking)
7. ✅ State endpoint (`/state`)
8. ✅ CORS headers

### Option 2: Manual Testing with curl

#### Test 1: Check Health
```bash
curl -v http://localhost:8080/health
```

Expected:
- Status: 200
- Response: `{"status":"ok","clients":0,"agentName":"Seedstr-Agent","uptime":...}`

#### Test 2: Connect to SSE Stream
```bash
curl -N http://localhost:8080/events
```

Expected:
- Status: 200
- Content-Type: `text/event-stream`
- Initial message: `: connected`
- Ping events: `: ping` every 15 seconds
- At least one agent event: `event: agent_started`

Open in new terminal and let it run for 5-10 seconds, then Ctrl+C to disconnect.

#### Test 3: Reconnect Immediately (The Critical Test)
This validates the 90s timeout fix:

```bash
# Terminal 1: Connect and disconnect quickly
timeout 2 curl -N http://localhost:8080/events
# Wait 1 second
sleep 1

# Terminal 2: Try to reconnect - should succeed
curl -v http://localhost:8080/events
```

Expected:
- First connection: Status 200, then closes after 2 seconds
- Second connection: Status 200 (NOT hanging or 500 error)

**Before the fix**: Second connection would hang or fail because the first client was still in the `clients` Set.
**After the fix**: Second connection succeeds immediately because the 90s timeout cleaned up the stalled client.

#### Test 4: Multiple Concurrent Connections
```bash
# Open 5 simultaneous connections
for i in {1..5}; do
  echo "Starting connection $i..."
  timeout 5 curl -N http://localhost:8080/events &
done

# Check health - should show 5 clients
sleep 1
curl http://localhost:8080/health

# Wait for all connections to finish
wait
```

Expected:
- All 5 connections should establish successfully
- Health check should report `"clients":5`
- After connections close, health check should report `"clients":0`

#### Test 5: Verify 90s Timeout
To verify the timeout is working (optional, takes 90+ seconds):

```bash
# Start connection
curl -N http://localhost:8080/events &
CONNECTION_PID=$!

# Check health every 10 seconds for 100 seconds
for i in {1..10}; do
  sleep 10
  CLIENTS=$(curl -s http://localhost:8080/health | grep -o '"clients":[0-9]*' | cut -d: -f2)
  echo "At ${i}0s: $CLIENTS clients"
done

# Kill if still running
kill $CONNECTION_PID 2>/dev/null || true
```

Expected:
- For first 90 seconds: `"clients":1` (connection held open by timeout)
- After 90 seconds: `"clients":0` (timeout forced cleanup)

## Key Code Changes to Verify

### File: `backend/src/agent/sse-server.ts`

#### Lines 130-145: Connection Timeout Logic
```typescript
// Connection timeout - cleanup stalled clients after 90s (Railway edge proxy timeout)
const timeout = setTimeout(() => {
  try {
    res.end();
  } catch {}
  clearInterval(ping);
  this.clients.delete(res);
  console.log(`[SSE] Client timeout after 90s. Total: ${this.clients.size}`);
}, 90_000);

req.on('close', () => {
  clearInterval(ping);
  clearTimeout(timeout);  // Also clear timeout when properly closed
  this.clients.delete(res);
  console.log(`[SSE] Client disconnected. Total: ${this.clients.size}`);
});
```

**Key features:**
- ✅ Timeout fires after 90,000ms (90 seconds)
- ✅ Forces connection end with `res.end()`
- ✅ Removes from clients Set
- ✅ Clears ping interval to prevent interval leaks
- ✅ Clears timeout in the close handler (prevents double cleanup)
- ✅ Logs client count for debugging

## Expected Behavior

### Before Fix
```
1. First /events connection: ✅ Success
2. Close connection: ✅ Deleted (eventually)
3. Second /events connection: ❌ HANGING or ❌ 500 ERROR
   (Dead client still in Set, new client never gets broadcast messages)
```

### After Fix
```
1. First /events connection: ✅ Success
2. Close connection: ✅ Deleted immediately on close (or after 90s timeout)
3. Second /events connection: ✅ Success (stalled client was cleaned up)
4. Multiple reconnects: ✅ All succeed
```

## Monitoring Logs

When running the smoke test, watch for these log messages:

```
[SSE] New connection request received
[SSE] Headers written
[SSE] Headers flushed
[SSE] Client added. Total: 1
[SSE] Initial message written (11 bytes)
[SSE] Sent additional keepalive comments
[SSE] Socket uncorked
[SSE] Client disconnected. Total: 0
[SSE] Client timeout after 90s. Total: 0  ← Only appears if connection held 90s
```

## Production Verification

### Dashboard
- Navigate to http://localhost:8080/
- Watch the SSE event stream in real-time
- Should show agent status, polling, and any job events
- Should auto-reconnect smoothly if connection drops

### Metrics Endpoint
```bash
curl http://localhost:8080/metrics
```

Should include SSE-related metrics (if instrumented).

## Troubleshooting

### "Connection refused"
- Agent not running: `npm start` in backend directory
- Wrong port: Check PORT env var or use default 8080

### "Connection hangs"
- Old code without timeout fix still running
- Verify commit `1195092` is deployed
- Check `npm start` log shows SSE server on correct port

### "Second connection fails"
- Stalled client not being cleaned up
- Verify timeout code (lines 130-145) is present
- Check `req.on('close')` handler clears the timeout

### Too many clients after tests
- Clients stuck in memory from failed connections
- Agent needs restart: `npm start` fresh instance

## Performance Expectations

| Operation | Expected Duration |
|-----------|-------------------|
| Health check | <10ms |
| New SSE connection | <50ms |
| Reconnection after close | <50ms |
| Broadcast to 10 clients | <10ms per client |
| Timeout cleanup (if needed) | ~90s |

## Next Steps

After successful smoke test:
1. ✅ Commit automation test to CI/CD (optional, for automated validation)
2. ✅ Monitor production for stalled client logs
3. ✅ Verify real-time dashboard updates smoothly
4. ✅ Test with actual job submissions

## References

- **Fix Commit**: `1195092` - "fix: add SSE connection timeout to prevent hanging clients"
- **Code Location**: `backend/src/agent/sse-server.ts` (lines 130-145)
- **Related Issue**: `/events` endpoint hanging on reconnection when using Railway edge proxy
- **Root Cause**: Missing timeout for stalled clients due to unreliable `close` event
