# Agent Loop (LLM Call → Tools → Reply)

## Overview
- Purpose of the task: Implement the core Agent Loop that manages the back-and-forth interaction between the user, the LLM, and tools.
- Scope of implementation: The implementation orchestrates sending a prompt to an LLM provider, receiving the response, handling function/tool calls, executing those tools, and returning the results to the LLM until a final response is generated.

## Design Decisions
- Architecture choices: Created a new package `@openhands/agent` under `packages/agent`. This isolates the agent loop logic from the protocol, gateway, and CLI.
- Patterns and abstractions used: Defined `LLMProvider` and `Tool` interfaces. This allows the core loop to be entirely agnostic to specific LLM APIs (like OpenAI, Anthropic) or specific tool logic. These can be easily mocked for testing. The `Agent.run()` method employs a loop that runs up to `maxIterations`. It evaluates responses and automatically triggers another LLM request if tools were called and executed, preventing infinite loops by capping iterations.

## Implementation Details
- Files added/modified:
  - `packages/agent/package.json`
  - `packages/agent/src/index.ts`
  - `apps/gateway/src/server.ts`
- Key components created:
  - `Role`, `ToolCall`, `Message` interfaces to type out OpenAI-style function calling structures.
  - `LLMProvider` & `Tool` interfaces to inject dependencies.
  - `Agent` class managing the `messages` array state and executing the `run` method to handle the iterative conversation loop.

## Test Cases
- Test scenarios covered:
  - Standard flow without tools: Simple prompts get a simple response and loop terminates.
  - Tool call flow: Mocks an LLM requesting a tool, verifies the agent executes it, and passes the result back for a second LLM iteration.
  - Unknown tool call error: Ensures the agent informs the LLM if a requested tool doesn't exist.
  - Tool execution error: Verifies that if a tool throws an exception, the error message is correctly relayed back to the LLM.
  - Max iterations: Tests that an infinite loop of tool calls is terminated safely when `maxIterations` is hit.
- Results and screenshots/logs:
  All 5 core agent tests and 20 other workspace tests pass successfully.
  ```
  ✓ packages/agent/test/agent.test.ts (5 tests) 7ms

  Test Files  4 passed (4)
       Tests  25 passed (25)
  ```

## Challenges & Resolutions
- Issues encountered: Testing the iterative loop without relying on a real LLM provider, which would be slow and brittle.
- How they were resolved: Abstracted the provider into an interface (`LLMProvider`). This allowed test-driven development using `vi.fn()` to simulate multiple rounds of LLM generation seamlessly, passing dummy tool calls and evaluating the Agent's handling.

## Next Steps
- Dependencies for upcoming tasks: With the core loop in place, the next task is to create actual `LLMProvider` implementations (e.g., OpenAI, Gemini, Anthropic providers) that adhere to the interface.
- Recommendations for future improvements: Enhance the `Tool` interface to support streaming execution and implement a better registration mechanism that populates the `Tool[]` array passed to the Agent dynamically.
