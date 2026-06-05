# Walkthrough - Premium Interactive Onboarding Setup

We have completely upgraded the CLI configuration onboarding flow to use `@clack/prompts` to deliver a premium command-line user experience, matching the quality of modern CLI tools like Astro and Vite.

---

## Changes Made

### 1. High-Fidelity CLI Onboarding Flow
* **Clack Prompts ([setup.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/apps/cli/src/setup.ts))**:
  * Utilizes Astro/Vite-like UI frames (`p.intro`, `p.select`, `p.text`, `p.spinner`, `p.outro`) with clean symbols, borders, and hints.
  * Allows interactive selection of providers (OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Qwen, Meta Llama) via keyboard arrow keys.
  * Dynamically sets and displays placeholders/default models and endpoints based on selected provider.
  * Employs live validation for API Keys (enforces values for commercial services, keeps them optional for local inference engines like Meta Llama/Ollama).
  * Safely handles cancellation signals (`Ctrl+C`) at each step using `p.isCancel` to exit without crashing.

### 2. Config Merging
* **JSON Merging ([loader.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/packages/config/src/loader.ts))**: Integrates the new provider properties, retaining all existing configurations in `openhand.json` (such as custom `gateway` properties).

### 3. Automated CLI Onboarding Tests ([cli-setup.test.ts](file:///c:/Users/hdk99/Desktop/Bro's_Git/OpenHands/apps/cli/test/cli-setup.test.ts))
* Built an automated test suite mocking `@clack/prompts` to verify:
  * Selection handling and default property generation.
  * Preservation of pre-existing keys (such as `gateway.port` or `gateway.host`).

---

## Verification Results

We verified that the entire Vitest suite passes without errors:

```
 RUN  v4.1.7 C:/Users/hdk99/Desktop/Bro's_Git/OpenHands

 ✓ packages/agent/test/anthropic.test.ts (5 tests) 18ms
 ✓ packages/agent/test/gemini.test.ts (5 tests) 24ms
 ✓ packages/agent/test/openai.test.ts (4 tests) 21ms
 ✓ packages/agent/test/agent.test.ts (5 tests) 18ms
 ✓ apps/cli/test/cli-setup.test.ts (2 tests) 92ms
 ✓ packages/config/test/config.test.ts (5 tests) 104ms
stdout | apps/gateway/test/gateway.test.ts
Gateway listening on 127.0.0.1:18999

stdout | apps/cli/test/cli.test.ts
Gateway listening on 127.0.0.1:18998

 ✓ apps/gateway/test/gateway.test.ts (9 tests) 127ms
 ✓ apps/cli/test/cli.test.ts (7 tests) 337ms

 Test Files  8 passed (8)
      Tests  42 passed (42)
   Start at  15:09:53
   Duration  1.71s (transform 1.46s, setup 0ms, import 2.32s, tests 742ms, environment 2ms)
```
