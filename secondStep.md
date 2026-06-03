# Step 2: CLI (Commander-based) — Complete Report

## Overview

Implemented a Commander-based CLI tool (`oh`) that connects to the Gateway server via WebSocket. Includes a reusable `GatewayClient` class that handles the full connection lifecycle (handshake, requests, events). Published as `@openhands/cli`.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CLI (oh command)                    │
│  Commander-based                                    │
│                                                     │
│  Commands:                                          │
│    oh health   → calls gateway health method        │
│    oh ping     → calls gateway ping method           │
│    oh listen   → subscribes to broadcast events      │
│    --server/-s → custom gateway URL (default:        │
│                   ws://127.0.0.1:18999)              │
└──────────────────────┬──────────────────────────────┘
                       │
                  WebSocket
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 Gateway Server                       │
│               ws://127.0.0.1:18999                   │
└─────────────────────────────────────────────────────┘
```

## CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `health` | Check gateway health (status, uptime, timestamp) | `oh health` |
| `ping` | Ping the gateway (pong, timestamp) | `oh ping` |
| `listen` | Listen for broadcast events for N ms | `oh listen -t 10000` |

### Global Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--server` | `-s` | `ws://127.0.0.1:18999` | Gateway WebSocket URL |

## GatewayClient Class

`apps/cli/src/gateway-client.ts` — reusable WebSocket client:

- **`connect(serverUrl)`** — connects, performs handshake (challenge → connect → hello-ok), returns connection info
- **`request(method, params?)`** — sends a request, returns the response payload (with 10s timeout)
- **`onEvent(handler)`** — registers a handler for broadcast events (returns unsubscribe function)
- **`close()`** — disconnects
- **`connectionId`** / **`features`** — accessors for connection state

## Project Files

```
apps/cli/
├── src/
│   ├── index.ts           # Commander CLI entry point
│   └── gateway-client.ts  # WebSocket client class
├── test/
│   └── cli.test.ts        # Tests (7 tests)
└── package.json
```

## Tests and Results

All **7 CLI tests pass** (total 16 across workspace):

| Test | Status | What it verifies |
|------|--------|------------------|
| Connect + full handshake | ✅ | Returns `connectionId`, `protocolVersion`, `features` |
| Invalid server URL | ✅ | Rejects with error when server unreachable |
| Health method | ✅ | Returns `status`, `uptime`, `timestamp` |
| Ping method | ✅ | Returns `pong: true`, `timestamp` |
| Unknown method | ✅ | Throws `METHOD_NOT_FOUND` |
| Broadcast events | ✅ | `onEvent()` handler receives events from server |
| Request after close | ✅ | Throws "Not connected" error |

```
 ✓ apps/cli/test/cli.test.ts (7 tests)  362ms

 Test Files  2 passed (2)
      Tests  16 passed (16)
```

## Key Implementation Details

### GatewayClient Connect Flow

1. Opens WebSocket to server URL
2. Receives `connect.challenge` event from server
3. Sends `connect` request with `minProtocol`, `maxProtocol`, `client` info
4. Parses `hello-ok` response → stores `connectionId` and `features`

### Request/Response Matching

Each request gets a unique `id` (e.g., `cli-1`, `cli-2`). A `Map<string, callback>` tracks pending requests. On response, the matching callback is invoked. A 10-second timeout prevents hanging.

### Event Handling

Broadcast events trigger all registered `onEvent` handlers. An unsubscribe function is returned for cleanup.

### CLI Error Handling

Connection failures print to stderr and exit with code 1. Request errors (e.g., `METHOD_NOT_FOUND`) are caught and printed. Resources are cleaned up via `client.close()` in `finally` blocks.
