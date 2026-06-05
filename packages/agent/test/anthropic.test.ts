import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnthropicProvider } from "../src/providers/anthropic.js";
import { Message, Tool } from "../src/index.js";

describe("AnthropicProvider", () => {
  const apiKey = "test-anthropic-key";
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fail if no apiKey is provided", () => {
    expect(() => new AnthropicProvider({ apiKey: "" })).toThrow("Anthropic API key is required");
  });

  it("calls fetch with correct Anthropic API payload structure", async () => {
    const provider = new AnthropicProvider({ apiKey, model: "claude-test-model" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Hello from Anthropic" }]
      })
    });

    const messages: Message[] = [
      { role: "system", content: "System instructions" },
      { role: "user", content: "Hello" }
    ];

    const response = await provider.generateResponse(messages);

    expect(response.message.content).toBe("Hello from Anthropic");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(callArgs[1].headers).toEqual({
      "Content-Type": "application/json",
      "x-api-key": "test-anthropic-key",
      "anthropic-version": "2023-06-01"
    });

    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe("claude-test-model");
    expect(body.system).toBe("System instructions");
    expect(body.messages).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }]
      }
    ]);
  });

  it("consolidates multiple sequential messages of the same target role", async () => {
    const provider = new AnthropicProvider({ apiKey });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Got it" }]
      })
    });

    const messages: Message[] = [
      { role: "user", content: "First user message" },
      { role: "assistant", content: "First assistant message", tool_calls: [{
        id: "tool_1",
        type: "function",
        function: { name: "test_tool", arguments: "{}" }
      }] },
      { role: "tool", name: "test_tool", tool_call_id: "tool_1", content: "Tool output" }
    ];

    await provider.generateResponse(messages);

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    // Should result in:
    // Message 1: role "user", content: "First user message"
    // Message 2: role "assistant", content: ["First assistant message", tool_use block]
    // Message 3: role "user" (from tool), content: [tool_result block]
    expect(body.messages).toHaveLength(3);
    expect(body.messages[0]).toEqual({
      role: "user",
      content: [{ type: "text", text: "First user message" }]
    });
    expect(body.messages[1].role).toBe("assistant");
    expect(body.messages[1].content).toHaveLength(2);
    expect(body.messages[1].content[0]).toEqual({ type: "text", text: "First assistant message" });
    expect(body.messages[1].content[1].type).toBe("tool_use");

    expect(body.messages[2]).toEqual({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: "tool_1",
        content: "Tool output"
      }]
    });
  });

  it("handles formatting tools using input_schema", async () => {
    const provider = new AnthropicProvider({ apiKey });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{
          type: "tool_use",
          id: "call_999",
          name: "calculate",
          input: { val: 42 }
        }]
      })
    });

    const messages: Message[] = [{ role: "user", content: "Calculate" }];
    const tools: Tool[] = [
      {
        name: "calculate",
        description: "Run math",
        parameters: {
          type: "object",
          properties: {
            val: { type: "number" }
          }
        },
        execute: async () => "42"
      }
    ];

    const response = await provider.generateResponse(messages, tools);
    expect(response.message.tool_calls).toBeDefined();
    expect(response.message.tool_calls?.[0].function.name).toBe("calculate");
    expect(response.message.tool_calls?.[0].function.arguments).toBe('{"val":42}');

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.tools).toEqual([
      {
        name: "calculate",
        description: "Run math",
        input_schema: {
          type: "object",
          properties: {
            val: { type: "number" }
          }
        }
      }
    ]);
  });

  it("throws error for failed requests", async () => {
    const provider = new AnthropicProvider({ apiKey });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({
        error: { message: "Invalid Anthropic version header" }
      })
    });

    await expect(provider.generateResponse([])).rejects.toThrow("Anthropic API request failed: Invalid Anthropic version header");
  });
});
