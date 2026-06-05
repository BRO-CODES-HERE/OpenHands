# OpenHands — AI Assistant Context

## Project
A personal AI assistant (like OpenClaw) built step by step. Running on Windows with Node 26.

## Stack
- **Runtime**: Node 26.1.0, pnpm 11.5.0
- **Language**: TypeScript (ESM, `"type": "module"`)
- **Testing**: Vitest
- **WS**: `ws` library
- **Monorepo**: pnpm workspaces

## What's Been Built

### packages/gateway-protocol/ ✅
- Frame types: `RequestFrame`, `ResponseFrame`, `EventFrame`
- Protocol version constants (v1)
- Runtime validation functions (custom, not TypeBox)
- Published as `@openhands/gateway-protocol`

### apps/gateway/ ✅
- WebSocket server on `127.0.0.1:18999`
- Connect handshake: challenge → connect req → hello-ok
- Methods: `health`, `ping` (+ METHOD_NOT_FOUND fallback)
- Event broadcasting to all clients
- Client connection tracking (Map)
- Published as `@openhands/gateway`

### apps/cli/ ✅ (Step 2)
- Commander-based CLI (`oh` command)
- `GatewayClient` class — WebSocket client that auto-connects and handshakes
- Commands: `health`, `ping`, `listen`
- `--server` / `-s` option for custom gateway URL

### Tests — 59/59 passing

* **Gateway & CLI**: 16 core protocol tests passing.
* **Config Package**: 5 config validation tests passing.
* **Agent System**: 19 LLM orchestration tests passing.
* **Tools System**: 10 registry & system tool tests passing.
* **Channel System**: 2 lifecycle integration tests passing.
* **Session System**: 2 CRUD database tests passing.
* **Plugin SDK System**: 2 dynamic loading tests passing.
* **Skills System**: 2 composite chaining execution tests passing.

## Project Structure
```
apps/
  gateway/           # Gateway server
  cli/               # CLI (Commander-based)
packages/
  gateway-protocol/  # Protocol types + validation
  config/            # Config parsing & load schema
  agent/             # LLM orchestration and providers
  tools/             # Standard developer tool definitions
  channel/           # Abstract channel client framework
  session/           # Conversation persistent JSON database
  plugin-sdk/        # Dynamic loader and extension SDK
  skills/            # Composite task chaining runner
extensions/
  system-info-plugin/# Example custom diagnostics extension
ui/
  webchat/           # Glassmorphic React-TS Web UI client
scripts/             # Build helpers
```

## Architecture Decisions
- No TypeBox (v1.1.39 removed Value.Check) — custom validation instead
- No auth yet (next step)
- Protocol version 1
- ConnectionId = crypto.randomUUID()
- Frame format: `{ type, id, method, params }` for req, `{ type, id, ok, payload, error }` for res, `{ type, event, payload }` for event
- Dynamic extensions are imported as Node ESM modules from `extensions/` using absolute `file://` URLs.
- In test environments (`process.env.VITEST`), Gateway LLM providers automatically fall back to mock setups to keep tests clean and fast.

## Next Steps Planned
1. ✅ Gateway + Protocol
2. ✅ CLI (Commander-based)
3. ✅ Config system (JSON file, schema)
4. ✅ Agent loop (LLM call → tools → reply)
5. ✅ LLM provider plugins
6. ✅ Tool system
7. ✅ Channel system
8. ✅ Channel implementation (WebChat)
9. ✅ Session management
10. ✅ Plugin SDK
11. ✅ Skills system

## Commands
- `pnpm vitest run` — run all tests
- `pnpm install` — install deps
- `pnpm vitest` — watch mode
