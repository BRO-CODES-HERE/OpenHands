# Agent Loop (LLM Call → Tools → Reply)

## Overview
- Purpose of the task: Implement the core Agent Loop that manages the back-and-forth interaction between the user, the LLM, and tools. This engine sits at the center of the AI Assistant orchestration.
- Scope of implementation: Orchestrate sending a prompt to an LLM provider, receiving the response, handling function/tool calls, executing those tools, handling exceptions and bad arguments, and returning the results to the LLM iteratively until a final response is generated.

## Design Decisions
- Architecture choices: Created a new package `@openhands/agent` under `packages/agent`. This completely isolates the agent loop state logic from the websocket protocol, the gateway, and CLI.
- Patterns and abstractions used: Defined `LLMProvider` and `Tool` interfaces. This keeps the core loop entirely agnostic to specific LLM APIs (like OpenAI vs Anthropic) or specific tool logic. These interfaces make test-driven development much simpler, allowing components to be easily mocked. The `Agent.run()` method runs within a simple capped `for` loop (up to `maxIterations`). This prevents catastrophic runaway LLM generation while natively triggering subsequent LLM requests if tools were executed.

## Implementation Details
- Files added/modified:
  - `packages/agent/package.json`
  - `packages/agent/src/index.ts`
  - `packages/agent/test/agent.test.ts`
  - `apps/gateway/src/server.ts`
- Key components created:
  - `Role`, `ToolCall`, `Message` interfaces to provide strong typing for OpenAI-style function calling structures regardless of the actual downstream LLM provider.
  - `LLMProvider` & `Tool` interfaces for dependency injection.
  - `Agent` class which manages the `messages` array state (the conversation history), input validation, and execution of the `run` method to handle the iterative tool-execution loop.

## Test Cases
- Test scenarios covered:
  - Empty User Input: Ensures the agent throws a `User message cannot be empty` error if empty strings or whitespace-only messages are passed to `run()`.
  - Standard flow without tools: Basic prompts receive simple string responses and the loop terminates correctly.
  - Tool call flow: Mocks an LLM requesting a tool, verifies the agent executes it with correct JSON arguments, and passes the result back for a second LLM iteration.
  - Unknown tool call error: Ensures the agent gracefully informs the LLM if a requested function name doesn't match the registered tools.
  - Tool execution error: Verifies that if a tool throws an internal exception, the error message is caught and relayed back to the LLM (so the LLM can try an alternative approach or inform the user).
  - Max iterations: Tests that an infinite loop of consecutive tool calls is forcefully terminated safely when `maxIterations` is hit.
- Results and screenshots/logs:
  All core agent tests and other workspace tests pass successfully.
  ```
  ✓ packages/agent/test/agent.test.ts (6 tests)
  ```

## Challenges & Resolutions
- Issues encountered: Testing the iterative recursive loop without relying on a real LLM provider (which would be slow, costly, and brittle).
- How they were resolved: Abstracting the provider into an interface (`LLMProvider`). This allowed using `vi.fn()` to simulate multiple back-to-back rounds of LLM generation seamlessly. We programmed mock functions to return dummy tool calls on the first round, and a final text string on the second round to evaluate the Agent's handling loop end-to-end.

## Next Steps
- Dependencies for upcoming tasks: With the core loop and tools infrastructure in place, the next task is to create actual `LLMProvider` implementations (e.g., OpenAI, Gemini, Anthropic providers) that adhere to the interface we just built.
- Recommendations for future improvements: Enhance the `Tool` interface to support streaming execution (like running shell commands) and implement a better dynamic plugin registry mechanism.
