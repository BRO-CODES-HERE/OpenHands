import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiProvider } from "../src/providers/gemini.js";
import { Message, Tool } from "../src/index.js";

describe("GeminiProvider", () => {
  const apiKey = "test-gemini-key";
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fail if no apiKey is provided", () => {
    expect(() => new GeminiProvider({ apiKey: "" })).toThrow("Gemini API key is required");
  });

  it("calls fetch with correct Gemini API URL structure and payloads", async () => {
    const provider = new GeminiProvider({ apiKey, model: "gemini-test-model" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ text: "Hello from Gemini" }]
            }
          }
        ]
      })
    });

    const messages: Message[] = [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" }
    ];

    const response = await provider.generateResponse(messages);

    expect(response.message.content).toBe("Hello from Gemini");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent?key=test-gemini-key");

    const body = JSON.parse(callArgs[1].body);
    expect(body.systemInstruction).toEqual({
      parts: [{ text: "You are helpful." }]
    });
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "Hello" }] }
    ]);
  });

  it("handles native tool mappings and outputs functionCall response", async () => {
    const provider = new GeminiProvider({ apiKey });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: "search_db",
                    args: { query: "vitest" }
                  }
                }
              ]
            }
          }
        ]
      })
    });

    const messages: Message[] = [{ role: "user", content: "Search for vitest" }];
    const tools: Tool[] = [
      {
        name: "search_db",
        description: "Search the database",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" }
          }
        },
        execute: async () => "result"
      }
    ];

    const response = await provider.generateResponse(messages, tools);
    expect(response.message.tool_calls).toBeDefined();
    expect(response.message.tool_calls?.[0].function.name).toBe("search_db");
    expect(response.message.tool_calls?.[0].function.arguments).toBe('{"query":"vitest"}');

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: "search_db",
            description: "Search the database",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" }
              }
            }
          }
        ]
      }
    ]);
  });

  it("handles translating tool messages back to functionResponse", async () => {
    const provider = new GeminiProvider({ apiKey });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Success" }]
            }
          }
        ]
      })
    });

    const messages: Message[] = [
      { role: "user", content: "Run search" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{
          id: "call1",
          type: "function",
          function: { name: "search_db", arguments: '{"query":"vitest"}' }
        }]
      },
      {
        role: "tool",
        tool_call_id: "call1",
        name: "search_db",
        content: "results page 1"
      }
    ];

    await provider.generateResponse(messages);

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.contents).toHaveLength(3);
    expect(body.contents[2]).toEqual({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: "search_db",
            response: {
              output: "results page 1"
            }
          }
        }
      ]
    });
  });

  it("throws on error response", async () => {
    const provider = new GeminiProvider({ apiKey });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: { message: "Invalid argument API Key" }
      })
    });

    await expect(provider.generateResponse([])).rejects.toThrow("Gemini API request failed: Invalid argument API Key");
  });
});
