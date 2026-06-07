import { describe, it, expect, vi } from "vitest";
import { Agent, LLMProvider, Tool, Message } from "../src/index.js";

describe("Agent Loop", () => {
  it("handles a standard conversation flow without tools", async () => {
    const mockProvider: LLMProvider = {
      generateResponse: vi.fn().mockResolvedValue({
        message: { role: "assistant", content: "Hello! How can I help you?" }
      })
    };

    const agent = new Agent(mockProvider, [], "You are a helpful assistant.");
    const result = await agent.run("Hi there");

    expect(result).toBe("Hello! How can I help you?");
    const messages = agent.getMessages();
    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: "system", content: "You are a helpful assistant." });
    expect(messages[1]).toEqual({ role: "user", content: "Hi there" });
    expect(messages[2]).toEqual({ role: "assistant", content: "Hello! How can I help you?" });
    expect(mockProvider.generateResponse).toHaveBeenCalledTimes(1);
  });

  it("handles a tool call flow", async () => {
    const mockWeatherTool: Tool = {
      name: "get_weather",
      description: "Get the current weather",
      parameters: {},
      execute: vi.fn().mockResolvedValue("Sunny and 75 degrees")
    };

    let callCount = 0;
    const mockProvider: LLMProvider = {
      generateResponse: vi.fn().mockImplementation(async (messages: Message[]) => {
        callCount++;
        if (callCount === 1) {
          return {
            message: {
              role: "assistant",
              content: "",
              tool_calls: [{
                id: "call_123",
                type: "function",
                function: { name: "get_weather", arguments: "{}" }
              }]
            }
          };
        } else {
          return {
            message: { role: "assistant", content: "The weather is Sunny and 75 degrees." }
          };
        }
      })
    };

    const agent = new Agent(mockProvider, [mockWeatherTool]);
    const result = await agent.run("What is the weather?");

    expect(result).toBe("The weather is Sunny and 75 degrees.");
    expect(mockWeatherTool.execute).toHaveBeenCalledWith({});
    expect(mockProvider.generateResponse).toHaveBeenCalledTimes(2);

    const messages = agent.getMessages();
    expect(messages).toHaveLength(4);
    expect(messages[1].tool_calls).toBeDefined();
    expect(messages[2]).toEqual({
      role: "tool",
      tool_call_id: "call_123",
      name: "get_weather",
      content: "Sunny and 75 degrees"
    });
  });

  it("handles an unknown tool call error", async () => {
    let callCount = 0;
    const mockProvider: LLMProvider = {
      generateResponse: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            message: {
              role: "assistant",
              content: "",
              tool_calls: [{
                id: "call_456",
                type: "function",
                function: { name: "unknown_tool", arguments: "{}" }
              }]
            }
          };
        } else {
          return {
            message: { role: "assistant", content: "I encountered an error running the tool." }
          };
        }
      })
    };

    const agent = new Agent(mockProvider, []);
    const result = await agent.run("Run an unknown tool.");

    expect(result).toBe("I encountered an error running the tool.");
    const messages = agent.getMessages();
    expect(messages[2]).toEqual({
      role: "tool",
      tool_call_id: "call_456",
      name: "unknown_tool",
      content: "Error: Tool unknown_tool not found."
    });
  });

  it("handles a tool execution error", async () => {
    const mockFailingTool: Tool = {
      name: "failing_tool",
      description: "A tool that always fails",
      parameters: {},
      execute: vi.fn().mockRejectedValue(new Error("Network timeout"))
    };

    let callCount = 0;
    const mockProvider: LLMProvider = {
      generateResponse: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            message: {
              role: "assistant",
              content: "",
              tool_calls: [{
                id: "call_789",
                type: "function",
                function: { name: "failing_tool", arguments: "{}" }
              }]
            }
          };
        } else {
          return {
            message: { role: "assistant", content: "The tool failed." }
          };
        }
      })
    };

    const agent = new Agent(mockProvider, [mockFailingTool]);
    const result = await agent.run("Run the failing tool.");

    expect(result).toBe("The tool failed.");
    const messages = agent.getMessages();
    expect(messages[2]).toEqual({
      role: "tool",
      tool_call_id: "call_789",
      name: "failing_tool",
      content: "Error: Failed to execute tool: Network timeout"
    });
  });

  it("throws an error when provided with an empty user message", async () => {
    const mockProvider: LLMProvider = {
      generateResponse: vi.fn()
    };
    const agent = new Agent(mockProvider, []);
    await expect(agent.run("")).rejects.toThrow("User message cannot be empty");
    await expect(agent.run("   ")).rejects.toThrow("User message cannot be empty");
  });

  it("stops when hitting max iterations", async () => {
    const mockProvider: LLMProvider = {
      generateResponse: vi.fn().mockResolvedValue({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [{
            id: "loop_call",
            type: "function",
            function: { name: "dummy_tool", arguments: "{}" }
          }]
        }
      })
    };

    const mockDummyTool: Tool = {
      name: "dummy_tool",
      description: "Dummy tool",
      parameters: {},
      execute: vi.fn().mockResolvedValue("Dummy result")
    };

    const agent = new Agent(mockProvider, [mockDummyTool]);
    await expect(agent.run("Start infinite loop", 3)).rejects.toThrow(/max iterations/);
    expect(mockProvider.generateResponse).toHaveBeenCalledTimes(3);
  });
});
