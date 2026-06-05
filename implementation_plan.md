# Implementation Plan - Step 5: LLM Provider Plugins

Implement concrete `LLMProvider` plugins in `@openhands/agent` to connect the agent loop to real LLM services (OpenAI, Gemini, Anthropic) via native HTTP `fetch` calls, without introducing heavy external library dependencies.

---

## Proposed Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                          packages/agent                           │
│                                                                   │
│  src/providers/                                                   │
│    ├── openai.ts    → OpenAI-compatible chat API provider         │
│    ├── gemini.ts    → Native Gemini API (generateContent)         │
│    └── anthropic.ts → Native Anthropic Messages API               │
│                                                                   │
│  src/index.ts (Re-exports all providers)                         │
└───────────────────────────────────────────────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **API Clients**: We propose using Node's native `fetch` (available in Node 26.x) to make API calls to providers. This avoids adding external package dependencies like `openai`, `@google/genai`, or `@anthropic-ai/sdk`, keeping the monorepo lightweight and fast to install.
>
> **Config Schema updates**: We will update the configuration schema in `@openhands/config` to support selecting and configuring LLM providers.

---

## Open Questions

> [!NOTE]
> Do we want to support any additional local providers (e.g. Ollama, local inference) explicitly, or is the configurable `baseUrl` in the `OpenAIProvider` sufficient for local LLM usage?

---

## Proposed Changes

### Configuration Updates

#### [MODIFY] [schema.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/config/src/schema.ts)
* Update `AppConfig` type definition and `DEFAULT_CONFIG` to include the `llm` field.
* Support config definitions for `openai`, `gemini`, and `anthropic`.

```typescript
export interface AppConfig {
  gateway: {
    port: number;
    host: string;
  };
  llm?: {
    provider: "openai" | "gemini" | "anthropic";
    openai?: {
      apiKey: string;
      model?: string;
      baseUrl?: string;
    };
    gemini?: {
      apiKey: string;
      model?: string;
    };
    anthropic?: {
      apiKey: string;
      model?: string;
    };
  };
}
```

---

### LLM Providers (`packages/agent`)

#### [NEW] [openai.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/agent/src/providers/openai.ts)
* Implement `OpenAIProvider` class conforming to `LLMProvider`.
* Parameters: `apiKey`, `model` (defaults to `gpt-4o`), and `baseUrl` (defaults to `https://api.openai.com/v1`).
* Translates tools and messages directly to the OpenAI chat completions format.

#### [NEW] [gemini.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/agent/src/providers/gemini.ts)
* Implement `GeminiProvider` class conforming to `LLMProvider`.
* Parameters: `apiKey` and `model` (defaults to `gemini-1.5-pro` or `gemini-2.0-flash-exp`).
* Translates message histories (converting system instructions and tool responses into Gemini's native `contents` and `systemInstruction` parts structure).

#### [NEW] [anthropic.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/agent/src/providers/anthropic.ts)
* Implement `AnthropicProvider` class conforming to `LLMProvider`.
* Parameters: `apiKey` and `model` (defaults to `claude-3-5-sonnet-latest`).
* Maps system messages to the Anthropic `system` top-level parameter and formats user/assistant/tool messages into Anthropic's specific message block structure.

#### [MODIFY] [index.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/agent/src/index.ts)
* Export new provider classes from the package entry point.

---

### Tests

#### [NEW] [openai.test.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/agent/test/openai.test.ts)
* Use Vitest `vi.spyOn(global, 'fetch')` to mock the HTTP responses from OpenAI.
* Verify message mappings, tool definition conversions, and response parsing.

#### [NEW] [gemini.test.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/agent/test/gemini.test.ts)
* Test mapping of message roles (`user` -> `user`, `assistant` -> `model`, system message extraction).
* Verify payload structure formatting and function-calling parameters mapping.

#### [NEW] [anthropic.test.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/agent/test/anthropic.test.ts)
* Verify Anthropic message formatting, tool blocks conversion, and response parsing.

---

## Verification Plan

### Automated Tests
- Run `pnpm vitest run` to verify that all new integration test cases for LLM providers pass.
- Ensure the config tests continue to work with the updated schema definitions.
