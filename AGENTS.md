# OpenHands — AI Assistant Context

## Project
A personal AI assistant (like OpenClaw) built step by step. Running on Windows with Node 26.

## Stack
- **Runtime**: Node 26.1.0, pnpm 11.5.0
- **Language**: TypeScript (ESM, `"type": "module"`)
- **Testing**: Vitest
- **WS**: `ws` library
- **Monorepo**: pnpm workspaces

## What's Been Built (Step 1)

### packages/gateway-protocol/
- Frame types: `RequestFrame`, `ResponseFrame`, `EventFrame`
- Protocol version constants (v1)
- Runtime validation functions (custom, not TypeBox)
- Published as `@openhands/gateway-protocol`

### apps/gateway/
- WebSocket server on `127.0.0.1:18999`
- Connect handshake: challenge → connect req → hello-ok
- Methods: `health`, `ping` (+ METHOD_NOT_FOUND fallback)
- Event broadcasting to all clients
- Client connection tracking (Map)
- Published as `@openhands/gateway`

### Tests — 9/9 passing
- Invalid JSON → PARSE_ERROR
- Non-connect first frame → NOT_CONNECTED + close
- Full handshake → connectionId
- Protocol mismatch → PROTOCOL_MISMATCH
- Invalid params → INVALID_PARAMS
- health/ping → correct responses
- Unknown method → METHOD_NOT_FOUND
- Broadcast events → all clients receive

## Project Structure
```
apps/gateway/        # Gateway server
packages/            # Shared packages
  gateway-protocol/  # Protocol types + validation
config/              # (future)
extensions/          # (future plugins)
skills/              # (future)
ui/                  # (future web UI)
scripts/             # Build helpers
```

## Architecture Decisions
- No TypeBox (v1.1.39 removed Value.Check) — custom validation instead
- No auth yet (next step)
- Protocol version 1
- ConnectionId = crypto.randomUUID()
- Frame format: `{ type, id, method, params }` for req, `{ type, id, ok, payload, error }` for res, `{ type, event, payload }` for event

## Next Steps Planned
1. ✅ Gateway + Protocol
2. CLI (Commander-based)
3. Config system (JSON file, schema)
4. Agent loop (LLM call → tools → reply)
5. LLM provider plugins
6. Tool system
7. Channel system
8. Channel implementation (WebChat)
9. Session management
10. Plugin SDK
11. Skills system

## Commands
- `pnpm vitest run` — run all tests
- `pnpm install` — install deps
- `pnpm vitest` — watch mode
