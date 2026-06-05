import { Message, Tool, LLMResponse, LLMProvider, ToolCall } from "../index.js";

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; model?: string }) {
    if (!options.apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.apiKey = options.apiKey;
    this.model = options.model || "gemini-2.0-flash-exp";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  async generateResponse(messages: Message[], tools?: Tool[]): Promise<LLMResponse> {
    const systemMessages = messages.filter(m => m.role === "system");
    const systemInstruction = systemMessages.length > 0 ? {
      parts: systemMessages.map(m => ({ text: m.content }))
    } : undefined;

    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => {
        const role = m.role === "assistant" ? "model" : m.role === "tool" ? "function" : "user";
        const parts: any[] = [];

        if (role === "function") {
          parts.push({
            functionResponse: {
              name: m.name || "",
              response: {
                output: m.content
              }
            }
          });
        } else {
          if (m.content) {
            parts.push({ text: m.content });
          }
          if (m.tool_calls) {
            for (const tc of m.tool_calls) {
              parts.push({
                functionCall: {
                  name: tc.function.name,
                  args: tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
                }
              });
            }
          }
        }

        // Gemini requires at least one part in every message
        if (parts.length === 0) {
          parts.push({ text: "" });
        }

        return { role, parts };
      });

    const formattedTools = tools && tools.length > 0 ? [
      {
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    ] : undefined;

    const requestBody: any = {
      contents
    };

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction;
    }

    if (formattedTools) {
      requestBody.tools = formattedTools;
    }

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // ignore parse error
      }
      throw new Error(`Gemini API request failed: ${errorMessage}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const candidateContent = candidate?.content;
    if (!candidateContent || !candidateContent.parts) {
      throw new Error("Gemini API returned an empty or invalid response");
    }

    let textContent = "";
    const toolCalls: ToolCall[] = [];

    for (const part of candidateContent.parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        const id = `gemini-call-${Math.random().toString(36).substring(2, 9)}`;
        toolCalls.push({
          id,
          type: "function",
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {})
          }
        });
      }
    }

    const resultMsg: Message = {
      role: "assistant",
      content: textContent
    };

    if (toolCalls.length > 0) {
      resultMsg.tool_calls = toolCalls;
    }

    return {
      message: resultMsg
    };
  }
}
