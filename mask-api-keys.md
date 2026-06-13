# Mask API Keys Security Fix

## Overview
This task addresses a critical security vulnerability where the `config.get` WebSocket endpoint was returning plaintext LLM API keys. This allowed any connected client to retrieve sensitive keys. The implementation adds dynamic masking for outbound keys and state-aware restoration for inbound configurations, keeping the application secure without breaking frontend usage.

## Design Decisions
*   **Dynamic Masking (`********`)**: The backend replaces any valid `apiKey` field in the outgoing `config.get` payload with a literal `********`. This effectively hides the actual tokens over the network.
*   **State-Aware Unmasking**: Because the frontend needs to submit the configuration back to `config.set`, we had to account for incoming payloads where the `apiKey` might literally be `********`. If `config.set` receives `********`, it intercepts the request, reads the existing `openhand.json` off disk, and restores the original API key before saving.
*   **Zero-Dependency Validation**: The logic relies completely on existing Node filesystem APIs (`fs/promises`) and JavaScript object references without adding heavy runtime schemas or dependencies, respecting the architecture guidelines.

## Implementation Details
1.  **apps/gateway/src/server.ts**:
    *   In the `config.get` handler, after fetching the configuration, deep-cloned it via `JSON.parse(JSON.stringify(config))`. Iterated over the supported `llm` providers (`openai`, `gemini`, `anthropic`, `deepseek`, `qwen`, `meta`) and explicitly masked existing `apiKey` values.
    *   In the `config.set` handler, intercepted the `config` object. Ran a `fs.readFile` to get the existing `openhand.json` payload (wrapping it in a `catch` block for fault tolerance). Mapped over the `llm` providers to check if the incoming `apiKey` equals `********`, substituting it with the previous `apiKey` if it existed.
2.  **apps/gateway/test/gateway.test.ts**: Appended an integration test suite testing the `Config Endpoint Security` block using the `TestClient`.

## Test Cases
1.  **Masks API Keys on GET (`it("masks API keys in config.get response")`)**: Connects to the gateway, sets a dummy config with `sk-real-test-key`, and verifies the subsequent `config.get` returns `********`.
2.  **Restores API Keys on SET (`it("restores masked API keys in config.set")`)**: Simulates a frontend payload returning `********` but changing the model. Validates via manual filesystem checks that the actual `openhand.json` has `sk-real-test-key` alongside the new model string.

## Challenges & Resolutions
*   **Challenge**: The frontend relies on fetching the `apiKey` via `config.get` to populate its state variables. Simply removing the property would break the UI inputs and possibly fail logic.
*   **Resolution**: By returning `********`, the frontend `apiKey` input box properly populates a "hidden" string that visually signifies the key is present. The backend logic then natively parses `********` back into the real key, ensuring a smooth UX with zero frontend changes.

## Next Steps
*   If we add new properties to `llm` configs (like secret tokens for databases), they should be added to the masking arrays.
*   In the future, consider a formal credentials management system or environment-variable overrides so API keys aren't written directly to `openhand.json`.