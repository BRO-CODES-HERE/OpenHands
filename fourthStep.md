# Step 4: Agent loop — Complete Report

## Overview
Implemented the core Agent Loop that manages the back-and-forth interaction between the user, the LLM, and tools.
The implementation orchestrates sending a prompt to an LLM provider, receiving the response, handling function/tool calls, executing those tools, and returning the results to the LLM until a final response is generated.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Agent Package                       │
│  packages/agent/                                    │
│                                                     │
│  Files:                                             │
│    src/index.ts   → Message/Tool interfaces & Agent │
│                     loop runner class               │
└─────────────────────────────────────────────────────┘
```

## Design Decisions
- **Modularity:** Created a new package `@openhands/agent` under `packages/agent`. This isolates the agent loop logic from the protocol, gateway, and CLI.
- **Interfaces over implementations:** Defined `LLMProvider` and `Tool` interfaces. This allows the core loop to be entirely agnostic to specific LLM APIs (like OpenAI, Anthropic) or specific tool logic. These can be easily mocked for testing.
- **Iterative Loop:** The `Agent.run()` method employs a loop that runs up to `maxIterations`. It evaluates responses and automatically triggers another LLM request if tools were called and executed, preventing infinite loops by capping iterations.
- **Error Handling in Loop:** If a tool call fails or requests a non-existent tool, the agent captures the error and feeds it back as a tool message. This allows the LLM to gracefully understand the failure rather than crashing the system.

## Implementation Details
- **`packages/agent/package.json`**: Created the new module setting type to `module`.
- **`packages/agent/src/index.ts`**:
  - `Role`: Defined standard message roles (`user`, `assistant`, `system`, `tool`).
  - `ToolCall` & `Message`: Typed out OpenAI-style function calling structures.
  - `LLMProvider` & `Tool`: Interfaces to inject dependencies.
  - `Agent`: The main class managing the `messages` array state and executing the `run` method to handle the loop.

---

## Tests and Results

All **5 agent tests pass** (total 25 across workspace):

| Test | Status | What it verifies |
|------|--------|------------------|
| Standard flow without tools | ✅ | Simple prompts get a simple response and loop terminates. |
| Tool call flow | ✅ | Mocks an LLM requesting a tool (`get_weather`), verifies the agent executes it, and passes the result back for a second LLM iteration. |
| Unknown tool call error | ✅ | Ensures the agent informs the LLM if a requested tool doesn't exist. |
| Tool execution error | ✅ | Verifies that if a tool throws an exception, the error message is correctly relayed back to the LLM. |
| Max iterations | ✅ | Tests that an infinite loop of tool calls is terminated safely when `maxIterations` is hit. |

```
✓ packages/agent/test/agent.test.ts (5 tests) 7ms

Test Files  4 passed (4)
     Tests  25 passed (25)
```

---

## Challenges & Resolutions
- **Challenge:** Creating the loop without a real LLM provider.
  - **Resolution:** Abstracted the provider into an interface (`LLMProvider`). This allowed test-driven development using `vi.fn()` to simulate multiple rounds of LLM generation seamlessly.

---

## Next Steps
- **LLM Provider Plugins:** Now that the core loop is in place, the next step is to create actual `LLMProvider` implementations (e.g., OpenAI provider) that adhere to the interface.
- **Tool System:** Implement standard tools and a better registration mechanism that populates the `Tool[]` array passed to the Agent.
