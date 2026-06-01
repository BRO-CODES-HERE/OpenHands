# Step 1: Gateway + Protocol — Complete Report

## Overview

Implemented a WebSocket-based Gateway server with a typed protocol, following the same architectural patterns as OpenClaw. This is the foundation all other components (CLI, channels, agents) connect through.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              Gateway Server                   │
│  WebSocket (ws://127.0.0.1:18999)            │
│                                               │
│  Connection Lifecycle:                        │
│  1. Client connects                           │
│  2. Server sends "connect.challenge" event    │
│  3. Client sends "connect" request            │
│  4. Server responds "hello-ok" (features)     │
│  5. req/res/event communication begins        │
└──────────────────────────────────────────────┘
        ▲                          │
        │  WS (JSON frames)        │
        ▼                          ▼
   CLI / Apps / Nodes        Broadcast Events
```

## Protocol Design

### Frame Types

| Frame | Direction | Description |
|-------|-----------|-------------|
| `req` | Client → Server | Request with `id`, `method`, `params` |
| `res` | Server → Client | Response with `id`, `ok`, `payload`/`error` |
| `event` | Server → Client | Server-push event with `event` name, `payload` |

### Connection Lifecycle

```
Client                       Server
  │                            │
  │──── WS Connect ──────────►│
  │                            │
  │◄─── event: connect.challenge ──┤
  │      { nonce }            │
  │                            │
  │──── req: connect ────────►│
  │      { minProtocol,       │
  │        maxProtocol,       │
  │        client }           │
  │                            │
  │◄─── res: hello-ok ────────┤
  │      { protocolVersion,   │
  │        connectionId,      │
  │        features }         │
  │                            │
  │──── req: health ─────────►│
  │◄─── res: { status: "ok" }─┤
  │                            │
  │◄─── event: notification ──┤ (broadcast)
```

### Implemented Methods

| Method | Description |
|--------|-------------|
| `connect` | Initial handshake (must be first frame) |
| `health` | Returns server status, uptime, timestamp |
| `ping` | Returns `{ pong: true, timestamp }` |
| *(any other)* | Returns `METHOD_NOT_FOUND` error |

### Implemented Events

| Event | Description |
|-------|-------------|
| `connect.challenge` | Sent on new WebSocket connection (with nonce) |
| `notification` | Example broadcast event (triggered via `broadcastEvent()`) |

---

## Project Structure

```
openhand/
├── packages/
│   └── gateway-protocol/          # Protocol types + validation
│       ├── src/
│       │   ├── index.ts           # Re-exports
│       │   ├── version.ts         # Protocol version constants
│       │   ├── types.ts           # TypeScript interfaces for all frames
│       │   └── validate.ts        # Runtime validation functions
│       └── package.json
│
├── apps/
│   └── gateway/                   # Gateway server implementation
│       ├── src/
│       │   ├── index.ts           # Public API (GatewayServer class)
│       │   ├── server.ts          # WebSocket server, connection handling
│       │   └── server-methods/    # RPC method implementations
│       │       ├── index.ts
│       │       ├── connect.ts     # Connect handshake logic + client store
│       │       └── health.ts      # Health method handler
│       ├── test/
│       │   └── gateway.test.ts    # Integration tests (9 tests)
│       └── package.json
│
├── vitest.config.ts
├── package.json
└── pnpm-workspace.yaml
```

## Tests and Results

All **9 tests pass**. Tests cover:

### Gateway Protocol (5 tests)

| Test | Status | What it verifies |
|------|--------|------------------|
| Reject invalid JSON | ✅ | Sends PARSE_ERROR for non-JSON messages |
| Reject non-connect first frame | ✅ | Sends NOT_CONNECTED + closes WS if first frame is not `connect` |
| Complete connect handshake | ✅ | Full handshake flow: challenge → connect → hello-ok with connectionId |
| Reject protocol mismatch | ✅ | Returns PROTOCOL_MISMATCH when client range doesn't include server version |
| Reject invalid connect params | ✅ | Returns INVALID_PARAMS for malformed connect request (e.g., bad types) |

### Gateway Methods (3 tests)

| Test | Status | What it verifies |
|------|--------|------------------|
| Health method | ✅ | Returns `{ status: "ok", uptime, timestamp }` |
| Ping method | ✅ | Returns `{ pong: true, timestamp }` |
| Unknown method | ✅ | Returns METHOD_NOT_FOUND with error message |

### Gateway Events (1 test)

| Test | Status | What it verifies |
|------|--------|------------------|
| Broadcast events to connected clients | ✅ | `broadcastEvent()` delivers same event payload to all connected clients |

### Running Tests

```bash
pnpm vitest run
```

Sample output:
```
 ✓ apps/gateway/test/gateway.test.ts > Gateway Protocol > should reject connection with invalid JSON
 ✓ apps/gateway/test/gateway.test.ts > Gateway Protocol > should reject non-connect first frame
 ✓ apps/gateway/test/gateway.test.ts > Gateway Protocol > should complete full connect handshake
 ✓ apps/gateway/test/gateway.test.ts > Gateway Protocol > should reject protocol version mismatch
 ✓ apps/gateway/test/gateway.test.ts > Gateway Protocol > should reject invalid connect params
 ✓ apps/gateway/test/gateway.test.ts > Gateway Methods > should respond to health method
 ✓ apps/gateway/test/gateway.test.ts > Gateway Methods > should respond to ping method
 ✓ apps/gateway/test/gateway.test.ts > Gateway Methods > should return METHOD_NOT_FOUND for unknown methods
 ✓ apps/gateway/test/gateway.test.ts > Gateway Events > should receive broadcast events after connection

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

---

## Key Implementation Details

### Protocol Validation

All frames are validated at runtime using custom validation functions in `packages/gateway-protocol/src/validate.ts`. Each function checks types and required fields:

```typescript
// Example: validates a connect request
export function validateConnectParams(raw: unknown): raw is ConnectParams {
  // checks minProtocol (number), maxProtocol (number),
  // client.id/version/platform (strings), auth.token (optional string)
}
```

### Connection State

The server maintains a `Map<connectionId, ConnectedClient>` that tracks:
- `id` — client-provided identifier
- `connectionId` — server-generated UUID
- `platform` — e.g., "cli", "macos", "test"
- `version` — client version string

Clients are automatically removed from the map on WebSocket `close` or `error`.

### Method Routing

After connection, the server routes incoming requests based on `method` field:
- Built-in methods: `health`, `ping`
- Unknown methods: returns `METHOD_NOT_FOUND`
- Extensible: new methods are added by adding cases to the `switch` in `handleMethod()`

### Broadcasting

`GatewayServer.broadcastEvent(event, payload)` pushes an event frame to every connected client. Useful for notifications, presence updates, etc.

---

## Differences from OpenClaw

| Feature | OpenClaw | Our Implementation |
|---------|----------|-------------------|
| Protocol version | 4 | 1 |
| Schema validation | TypeBox | Custom type guards |
| Auth | Token/password/trusted-proxy/none | Not yet (next step) |
| Role system | operator/node | Not yet |
| Device pairing | Full system | Not yet |
| Plugin system | 80+ bundled extensions | Not yet |
