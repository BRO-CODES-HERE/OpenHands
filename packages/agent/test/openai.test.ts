import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIProvider } from "../src/providers/openai.js";
import { Message, Tool } from "../src/index.js";

describe("OpenAIProvider", () => {
  const apiKey = "test-key";
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fail if no apiKey is provided", () => {
    expect(() => new OpenAIProvider({ apiKey: "" })).toThrow("OpenAI API key is required");
  });

  it("calls fetch with correct URL, headers, and request body", async () => {
    const provider = new OpenAIProvider({ apiKey, model: "gpt-4-custom" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Hello from OpenAI"
            }
          }
        ]
      })
    });

    const messages: Message[] = [{ role: "user", content: "hello" }];
    const response = await provider.generateResponse(messages);

    expect(response.message.content).toBe("Hello from OpenAI");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-key"
      },
      body: JSON.stringify({
        model: "gpt-4-custom",
        messages: [{ role: "user", content: "hello" }]
      })
    });
  });

  it("maps tools correctly and passes them in request body", async () => {
    const provider = new OpenAIProvider({ apiKey });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Done",
              tool_calls: [
                {
                  id: "call_123",
                  type: "function",
                  function: {
                    name: "add_item",
                    arguments: '{"item":"apple"}'
                  }
                }
              ]
            }
          }
        ]
      })
    });

    const messages: Message[] = [{ role: "user", content: "Add apple to my list" }];
    const tools: Tool[] = [
      {
        name: "add_item",
        description: "Add an item to list",
        parameters: {
          type: "object",
          properties: {
            item: { type: "string" }
          },
          required: ["item"]
        },
        execute: async () => "ok"
      }
    ];

    const response = await provider.generateResponse(messages, tools);
    expect(response.message.tool_calls).toBeDefined();
    expect(response.message.tool_calls?.[0]).toEqual({
      id: "call_123",
      type: "function",
      function: {
        name: "add_item",
        arguments: '{"item":"apple"}'
      }
    });

    const lastCall = fetchMock.mock.calls[0];
    const body = JSON.parse(lastCall[1].body);
    expect(body.tools).toBeDefined();
    expect(body.tools[0]).toEqual({
      type: "function",
      function: {
        name: "add_item",
        description: "Add an item to list",
        parameters: {
          type: "object",
          properties: {
            item: { type: "string" }
          },
          required: ["item"]
        }
      }
    });
  });

  it("throws error when API response is not ok", async () => {
    const provider = new OpenAIProvider({ apiKey });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({
        error: { message: "Invalid API key" }
      })
    });

    await expect(provider.generateResponse([])).rejects.toThrow("OpenAI API request failed: Invalid API key");
  });
});
