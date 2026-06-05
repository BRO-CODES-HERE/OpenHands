import { Message, Tool, LLMResponse, LLMProvider, ToolCall } from "../index.js";

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; model?: string }) {
    if (!options.apiKey) {
      throw new Error("Anthropic API key is required");
    }
    this.apiKey = options.apiKey;
    this.model = options.model || "claude-3-5-sonnet-latest";
    this.baseUrl = "https://api.anthropic.com/v1";
  }

  async generateResponse(messages: Message[], tools?: Tool[]): Promise<LLMResponse> {
    const systemMessages = messages.filter(m => m.role === "system");
    const system = systemMessages.map(m => m.content).join("\n") || undefined;

    const anthropicMessages: any[] = [];
    const nonSystem = messages.filter(m => m.role !== "system");

    for (const msg of nonSystem) {
      const role = (msg.role === "tool" || msg.role === "user") ? "user" : "assistant";
      const contentBlocks: any[] = [];

      if (msg.role === "tool") {
        contentBlocks.push({
          type: "tool_result",
          tool_use_id: msg.tool_call_id || "",
          content: msg.content
        });
      } else {
        if (msg.content) {
          contentBlocks.push({
            type: "text",
            text: msg.content
          });
        }
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            contentBlocks.push({
              type: "tool_use",
              id: tc.id,
              name: tc.function.name,
              input: tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
            });
          }
        }
      }

      // Merge sequential user/assistant messages to ensure alternation
      const lastMsg = anthropicMessages[anthropicMessages.length - 1];
      if (lastMsg && lastMsg.role === role) {
        lastMsg.content.push(...contentBlocks);
      } else {
        anthropicMessages.push({
          role,
          content: contentBlocks
        });
      }
    }

    const formattedTools = tools && tools.length > 0 ? tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    })) : undefined;

    const requestBody: any = {
      model: this.model,
      messages: anthropicMessages,
      max_tokens: 4096
    };

    if (system) {
      requestBody.system = system;
    }

    if (formattedTools) {
      requestBody.tools = formattedTools;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody)
    });

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
      throw new Error(`Anthropic API request failed: ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.content;
    if (!content || !Array.isArray(content)) {
      throw new Error("Anthropic API returned an empty or invalid response");
    }

    let textContent = "";
    const toolCalls: ToolCall[] = [];

    for (const block of content) {
      if (block.type === "text") {
        textContent += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          type: "function",
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input || {})
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
