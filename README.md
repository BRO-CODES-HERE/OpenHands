# ✋ OpenHands — Personal AI Assistant

<p align="center">
  <strong>HANDS ON. AI OFF. YOU DECIDE.</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/status-alpha-yellow?style=for-the-badge" alt="Alpha"></a>
  <a href="#"><img src="https://img.shields.io/badge/tests-59%2F59-passing-green?style=for-the-badge" alt="Tests"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D22.19-339933?style=for-the-badge&logo=node.js" alt="Node"></a>
</p>

**OpenHands** is a _personal AI assistant_ you build and run on your own devices.
It connects through a WebSocket gateway, routes messages through an LLM agent loop, and delivers responses back to any channel you plug in. The Gateway is the control plane — the product is the assistant.

If you want a personal, single-user assistant that feels local, fast, and yours to hack on, this is it.

Built piece by piece, step by step.

[Getting Started](#quick-start) · [Architecture](#highlights) · [From Source](#from-source-development)

## Quick start (TL;DR)

Runtime: **Node 22.19+** (Node 26 recommended).

```bash
git clone https://github.com/BRO-CODES-HERE/OpenHands.git
cd OpenHands
pnpm install

# Start the gateway (foreground/dev mode)
pnpm --filter @openhands/gateway dev
```

In another terminal:

```bash
# Check gateway health
pnpm --filter @openhands/cli dev health

# Ping the assistant
pnpm --filter @openhands/cli dev ping
```

Configure your LLM provider in `openhand.json`:

```json5
{
  "llm": {
    "provider": "openai",   // openai | gemini | anthropic | deepseek | qwen | meta
    "apiKey": "sk-...",
    "model": "gpt-4o"
  }
}
```

## Highlights

- **[Gateway](apps/gateway/)** — WebSocket control plane on `127.0.0.1:18999` for sessions, channels, tools, and events. Challenge handshake, RPC methods, event broadcasting.
- **[CLI](apps/cli/)** — `oh` command (Commander-based). `health`, `ping`, `listen`, `setup` commands. Connect to the gateway from your terminal.
- **[Agent Loop](packages/agent/)** — LLM orchestration engine. Message history, tool-call execution loop, multi-provider support (OpenAI, Gemini, Anthropic, DeepSeek, Qwen, Llama).
- **[Tool System](packages/tools/)** — `ToolRegistry` with built-in tools: `ReadFile`, `WriteFile`, `ListDir`, `Calculator`. Extensible via plugins.
- **[Channel Framework](packages/channel/)** — Abstract `BaseChannel` for connecting messaging surfaces (WebChat, etc.) to the gateway.
- **[Session Management](packages/session/)** — Persistent JSON-based conversation storage with full CRUD.
- **[Plugin SDK](packages/plugin-sdk/)** — Dynamic ESM plugin loader. Drop an extension into `extensions/` and it loads at runtime.
- **[Skills System](packages/skills/)** — Composite task chaining runner with template interpolation and sequential tool execution.
- **[WebChat UI](ui/webchat/)** — Glassmorphic React + TypeScript chat client with session management and LLM config UI.
- **[Protocol](packages/gateway-protocol/)** — Custom frame format (`req`/`res`/`event`), runtime validation (no TypeBox), protocol v1.

## From source (development)

The repository is a pnpm workspace. All packages use TypeScript ESM (`"type": "module"`).

```bash
git clone https://github.com/BRO-CODES-HERE/OpenHands.git
cd OpenHands
pnpm install

# Run all tests
pnpm vitest run

# Build all packages
pnpm build
```

### Dev loop

```bash
# Gateway with auto-reload
pnpm --filter @openhands/gateway dev

# CLI against running gateway
pnpm --filter @openhands/cli dev health
pnpm --filter @openhands/cli dev listen

# WebChat UI
pnpm --filter webchat dev
```

## Package architecture

```
apps/
  gateway/           # WebSocket gateway server
  cli/               # Commander-based CLI
packages/
  gateway-protocol/  # Frame types, validation, GatewayClient
  config/            # AppConfig schema + JSON loader
  agent/             # Agent loop + LLM providers
  tools/             # Tool registry + built-in tools
  channel/           # Abstract channel client framework
  session/           # JSON-based session persistence
  plugin-sdk/        # Dynamic ESM plugin loader
  skills/            # Composite task chaining runner
extensions/
  system-info-plugin/# Example diagnostics extension
ui/
  webchat/           # Glassmorphic React chat client
```

## Tests — 59/59 passing

| Suite | Tests | Status |
|---|---|---|
| Gateway & CLI (protocol) | 16 | ✅ |
| Config (validation) | 5 | ✅ |
| Agent (LLM orchestration) | 19 | ✅ |
| Tools (registry + system) | 10 | ✅ |
| Channel (lifecycle) | 2 | ✅ |
| Session (CRUD) | 2 | ✅ |
| Plugin SDK (dynamic loading) | 2 | ✅ |
| Skills (chaining) | 2 | ✅ |

## Architecture decisions

- **No TypeBox** — custom runtime validation (TypeBox v1.1.39 removed `Value.Check`).
- **ConnectionId** = `crypto.randomUUID()`.
- Frame format: `{ type, id, method, params }` for req, `{ type, id, ok, payload, error }` for res, `{ type, event, payload }` for event.
- Dynamic extensions loaded as ESM via absolute `file://` URLs.
- Test environment detection (`process.env.VITEST`) auto-falls back to mock providers.
- CSRF protection via WebSocket `verifyClient` (localhost origins only).
- DoS protection — `maxPayload` capped at 2MB.

## What's next

- [x] Gateway + Protocol
- [x] CLI (Commander-based)
- [x] Config system (JSON file, schema)
- [x] Agent loop (LLM call → tools → reply)
- [x] LLM provider plugins
- [x] Tool system
- [x] Channel system
- [x] Channel implementation (WebChat)
- [x] Session management
- [x] Plugin SDK
- [x] Skills system
- [ ] Authentication
- [ ] More channel integrations

## License

MIT
